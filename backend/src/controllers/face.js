import crypto from 'crypto';
import db from '../config/db.js';
import logAudit from '../utils/audit.js';
import fs from 'fs';
import path from 'path';
import { saveBase64Image } from '../utils/photoStorage.js';

// Helper to calculate Euclidean distance between two vectors
const calculateEuclideanDistance = (vec1, vec2) => {
  if (!Array.isArray(vec1) || !Array.isArray(vec2) || vec1.length !== vec2.length) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

// POST /api/face/enroll
export const enrollFace = async (req, res) => {
  try {
    const { faceEmbedding } = req.body;
    const userId = req.user.id;

    if (!faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      return res.status(400).json({ error: 'Valid face embedding vector is required.' });
    }

    const embeddingString = JSON.stringify(faceEmbedding);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Check if face template already exists for the user
    const checkResult = await db.execute({
      sql: 'SELECT id FROM face_templates WHERE user_id = ?',
      args: [userId]
    });

    if (checkResult.rows.length > 0) {
      // Overwrite existing face template
      await db.execute({
        sql: `
          UPDATE face_templates 
          SET face_embedding = ?, enrollment_status = 'enrolled', created_at = ?
          WHERE user_id = ?
        `,
        args: [embeddingString, now, userId]
      });
      await logAudit(userId, 'ENROLL_FACE', 'Face ID embedding updated successfully.', req);
    } else {
      // Insert new face template
      await db.execute({
        sql: `
          INSERT INTO face_templates (id, user_id, face_embedding, enrollment_status, created_at)
          VALUES (?, ?, ?, 'enrolled', ?)
        `,
        args: [id, userId, embeddingString, now]
      });
      await logAudit(userId, 'ENROLL_FACE', 'Face ID embedding enrolled successfully.', req);
    }

    return res.json({
      message: 'Face ID registered successfully.'
    });
  } catch (error) {
    console.error('Face ID enrollment error:', error);
    return res.status(500).json({ error: 'Failed to enroll Face ID due to a server error.' });
  }
};

// POST /api/face/verify
// Frontend sends verification request before checking in
export const verifyFace = async (req, res) => {
  try {
    const { faceEmbedding } = req.body;
    const userId = req.user.id;

    if (!faceEmbedding || !Array.isArray(faceEmbedding)) {
      return res.status(400).json({ error: 'Live face embedding vector is required.' });
    }

    // Retrieve stored face template
    const templateResult = await db.execute({
      sql: 'SELECT face_embedding, enrollment_status FROM face_templates WHERE user_id = ?',
      args: [userId]
    });

    if (templateResult.rows.length === 0 || templateResult.rows[0].enrollment_status !== 'enrolled') {
      return res.status(404).json({ error: 'No registered Face ID template found for this user.' });
    }

    const storedEmbedding = JSON.parse(templateResult.rows[0].face_embedding);

    // Calculate Euclidean distance (similarity score)
    const distance = calculateEuclideanDistance(faceEmbedding, storedEmbedding);
    const threshold = 0.15; // Strict comparison threshold (lower is stricter)
    const match = distance <= threshold;

    if (match) {
      await logAudit(userId, 'VERIFY_FACE_SUCCESS', `Face verified successfully. Distance score: ${distance.toFixed(4)}.`, req);
      return res.json({
        success: true,
        message: 'Face verification successful.',
        distance
      });
    } else {
      await logAudit(userId, 'VERIFY_FACE_FAILED', `Face verification failed. Distance score: ${distance.toFixed(4)}.`, req);
      return res.status(400).json({
        success: false,
        error: 'Face verification failed. Live face does not match enrolled template.',
        distance
      });
    }
  } catch (error) {
    console.error('Face verification error:', error);
    return res.status(500).json({ error: 'Failed to verify face due to a server error.' });
  }
};

// POST /api/face/reset/:employeeId
// Admin only resets employee biometrics (template and reference photo)
export const resetFaceId = async (req, res) => {
  try {
    const { employeeId } = req.params; // This is the employee_id string like 'EMP101'

    // Find the user first
    const userResult = await db.execute({
      sql: 'SELECT id, name FROM users WHERE employee_id = ?',
      args: [employeeId]
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: `Employee with ID "${employeeId}" not found.` });
    }

    const targetUser = userResult.rows[0];

    // Delete reference photo record
    await db.execute({
      sql: 'DELETE FROM employee_photos WHERE user_id = ?',
      args: [targetUser.id]
    });

    // Also delete face template (if any exists)
    await db.execute({
      sql: 'DELETE FROM face_templates WHERE user_id = ?',
      args: [targetUser.id]
    });

    await logAudit(req.user.id, 'RESET_REFERENCE_PHOTO', `Reset biometric reference photo and templates for employee ${targetUser.name} (ID: ${employeeId}).`, req);

    return res.json({
      message: `Biometric reference photo and templates for ${targetUser.name} have been reset successfully.`
    });
  } catch (error) {
    console.error('Biometrics reset error:', error);
    return res.status(500).json({ error: 'Failed to reset biometric templates.' });
  }
};

// POST /api/face/register-photo
// Employee captures/uploads reference photo
export const registerReferencePhoto = async (req, res) => {
  try {
    const { referencePhoto } = req.body;
    const userId = req.user.id;

    if (!referencePhoto) {
      return res.status(400).json({ error: 'Reference photo base64 data is required.' });
    }

    const filename = `reference_${userId}_${Date.now()}.png`;
    const savedPath = saveBase64Image(referencePhoto, 'reference', filename);
    const now = new Date().toISOString();

    // Check if photo record already exists
    const checkResult = await db.execute({
      sql: 'SELECT id FROM employee_photos WHERE user_id = ?',
      args: [userId]
    });

    if (checkResult.rows.length > 0) {
      await db.execute({
        sql: 'UPDATE employee_photos SET reference_photo_url = ?, updated_at = ? WHERE user_id = ?',
        args: [savedPath, now, userId]
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO employee_photos (user_id, reference_photo_url, created_at, updated_at) VALUES (?, ?, ?, ?)',
        args: [userId, savedPath, now, now]
      });
    }

    // Set face_templates record status to enrolled for general schema compliance
    const templateCheck = await db.execute({
      sql: 'SELECT id FROM face_templates WHERE user_id = ?',
      args: [userId]
    });
    if (templateCheck.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO face_templates (id, user_id, face_embedding, enrollment_status, created_at) VALUES (?, ?, '[]', 'enrolled', ?)",
        args: [crypto.randomUUID(), userId, now]
      });
    }

    await logAudit(userId, 'UPLOAD_REFERENCE_PHOTO', 'Employee uploaded secure biometric reference photo.', req);

    return res.json({
      message: 'Reference photo saved successfully.',
      photoUrl: `/api/face/photo/reference/${userId}`
    });
  } catch (error) {
    console.error('Register reference photo error:', error);
    return res.status(500).json({ error: 'Failed to save reference photo due to a server error.' });
  }
};

// GET /api/face/photo/reference/:userId
// Serve employee reference photo with security authorization filters
export const serveReferencePhoto = async (req, res) => {
  try {
    const { userId } = req.params;
    const requester = req.user;

    // Security: Only Admin or the owner can view the reference photo
    if (requester.role !== 'admin' && requester.id !== userId) {
      return res.status(403).json({ error: 'Access Denied: Insufficient authorization to view this resource.' });
    }

    const photoResult = await db.execute({
      sql: 'SELECT reference_photo_url FROM employee_photos WHERE user_id = ?',
      args: [userId]
    });

    if (photoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reference photo not found.' });
    }

    const relativePath = photoResult.rows[0].reference_photo_url;
    const absolutePath = path.join(process.cwd(), relativePath);

    if (fs.existsSync(absolutePath)) {
      return res.sendFile(absolutePath);
    } else {
      return res.status(404).json({ error: 'Reference photo file is missing on storage.' });
    }
  } catch (error) {
    console.error('Serve reference photo error:', error);
    return res.status(500).json({ error: 'Failed to retrieve photo.' });
  }
};

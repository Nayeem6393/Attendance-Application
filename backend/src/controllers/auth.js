import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../config/db.js';
import logAudit from '../utils/audit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_attendance_key_2026';

// Register Employee ONLY
export const register = async (req, res) => {
  try {
    const { name, email, mobile, password, department, designation, employee_id } = req.body;

    // Validate inputs
    if (!name || !email || !mobile || !password || !department || !designation || !employee_id) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if user already exists (by email, mobile, or employee_id)
    const existingCheck = await db.execute({
      sql: 'SELECT id, email, mobile, employee_id FROM users WHERE email = ? OR mobile = ? OR employee_id = ?',
      args: [email.toLowerCase(), mobile, employee_id.toUpperCase()]
    });

    if (existingCheck.rows.length > 0) {
      const match = existingCheck.rows[0];
      if (match.email === email.toLowerCase()) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }
      if (match.mobile === mobile) {
        return res.status(400).json({ error: 'An account with this mobile number already exists.' });
      }
      if (match.employee_id === employee_id.toUpperCase()) {
        return res.status(400).json({ error: 'An account with this Employee ID already exists.' });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert user into users table with role 'employee' and status 'pending'
    await db.execute({
      sql: `
        INSERT INTO users (id, name, email, mobile, password_hash, role, department, designation, employee_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'employee', ?, ?, ?, 'pending', ?, ?)
      `,
      args: [
        userId,
        name,
        email.toLowerCase(),
        mobile,
        passwordHash,
        department,
        designation,
        employee_id.toUpperCase(),
        now,
        now
      ]
    });

    await logAudit(userId, 'REGISTER', `Employee account registered for ${name} (ID: ${employee_id}). Status: pending.`, req);

    return res.status(201).json({
      message: 'Employee registered successfully! Your account is pending administrator approval.',
      userId
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
};

// Login Common (Admin and Employee)
export const login = async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body; // loginIdentifier can be email or mobile

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email/Mobile and password are required.' });
    }

    const queryStr = loginIdentifier.toLowerCase().trim();

    // Query user by email OR mobile
    const userResult = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ? OR mobile = ?',
      args: [queryStr, queryStr]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = userResult.rows[0];

    // Validate Status (e.g. if rejected)
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'Your account has been rejected by the administrator. Contact HR.' });
    }

    // Compare Password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAudit(user.id, 'LOGIN', `User logged in successfully. Role: ${user.role}.`, req);

    // Return token and user details
    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        department: user.department,
        designation: user.designation,
        employee_id: user.employee_id,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
};

// Logout Common
export const logout = async (req, res) => {
  try {
    if (req.user) {
      await logAudit(req.user.id, 'LOGOUT', 'User logged out.', req);
    }
    return res.json({ message: 'Logout successful.' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Logout failed.' });
  }
};

// Current Session Info
export const me = async (req, res) => {
  try {
    // Get fresh user details from DB
    const userResult = await db.execute({
      sql: 'SELECT id, name, email, mobile, role, department, designation, employee_id, status FROM users WHERE id = ?',
      args: [req.user.id]
    });

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];

    // Check Face ID enrollment status
    const faceResult = await db.execute({
      sql: 'SELECT enrollment_status FROM face_templates WHERE user_id = ?',
      args: [req.user.id]
    });

    const isFaceEnrolled = faceResult.rows.length > 0 && faceResult.rows[0].enrollment_status === 'enrolled';

    return res.json({
      user: {
        ...user,
        face_enrolled: isFaceEnrolled
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return res.status(500).json({ error: 'Failed to retrieve user details.' });
  }
};

// Update User Profile (Admin or Employee)
export const updateProfile = async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!name || !mobile || !email) {
      return res.status(400).json({ error: 'Name, mobile, and email are required.' });
    }

    // Check if new email is already in use by another user
    const emailCheck = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ? AND id != ?',
      args: [email.toLowerCase().trim(), userId]
    });

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Check if new mobile is already in use by another user
    const mobileCheck = await db.execute({
      sql: 'SELECT id FROM users WHERE mobile = ? AND id != ?',
      args: [mobile.trim(), userId]
    });

    if (mobileCheck.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this mobile number already exists.' });
    }

    const now = new Date().toISOString();

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }
      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);

      await db.execute({
        sql: `
          UPDATE users
          SET name = ?, mobile = ?, email = ?, password_hash = ?, updated_at = ?
          WHERE id = ?
        `,
        args: [name.trim(), mobile.trim(), email.toLowerCase().trim(), passwordHash, now, userId]
      });
    } else {
      await db.execute({
        sql: `
          UPDATE users
          SET name = ?, mobile = ?, email = ?, updated_at = ?
          WHERE id = ?
        `,
        args: [name.trim(), mobile.trim(), email.toLowerCase().trim(), now, userId]
      });
    }

    await logAudit(userId, 'UPDATE_PROFILE', `Updated profile details: ${email.toLowerCase().trim()}.`, req);

    return res.json({ message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
};

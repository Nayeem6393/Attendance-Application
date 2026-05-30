import fs from 'fs';
import path from 'path';

/**
 * Ensures that the required folders in process.cwd()/uploads exist.
 */
export const ensureUploadDirectories = () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const refDir = path.join(uploadsDir, 'reference');
  const attDir = path.join(uploadsDir, 'attendance');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });
  if (!fs.existsSync(attDir)) fs.mkdirSync(attDir, { recursive: true });
};

/**
 * Decodes a base64 image data-URI and saves it to the target uploads folder.
 * @param {string} base64Data - Raw or data-URI base64 image string.
 * @param {string} folder - 'reference' or 'attendance'.
 * @param {string} filename - Unique output filename.
 * @returns {string} Relative file URL path e.g. 'uploads/reference/filename.png'.
 */
export const saveBase64Image = (base64Data, folder, filename) => {
  ensureUploadDirectories();

  // Strip standard base64 data-uri header if present (e.g. data:image/png;base64,)
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let binaryBuffer;

  if (matches && matches.length === 3) {
    binaryBuffer = Buffer.from(matches[2], 'base64');
  } else {
    binaryBuffer = Buffer.from(base64Data, 'base64');
  }

  const relativePath = path.join('uploads', folder, filename);
  const absolutePath = path.join(process.cwd(), relativePath);

  fs.writeFileSync(absolutePath, binaryBuffer);
  
  // Return the normalized relative path
  return relativePath.replace(/\\/g, '/');
};

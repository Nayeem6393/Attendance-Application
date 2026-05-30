import db from '../config/db.js';
import crypto from 'crypto';

/**
 * Log audit events to the audit_logs table
 * @param {string|null} userId - The user performing the action or affected
 * @param {string} action - The action string (e.g. 'LOGIN', 'ENROLL_FACE', 'MARK_ATTENDANCE')
 * @param {string} description - Readable details of the event
 * @param {object} req - Express request object for IP and User-Agent capturing
 */
export const logAudit = async (userId, action, description, req = null) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    let ipAddress = '127.0.0.1';
    let deviceInfo = 'System/Unknown';

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      deviceInfo = req.headers['user-agent'] || 'Browser/Unknown';
      // Normalize IP address
      if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.slice(7);
      }
    }

    await db.execute({
      sql: `
        INSERT INTO audit_logs (id, user_id, action, description, ip_address, device_info, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, userId || 'system', action, description, ipAddress, deviceInfo, now]
    });
  } catch (error) {
    console.error('Failed to insert audit log record:', error);
  }
};

export default logAudit;

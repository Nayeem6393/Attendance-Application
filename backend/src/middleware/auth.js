import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_attendance_key_2026';

// General auth check
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required. Access Denied.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists in database
    const userResult = await db.execute({
      sql: 'SELECT id, name, email, role, status FROM users WHERE id = ?',
      args: [decoded.id]
    });

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    const user = userResult.rows[0];
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Access Denied.' });
  }
};

// Admin only auth check
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  next();
};

// Employee only auth check
export const requireEmployee = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== 'employee') {
    return res.status(403).json({ error: 'Forbidden. Employee access required.' });
  }
  next();
};

// Active account check (must not be rejected)
export const requireActive = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.status === 'rejected') {
    return res.status(403).json({ error: 'Account has been rejected by Administrator.' });
  }
  next();
};

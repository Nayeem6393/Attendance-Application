import express from 'express';
import { register, login, logout, me, updateProfile } from '../controllers/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);

// Protected auth endpoints
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);
router.put('/update-profile', requireAuth, updateProfile);

export default router;

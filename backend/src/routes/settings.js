import express from 'express';
import { getSettings, updateSettings } from '../controllers/settings.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getSettings);
router.put('/', requireAuth, requireAdmin, updateSettings);

export default router;

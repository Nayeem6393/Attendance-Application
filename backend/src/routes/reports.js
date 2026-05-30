import express from 'express';
import { exportDailyReport, exportMonthlyReport } from '../controllers/reports.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/daily', requireAuth, requireAdmin, exportDailyReport);
router.get('/monthly', requireAuth, requireAdmin, exportMonthlyReport);

export default router;

import express from 'express';
import {
  markAttendance,
  getTodayAttendance,
  getMyHistory,
  getAdminAttendance,
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  updateAttendanceManual,
  createLateLoginRequest,
  getLateLoginRequests,
  updateLateLoginRequest,
  serveAttendancePhoto
} from '../controllers/attendance.js';
import { requireAuth, requireAdmin, requireActive } from '../middleware/auth.js';
import { runAutoAbsentCheck } from '../scheduler/autoAbsent.js';

const router = express.Router();

// Employee-scoped attendance endpoints
router.post('/mark', requireAuth, requireActive, markAttendance);
router.get('/today', requireAuth, getTodayAttendance);
router.get('/my-history', requireAuth, requireActive, getMyHistory);
router.post('/late-request', requireAuth, requireActive, createLateLoginRequest);
router.get('/photo/:recordId', requireAuth, serveAttendancePhoto);

// Admin-scoped tracking dashboards
router.get('/admin', requireAuth, requireAdmin, getAdminAttendance);
router.get('/admin/daily', requireAuth, requireAdmin, getDailyAttendanceReport);
router.get('/admin/monthly', requireAuth, requireAdmin, getMonthlyAttendanceReport);
router.put('/admin/manual', requireAuth, requireAdmin, updateAttendanceManual);
router.get('/admin/late-requests', requireAuth, requireAdmin, getLateLoginRequests);
router.put('/admin/late-requests/:id', requireAuth, requireAdmin, updateLateLoginRequest);

// Administrative manual trigger for the Auto-Absent background scheduler (excellent for test validations)
router.post('/admin/run-auto-absent', requireAuth, requireAdmin, async (req, res) => {
  const result = await runAutoAbsentCheck(true); // force run bypassing time limits
  if (result.success) {
    return res.json({ message: 'Auto-Absent marking job completed successfully.', ...result });
  } else {
    return res.status(500).json({ error: 'Auto-Absent marking job failed.', details: result.error });
  }
});

export default router;

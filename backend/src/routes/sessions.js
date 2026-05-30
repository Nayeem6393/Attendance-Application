import express from 'express';
import {
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  toggleSession,
  assignSession,
  getSessionAssignments,
  getTodaySessionsEmployee
} from '../controllers/sessions.js';
import { requireAuth, requireAdmin, requireActive } from '../middleware/auth.js';

const adminRouter = express.Router();
const employeeRouter = express.Router();

// Admin-scoped session configurations
adminRouter.get('/', requireAuth, requireAdmin, getSessions);
adminRouter.post('/', requireAuth, requireAdmin, createSession);
adminRouter.put('/:id', requireAuth, requireAdmin, updateSession);
adminRouter.delete('/:id', requireAuth, requireAdmin, deleteSession);
adminRouter.patch('/:id/toggle', requireAuth, requireAdmin, toggleSession);
adminRouter.post('/:id/assign', requireAuth, requireAdmin, assignSession);
adminRouter.get('/:id/assignments', requireAuth, requireAdmin, getSessionAssignments);

// Employee-scoped session retrieval
employeeRouter.get('/today', requireAuth, requireActive, getTodaySessionsEmployee);

export { adminRouter, employeeRouter };

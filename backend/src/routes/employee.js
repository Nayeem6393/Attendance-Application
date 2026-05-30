import express from 'express';
import {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  approveEmployee,
  rejectEmployee
} from '../controllers/employee.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Admin-only list of employees
router.get('/', requireAuth, requireAdmin, getEmployees);

// Individual operations
router.get('/:id', requireAuth, getEmployeeById);
router.put('/:id', requireAuth, updateEmployee);
router.delete('/:id', requireAuth, requireAdmin, deleteEmployee);

// Admin-only approvals
router.put('/:id/approve', requireAuth, requireAdmin, approveEmployee);
router.put('/:id/reject', requireAuth, requireAdmin, rejectEmployee);

export default router;

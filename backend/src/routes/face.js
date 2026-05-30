import express from 'express';
import { enrollFace, verifyFace, resetFaceId, registerReferencePhoto, serveReferencePhoto } from '../controllers/face.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/enroll', requireAuth, enrollFace);
router.post('/verify', requireAuth, verifyFace);
router.post('/reset/:employeeId', requireAuth, requireAdmin, resetFaceId);
router.post('/register-photo', requireAuth, registerReferencePhoto);
router.get('/photo/reference/:userId', requireAuth, serveReferencePhoto);

export default router;

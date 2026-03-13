import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// สังเกตว่าเราใช้ authenticate ดักไว้ด้วย เพื่อให้แน่ใจว่าคนเรียก API นี้ต้องล็อกอิน
router.get('/stats', authenticate, adminController.getDashboardStats);
router.delete('/songs/:songId', authenticate, adminController.deleteSong);
router.get('/users', authenticate, adminController.getAllUsers);
router.get('/songs', authenticate, adminController.getAllSongs);

export default router;
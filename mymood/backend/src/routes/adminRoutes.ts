import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authenticate,isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// สังเกตว่าเราใช้ authenticate ดักไว้ด้วย เพื่อให้แน่ใจว่าคนเรียก API นี้ต้องล็อกอิน
router.get('/stats', authenticate, isAdmin, adminController.getDashboardStats);
router.delete('/songs/:songId', authenticate, isAdmin, adminController.deleteSong);
router.get('/users', authenticate, isAdmin, adminController.getAllUsers);
router.get('/songs', authenticate, isAdmin, adminController.getAllSongs);

export default router;
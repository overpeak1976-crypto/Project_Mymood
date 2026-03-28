import { Router } from 'express';
import { authenticate,isAdmin } from '../middlewares/authMiddleware';
import { adminStatsController } from '../../../backend/src/controllers/admin/adminStatsController';
import { adminUserController } from '../../../backend/src/controllers/admin/adminUserController';
import { adminSongController } from '../../../backend/src/controllers/admin/adminSongController';

const router = Router();

// สังเกตว่าเราใช้ authenticate ดักไว้ด้วย เพื่อให้แน่ใจว่าคนเรียก API นี้ต้องล็อกอิน
router.get('/stats', authenticate, isAdmin, adminStatsController.getDashboardStats);
router.delete('/songs/:songId', authenticate, isAdmin, adminSongController.deleteSong);
router.get('/users', authenticate, isAdmin, adminUserController.getAllUsers);
router.get('/songs', authenticate, isAdmin, adminSongController.getAllSongs);

export default router;
import { Router } from 'express';
import { authenticate, isAdmin } from '../middlewares/authMiddleware';
import { adminStatsController } from '../controllers/admin/adminStatsController';
import { adminUserController } from '../controllers/admin/adminUserController';
import { adminSongController } from '../controllers/admin/adminSongController';

const router = Router();

router.delete('/songs/:songId', authenticate, isAdmin, adminSongController.deleteSong);
router.get('/songs', authenticate, isAdmin, adminSongController.getAllSongs);

router.get('/stats', authenticate, isAdmin, adminStatsController.getDashboardStats);

router.get('/users', authenticate, isAdmin, adminUserController.getAllUsers);

router.post('/users/:id/message', authenticate, isAdmin, adminUserController.sendMessageToUser);

export default router;
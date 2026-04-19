import { Router } from 'express';
import { authenticate, isAdmin } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload';
import { adminStatsController } from '../controllers/admin/adminStatsController';
import { adminUserController } from '../controllers/admin/adminUserController';
import { adminSongController } from '../controllers/admin/adminSongController';
import { adminNotificationController } from '../controllers/admin/adminNotificationController';
import { adminAnalyticsController } from '../controllers/admin/adminAnalyticsController';

const router = Router();

// Dashboard
router.get('/stats', authenticate, isAdmin, adminStatsController.getDashboardStats);
router.get('/stats/user-growth', authenticate, isAdmin, adminStatsController.getUserGrowthChart);
router.get('/stats/play-growth', authenticate, isAdmin, adminStatsController.getPlayGrowthChart);

// Songs / Content
router.get('/songs', authenticate, isAdmin, adminSongController.getAllSongs);
router.post('/songs/upload', authenticate, isAdmin, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }]), adminSongController.uploadSong);
router.delete('/songs/:songId', authenticate, isAdmin, adminSongController.deleteSong);
router.patch('/songs/:songId/visibility', authenticate, isAdmin, adminSongController.toggleVisibility);

// Users
router.get('/users', authenticate, isAdmin, adminUserController.getAllUsers);
router.get('/users/:id', authenticate, isAdmin, adminUserController.getUserDetail);
router.patch('/users/:id/role', authenticate, isAdmin, adminUserController.updateUserRole);
router.delete('/users/:id/profile-image', authenticate, isAdmin, adminUserController.clearUserProfileImage);
router.delete('/users/:id/banner-image', authenticate, isAdmin, adminUserController.clearUserBannerImage);
router.post('/users/:id/message', authenticate, isAdmin, adminUserController.sendMessageToUser);

// Notifications
router.post('/notifications/broadcast', authenticate, isAdmin, adminNotificationController.broadcast);
router.post('/notifications/inactive', authenticate, isAdmin, adminNotificationController.sendToInactive);

// Analytics
router.get('/analytics', authenticate, isAdmin, adminAnalyticsController.getAnalytics);

export default router;
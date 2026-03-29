import express from 'express';
import * as notificationController from '../controllers/notificationController';
import { authenticate } from '../middlewares/authMiddleware'; // ปรับ Path ให้ตรงของคุณ

const router = express.Router();

// ดึงแจ้งเตือนของตัวเอง: GET /api/notifications
router.get('/', authenticate, notificationController.getMyNotifications);

// ทำเครื่องหมายว่าอ่านแล้ว: PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, notificationController.markAsRead);

export default router;
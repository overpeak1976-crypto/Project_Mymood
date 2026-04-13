import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { notificationService } from '../services/notificationService';

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    console.log(`📡 Fetching notifications for: ${req.user.id}`);
    const data = await notificationService.getMyNotifications(req.user.id);
    res.status(200).json(data);
  } catch (error: any) {
    console.error('🚨 ERROR [getMyNotifications]:', error.message);
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await notificationService.markAsRead(id, req.user.id);
    res.status(200).json({ message: 'Marked as read successfully' });
  } catch (error: any) {
    console.error('🚨 ERROR [markAsRead]:', error.message);
    res.status(500).json({ error: error.message });
  }
};
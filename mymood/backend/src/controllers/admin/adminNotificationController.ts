import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { adminService } from '../../services/adminService';

export const adminNotificationController = {
  async broadcast(req: AuthRequest, res: Response) {
    try {
      const { title, message } = req.body;
      const result = await adminService.broadcastMessage(title, message);
      res.status(200).json({ message: `ส่งสำเร็จ ${result.sent}/${result.total} คน`, ...result });
    } catch (error: any) {
      const status = error.message.includes('กรุณาพิมพ์') ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  async sendToInactive(req: AuthRequest, res: Response) {
    try {
      const { title, message, days_since } = req.body;
      const result = await adminService.sendToInactiveUsers(title, message, days_since || 7);
      res.status(200).json({ message: `ส่งสำเร็จ ${result.sent}/${result.total} คน`, ...result });
    } catch (error: any) {
      const status = error.message.includes('กรุณาพิมพ์') ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  },
};

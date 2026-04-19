import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { adminService } from '../../services/adminService';

export const adminAnalyticsController = {
  async getAnalytics(req: AuthRequest, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await adminService.getAnalytics(days);
      res.status(200).json(data);
    } catch (error: any) {
      console.error('🚨 Admin Analytics Error:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

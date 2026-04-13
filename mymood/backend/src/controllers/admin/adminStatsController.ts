import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { adminService } from '../../services/adminService';

export const adminStatsController = {
  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const stats = await adminService.getDashboardStats();
      res.status(200).json(stats);
    } catch (error: any) {
      console.error('🚨 Admin Stats Error:', error);
      res.status(500).json({ error: error.message });
    }
  },
};
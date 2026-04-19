import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { friendService } from '../services/friendService';

export const friendController = {
  async getMyFriends(req: AuthRequest, res: Response) {
    try {
      const friends = await friendService.getMyFriends(req.user.id);
      res.status(200).json({ message: 'ดึงรายชื่อเพื่อนสำเร็จ', friends });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getPendingRequests(req: AuthRequest, res: Response) {
    try {
      const requests = await friendService.getPendingRequests(req.user.id);
      res.status(200).json({ requests });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getSentRequests(req: AuthRequest, res: Response) {
    try {
      const sent_requests = await friendService.getSentRequests(req.user.id);
      res.status(200).json({ sent_requests });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async rejectOrCancelRequest(req: AuthRequest, res: Response) {
    try {
      const targetId = req.params.targetId as string;
      await friendService.rejectOrCancelRequest(req.user.id, targetId);
      res.status(200).json({ message: 'ลบคำขอสำเร็จ' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
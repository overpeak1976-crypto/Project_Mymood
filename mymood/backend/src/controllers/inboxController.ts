import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { inboxService } from '../services/inboxService';

export const inboxController = {
  async shareSong(req: AuthRequest, res: Response) {
    try {
      const { receiverId, songId, message } = req.body;
      const inbox = await inboxService.shareSong(req.user.id, receiverId, songId, message || null);
      res.status(201).json({ message: 'ส่งเพลงให้เพื่อนสำเร็จ!', inbox });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getMyInbox(req: AuthRequest, res: Response) {
    try {
      const data = await inboxService.getMyInbox(req.user.id);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
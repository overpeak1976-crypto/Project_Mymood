import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { userService } from '../services/userService';

export const userController = {
  async searchByHandle(req: AuthRequest, res: Response) {
    try {
      const handle = req.params.handle as string;
      const data = await userService.searchByHandle(handle);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async addFriend(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;
      const { targetUserId } = req.body;
      const friendship = await userService.addFriend(myId, targetUserId);
      res.status(201).json({ message: 'ส่งคำขอแอดเพื่อนเรียบร้อย!', friendship });
    } catch (error: any) {
      const status =
        error.message.includes('แอดตัวเอง') || error.message.includes('ส่งคำขอไปแล้ว')
          ? 400
          : 500;
      res.status(status).json({ error: error.message });
    }
  },

  async acceptFriend(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;
      const { senderId } = req.body;
      const friendship = await userService.acceptFriend(myId, senderId);
      res.status(200).json({ message: 'เป็นเพื่อนกันเรียบร้อย!', friendship });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getMyTopGenres(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;
      const topGenres = await userService.getMyTopGenres(myId);
      res.status(200).json({ topGenres });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
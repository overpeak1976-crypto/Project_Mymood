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

  async getMyProfile(req: AuthRequest, res: Response) {
    console.log('[userController] getMyProfile called, user:', req.user?.id);
    try {
      const myId = req.user.id;
      const profile = await userService.profileData(myId);
      console.log('[userController] profile result:', profile ? 'found' : 'null');
      res.status(200).json(profile);
    } catch (error: any) {
      console.error('[userController] getMyProfile error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async updateMyProfile(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;
      const { username, handle, bio, link, profile_image_url, banner_image_url, current_playing_song_id } = req.body;
      const profile = await userService.uploadsData(myId, { username, handle, bio, link, profile_image_url, banner_image_url, current_playing_song_id });
      res.status(200).json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getPrivacySettings(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;
      const settings = await userService.getPrivacySettings(myId);
      res.status(200).json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async updatePrivacySettings(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;
      const { show_activity_status, show_uploads } = req.body;
      const settings = await userService.updatePrivacySettings(myId, { show_activity_status, show_uploads });
      res.status(200).json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getPublicProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.userId as string;
      const myId = req.user?.id;
      const profile = await userService.getPublicProfile(userId, myId);
      if (!profile) return res.status(404).json({ error: 'User not found' });
      res.status(200).json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
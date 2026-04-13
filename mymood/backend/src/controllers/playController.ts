import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { playService } from '../services/playService';

export const playController = {
  async recordPlay(req: AuthRequest, res: Response) {
    try {
      const song_id = req.params.song_id as string;
      const result = await playService.recordPlay(req.user.id, song_id);
      res.status(200).json({
        message: 'บันทึกประวัติและบวกยอดวิวสำเร็จ!',
        current_views: result.current_views,
      });
    } catch (error: any) {
      console.error('🚨 Record Play Error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async getHistory(req: AuthRequest, res: Response) {
    try {
      const songs = await playService.getRecentHistory(req.user.id);
      res.status(200).json({ recent_songs: songs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
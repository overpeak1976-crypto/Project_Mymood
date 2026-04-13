import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { likeService } from '../services/likeService';

export const likeController = {
  async toggleLike(req: AuthRequest, res: Response) {
    try {
      const { song_id } = req.body;
      const result = await likeService.toggleLike(req.user.id, song_id);
      if (result.isLiked) {
        return res.status(201).json({ message: 'เพิ่มเข้าเพลงที่ถูกใจแล้ว ❤️', isLiked: true });
      } else {
        return res.status(200).json({ message: 'ยกเลิกถูกใจเพลงแล้ว 💔', isLiked: false });
      }
    } catch (error: any) {
      const status = error.message.includes('song_id') ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  async getMyLikedSongs(req: AuthRequest, res: Response) {
    try {
      const likedSongs = await likeService.getMyLikedSongs(req.user.id);
      res.status(200).json({
        message: 'ดึงข้อมูลเพลงที่ถูกใจสำเร็จ',
        total: likedSongs.length,
        liked_songs: likedSongs,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
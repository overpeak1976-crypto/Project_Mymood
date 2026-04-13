import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { playlistService } from '../services/playlistService';

export const playlistController = {
  async getMyPlaylists(req: AuthRequest, res: Response) {
    try {
      const playlists = await playlistService.getMyPlaylists(req.user.id);
      res.status(200).json({ playlists });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async createPlaylist(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;
      const playlist = await playlistService.createPlaylist(req.user.id, name, description);
      res.status(201).json({ message: 'สร้างเพลย์ลิสต์สำเร็จ!', playlist });
    } catch (error: any) {
      const status = error.message.includes('ห้ามว่าง') ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  async addTrack(req: AuthRequest, res: Response) {
    try {
      const playlistId = req.params.playlistId as string;
      const { song_id } = req.body;
      await playlistService.addTrack(req.user.id, playlistId, song_id);
      res.status(201).json({ message: 'เพิ่มเพลงเข้าเพลย์ลิสต์สำเร็จ! 🎵' });
    } catch (error: any) {
      const status = error.message.includes('สิทธิ์') || error.message.includes('song_id') ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  },
};

import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { aiPlaylistService } from '../services/aiPlaylistService';

export const aiPlaylistController = {
  async generatePlaylist(req: Request, res: Response) {
    try {
      const { prompt, limit, excludeIds } = req.body;
      const parsedLimit = limit ? parseInt(limit, 5) : 5;
      const parsedExcludeIds = Array.isArray(excludeIds) ? excludeIds : [];

      const result = await aiPlaylistService.generatePlaylist(prompt, parsedLimit, parsedExcludeIds);

      if (!result.songs || result.songs.length === 0) {
        return res.status(200).json({ message: 'ไม่พบเพลงที่ตรงกับอารมณ์นี้ในระบบ', songs: [] });
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error('🚨 Generate Playlist Error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async savePlaylist(req: AuthRequest, res: Response) {
    try {
      const { name, description, cover_image_url, song_ids } = req.body;
      const playlist = await aiPlaylistService.savePlaylist(
        req.user.id, name, description || null, cover_image_url || null, song_ids,
      );
      res.status(201).json({ message: 'บันทึกเพลย์ลิสต์ลงคลังส่วนตัวสำเร็จ!', playlist });
    } catch (error: any) {
      console.error('🚨 Save Playlist Error:', error);
      const status = error.message.includes('ข้อมูลไม่ครบ') ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  async getMyPlaylists(req: AuthRequest, res: Response) {
    try {
      const playlists = await aiPlaylistService.getMyPlaylists(req.user.id);
      res.status(200).json({
        message: 'ดึงข้อมูลเพลย์ลิสต์สำเร็จ!',
        total: playlists.length,
        playlists,
      });
    } catch (error: any) {
      console.error('🚨 Get My Playlists Error:', error);
      res.status(500).json({ error: error.message });
    }
  },
};
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { playlistService } from '../services/playlistService';
import { uploadService } from '../services/uploadService';

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
      let coverImageUrl: string | null = null;
      if (req.file) {
        coverImageUrl = await uploadService.uploadImage(req.file.path);
      }
      const playlist = await playlistService.createPlaylist(req.user.id, name, description, coverImageUrl);
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

  async getPlaylistById(req: AuthRequest, res: Response) {
    try {
      const playlistId = req.params.playlistId as string;
      const playlist = await playlistService.getPlaylistById(req.user.id, playlistId);
      res.status(200).json({ playlist });
    } catch (error: any) {
      const status = error.message.includes('ไม่พบ') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  async removeTrack(req: AuthRequest, res: Response) {
    try {
      const playlistId = req.params.playlistId as string;
      const trackId = req.params.trackId as string;
      await playlistService.removeTrack(req.user.id, playlistId, trackId);
      res.status(200).json({ message: 'ลบเพลงออกจากเพลย์ลิสต์สำเร็จ' });
    } catch (error: any) {
      const status = error.message.includes('สิทธิ์') ? 403 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  async deletePlaylist(req: AuthRequest, res: Response) {
    try {
      const playlistId = req.params.playlistId as string;
      await playlistService.deletePlaylist(req.user.id, playlistId);
      res.status(200).json({ message: 'ลบเพลย์ลิสต์สำเร็จ' });
    } catch (error: any) {
      const status = error.message.includes('สิทธิ์') ? 403 : 500;
      res.status(status).json({ error: error.message });
    }
  },
};

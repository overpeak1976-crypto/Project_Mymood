import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { adminService } from '../../services/adminService';

export const adminSongController = {
  async getAllSongs(req: AuthRequest, res: Response) {
    try {
      const data = await adminService.getAllSongs();
      if (data && data.length > 0) {
        console.log('📦 First song data from DB:', data[0]);
      }
      res.status(200).json(data);
    } catch (error: any) {
      console.error('🚨 ERROR [getAllSongs]:', error.message);
      res.status(500).json({ error: error.message });
    }
  },

  async deleteSong(req: AuthRequest, res: Response) {
    try {
      const songId = req.params.songId as string;
      await adminService.deleteSong(songId);
      res.status(200).json({ message: 'ลบเพลงและไฟล์จาก Cloudinary เรียบร้อยแล้ว!' });
    } catch (error: any) {
      console.error('🚨 Admin Delete Song Error:', error);
      const status = error.message.includes('ไม่พบ') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },
};
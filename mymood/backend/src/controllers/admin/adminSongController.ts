import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { adminService } from '../../services/adminService';
import { songService } from '../../services/songService';
import * as mm from 'music-metadata';

export const adminSongController = {
  async getAllSongs(req: AuthRequest, res: Response) {
    try {
      const data = await adminService.getAllSongs();
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

  async toggleVisibility(req: AuthRequest, res: Response) {
    try {
      const songId = req.params.songId as string;
      const { is_public } = req.body;
      await adminService.toggleSongVisibility(songId, is_public);
      res.status(200).json({ message: is_public ? 'แสดงเพลงแล้ว' : 'ซ่อนเพลงแล้ว' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async uploadSong(req: AuthRequest, res: Response) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    try {
      const { title, artist, album, is_public } = req.body;
      const isPublic = is_public === 'false' ? false : true;

      if (!files || !files['audio']) {
        return res.status(400).json({ error: 'ไม่พบไฟล์เพลง กรุณาแนบไฟล์ .mp3' });
      }
      if (!files['cover_image']) {
        return res.status(400).json({ error: 'กรุณาแนบรูปปกเพลง' });
      }

      const audioFile = files['audio'][0];
      const coverImageFile = files['cover_image'][0];

      const metadata = await mm.parseFile(audioFile.path);
      const durationSeconds = Math.round(metadata.format.duration || 0);

      const song = await songService.uploadSong(
        req.user.id,
        title,
        artist,
        album || null,
        audioFile.path,
        coverImageFile.path,
        durationSeconds,
        isPublic,
      );

      res.status(201).json({ message: 'อัปโหลดเพลงสำเร็จ!', song });
    } catch (error: any) {
      console.error('🚨 Admin Upload Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      songService.cleanupTempFiles(files);
    }
  },
};
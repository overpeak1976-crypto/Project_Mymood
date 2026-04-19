import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { songService } from '../services/songService';
import * as mm from 'music-metadata';

export const songController = {
  async getAllSongs(req: Request, res: Response) {
    try {
      const sort = req.query.sort as string | undefined;
      const limit = parseInt(req.query.limit as string) || 10;

      if (sort === 'popular') {
        const data = await songService.getPopularSongs(limit);
        res.status(200).json(data);
      } else {
        const data = await songService.getAllSongs();
        res.status(200).json(data);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getMyUploads(req: AuthRequest, res: Response) {
    try {
      const data = await songService.getMyUploads(req.user.id);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getFriendsUploads(req: AuthRequest, res: Response) {
    try {
      const data = await songService.getFriendsUploads(req.user.id);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getMyTopSongs(req: AuthRequest, res: Response) {
    try {
      const data = await songService.getMyTopSongs(req.user.id);
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async uploadSong(req: AuthRequest, res: Response) {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    try {
      const { title, artist, is_public } = req.body;
      const albumName = req.body.album || null;
      const isPublic = is_public === 'false' ? false : true;

      if (!files || !files['audio']) {
        return res.status(400).json({ error: 'ไม่พบไฟล์เพลง กรุณาแนบไฟล์ .mp3 มาด้วยครับ' });
      }
      if (!files['cover_image']) {
        return res.status(400).json({ error: 'กรุณาแนบรูปปกเพลงมาด้วยครับ' });
      }

      const audioFile = files['audio'][0];
      const coverImageFile = files['cover_image'][0];

      const metadata = await mm.parseFile(audioFile.path);
      const durationSeconds = Math.round(metadata.format.duration || 0);

      const song = await songService.uploadSong(
        req.user.id,
        title,
        artist,
        albumName,
        audioFile.path,
        coverImageFile.path,
        durationSeconds,
        isPublic,
      );

      res.status(201).json({ message: 'อัปโหลดเพลง รูปปก และสร้าง AI Vector สำเร็จ!', song });
    } catch (error: any) {
      console.error('🚨 Upload Route Error:', error);
      res.status(500).json({ error: error.message });
    } finally {
      songService.cleanupTempFiles(files);
    }
  },

  async searchSongsByAI(req: AuthRequest, res: Response) {
    try {
      const { prompt } = req.body;
      const songs = await songService.searchSongsByAI(prompt);

      if (!songs || songs.length === 0) {
        return res.status(200).json({ message: 'ไม่พบเพลงที่ตรงกับอารมณ์นี้', songs: [] });
      }
      res.status(200).json({ message: 'ค้นหาสำเร็จ!', songs });
    } catch (error: any) {
      console.error('🚨 Search AI Error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async reanalyzeSong(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await songService.reanalyzeSong(id);
      res.status(200).json({ message: 'อัปเดตข้อมูล AI สำเร็จ!', genre: result.genre });
    } catch (error: any) {
      console.error('❌ Reanalyze Error:', error);
      const status = error.message === 'ไม่พบข้อมูลเพลง' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },
};

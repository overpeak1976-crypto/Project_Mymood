import { Response } from 'express';
import { supabase } from '../../../src/config/supabase';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const adminSongController = {
  // ดึงรายชื่อเพลงทั้งหมดแบบละเอียด
  async getAllSongs(req: AuthRequest, res: Response) {
    try {
      const { data, error } = await supabase
        .from('songs')
        .select(`
          id, title, artist, cover_image_url, audio_file_url, created_at,
          users!songs_uploaded_by_fkey (username, handle)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error (getAllSongs):", error);
        throw error;
      }

      const formattedSongs = data.map((song: any) => ({
        ...song,
        uploader: song.users
      }));

      res.status(200).json(formattedSongs);
    } catch (error: any) {
      console.error("🚨 ERROR [getAllSongs]:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  // ลบเพลงออกจากระบบ
  async deleteSong(req: AuthRequest, res: Response) {
    try {
      const { songId } = req.params;

      const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (error) throw error;
      
      res.status(200).json({ message: "ลบเพลงออกจากระบบเรียบร้อยแล้ว" });
    } catch (error: any) {
      console.error("🚨 Admin Delete Song Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};
import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const adminController = {
  // 1. ดึงสถิติรวมของแอป
  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const { count: userCount, error: userError } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: songCount, error: songError } = await supabase.from('songs').select('*', { count: 'exact', head: true });
      const { count: shareCount, error: shareError } = await supabase.from('shared_inbox').select('*', { count: 'exact', head: true });

      if (userError) console.error("User Error:", userError);
      if (songError) console.error("Song Error:", songError);
      if (shareError) console.error("Share Error:", shareError);

      if (userError || songError || shareError) {
        throw new Error("เกิดข้อผิดพลาดในการดึงสถิติจากตาราง");
      }

      res.status(200).json({
        total_users: userCount || 0,
        total_songs: songCount || 0,
        total_shares: shareCount || 0
      });
    } catch (error: any) {
      console.error("🚨 Admin Stats Error:", error); // <--- เพิ่มบรรทัดนี้ให้มันปริ้นท์บอกเรา
      res.status(500).json({ error: error.message });
    }
  },

  // 2. ลบเพลงออกจากระบบ (Admin Only)
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
      res.status(500).json({ error: error.message });
    }
  },
  // 3. ดึงรายชื่อผู้ใช้ทั้งหมด
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, handle, email, created_at, profile_image_url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 4. ดึงรายชื่อเพลงทั้งหมดแบบละเอียด
  async getAllSongs(req: AuthRequest, res: Response) {
    try {
      // ชี้เป้าไปที่ songs_uploaded_by_fkey ตามที่ Error แนะนำเป๊ะๆ
      const { data, error } = await supabase.from('songs').select(`
        id, title, artist, cover_image_url, audio_file_url, created_at,
        users!songs_uploaded_by_fkey (username, handle)
      `).order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error (getAllSongs):", error);
        throw error;
      }

      // แปลงชื่อ object จาก 'users' เป็น 'uploader' เพื่อให้หน้า Frontend ใช้งานต่อได้
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
};
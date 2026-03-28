import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';
import { cloudinaryService } from '../services/cloudinaryService';

export const adminController = {
  // 1. ดึงสถิติรวมของแอป
  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // 2. Query ดึงข้อมูลจาก Supabase
      const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: totalSongs } = await supabase.from('songs').select('*', { count: 'exact', head: true });

      // 🌟 3. ข้อมูลใหม่ที่คุณขอมา
      const { count: onlineUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_online', true);
      const { count: todayNewUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO);
      const { count: todayActiveUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_active', todayISO);

      // 4. ส่งกลับไปให้ React
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
        total_shares: shareCount || 0,
        online_users: onlineUsers || 0,
        today_new_users: todayNewUsers || 0,
        today_active_users: todayActiveUsers || 0
      });
    } catch (error: any) {
      console.error("🚨 Admin Stats Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 2. ลบเพลงออกจากระบบ (Admin Only)
  async deleteSong(req: AuthRequest, res: Response) {
    try {
      const { songId } = req.params;

      // 1. ค้นหาเพลงนี้ก่อนเพื่อเอา URL ของรูปและเสียง
      const { data: song, error: fetchError } = await supabase
        .from('songs')
        .select('audio_file_url, cover_image_url')
        .eq('id', songId)
        .single();

      if (fetchError || !song) throw new Error("ไม่พบข้อมูลเพลงนี้ในระบบ");

      // 2. สั่งลบไฟล์จริงใน Cloudinary ก่อน
      if (song.audio_file_url) {
        await cloudinaryService.deleteFile(song.audio_file_url, 'video'); 
      }
      if (song.cover_image_url) {
        await cloudinaryService.deleteFile(song.cover_image_url, 'image');
      }

      // 🌟 3. ลบข้อมูลในตารางลูก (Vectors) ก่อน! ไม่งั้น Supabase จะบล็อกการลบเพลง
      await supabase.from('song_vectors').delete().eq('song_id', songId);

      // (ถ้าคุณมีตารางอื่นๆ ที่ผูกกับเพลง เช่น play_history, likes ให้สั่งลบตรงนี้เพิ่มด้วยนะครับ)

      // 4. ค่อยลบข้อมูลเพลงหลัก
      const { error: deleteError } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

      if (deleteError) throw deleteError;
      
      res.status(200).json({ message: "ลบเพลงและไฟล์จาก Cloudinary เรียบร้อยแล้ว!" });
    } catch (error: any) {
      console.error("🚨 Admin Delete Song Error:", error);
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
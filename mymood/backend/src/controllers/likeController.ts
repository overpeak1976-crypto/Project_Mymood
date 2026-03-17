import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const likeController = {
  // 1. กด Like / ยกเลิก Like (Toggle)
  async toggleLike(req: AuthRequest, res: Response) {
    try {
      const user_id = req.user.id;
      const { song_id } = req.body;

      if (!song_id) {
        return res.status(400).json({ error: "กรุณาส่ง song_id มาด้วยครับ" });
      }

      // เช็คว่าเคยกดถูกใจเพลงนี้ไปหรือยัง?
      const { data: existingLike, error: checkError } = await supabase
        .from('liked_songs')
        .select('*')
        .eq('user_id', user_id)
        .eq('song_id', song_id)
        .maybeSingle(); // ใช้ maybeSingle เพื่อไม่ให้มันเด้ง Error ถ้าหาไม่เจอ

      if (checkError) throw checkError;

      if (existingLike) {
        // 💔 ถ้าเคย Like แล้ว -> ให้ดึงหัวใจออก (Unlike)
        const { error: deleteError } = await supabase
          .from('liked_songs')
          .delete()
          .eq('user_id', user_id)
          .eq('song_id', song_id);
          
        if (deleteError) throw deleteError;
        return res.status(200).json({ message: "ยกเลิกถูกใจเพลงแล้ว 💔", isLiked: false });
      } else {
        // ❤️ ถ้ายังไม่เคย Like -> ให้บันทึกการกดหัวใจ
        const { error: insertError } = await supabase
          .from('liked_songs')
          .insert([{ user_id, song_id }]);
          
        if (insertError) throw insertError;
        return res.status(201).json({ message: "เพิ่มเข้าเพลงที่ถูกใจแล้ว ❤️", isLiked: true });
      }
    } catch (error: any) {
      console.error("🚨 Toggle Like Error:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // 2. ดึงรายการเพลงที่ฉันถูกใจทั้งหมด (เอาไปโชว์ในหน้า Library)
  async getMyLikedSongs(req: AuthRequest, res: Response) {
    try {
      const user_id = req.user.id;

      // ใช้ Relational Query ดึงข้ามตาราง (เอาข้อมูลเพลงมาด้วย)
      const { data: likedSongs, error } = await supabase
        .from('liked_songs')
        .select(`
          created_at,
          songs (
            id,
            title,
            artist,
            cover_image_url,
            audio_file_url,
            duration_seconds
          )
        `)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false }); // เพลงที่เพิ่งกดไลก์ให้อยู่บนสุด

      if (error) throw error;

      res.status(200).json({ 
        message: "ดึงข้อมูลเพลงที่ถูกใจสำเร็จ", 
        total: likedSongs.length,
        liked_songs: likedSongs 
      });
    } catch (error: any) {
      console.error("🚨 Get Liked Songs Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};
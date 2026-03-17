import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const playController = {
  // ฟังก์ชันนี้แอปมือถือจะยิงมาหาตอนที่ผู้ใช้กด "Play" เพลง
  async recordPlay(req: AuthRequest, res: Response) {
    try {
      const user_id = req.user.id;
      const { song_id } = req.params; // รับ ID เพลงมาจาก URL

      console.log(`🎧 ผู้ใช้กำลังฟังเพลง ID: ${song_id}`);

      // 1. บันทึกประวัติการฟังลงตาราง play_history
      const { error: historyError } = await supabase
        .from('play_history')
        .insert([{ user_id, song_id }]);
        
      if (historyError) throw historyError;

      // 2. ดึงค่ายอดวิวปัจจุบันมาดู
      const { data: song, error: fetchError } = await supabase
        .from('songs')
        .select('play_count')
        .eq('id', song_id)
        .single();

      if (fetchError) throw fetchError;

      // 3. บวกยอดวิวเพิ่ม 1 แล้วเซฟกลับลงไป
      const newCount = (song.play_count || 0) + 1;
      const { error: updateError } = await supabase
        .from('songs')
        .update({ play_count: newCount })
        .eq('id', song_id);

      if (updateError) throw updateError;

      res.status(200).json({ 
        message: "บันทึกประวัติและบวกยอดวิวสำเร็จ!", 
        current_views: newCount 
      });

    } catch (error: any) {
      console.error("🚨 Record Play Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};
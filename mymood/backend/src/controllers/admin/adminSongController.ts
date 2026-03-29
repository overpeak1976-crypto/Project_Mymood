import { Response } from 'express';
import { supabase } from '../../../src/config/supabase';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { cloudinaryService } from '../../services/cloudinaryService';
export const adminSongController = {
  // ดึงรายชื่อเพลงทั้งหมดแบบละเอียด
   async getAllSongs(req: AuthRequest, res: Response) {
    try {
      // 1. ดึงทุกคอลัมน์ (*) และดึง handle ของคนอัปโหลดมาด้วย
      const { data, error } = await supabase
        .from('songs')
        .select(`*, uploader:uploaded_by(handle)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error (getAllSongs):", error);
        throw error;
      }
      res.status(200).json(data);
    } catch (error: any) {
      console.error("🚨 ERROR [getAllSongs]:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  // ลบเพลงออกจากระบบ
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
  }
};
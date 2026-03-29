import { Response } from 'express';
import { supabase } from '../../../src/config/supabase';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const adminUserController = {
  // ดึงรายชื่อผู้ใช้ทั้งหมด
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, handle, email, created_at, profile_image_url')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.status(200).json(data);
    } catch (error: any) {
      console.error("🚨 Admin Users Error:", error);
      res.status(500).json({ error: error.message });
    }
  },
  async sendMessageToUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params; // ID ของผู้ใช้ที่แอดมินจะส่งข้อความหา
      const { title, message } = req.body;

      if (!message) return res.status(400).json({ error: "กรุณาพิมพ์ข้อความด้วยครับ" });

      // บันทึกลงตาราง notifications
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: id,
          title: title || '📢 ประกาศจากผู้ดูแลระบบ',
          message: message,
          type: 'admin_notice', // ระบุว่าเป็นประกาศจากแอดมิน
          is_read: false
        }]);

      if (error) throw error;

      res.status(200).json({ message: "ส่งข้อความหาผู้ใช้สำเร็จ!" });
    } catch (error: any) {
      console.error("❌ Send Message Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};
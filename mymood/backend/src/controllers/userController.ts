import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const userController = {
  // 1. ค้นหาผู้ใช้ด้วย Handle
  async searchByHandle(req: AuthRequest, res: Response) {
    try {
      const { handle } = req.params;

      // ค้นหาโดยใช้ ilike เพื่อให้พิมพ์แค่บางส่วนก็เจอ และไม่สนตัวพิมพ์เล็กใหญ่
      const { data, error } = await supabase
        .from('users')
        .select('id, username, handle, profile_image_url')
        .ilike('handle', `%${handle}%`)
        .limit(10); // จำกัดแค่ 10 คนป้องกันเซิร์ฟเวอร์โหลด

      if (error) throw error;
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 2. ส่งคำขอเป็นเพื่อน
  async addFriend(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id; // ดึง ID ของเราจาก Token
      const { targetUserId } = req.body; // ID ของคนที่เราจะแอด

      if (myId === targetUserId) {
        return res.status(400).json({ error: "แอดตัวเองเป็นเพื่อนไม่ได้นะครับ" });
      }

      // บันทึกลงตาราง friendships
      const { data, error } = await supabase
        .from('friendships')
        .insert([{ user_id: myId, friend_id: targetUserId, status: 'pending' }])
        .select()
        .single();

      if (error) {
        // เช็คเผื่อกรณีแอดซ้ำ
        if (error.code === '23505') return res.status(400).json({ error: "ส่งคำขอไปแล้ว หรือเป็นเพื่อนกันอยู่แล้ว" });
        throw error;
      }

      res.status(201).json({ message: "ส่งคำขอแอดเพื่อนเรียบร้อย!", friendship: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 3. กดยอมรับเพื่อน (Accept Friend)
  async acceptFriend(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id; // ID ของเรา (จาก Token)
      const { senderId } = req.body; // ID ของคนที่แอดเรามา

      // อัปเดตสถานะเป็น accepted
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .match({ user_id: senderId, friend_id: myId }) // เงื่อนไข: เขาเป็นคนส่ง (user_id) เราเป็นคนรับ (friend_id)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ message: "เป็นเพื่อนกันเรียบร้อย!", friendship: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
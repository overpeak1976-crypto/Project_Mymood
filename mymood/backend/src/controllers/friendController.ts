import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const friendController = {
  // ดึงรายชื่อเพื่อนที่ accept แล้วทั้งหมด
  async getMyFriends(req: AuthRequest, res: Response) {
    try {
      const my_id = req.user.id;

      // ค้นหาในตาราง friendships ว่าเราเป็นเพื่อนกับใครบ้าง (ทั้งฝั่งคนขอ และคนรับ)
      const { data: friends, error } = await supabase
        .from('friendships')
        .select(`
          status,
          user_id,
          friend_id
        `)
        .eq('status', 'accepted')
        .or(`user_id.eq.${my_id},friend_id.eq.${my_id}`);

      if (error) throw error;

      res.status(200).json({ 
        message: "ดึงรายชื่อเพื่อนสำเร็จ", 
        friends 
      });

    } catch (error: any) {
      console.error("🚨 Get Friends Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
};
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
  }
};
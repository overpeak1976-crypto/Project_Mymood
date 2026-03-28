import { Response } from 'express';
import { supabase } from '../../../src/config/supabase';
import { AuthRequest } from '../../middlewares/authMiddleware';

export const adminStatsController = {
  // ดึงสถิติรวมของแอป
  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // ดึงข้อมูลพื้นฐาน (จำนวน Users, Songs, Shares)
      const { count: userCount, error: userError } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: songCount, error: songError } = await supabase.from('songs').select('*', { count: 'exact', head: true });
      const { count: shareCount, error: shareError } = await supabase.from('shared_inbox').select('*', { count: 'exact', head: true });

      // ดึงข้อมูลรายวันและออนไลน์
      const { count: onlineUsers, error: onlineError } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_online', true);
      const { count: todayNewUsers, error: todayNewError } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayISO);
      const { count: todayActiveUsers, error: todayActiveError } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_active', todayISO);

      // Check Errors
      if (userError || songError || shareError || onlineError || todayNewError || todayActiveError) {
        console.error("Supabase Error:", { userError, songError, shareError });
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
  }
};
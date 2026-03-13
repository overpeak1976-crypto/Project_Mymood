import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const inboxController = {
  // 1. ส่งเพลงเข้า Inbox เพื่อน
  async shareSong(req: AuthRequest, res: Response) {
    try {
      const senderId = req.user.id;
      const { receiverId, songId, message } = req.body;

      const { data, error } = await supabase
        .from('shared_inbox')
        .insert([{ 
          sender_id: senderId, 
          receiver_id: receiverId, 
          song_id: songId, 
          message: message || null 
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ message: "ส่งเพลงให้เพื่อนสำเร็จ!", inbox: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 2. ดูเพลงที่เพื่อนส่งมาให้เรา (My Inbox)
  async getMyInbox(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;

      const { data, error } = await supabase
        .from('shared_inbox')
        .select(`
          id, message, status, created_at,
          sender:users!shared_inbox_sender_id_fkey(username, handle),
          song:songs(title, artist, cover_image_url)
        `)
        .eq('receiver_id', myId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const userController = {
  async searchByHandle(req: AuthRequest, res: Response) {
    try {
      const { handle } = req.params;
      const { data, error } = await supabase
        .from('users')
        .select('id, username, handle, profile_image_url')
        .ilike('handle', `%${handle}%`)
        .limit(10); 
      if (error) throw error;
      res.status(200).json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async addFriend(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;
      const { targetUserId } = req.body;

      if (myId === targetUserId) {
        return res.status(400).json({ error: "แอดตัวเองเป็นเพื่อนไม่ได้นะครับ" });
      }
      const { data, error } = await supabase
        .from('friendships')
        .insert([{ user_id: myId, friend_id: targetUserId, status: 'pending' }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: "ส่งคำขอไปแล้ว หรือเป็นเพื่อนกันอยู่แล้ว" });
        throw error;
      }

      res.status(201).json({ message: "ส่งคำขอแอดเพื่อนเรียบร้อย!", friendship: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async acceptFriend(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id; 
      const { senderId } = req.body; 
      const { data, error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .match({ user_id: senderId, friend_id: myId }) 
        .select()
        .single();

      if (error) throw error;
      
      await supabase
        .from('friendships')
        .delete()
        .match({ user_id: myId, friend_id: senderId, status: 'pending' });

      res.status(200).json({ message: "เป็นเพื่อนกันเรียบร้อย!", friendship: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
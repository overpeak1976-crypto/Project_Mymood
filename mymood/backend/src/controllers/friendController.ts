import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middlewares/authMiddleware';

export const friendController = {
  
async getMyFriends(req: AuthRequest, res: Response) {
    try {
      const my_id = req.user.id;
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select(`
          user_id, friend_id,
          user:users!user_id(id, username, handle, profile_image_url, is_online),
          friend:users!friend_id(id, username, handle, profile_image_url, is_online)
        `)
        .eq('status', 'accepted')
        .or(`user_id.eq.${my_id},friend_id.eq.${my_id}`);

      if (error) {
        console.error("🚨 Supabase Error (Get Friends):", error.message);
        throw error;
      }

      const formattedFriends = friendships.map((f: any) => {
        const isSender = f.user_id === my_id;
        return isSender ? f.friend : f.user; 
      });

      res.status(200).json({ message: "ดึงรายชื่อเพื่อนสำเร็จ", friends: formattedFriends });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getPendingRequests(req: AuthRequest, res: Response) {
    try {
      const my_id = req.user.id;
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user_id, friend_id, 
          sender:users!user_id(id, username, handle, profile_image_url) 
        `)
        .eq('friend_id', my_id)
        .eq('status', 'pending');

      if (error) {
        console.error("🚨 Supabase Error (Pending):", error.message);
        throw error;
      }

      const formattedRequests = data.map((req: any) => ({
        senderId: req.user_id,
        sender: req.sender
      }));

      res.status(200).json({ requests: formattedRequests });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getSentRequests(req: AuthRequest, res: Response) {
    try {
      const my_id = req.user.id;
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          user_id, friend_id, 
          receiver:users!friend_id(id, username, handle, profile_image_url)
        `) 
        .eq('user_id', my_id)
        .eq('status', 'pending');

      if (error) {
        console.error("🚨 Supabase Error (Sent):", error.message);
        throw error;
      }
      const formattedSent = data.map((req: any) => ({
        receiverId: req.friend_id, 
        receiver: req.receiver 
      }));

      res.status(200).json({ sent_requests: formattedSent });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async rejectOrCancelRequest(req: AuthRequest, res: Response) {
    try {
      const myId = req.user.id;
      const { targetId } = req.params; 
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${targetId},friend_id.eq.${myId}),and(user_id.eq.${myId},friend_id.eq.${targetId})`);

      if (error) throw error;
      res.status(200).json({ message: "ลบคำขอสำเร็จ" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
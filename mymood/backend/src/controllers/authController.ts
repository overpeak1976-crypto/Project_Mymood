import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

// 1. ฟังก์ชันรับข้อมูลจาก Google Login
export const googleSync = async (req: Request, res: Response) => {
  const { id, email, username, profile_image_url } = req.body;
  
  try {
    const handle = username ? username.toLowerCase().replace(/[^a-z0-9]/g, '') : email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const { data, error } = await supabase
      .from('users')
      .upsert({ 
        id, 
        email, 
        username, 
        handle,
        password_hash: "google_oauth_managed",
        profile_image_url,
        last_active: new Date()
      })
      .select().single();

    if (error) throw error;
    res.json({ message: "Sync Success", user: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 🌟 2. ฟังก์ชันรับข้อมูลจากหน้าสมัครสมาชิก (Email/Password)
export const syncUser = async (req: Request, res: Response) => {
  const { id, email, username } = req.body;
  
  try {
    const handle = username ? username.toLowerCase().replace(/[^a-z0-9]/g, '') : email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const { data, error } = await supabase
      .from('users')
      .upsert({ 
        id: id, 
        email: email, 
        username: username,
        handle: handle,
        password_hash: "supabase_managed",
        is_online: true,
        last_active: new Date()
      })
      .select().single();

    if (error) throw error;
    res.status(200).json({ message: "Sync Profile Success", user: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
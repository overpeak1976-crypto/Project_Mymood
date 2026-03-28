import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

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
        is_online: true,
        last_active: new Date()
      })
      .select().single();

    if (error) throw error;
    res.json({ message: "Sync Success", user: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

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

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่านให้ครบ" });
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
      return;
    }
    await supabase
      .from('users')
      .update({ is_online: true, last_active: new Date() })
      .eq('id', data.user.id);
    res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      access_token: data.session.access_token,
      user: data.user
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
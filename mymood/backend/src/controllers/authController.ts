import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// คีย์ลับสำหรับสร้าง Token (ในของจริงควรเอาไปใส่ใน .env)
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_mymood_key_2026';

export const authController = {
  // 1. สมัครสมาชิก (Register)
  async register(req: Request, res: Response) {
    try {
      const { email, password, username, handle } = req.body;

      // เช็คก่อนว่ามีใครใช้ @handle นี้ไปหรือยัง
      const { data: existingUser } = await supabase
        .from('users')
        .select('handle')
        .eq('handle', handle.toLowerCase())
        .single();

      if (existingUser) {
        return res.status(400).json({ error: "Handle นี้มีคนใช้ไปแล้วครับ ลองเปลี่ยนใหม่นะ" });
      }

      // เข้ารหัสผ่าน (Hashing) เพื่อความปลอดภัย
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // บันทึกข้อมูลลงฐานข้อมูล
      const { data, error } = await supabase
        .from('users')
        .insert([{ 
          email, 
          username, 
          handle: handle.toLowerCase(), 
          password_hash 
        }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ message: "สมัครสมาชิกสำเร็จ!", user: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // 2. เข้าสู่ระบบ (Login)
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // ค้นหาผู้ใช้จากอีเมล
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!user || error) {
        return res.status(400).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
      }

      // ตรวจสอบรหัสผ่านว่าตรงกันไหม
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
      }

      // ถ้ารหัสถูก สร้างบัตรผ่าน (JWT Token) ให้ไปใช้งานต่อ
      const token = jwt.sign({ id: user.id, handle: user.handle }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ 
        message: "เข้าสู่ระบบสำเร็จ", 
        token, 
        user: { id: user.id, username: user.username, handle: user.handle, profile_image_url: user.profile_image_url } 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
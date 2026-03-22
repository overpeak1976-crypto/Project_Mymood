import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_mymood_key_2026';

export interface AuthRequest extends Request {
  user?: any;
}
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Access denied. ต้องเข้าสู่ระบบก่อนครับ' });
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (user && !error) {
      req.user = user; 
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next(); 
  } catch (error) {
    res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};

export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.sub; 

    if (!userId) {
      res.status(401).json({ error: 'ไม่พบข้อมูลผู้ใช้งาน' });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'ไม่พบผู้ใช้งานในระบบ' });
      return;
    }

    if (data.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: คุณไม่มีสิทธิ์เข้าถึง (Admin Only)' });
      return;
    }
    next();
  } catch (error) {
    console.error("isAdmin Middleware Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
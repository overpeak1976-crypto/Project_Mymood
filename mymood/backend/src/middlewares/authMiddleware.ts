import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_mymood_key_2026';

// สร้าง Interface เพื่อให้ TypeScript รู้จัก req.user
export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // ดึง Token จาก Header ที่ชื่อ Authorization
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Access denied. ต้องเข้าสู่ระบบก่อนครับ' });
    return;
  }

  try {
    // ถอดรหัส Token เพื่อดึงข้อมูล user id และ handle
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next(); // อนุญาตให้ไปทำงานฟังก์ชันถัดไปได้
  } catch (error) {
    res.status(400).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
};
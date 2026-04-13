import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const googleSync = async (req: Request, res: Response) => {
  const { id, email, username, profile_image_url } = req.body;
  try {
    const user = await authService.googleSync(id, email, username, profile_image_url);
    res.json({ message: 'Sync Success', user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const syncUser = async (req: Request, res: Response) => {
  const { id, email, username } = req.body;
  try {
    const user = await authService.syncUser(id, email, username);
    res.status(200).json({ message: 'Sync Profile Success', user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบ' });
    return;
  }

  try {
    const result = await authService.login(email, password);
    res.status(200).json({
      message: 'เข้าสู่ระบบสำเร็จ',
      access_token: result.access_token,
      user: result.user,
    });
  } catch (error: any) {
    const status = error.message === 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' ? 401 : 500;
    res.status(status).json({ error: error.message });
  }
};
import { Response } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { adminService } from '../../services/adminService';

export const adminUserController = {
  async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const data = await adminService.getAllUsers();
      res.status(200).json(data);
    } catch (error: any) {
      console.error('🚨 Admin Users Error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  async sendMessageToUser(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { title, message } = req.body;
      await adminService.sendMessageToUser(id, title, message);
      res.status(200).json({ message: 'ส่งข้อความหาผู้ใช้สำเร็จ!' });
    } catch (error: any) {
      console.error('❌ Send Message Error:', error);
      const status = error.message.includes('กรุณาพิมพ์') ? 400 : 500;
      res.status(status).json({ error: error.message });
    }
  },
};
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

  async getUserDetail(req: AuthRequest, res: Response) {
    try {
      const data = await adminService.getUserDetail(req.params.id as string);
      res.status(200).json(data);
    } catch (error: any) {
      const status = error.message.includes('ไม่พบ') ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  async updateUserRole(req: AuthRequest, res: Response) {
    try {
      const { role } = req.body;
      await adminService.updateUserRole(req.params.id as string, role);
      res.status(200).json({ message: 'อัปเดตสิทธิ์สำเร็จ' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async clearUserProfileImage(req: AuthRequest, res: Response) {
    try {
      await adminService.clearUserProfileImage(req.params.id as string);
      res.status(200).json({ message: 'ลบรูปโปรไฟล์สำเร็จ' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async clearUserBannerImage(req: AuthRequest, res: Response) {
    try {
      await adminService.clearUserBannerImage(req.params.id as string);
      res.status(200).json({ message: 'ลบแบนเนอร์สำเร็จ' });
    } catch (error: any) {
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
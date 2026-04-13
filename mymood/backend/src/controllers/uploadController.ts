import { Request, Response } from 'express';
import { uploadService } from '../services/uploadService';

export const uploadController = {
  async uploadImageAPI(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'ไม่พบไฟล์รูปภาพ กรุณาอัปโหลดไฟล์' });
      }
      const image_url = await uploadService.uploadImage(req.file.path);
      res.status(200).json({ message: 'อัปโหลดรูปลง Cloudinary สำเร็จ!', image_url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};
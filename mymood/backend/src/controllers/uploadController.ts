import { Request, Response } from 'express';
import { cloudinaryService } from '../services/cloudinaryService';

export const uploadController = {
  async uploadImageAPI(req: Request, res: Response) {
    try {
      // req.file คือไฟล์รูปที่ Multer จับดักไว้ให้
      if (!req.file) {
        return res.status(400).json({ error: "ไม่พบไฟล์รูปภาพ กรุณาอัปโหลดไฟล์" });
      }

      console.log(`☁️ กำลังส่งรูปภาพขึ้น Cloudinary...`);
      
      // ส่งพาทไฟล์ (เช่น uploads/my_cover.jpg) ไปให้ Cloudinary Service
      const imageUrl = await cloudinaryService.uploadImage(req.file.path, 'mymood_covers');

      console.log(`✅ อัปโหลดรูปสำเร็จ! URL: ${imageUrl}`);
      
      // ส่ง URL กลับไปให้แอปมือถือเอาไปใช้งานต่อ
      res.status(200).json({ 
        message: "อัปโหลดรูปลง Cloudinary สำเร็จ!", 
        image_url: imageUrl 
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
};
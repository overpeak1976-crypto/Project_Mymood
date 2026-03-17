import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ตั้งค่าการเชื่อมต่อ
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const cloudinaryService = {
  // ฟังก์ชันรับไฟล์จากเครื่องเรา โยนขึ้น Cloudinary
  async uploadImage(filePath: string, folder: string = 'mymood_uploads'): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder, // จัดเก็บเป็นโฟลเดอร์ให้เป็นระเบียบ
        resource_type: 'image'
      });
      
      // พอส่งขึ้นเมฆเสร็จ ก็ลบไฟล์ขยะในเครื่องเราทิ้งเลย เซิร์ฟเวอร์จะได้ไม่หนัก
      fs.unlinkSync(filePath); 
      
      return result.secure_url; // ส่ง URL สวยๆ กลับไปให้แอปใช้
    } catch (error) {
      console.error("🚨 Cloudinary Upload Error:", error);
      throw error;
    }
  },
  async uploadAudio(filePath: string, folder: string = 'mymood_audio'): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'video' // ทริค: Cloudinary ใช้คำว่า 'video' ในการจัดการทั้งไฟล์วิดีโอและไฟล์เสียงครับ
      });
      
      fs.unlinkSync(filePath); // อัปเสร็จปุ๊บ ลบไฟล์ขยะในเครื่องทิ้งทันที
      return result.secure_url;
    } catch (error) {
      console.error("🚨 Cloudinary Audio Upload Error:", error);
      throw error;
    }
  }
};
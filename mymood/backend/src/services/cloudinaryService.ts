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
  },
 // 🌟 ฟังก์ชันลบไฟล์แบบแม่นยำ 100%
  // 🌟 ฟังก์ชันลบไฟล์แบบครอบจักรวาล (ดึง Public ID แม่น 100%)
  async deleteFile(fileUrl: string, resourceType: 'image' | 'video') {
    if (!fileUrl) return;
    try {
      console.log(`🔍 [Cloudinary] เตรียมลบ: ${fileUrl}`);

      // ใช้ระบบ URL ของ Node.js มาช่วยชำแหละ
      const urlObj = new URL(fileUrl);
      const pathParts = urlObj.pathname.split('/');
      const uploadIndex = pathParts.indexOf('upload');

      if (uploadIndex === -1) throw new Error("ไม่ใช่ URL ของ Cloudinary");

      // ดึงส่วนที่อยู่หลังคำว่า upload/ มาทั้งหมด
      let publicIdPath = pathParts.slice(uploadIndex + 1).join('/');

      // ถ้ามีเวอร์ชัน (เช่น v1774469955/) ให้ตัดทิ้ง
      if (publicIdPath.match(/^v\d+\//)) {
        publicIdPath = publicIdPath.replace(/^v\d+\//, '');
      }

      // ตัดนามสกุลไฟล์ (.mp3, .png) ทิ้ง (ถ้ามี)
      const lastDotIndex = publicIdPath.lastIndexOf('.');
      const publicId = lastDotIndex !== -1 ? publicIdPath.substring(0, lastDotIndex) : publicIdPath;
      console.log(`🎯 [Cloudinary] Public ID ที่สกัดได้คือ: [${publicId}]`);

      // ยิงคำสั่งทำลายไฟล์!
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      console.log(`🗑️ [Cloudinary] ลบไฟล์ออกจากระบบสำเร็จ!`);

    } catch (error) {
      console.error(`❌ [Cloudinary] ลบไฟล์พลาด:`, error);
    }
  }
};
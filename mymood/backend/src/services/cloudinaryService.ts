import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
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
    const absPath = path.resolve(filePath);
    try {
      const result = await cloudinary.uploader.upload(absPath, {
        folder: folder,
        resource_type: 'image',
        timeout: 120000,
      });
      return result.secure_url;
    } catch (error) {
      console.error("🚨 Cloudinary Upload Error:", error);
      throw error;
    }
  },
  async uploadAudio(filePath: string, folder: string = 'mymood_audio'): Promise<string> {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Audio file not found before upload: ${absPath}`);
    }
    const fileSize = fs.statSync(absPath).size;
    console.log(`☁️ Uploading audio to Cloudinary (${(fileSize / 1024 / 1024).toFixed(1)} MB)...`);

    // Read file into memory first to avoid ReadStream ENOENT race on Windows
    const buffer = fs.readFileSync(absPath);

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'video',
          timeout: 600000,
        },
        (error, result) => {
          if (error) {
            console.error("🚨 Cloudinary Audio Upload Error:", error);
            return reject(error);
          }
          if (!result?.secure_url) {
            return reject(new Error('Cloudinary upload returned no secure_url'));
          }
          console.log(`✅ Audio uploaded: ${result.secure_url}`);
          resolve(result.secure_url);
        }
      );

      // Stream the buffer to Cloudinary (no file path dependency during upload)
      const readable = Readable.from(buffer);
      readable.pipe(uploadStream);
    });
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
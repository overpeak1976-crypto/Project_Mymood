import express from 'express';
import multer from 'multer';
import { uploadController } from '../controllers/uploadController';

const router = express.Router();

// ตั้งค่า Multer ให้เซฟไฟล์รูปลงโฟลเดอร์ uploads ก่อนชั่วคราว
const upload = multer({ dest: 'uploads/' });

// เปิดเส้นทาง POST /api/upload/image (รองรับไฟล์ชื่อ 'image_file')
router.post('/image', upload.single('image_file'), uploadController.uploadImageAPI);

export default router;
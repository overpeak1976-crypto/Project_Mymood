import express from 'express';
import { uploadController } from '../controllers/uploadController';
import { upload } from '../middlewares/upload';

const router = express.Router();

// เปิดเส้นทาง POST /api/upload/image (รองรับไฟล์ชื่อ 'image_file')
router.post('/image', upload.single('image_file'), uploadController.uploadImageAPI);

export default router;
import { Router } from 'express';
import multer from 'multer';
import { songController } from '../controllers/songController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
// ใช้ multer สำหรับจัดการไฟล์อัปโหลด
const upload = multer({ dest: 'uploads/' });
// Endpoint: GET /api/songs
router.get('/',authenticate, songController.getAllSongs );

// Endpoint: POST /api/songs/upload
router.post('/upload',authenticate, upload.single('file'), songController.uploadSong );

export default router;
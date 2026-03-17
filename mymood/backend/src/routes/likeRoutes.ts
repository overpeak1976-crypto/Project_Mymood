import express from 'express';
import { likeController } from '../controllers/likeController';
import { authenticate } from '../middlewares/authMiddleware'; // อย่าลืมดัก Token!

const router = express.Router();

// ยิง POST เพื่อกดหัวใจ / เอาหัวใจออก
router.post('/toggle', authenticate, likeController.toggleLike);

// ยิง GET เพื่อดึงเพลงโปรดทั้งหมด
router.get('/my-likes', authenticate, likeController.getMyLikedSongs);

export default router;
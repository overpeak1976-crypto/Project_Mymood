import express from 'express';
import { likeController } from '../controllers/likeController';
import { authenticate } from '../middlewares/authMiddleware'; // อย่าลืมดัก Token!

const router = express.Router();

router.post('/toggle', authenticate, likeController.toggleLike);

router.get('/my-likes', authenticate, likeController.getMyLikedSongs);

export default router;
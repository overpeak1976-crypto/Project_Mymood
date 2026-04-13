import express from 'express';
import { playController } from '../controllers/playController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// ยิง POST ไปที่ /api/play/:song_id เพื่อบวกยอดวิว
router.post('/:song_id', authenticate, playController.recordPlay);
router.get('/history', authenticate, playController.getHistory);

export default router;
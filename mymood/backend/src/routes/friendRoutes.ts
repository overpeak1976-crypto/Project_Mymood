import express from 'express';
import { friendController } from '../controllers/friendController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/list', authenticate, friendController.getMyFriends);

export default router;
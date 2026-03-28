import express from 'express';
import { friendController } from '../controllers/friendController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/list', authenticate, friendController.getMyFriends);

router.get('/requests', authenticate, friendController.getPendingRequests);

router.get('/sent-requests', authenticate, friendController.getSentRequests);

router.delete('/reject/:targetId', authenticate, friendController.rejectOrCancelRequest);

export default router;
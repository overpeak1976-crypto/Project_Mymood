import { Router } from 'express';
import { inboxController } from '../controllers/inboxController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.post('/share', authenticate, inboxController.shareSong);
router.get('/', authenticate, inboxController.getMyInbox);

export default router;
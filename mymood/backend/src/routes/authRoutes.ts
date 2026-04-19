import { Router } from 'express';
import { googleSync, login, syncUser } from '../controllers/authController';

const router = Router();

router.post('/google-sync', googleSync);

router.post('/sync-user', syncUser);

router.post('/login', login);
export default router;
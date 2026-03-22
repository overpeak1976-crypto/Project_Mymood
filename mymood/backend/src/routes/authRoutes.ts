import { Router } from 'express';
import { googleSync, login, syncUser} from '../controllers/authController';

const router = Router();

// Endpoint: POST /api/auth/google-sync
router.post('/google-sync', googleSync);

// 🌟 Endpoint: POST /api/auth/sync-user (รับข้อมูลหลังสมัครเสร็จ)
router.post('/sync-user', syncUser);

router.post('/login', login);
export default router;
import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint: GET /api/users/search/:handle
// ค้นหาเพื่อนไม่จำเป็นต้องล็อกอินก็ได้ (หรือจะใส่ authenticate ด้วยก็ได้)
router.get('/search/:handle', userController.searchByHandle);

// Endpoint: POST /api/users/add-friend
// การจะแอดเพื่อน *บังคับ* ว่าต้องล็อกอิน (ผ่าน middleware authenticate)
router.post('/add-friend', authenticate, userController.addFriend);

router.put('/accept-friend', authenticate, userController.acceptFriend);

router.get('/my-top-genres', authenticate, userController.getMyTopGenres);

router.get('/profile', authenticate, userController.getMyProfile);

router.put('/profile', authenticate, userController.updateMyProfile);

router.get('/privacy', authenticate, userController.getPrivacySettings);

router.put('/privacy', authenticate, userController.updatePrivacySettings);

router.get('/public-profile/:userId', authenticate, userController.getPublicProfile);

export default router;
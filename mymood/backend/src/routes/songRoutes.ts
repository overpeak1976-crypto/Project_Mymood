import { Router } from 'express';
import { songController } from '../controllers/songController';
import { authenticate } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload';

const router = Router();
// Endpoint: GET /api/songs
router.get('/',authenticate, songController.getAllSongs );
// Endpoint: POST /api/songs/upload
router.post('/upload',authenticate, upload.fields([{ name: 'audio', maxCount: 1 },{ name: 'cover_image', maxCount: 1 }]), songController.uploadSong );

router.get('/my-uploads', authenticate, songController.getMyUploads);
router.get('/friends-uploads', authenticate, songController.getFriendsUploads);
router.get('/top-for-you', authenticate, songController.getMyTopSongs);

router.post('/search', authenticate, songController.searchSongsByAI);

router.post('/:id/reanalyze', authenticate, songController.reanalyzeSong);

export default router;
import { Router } from 'express';
import { aiPlaylistController } from '../controllers/aiPlaylistController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Endpoint: POST /api/ai/recommend
router.post('/recommend', aiPlaylistController.generatePlaylist);
    
router.post('/generate-playlist', authenticate, aiPlaylistController.generatePlaylist);

router.post('/save-playlist', authenticate, aiPlaylistController.savePlaylist);
// วางต่อจากบรรทัด /save-playlist ได้เลย
router.get('/my-playlists', authenticate, aiPlaylistController.getMyPlaylists);

export default router;
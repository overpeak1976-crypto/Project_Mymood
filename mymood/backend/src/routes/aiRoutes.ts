import { Router } from 'express';
import { aiPlaylistController } from '../controllers/aiPlaylistController';

const router = Router();

// Endpoint: POST /api/ai/recommend
router.post('/recommend', aiPlaylistController.generatePlaylist);

export default router;
import express from 'express';
import { playlistController } from '../controllers/playlistController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', authenticate, playlistController.getMyPlaylists);
router.post('/', authenticate, playlistController.createPlaylist);
router.post('/:playlistId/tracks', authenticate, playlistController.addTrack);

export default router;

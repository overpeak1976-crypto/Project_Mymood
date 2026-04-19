import express from 'express';
import { playlistController } from '../controllers/playlistController';
import { authenticate } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload';

const router = express.Router();

router.get('/', authenticate, playlistController.getMyPlaylists);
router.post('/', authenticate, upload.single('cover_image'), playlistController.createPlaylist);
router.get('/:playlistId', authenticate, playlistController.getPlaylistById);
router.delete('/:playlistId', authenticate, playlistController.deletePlaylist);
router.post('/:playlistId/tracks', authenticate, playlistController.addTrack);
router.delete('/:playlistId/tracks/:trackId', authenticate, playlistController.removeTrack);

export default router;

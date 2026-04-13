import { Router } from 'express';
import { searchController } from '../controllers/searchController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// GET /api/search?q=your+query
router.get('/', authenticate, searchController.search);

export default router;

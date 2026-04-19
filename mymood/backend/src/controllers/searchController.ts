import { Request, Response } from 'express';
import { searchService } from '../services/searchService';

export const searchController = {
  async search(req: Request, res: Response) {
    try {
      const query = (req.query.q as string)?.trim() ?? '';
      if (!query) return res.status(200).json({ results: [], total: 0 });

      const data = await searchService.hybridSearch(query);
      res.status(200).json(data);
    } catch (error: any) {
      console.error('🔍 Search Error:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

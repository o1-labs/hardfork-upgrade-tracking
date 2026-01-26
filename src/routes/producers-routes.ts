import { Router } from 'express';
import { statsService } from '../services/stats-service';

const router = Router();

router.get('/stats', async (req, res) => {
  try {
    const stats = await statsService.getAll();
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

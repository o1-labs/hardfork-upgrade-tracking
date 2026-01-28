import { Router } from 'express';
import { statsService } from '../services/stats-service';
import { NodeStats } from '../types/node-stats';

const router = Router();

router.post('/stats', async (req, res) => {
  try {
    const stats: NodeStats = req.body.data ?? req.body;
    console.log('Received stats submission:', JSON.stringify(stats, null, 2));
    await statsService.submitStats(stats);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to save stats:', error);
    res.status(500).json({ success: false, error: 'Failed to save stats' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await statsService.getAll();
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/stats/:peerId', async (req, res) => {
  try {
    const stats = await statsService.getByPeerId(req.params.peerId);
    if (!stats) {
      res.status(404).json({ error: 'Stats not found' });
      return;
    }
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;

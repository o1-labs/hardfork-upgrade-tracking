import { Router } from 'express';
import { statsService } from '../services/stats-service';
import { NodeStats } from '../types/node-stats';

const router = Router();

router.post('/stats', async (req, res) => {
  try {
    let stats: NodeStats;

    // Check if this is a Pub/Sub push message
    if (req.body.message?.data) {
      // Pub/Sub wraps the message: { message: { data: "base64-encoded" } }
      const decoded = Buffer.from(req.body.message.data, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      // The Cloud Function preserves original payload which has { data: {...} }
      stats = parsed.data ?? parsed;
      console.log('Received Pub/Sub push message, decoded stats:', JSON.stringify(stats, null, 2));
    } else {
      // Direct POST from Mina nodes: { data: {...} } or {...}
      stats = req.body.data ?? req.body;
      console.log('Received direct stats submission:', JSON.stringify(stats, null, 2));
    }

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

import { Router } from 'express';
import { dashboardService } from '../services/dashboard-service';

const router = Router();

const RELEASE_PERCENTAGE = parseInt(process.env.RELEASE_PERCENTAGE || '80', 10);

router.get('/', async (req, res) => {
  try {
    const html = await dashboardService.render(RELEASE_PERCENTAGE);
    res.send(html);
  } catch (error) {
    console.error('Failed to render dashboard:', error);
    res.status(500).send('Failed to load dashboard');
  }
});

export default router;

import { Router } from 'express';
import { dashboardService } from '../services/dashboard-service';

const router = Router();

const RELEASE_PERCENTAGE = parseInt(process.env.RELEASE_PERCENTAGE || '80', 10);

// Admit nodes that report no block producer key into the dashboard table.
// Off by default, preserving the BP-only view the testnets rely on. Turn it on
// for networks where we run no block producers of our own — on mainnet the fleet
// is archive + seeds, so every node we operate reports a null BP key and the
// default view stays permanently empty.
const SHOW_NON_BP_NODES = process.env.SHOW_NON_BP_NODES === 'true';

router.get('/', async (req, res) => {
  try {
    const html = await dashboardService.render(RELEASE_PERCENTAGE, SHOW_NON_BP_NODES);
    res.send(html);
  } catch (error) {
    console.error('Failed to render dashboard:', error);
    res.status(500).send('Failed to load dashboard');
  }
});

export default router;

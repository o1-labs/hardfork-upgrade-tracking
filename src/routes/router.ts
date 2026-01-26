import { Router } from 'express';
import statsRoutes from './stats-routes';
import producersRoutes from './producers-routes';
import dashboardRoutes from './dashboard-routes';

const router = Router();

router.use('/', dashboardRoutes);
router.use('/api', producersRoutes);
router.use('/submit', statsRoutes);

export default router;

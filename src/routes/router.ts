import { Router } from 'express';
import statsRoutes from './stats-routes';
import producersRoutes from './producers-routes';
import dashboardRoutes from './dashboard-routes';
import blockProducerRoutes from './block-producer-routes';

const router = Router();

router.use('/', dashboardRoutes);
router.use('/api', producersRoutes);
router.use('/submit', statsRoutes);
router.use('/block-producers', blockProducerRoutes);

export default router;

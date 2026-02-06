import { Router, Request, Response, NextFunction } from 'express';
import { blockProducerService } from '../services/block-producer-service';

const router = Router();

const validateBearerToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CSV_UPLOAD_TOKEN;

  if (!expectedToken) {
    console.error('CSV_UPLOAD_TOKEN environment variable is not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (token !== expectedToken) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }

  next();
};

router.post('/upload', validateBearerToken, async (req: Request, res: Response) => {
  try {
    const csvContent = req.body;

    if (!csvContent || typeof csvContent !== 'string') {
      res.status(400).json({ error: 'Request body must be CSV content as text' });
      return;
    }

    console.log('Received CSV upload, content length:', csvContent.length);

    const result = await blockProducerService.uploadCSV(csvContent);

    console.log('CSV processed successfully:', result);

    res.json({
      success: true,
      message: `Processed ${result.total} block producers`,
      ...result,
    });
  } catch (error) {
    console.error('Error processing CSV upload:', error);
    res.status(500).json({
      error: 'Failed to process CSV',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const producers = await blockProducerService.getAll();
    res.json(producers);
  } catch (error) {
    console.error('Error fetching block producers:', error);
    res.status(500).json({ error: 'Failed to fetch block producers' });
  }
});

router.get('/last-sync', async (_req: Request, res: Response) => {
  try {
    const lastSync = await blockProducerService.getLastSyncTime();
    res.json({ lastSync });
  } catch (error) {
    console.error('Error fetching last sync time:', error);
    res.status(500).json({ error: 'Failed to fetch last sync time' });
  }
});

router.get('/:publicKey', async (req: Request<{ publicKey: string }>, res: Response) => {
  try {
    const producer = await blockProducerService.getByPublicKey(req.params.publicKey);
    if (!producer) {
      res.status(404).json({ error: 'Block producer not found' });
      return;
    }
    res.json(producer);
  } catch (error) {
    console.error('Error fetching block producer:', error);
    res.status(500).json({ error: 'Failed to fetch block producer' });
  }
});

export default router;

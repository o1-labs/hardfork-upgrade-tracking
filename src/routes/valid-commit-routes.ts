import { Router, Request, Response, NextFunction } from 'express';
import { validCommitService } from '../services/valid-commit-service';

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

  const token = authHeader.slice(7);

  if (token !== expectedToken) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }

  next();
};

// Get all valid commits
router.get('/', async (_req: Request, res: Response) => {
  try {
    const commits = await validCommitService.getAll();
    res.json(commits);
  } catch (error) {
    console.error('Error fetching valid commits:', error);
    res.status(500).json({ error: 'Failed to fetch valid commits' });
  }
});

// Add a single commit or list of commits
router.post('/', validateBearerToken, async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Handle single commit: { hash: "abc123", label?: "v1.0.0" }
    if (typeof body.hash === 'string') {
      const commit = await validCommitService.addCommit(body.hash, body.label);
      res.json({ success: true, commit });
      return;
    }

    // Handle list of commits: { commits: [{ hash: "abc", label?: "v1" }, ...] }
    if (Array.isArray(body.commits)) {
      const result = await validCommitService.addCommits(body.commits);
      res.json({ success: true, ...result });
      return;
    }

    res.status(400).json({
      error: 'Invalid request body',
      expected: '{ hash: string, label?: string } or { commits: [{ hash: string, label?: string }] }',
    });
  } catch (error) {
    console.error('Error adding valid commit:', error);
    res.status(500).json({
      error: 'Failed to add valid commit',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete a commit
router.delete('/:hash', validateBearerToken, async (req: Request<{ hash: string }>, res: Response) => {
  try {
    await validCommitService.deleteCommit(req.params.hash);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting valid commit:', error);
    res.status(500).json({ error: 'Failed to delete valid commit' });
  }
});

export default router;

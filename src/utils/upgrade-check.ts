import { NodeStats } from '../types/node-stats';
import { validCommitRepository } from '../repositories/valid-commit-repository';

// Cache of valid commit hashes to avoid DB lookups on every request
let validCommitCache: Set<string> | null = null;
let cacheLastUpdated: number = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

async function getValidCommits(): Promise<Set<string>> {
  const now = Date.now();
  if (validCommitCache && now - cacheLastUpdated < CACHE_TTL_MS) {
    return validCommitCache;
  }
  validCommitCache = await validCommitRepository.getAllHashes();
  cacheLastUpdated = now;
  return validCommitCache;
}

/**
 * Determines if a node is upgraded based on its commit hash.
 * A node is considered upgraded if its commit_hash is in the valid_commits table.
 */
export async function isUpgraded(stats: NodeStats): Promise<boolean> {
  const validCommits = await getValidCommits();
  return validCommits.has(stats.commit_hash);
}

/**
 * Clears the valid commit cache (call after adding/removing commits)
 */
export function clearUpgradeCache(): void {
  validCommitCache = null;
  cacheLastUpdated = 0;
}

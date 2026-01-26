import { NodeStats } from '../types/node-stats';

/**
 * Determines if a node is upgraded based on its stats.
 *
 * TODO: Implement actual upgrade detection logic.
 * This could be based on:
 * - commit_hash matching a target version
 * - block height being above a threshold
 * - other criteria
 *
 * For now, returns true for all nodes.
 */
export function isUpgraded(stats: NodeStats): boolean {
  // Placeholder: count all as upgraded for now
  return true;
}

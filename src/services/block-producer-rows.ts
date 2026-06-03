import type { EnrichedNodeStats, StakeStats, BlockProducerRow } from '../templates';

/**
 * Collapse per-node stats into at most one row per block producer.
 *
 * A node that restarts with a new commit reports under a new peer_id, so the old
 * record (with the old commit) remains in the DB. Grouping by block producer key
 * folds those duplicates into a single row:
 *  - upgraded if ANY reporting node is upgraded,
 *  - commits is the distinct list of commits the BP reported (first-seen order),
 *  - peer/timestamp fields come from the most recent report (the current node),
 *  - max_observed_block_height is the max across the group.
 *
 * Nodes that reported no block producer key are dropped (not useful in the table;
 * still retained in the DB for later access).
 */
export function groupByBlockProducer(stats: EnrichedNodeStats[]): BlockProducerRow[] {
  const groups = new Map<string, BlockProducerRow>();

  for (const s of stats) {
    const bpKey = s.block_producer_public_key;
    if (!bpKey) continue;

    let row = groups.get(bpKey);
    if (!row) {
      row = {
        block_producer_public_key: bpKey,
        upgraded: false,
        total_stake: s.total_stake,
        num_delegators: s.num_delegators,
        percent_total_stake: s.percent_total_stake,
        percent_total_active_stake: s.percent_total_active_stake,
        is_active: s.is_active,
        commits: [],
        timestamp: s.timestamp,
        max_observed_block_height: s.max_observed_block_height,
        peer_count: s.peer_count,
        peer_id: s.peer_id,
      };
      groups.set(bpKey, row);
    }

    row.upgraded = row.upgraded || !!s.upgraded;
    if (!row.commits.includes(s.commit_hash)) {
      row.commits.push(s.commit_hash);
    }
    if (s.max_observed_block_height > row.max_observed_block_height) {
      row.max_observed_block_height = s.max_observed_block_height;
    }
    // The most recent report reflects the BP's current node (peer + freshness).
    if (new Date(s.timestamp).getTime() >= new Date(row.timestamp).getTime()) {
      row.timestamp = s.timestamp;
      row.peer_id = s.peer_id;
      row.peer_count = s.peer_count;
    }
  }

  return Array.from(groups.values());
}

/**
 * Compute aggregate stake stats from the already-deduplicated block producer rows.
 * Rows are unique per BP, so a plain sum is correct (no per-key dedup needed).
 */
export function computeStakeStats(rows: BlockProducerRow[], lastSync: string | null): StakeStats {
  let upgradedActiveStake = 0;
  let totalActiveStake = 0;
  let upgradedTotalStake = 0;

  for (const r of rows) {
    if (r.upgraded && r.is_active) {
      upgradedActiveStake += r.percent_total_active_stake || 0;
    }
    if (r.is_active) {
      totalActiveStake += r.percent_total_active_stake || 0;
    }
    if (r.upgraded) {
      upgradedTotalStake += r.percent_total_stake || 0;
    }
  }

  return {
    upgradedActiveStakePercent: upgradedActiveStake,
    totalActiveStakePercent: totalActiveStake,
    upgradedTotalStakePercent: upgradedTotalStake,
    lastSync,
  };
}

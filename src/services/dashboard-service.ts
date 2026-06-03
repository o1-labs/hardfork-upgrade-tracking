import { statsService } from './stats-service';
import { blockProducerService } from './block-producer-service';
import { groupByBlockProducer, computeStakeStats } from './block-producer-rows';
import { renderDashboard, EnrichedNodeStats } from '../templates';

export const dashboardService = {
  async render(releasePercentage: number): Promise<string> {
    const stats = await statsService.getAll();
    const blockProducers = await blockProducerService.getAll();
    const lastSync = await blockProducerService.getLastSyncTime();

    // Create a map of block producer data by public key
    const bpMap = new Map(blockProducers.map(bp => [bp.public_key, bp]));

    // Enrich node stats with block producer data
    const enrichedStats: EnrichedNodeStats[] = stats.map(s => {
      const bp = s.block_producer_public_key ? bpMap.get(s.block_producer_public_key) : null;
      return {
        ...s,
        total_stake: bp?.total_stake ?? null,
        num_delegators: bp?.num_delegators ?? null,
        percent_total_stake: bp?.percent_total_stake ?? null,
        percent_total_active_stake: bp?.percent_total_active_stake ?? null,
        is_active: bp?.is_active ?? null,
      };
    });

    // Collapse to one row per block producer (folds restart duplicates, drops
    // nodes with no BP key), then derive stake stats from those unique rows.
    const rows = groupByBlockProducer(enrichedStats);
    const stakeStats = computeStakeStats(rows, lastSync);

    return renderDashboard(rows, releasePercentage, stakeStats);
  },
};

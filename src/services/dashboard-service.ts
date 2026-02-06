import { statsService } from './stats-service';
import { blockProducerService } from './block-producer-service';
import { renderDashboard, EnrichedNodeStats, StakeStats } from '../templates';

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

    // Calculate stake stats
    const upgradedActiveNodes = enrichedStats.filter(s => s.upgraded && s.is_active);
    const allActiveNodes = enrichedStats.filter(s => s.is_active);
    const upgradedNodes = enrichedStats.filter(s => s.upgraded);

    const upgradedActiveStake = upgradedActiveNodes.reduce(
      (sum, s) => sum + (s.percent_total_active_stake || 0), 0
    );
    const totalActiveStake = allActiveNodes.reduce(
      (sum, s) => sum + (s.percent_total_active_stake || 0), 0
    );
    const upgradedTotalStake = upgradedNodes.reduce(
      (sum, s) => sum + (s.percent_total_stake || 0), 0
    );

    const stakeStats: StakeStats = {
      upgradedActiveStakePercent: upgradedActiveStake,
      totalActiveStakePercent: totalActiveStake,
      upgradedTotalStakePercent: upgradedTotalStake,
      lastSync,
    };

    return renderDashboard(enrichedStats, releasePercentage, stakeStats);
  },
};

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

    // Calculate stake stats - deduplicate by block producer key to avoid counting same BP twice
    const seenUpgradedActiveBPs = new Set<string>();
    const seenAllActiveBPs = new Set<string>();
    const seenUpgradedBPs = new Set<string>();

    let upgradedActiveStake = 0;
    let totalActiveStake = 0;
    let upgradedTotalStake = 0;

    for (const s of enrichedStats) {
      const bpKey = s.block_producer_public_key;
      if (!bpKey) continue;

      // Count upgraded active stake (unique BPs only)
      if (s.upgraded && s.is_active && !seenUpgradedActiveBPs.has(bpKey)) {
        seenUpgradedActiveBPs.add(bpKey);
        upgradedActiveStake += s.percent_total_active_stake || 0;
      }

      // Count total active stake (unique BPs only)
      if (s.is_active && !seenAllActiveBPs.has(bpKey)) {
        seenAllActiveBPs.add(bpKey);
        totalActiveStake += s.percent_total_active_stake || 0;
      }

      // Count upgraded total stake (unique BPs only)
      if (s.upgraded && !seenUpgradedBPs.has(bpKey)) {
        seenUpgradedBPs.add(bpKey);
        upgradedTotalStake += s.percent_total_stake || 0;
      }
    }

    const stakeStats: StakeStats = {
      upgradedActiveStakePercent: upgradedActiveStake,
      totalActiveStakePercent: totalActiveStake,
      upgradedTotalStakePercent: upgradedTotalStake,
      lastSync,
    };

    return renderDashboard(enrichedStats, releasePercentage, stakeStats);
  },
};

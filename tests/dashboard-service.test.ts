// Test stake calculation logic
describe('Dashboard stake calculations', () => {
  // Helper function that mimics the dashboard service calculation
  function calculateStakeStats(enrichedStats: any[]) {
    const seenUpgradedActiveBPs = new Set<string>();
    const seenAllActiveBPs = new Set<string>();
    const seenUpgradedBPs = new Set<string>();

    let upgradedActiveStake = 0;
    let totalActiveStake = 0;
    let upgradedTotalStake = 0;

    for (const s of enrichedStats) {
      const bpKey = s.block_producer_public_key;
      if (!bpKey) continue;

      if (s.upgraded && s.is_active && !seenUpgradedActiveBPs.has(bpKey)) {
        seenUpgradedActiveBPs.add(bpKey);
        upgradedActiveStake += s.percent_total_active_stake || 0;
      }

      if (s.is_active && !seenAllActiveBPs.has(bpKey)) {
        seenAllActiveBPs.add(bpKey);
        totalActiveStake += s.percent_total_active_stake || 0;
      }

      if (s.upgraded && !seenUpgradedBPs.has(bpKey)) {
        seenUpgradedBPs.add(bpKey);
        upgradedTotalStake += s.percent_total_stake || 0;
      }
    }

    return {
      upgradedActiveStakePercent: upgradedActiveStake,
      totalActiveStakePercent: totalActiveStake,
      upgradedTotalStakePercent: upgradedTotalStake,
    };
  }

  it('should calculate stake correctly for single nodes', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
      { block_producer_public_key: 'BP2', upgraded: false, is_active: true, percent_total_active_stake: 0.3, percent_total_stake: 0.3 },
      { block_producer_public_key: 'BP3', upgraded: true, is_active: false, percent_total_active_stake: null, percent_total_stake: 0.2 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBe(0.5); // Only BP1 (upgraded + active)
    expect(result.totalActiveStakePercent).toBeCloseTo(0.8); // BP1 + BP2 (both active)
    expect(result.upgradedTotalStakePercent).toBeCloseTo(0.6); // BP1 + BP3 (both upgraded)
  });

  it('should deduplicate by block producer key', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 }, // Duplicate
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 }, // Another duplicate
    ];

    const result = calculateStakeStats(stats);

    // Should only count BP1 once
    expect(result.upgradedActiveStakePercent).toBe(0.5);
    expect(result.totalActiveStakePercent).toBe(0.5);
    expect(result.upgradedTotalStakePercent).toBe(0.4);
  });

  it('should skip nodes without block producer key', () => {
    const stats = [
      { block_producer_public_key: null, upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
      { block_producer_public_key: '', upgraded: true, is_active: true, percent_total_active_stake: 0.3, percent_total_stake: 0.3 },
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.2, percent_total_stake: 0.1 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBe(0.2); // Only BP1
    expect(result.totalActiveStakePercent).toBe(0.2);
    expect(result.upgradedTotalStakePercent).toBe(0.1);
  });

  it('should handle null stake percentages', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: null, percent_total_stake: null },
      { block_producer_public_key: 'BP2', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBe(0.5);
    expect(result.totalActiveStakePercent).toBe(0.5);
    expect(result.upgradedTotalStakePercent).toBe(0.4);
  });

  it('should return zeros for empty stats', () => {
    const result = calculateStakeStats([]);

    expect(result.upgradedActiveStakePercent).toBe(0);
    expect(result.totalActiveStakePercent).toBe(0);
    expect(result.upgradedTotalStakePercent).toBe(0);
  });

  it('should not exceed 100% when data is correct', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.4, percent_total_stake: 0.3 },
      { block_producer_public_key: 'BP2', upgraded: true, is_active: true, percent_total_active_stake: 0.3, percent_total_stake: 0.25 },
      { block_producer_public_key: 'BP3', upgraded: false, is_active: true, percent_total_active_stake: 0.3, percent_total_stake: 0.25 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBeLessThanOrEqual(1);
    expect(result.totalActiveStakePercent).toBeLessThanOrEqual(1);
    expect(result.upgradedTotalStakePercent).toBeLessThanOrEqual(1);
  });

  it('should handle all nodes not upgraded', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: false, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
      { block_producer_public_key: 'BP2', upgraded: false, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBe(0);
    expect(result.upgradedTotalStakePercent).toBe(0);
    expect(result.totalActiveStakePercent).toBeCloseTo(1.0);
  });

  it('should handle all nodes upgraded', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
      { block_producer_public_key: 'BP2', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBeCloseTo(1.0);
    expect(result.totalActiveStakePercent).toBeCloseTo(1.0);
  });

  it('should handle mix of active and inactive block producers', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.3, percent_total_stake: 0.2 },
      { block_producer_public_key: 'BP2', upgraded: true, is_active: false, percent_total_active_stake: null, percent_total_stake: 0.1 },
      { block_producer_public_key: 'BP3', upgraded: false, is_active: true, percent_total_active_stake: 0.4, percent_total_stake: 0.3 },
      { block_producer_public_key: 'BP4', upgraded: false, is_active: false, percent_total_active_stake: null, percent_total_stake: 0.2 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBe(0.3); // Only BP1
    expect(result.totalActiveStakePercent).toBeCloseTo(0.7); // BP1 + BP3
    expect(result.upgradedTotalStakePercent).toBeCloseTo(0.3); // BP1 + BP2
  });

  it('should handle very small stake percentages', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.0001, percent_total_stake: 0.00005 },
      { block_producer_public_key: 'BP2', upgraded: true, is_active: true, percent_total_active_stake: 0.0002, percent_total_stake: 0.00010 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBeCloseTo(0.0003);
    expect(result.upgradedTotalStakePercent).toBeCloseTo(0.00015);
  });

  it('should handle single node scenario', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 1.0, percent_total_stake: 1.0 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBe(1.0);
    expect(result.totalActiveStakePercent).toBe(1.0);
    expect(result.upgradedTotalStakePercent).toBe(1.0);
  });

  it('should handle undefined values gracefully', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: undefined, percent_total_stake: undefined },
      { block_producer_public_key: 'BP2', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBe(0.5);
    expect(result.upgradedTotalStakePercent).toBe(0.4);
  });

  it('should handle many duplicate BP keys correctly', () => {
    const stats = Array(100).fill(null).map((_, i) => ({
      block_producer_public_key: 'BP1',
      upgraded: true,
      is_active: true,
      percent_total_active_stake: 0.5,
      percent_total_stake: 0.4,
    }));

    const result = calculateStakeStats(stats);

    // Should only count once despite 100 entries
    expect(result.upgradedActiveStakePercent).toBe(0.5);
    expect(result.totalActiveStakePercent).toBe(0.5);
    expect(result.upgradedTotalStakePercent).toBe(0.4);
  });

  it('should handle large number of unique block producers', () => {
    const stats = Array(1000).fill(null).map((_, i) => ({
      block_producer_public_key: `BP${i}`,
      upgraded: i % 2 === 0,
      is_active: true,
      percent_total_active_stake: 0.001,
      percent_total_stake: 0.001,
    }));

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBeCloseTo(0.5); // 500 upgraded
    expect(result.totalActiveStakePercent).toBeCloseTo(1.0); // 1000 total
  });

  it('should handle mixed upgrade status for same BP (first wins)', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
      { block_producer_public_key: 'BP1', upgraded: false, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 },
    ];

    const result = calculateStakeStats(stats);

    // First entry marks BP1 as upgraded, so it should be counted
    expect(result.upgradedActiveStakePercent).toBe(0.5);
  });

  it('should handle zero stake percentages', () => {
    const stats = [
      { block_producer_public_key: 'BP1', upgraded: true, is_active: true, percent_total_active_stake: 0, percent_total_stake: 0 },
      { block_producer_public_key: 'BP2', upgraded: true, is_active: true, percent_total_active_stake: 0, percent_total_stake: 0 },
    ];

    const result = calculateStakeStats(stats);

    expect(result.upgradedActiveStakePercent).toBe(0);
    expect(result.upgradedTotalStakePercent).toBe(0);
  });
});

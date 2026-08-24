import { groupByBlockProducer, computeStakeStats } from '../src/services/block-producer-rows';
import { EnrichedNodeStats } from '../src/templates';

// Build an EnrichedNodeStats with sensible defaults that individual tests override.
function node(overrides: Partial<EnrichedNodeStats>): EnrichedNodeStats {
  return {
    max_observed_block_height: 100,
    commit_hash: 'commit_a',
    chain_id: 'devnet',
    peer_id: 'peer_1',
    peer_count: 10,
    timestamp: '2026-01-01T00:00:00.000Z',
    block_producer_public_key: 'BP1',
    upgraded: false,
    total_stake: 1000,
    num_delegators: 5,
    percent_total_stake: 0.1,
    percent_total_active_stake: 0.1,
    is_active: true,
    ...overrides,
  };
}

describe('groupByBlockProducer', () => {
  it('produces at most one row per block producer key', () => {
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: 'BP1', peer_id: 'p1' }),
      node({ block_producer_public_key: 'BP1', peer_id: 'p2' }),
      node({ block_producer_public_key: 'BP2', peer_id: 'p3' }),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.block_producer_public_key).sort()).toEqual(['BP1', 'BP2']);
  });

  it('drops nodes that reported no block producer key', () => {
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: undefined, peer_id: 'p1' }),
      node({ block_producer_public_key: '', peer_id: 'p2' }),
      node({ block_producer_public_key: 'BP1', peer_id: 'p3' }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].block_producer_public_key).toBe('BP1');
  });

  it('marks a BP upgraded if ANY of its nodes is upgraded', () => {
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: 'BP1', peer_id: 'p1', upgraded: false, commit_hash: 'old' }),
      node({ block_producer_public_key: 'BP1', peer_id: 'p2', upgraded: true, commit_hash: 'new' }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].upgraded).toBe(true);
  });

  it('keeps a BP not-upgraded when none of its nodes is upgraded', () => {
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: 'BP1', peer_id: 'p1', upgraded: false, commit_hash: 'old' }),
      node({ block_producer_public_key: 'BP1', peer_id: 'p2', upgraded: false, commit_hash: 'older' }),
    ]);

    expect(rows[0].upgraded).toBe(false);
  });

  it('lists all distinct commits (first-seen order, deduplicated)', () => {
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: 'BP1', peer_id: 'p1', commit_hash: 'new' }),
      node({ block_producer_public_key: 'BP1', peer_id: 'p2', commit_hash: 'old' }),
      node({ block_producer_public_key: 'BP1', peer_id: 'p3', commit_hash: 'new' }), // duplicate
    ]);

    expect(rows[0].commits).toEqual(['new', 'old']);
  });

  it('uses the most recent report for peer/timestamp and the max block height', () => {
    const rows = groupByBlockProducer([
      node({
        block_producer_public_key: 'BP1',
        peer_id: 'recent',
        peer_count: 42,
        timestamp: '2026-03-01T00:00:00.000Z',
        max_observed_block_height: 500,
      }),
      node({
        block_producer_public_key: 'BP1',
        peer_id: 'old',
        peer_count: 7,
        timestamp: '2026-01-01T00:00:00.000Z',
        max_observed_block_height: 900,
      }),
    ]);

    expect(rows[0].peer_id).toBe('recent');
    expect(rows[0].peer_count).toBe(42);
    expect(rows[0].timestamp).toBe('2026-03-01T00:00:00.000Z');
    expect(rows[0].max_observed_block_height).toBe(900); // max across the group
  });

  it('returns an empty list for empty input', () => {
    expect(groupByBlockProducer([])).toEqual([]);
  });
});

describe('computeStakeStats', () => {
  it('sums stake across unique block producer rows', () => {
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: 'BP1', peer_id: 'p1', upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 }),
      node({ block_producer_public_key: 'BP2', peer_id: 'p2', upgraded: false, is_active: true, percent_total_active_stake: 0.3, percent_total_stake: 0.3 }),
      node({ block_producer_public_key: 'BP3', peer_id: 'p3', upgraded: true, is_active: false, percent_total_active_stake: null, percent_total_stake: 0.2 }),
    ]);

    const result = computeStakeStats(rows, null);

    expect(result.upgradedActiveStakePercent).toBe(0.5); // BP1 (upgraded + active)
    expect(result.totalActiveStakePercent).toBeCloseTo(0.8); // BP1 + BP2 (active)
    expect(result.upgradedTotalStakePercent).toBeCloseTo(0.6); // BP1 + BP3 (upgraded)
  });

  it('counts each BP once even with many duplicate node records', () => {
    const stats = Array(100).fill(null).map((_, i) =>
      node({ block_producer_public_key: 'BP1', peer_id: `p${i}`, upgraded: true, is_active: true, percent_total_active_stake: 0.5, percent_total_stake: 0.4 })
    );

    const result = computeStakeStats(groupByBlockProducer(stats), null);

    expect(result.upgradedActiveStakePercent).toBe(0.5);
    expect(result.totalActiveStakePercent).toBe(0.5);
    expect(result.upgradedTotalStakePercent).toBe(0.4);
  });

  it('counts a BP as upgraded stake if ANY of its nodes is upgraded', () => {
    // Most recent node is NOT upgraded, older one IS — the BP still counts as upgraded.
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: 'BP1', peer_id: 'recent', timestamp: '2026-03-01T00:00:00.000Z', upgraded: false, is_active: true, percent_total_active_stake: 0.6, percent_total_stake: 0.5 }),
      node({ block_producer_public_key: 'BP1', peer_id: 'old', timestamp: '2026-01-01T00:00:00.000Z', upgraded: true, is_active: true, percent_total_active_stake: 0.6, percent_total_stake: 0.5 }),
    ]);

    const result = computeStakeStats(rows, null);

    expect(result.upgradedActiveStakePercent).toBe(0.6);
    expect(result.upgradedTotalStakePercent).toBe(0.5);
  });

  it('returns zeros for empty stats', () => {
    const result = computeStakeStats([], null);
    expect(result.upgradedActiveStakePercent).toBe(0);
    expect(result.totalActiveStakePercent).toBe(0);
    expect(result.upgradedTotalStakePercent).toBe(0);
  });

  it('does not exceed 100% when data is correct', () => {
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: 'BP1', peer_id: 'p1', upgraded: true, is_active: true, percent_total_active_stake: 0.4, percent_total_stake: 0.3 }),
      node({ block_producer_public_key: 'BP2', peer_id: 'p2', upgraded: true, is_active: true, percent_total_active_stake: 0.3, percent_total_stake: 0.25 }),
      node({ block_producer_public_key: 'BP3', peer_id: 'p3', upgraded: false, is_active: true, percent_total_active_stake: 0.3, percent_total_stake: 0.25 }),
    ]);

    const result = computeStakeStats(rows, null);

    expect(result.upgradedActiveStakePercent).toBeLessThanOrEqual(1);
    expect(result.totalActiveStakePercent).toBeLessThanOrEqual(1);
    expect(result.upgradedTotalStakePercent).toBeLessThanOrEqual(1);
  });

  it('passes lastSync through unchanged', () => {
    const result = computeStakeStats([], '2026-05-29T11:31:38.000Z');
    expect(result.lastSync).toBe('2026-05-29T11:31:38.000Z');
  });
});

describe('groupByBlockProducer with includeNonBp', () => {
  // A keyless node has no BP record to enrich from, so every stake field is null.
  // The field is `undefined` rather than `null` on the way in: statsRepository
  // normalizes the DB's NULL to undefined (`?? undefined`) on read. The row it
  // produces normalizes back to null, matching the other nullable row fields.
  function keyless(overrides: Partial<EnrichedNodeStats>): EnrichedNodeStats {
    return node({
      block_producer_public_key: undefined,
      total_stake: null,
      num_delegators: null,
      percent_total_stake: null,
      percent_total_active_stake: null,
      is_active: null,
      ...overrides,
    });
  }

  it('drops keyless nodes by default (unchanged behaviour)', () => {
    const rows = groupByBlockProducer([
      node({ block_producer_public_key: 'BP1', peer_id: 'p1' }),
      keyless({ peer_id: 'p2' }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].block_producer_public_key).toBe('BP1');
  });

  it('admits keyless nodes as one row per peer_id when enabled', () => {
    const rows = groupByBlockProducer(
      [
        node({ block_producer_public_key: 'BP1', peer_id: 'p1' }),
        keyless({ peer_id: 'p2' }),
        keyless({ peer_id: 'p3' }),
      ],
      true
    );

    expect(rows).toHaveLength(3);
    const keylessRows = rows.filter(r => r.block_producer_public_key === null);
    expect(keylessRows.map(r => r.peer_id).sort()).toEqual(['p2', 'p3']);
  });

  it('does not fold distinct keyless nodes together', () => {
    // Two seeds on the same commit must stay separate rows — with no BP key to
    // fold on, peer_id is the only identity they have.
    const rows = groupByBlockProducer(
      [keyless({ peer_id: 'seed1' }), keyless({ peer_id: 'seed2' })],
      true
    );

    expect(rows).toHaveLength(2);
  });

  it('still folds BP restart duplicates while admitting keyless nodes', () => {
    const rows = groupByBlockProducer(
      [
        node({ block_producer_public_key: 'BP1', peer_id: 'p1', commit_hash: 'c1' }),
        node({ block_producer_public_key: 'BP1', peer_id: 'p2', commit_hash: 'c2' }),
        keyless({ peer_id: 'p3' }),
      ],
      true
    );

    expect(rows).toHaveLength(2);
    const bpRow = rows.find(r => r.block_producer_public_key === 'BP1')!;
    expect(bpRow.commits).toEqual(['c1', 'c2']);
  });

  it('never lets a peer_id collide with an identically named BP key', () => {
    const rows = groupByBlockProducer(
      [node({ block_producer_public_key: 'X', peer_id: 'p1' }), keyless({ peer_id: 'X' })],
      true
    );

    expect(rows).toHaveLength(2);
  });

  it('marks a keyless node upgraded from its own commit', () => {
    const rows = groupByBlockProducer([keyless({ peer_id: 'p1', upgraded: true })], true);
    expect(rows[0].upgraded).toBe(true);
  });

  it('keeps keyless rows out of the stake math', () => {
    const bp = node({
      block_producer_public_key: 'BP1', peer_id: 'p1', upgraded: true,
      is_active: true, percent_total_active_stake: 0.4, percent_total_stake: 0.3,
    });

    const withoutKeyless = computeStakeStats(groupByBlockProducer([bp]), null);
    const withKeyless = computeStakeStats(
      groupByBlockProducer(
        [bp, keyless({ peer_id: 'seed1', upgraded: true }), keyless({ peer_id: 'seed2' })],
        true
      ),
      null
    );

    expect(withKeyless).toEqual(withoutKeyless);
  });

  it('strips stake off a keyless node even when the caller supplies it', () => {
    // The invariant must be structural, not a property of how dashboard-service
    // happens to enrich records. Feeding a keyless node with full stake fields is
    // the only version of this test that can actually fail: `keyless()` nulls them
    // up front, so a pass-through implementation would satisfy that one too.
    const rows = groupByBlockProducer(
      [
        node({
          block_producer_public_key: undefined,
          peer_id: 'seed1',
          upgraded: true,
          is_active: true,
          total_stake: 5000,
          num_delegators: 9,
          percent_total_active_stake: 0.3,
          percent_total_stake: 0.25,
        }),
      ],
      true
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      block_producer_public_key: null,
      total_stake: null,
      num_delegators: null,
      percent_total_stake: null,
      percent_total_active_stake: null,
      is_active: null,
      upgraded: true,
    });

    expect(computeStakeStats(rows, null)).toEqual({
      upgradedActiveStakePercent: 0,
      totalActiveStakePercent: 0,
      upgradedTotalStakePercent: 0,
      lastSync: null,
    });
  });

  it('normalizes an empty-string BP key to null rather than leaving it ""', () => {
    const rows = groupByBlockProducer(
      [node({ block_producer_public_key: '', peer_id: 'p1', total_stake: 1000 })],
      true
    );

    expect(rows[0].block_producer_public_key).toBeNull();
    expect(rows[0].total_stake).toBeNull();
  });
});

/**
 * Wiring test for dashboardService.render.
 *
 * groupByBlockProducer, renderDashboard and dashboardService.render all default
 * `includeNonBp` to false. That is the right default at the API boundary, but it
 * means dropping the argument at either internal call site in dashboard-service
 * fails silently: the table simply goes empty again, or renders keyless rows
 * under "Block Producers" labels, with every unit test still green.
 *
 * These tests stub the two data services and assert the flag actually reaches
 * both the grouping and the rendering.
 */
import { dashboardService } from '../src/services/dashboard-service';
import { statsService } from '../src/services/stats-service';
import { blockProducerService } from '../src/services/block-producer-service';

jest.mock('../src/services/stats-service');
jest.mock('../src/services/block-producer-service');

const mockedStats = statsService as jest.Mocked<typeof statsService>;
const mockedBps = blockProducerService as jest.Mocked<typeof blockProducerService>;

// One keyless node (a seed) and one block producer, the mainnet-ish mix.
const NODE_RECORDS = [
  {
    max_observed_block_height: 546191,
    commit_hash: 'aaaaaaaa11',
    chain_id: 'mainnet',
    peer_id: 'seed_peer_1',
    peer_count: 89,
    timestamp: '2026-08-24T11:08:20.000Z',
    block_producer_public_key: undefined,
    upgraded: true,
  },
  {
    max_observed_block_height: 546190,
    commit_hash: 'bbbbbbbb22',
    chain_id: 'mainnet',
    peer_id: 'bp_peer_1',
    peer_count: 40,
    timestamp: '2026-08-24T11:00:00.000Z',
    block_producer_public_key: 'B62qBP1',
    upgraded: false,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockedStats.getAll.mockResolvedValue(NODE_RECORDS as any);
  mockedBps.getAll.mockResolvedValue([
    {
      public_key: 'B62qBP1',
      total_stake: 1000,
      num_delegators: 5,
      is_active: true,
      percent_total_stake: 0.2,
      percent_total_active_stake: 0.3,
      upgraded: false,
    },
  ] as any);
  mockedBps.getLastSyncTime.mockResolvedValue(null);
});

describe('dashboardService.render wiring', () => {
  it('hides keyless nodes and labels cards "Block Producers" by default', async () => {
    const html = await dashboardService.render(85);

    expect(html).toContain('Total Block Producers');
    expect(html).toContain('B62qBP1');
    // The seed must not have produced a row.
    expect(html).not.toContain('seed_peer_1');
  });

  it('passes includeNonBp through to both grouping and rendering', async () => {
    const html = await dashboardService.render(85, true);

    // Reached groupByBlockProducer: the keyless seed now has a row.
    expect(html).toContain('seed_peer_1');
    // Reached renderDashboard: the count labels switched noun.
    expect(html).toContain('Total Nodes');
    expect(html).not.toContain('Total Block Producers');
  });

  it('keeps the aggregate stake headline intact when keyless nodes are admitted', async () => {
    // Mark the BP upgraded so it actually contributes to upgradedActiveStakePercent
    // — otherwise the only "30.00%" in the HTML is the row's own table cell, and
    // the assertion would pass without exercising the aggregate at all.
    mockedStats.getAll.mockResolvedValue([
      NODE_RECORDS[0],
      { ...NODE_RECORDS[1], upgraded: true },
    ] as any);

    const withoutFlag = await dashboardService.render(85);
    const withFlag = await dashboardService.render(85, true);

    // The one BP holds 30% active stake. Admitting two keyless seeds alongside it
    // must neither dilute nor inflate the headline.
    expect(withoutFlag).toContain('<div class="adoption-percentage">30.00%</div>');
    expect(withFlag).toContain('<div class="adoption-percentage">30.00%</div>');
  });
});

// Regression: a Mina daemon in early startup (sync_status="Connecting")
// may POST /submit/stats without `peer_count`. Before the fix, the repository
// passed `undefined` straight to prisma.nodeStats.upsert(), which threw
// PrismaClientValidationError because the column was a required Int.
// Now peer_count is nullable and the repository coerces undefined to null.

const mockUpsert = jest.fn();
const mockValidCommitFindMany = jest.fn();

jest.mock('../src/db', () => ({
  prisma: {
    nodeStats: { upsert: mockUpsert },
    validCommit: { findMany: mockValidCommitFindMany },
  },
}));

import { statsRepository } from '../src/repositories/stats-repository';
import { clearUpgradeCache } from '../src/utils/upgrade-check';

const basePayload = {
  max_observed_block_height: 0,
  commit_hash: '0e8410e998a33c13750e475e42bb6dd4fcbaab63',
  chain_id: '2b40c115bef65e0f46d20b97e4f315ef5ea007d2a103a05a5081a78e61feb246',
  peer_id: '12D3KooWRRCcTc8nXLSpjmJKi7YtA1y3mM2jksoGMrfdyP6yKgid',
  timestamp: '2026-05-30T12:45:01.000Z',
};

describe('statsRepository.save', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearUpgradeCache();
    mockUpsert.mockResolvedValue({});
    mockValidCommitFindMany.mockResolvedValue([]);
  });

  it('persists null peerCount when peer_count is omitted (early-startup daemon)', async () => {
    await statsRepository.save({ ...basePayload });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const args = mockUpsert.mock.calls[0][0];
    expect(args.create.peerCount).toBeNull();
    expect(args.update.peerCount).toBeNull();
  });

  it('persists null peerCount when peer_count is explicitly null', async () => {
    await statsRepository.save({ ...basePayload, peer_count: null });

    const args = mockUpsert.mock.calls[0][0];
    expect(args.create.peerCount).toBeNull();
    expect(args.update.peerCount).toBeNull();
  });

  it('passes numeric peer_count through unchanged', async () => {
    await statsRepository.save({ ...basePayload, peer_count: 12 });

    const args = mockUpsert.mock.calls[0][0];
    expect(args.create.peerCount).toBe(12);
    expect(args.update.peerCount).toBe(12);
  });

  it('preserves zero peer_count (genuinely 0 peers, not "unknown")', async () => {
    await statsRepository.save({ ...basePayload, peer_count: 0 });

    const args = mockUpsert.mock.calls[0][0];
    expect(args.create.peerCount).toBe(0);
    expect(args.update.peerCount).toBe(0);
  });
});

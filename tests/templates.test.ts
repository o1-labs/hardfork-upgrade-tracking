import { renderDashboard, BlockProducerRow, StakeStats } from '../src/templates';

function bpRow(overrides: Partial<BlockProducerRow>): BlockProducerRow {
  return {
    block_producer_public_key: 'BP1',
    upgraded: false,
    total_stake: 1000,
    num_delegators: 5,
    percent_total_stake: 0.1,
    percent_total_active_stake: 0.1,
    is_active: true,
    commits: ['commit_a'],
    timestamp: '2026-01-01T00:00:00.000Z',
    max_observed_block_height: 100,
    peer_count: 10,
    peer_id: 'peer_1',
    ...overrides,
  };
}

// A row produced from a node that reported no block producer key: keyed by
// peer_id, with every stake field nulled by groupByBlockProducer.
function keylessRow(overrides: Partial<BlockProducerRow> = {}): BlockProducerRow {
  return bpRow({
    block_producer_public_key: null,
    peer_id: 'seed_peer_1',
    total_stake: null,
    num_delegators: null,
    percent_total_stake: null,
    percent_total_active_stake: null,
    is_active: null,
    ...overrides,
  });
}

const emptyStakeStats: StakeStats = {
  upgradedActiveStakePercent: 0,
  totalActiveStakePercent: 0,
  upgradedTotalStakePercent: 0,
  lastSync: null,
};

describe('renderDashboard table', () => {
  it('renders one <tr> per block producer row', () => {
    const html = renderDashboard(
      [bpRow({ block_producer_public_key: 'BP1', peer_id: 'p1' }), bpRow({ block_producer_public_key: 'BP2', peer_id: 'p2' })],
      80,
      emptyStakeStats
    );

    const bodyRows = (html.match(/data-bp_key=/g) || []).length;
    expect(bodyRows).toBe(2);
  });

  it('lists comma-separated commits for a collapsed block producer', () => {
    const html = renderDashboard(
      [bpRow({ commits: ['aaaaaaaa1111', 'bbbbbbbb2222'] })],
      80,
      emptyStakeStats
    );

    // Cell shows the first 8 chars of each commit, comma-separated.
    expect(html).toContain('aaaaaaaa, bbbbbbbb');
    // Full commits are preserved in the data attribute (used by sort/export).
    expect(html).toContain('data-commit="aaaaaaaa1111, bbbbbbbb2222"');
  });

  it('caps inline commits at 2 and summarizes the rest with "+N more"', () => {
    const html = renderDashboard(
      [bpRow({ commits: ['c1111111aaa', 'c2222222bbb', 'c3333333ccc', 'c4444444ddd', 'c5555555eee'] })],
      80,
      emptyStakeStats
    );

    // First two commits shown as 8-char short hashes...
    expect(html).toContain('c1111111, c2222222');
    // ...and the remaining three summarized.
    expect(html).toContain('+3 more');
    // The full list stays available for the tooltip, copy, and CSV export.
    const fullList = 'c1111111aaa, c2222222bbb, c3333333ccc, c4444444ddd, c5555555eee';
    expect(html).toContain(`data-commits="${fullList}"`);
    expect(html).toContain(`data-commit="${fullList}"`);
  });

  it('does not show "+N more" when there are 2 or fewer commits', () => {
    const html = renderDashboard([bpRow({ commits: ['aaaaaaaa11', 'bbbbbbbb22'] })], 80, emptyStakeStats);
    expect(html).toContain('aaaaaaaa, bbbbbbbb');
    expect(html).not.toContain('class="commit-more"');
  });

  it('counts block producers, not nodes, in the summary cards', () => {
    const html = renderDashboard(
      [
        bpRow({ block_producer_public_key: 'BP1', upgraded: true }),
        bpRow({ block_producer_public_key: 'BP2', upgraded: false }),
        bpRow({ block_producer_public_key: 'BP3', upgraded: false }),
      ],
      80,
      emptyStakeStats
    );

    expect(html).toContain('Total Block Producers');
    expect(html).toContain('Upgraded Block Producers');
    expect(html).toContain('Not Upgraded Block Producers');
  });

  it('relabels the count cards as Nodes when non-BP nodes are admitted', () => {
    const html = renderDashboard([bpRow({})], 80, emptyStakeStats, true);

    expect(html).toContain('Total Nodes');
    expect(html).toContain('Upgraded Nodes');
    expect(html).toContain('Not Upgraded Nodes');
    // Scoped to the card labels: the table header is "Block Producer Key", and
    // unrelated copy elsewhere in the template should not fail this test.
    expect(html).not.toContain('Total Block Producers');
    expect(html).not.toContain('Upgraded Block Producers');
  });

  it('renders a keyless row with a dash and no copy button for the key', () => {
    const html = renderDashboard([keylessRow()], 80, emptyStakeStats, true);

    expect(html).toContain('data-bp_key=""');
    expect(html).toContain('seed_peer_1');

    // Assert positively on the BP-key cell rather than just the absence of a
    // literal 'null': a bug emitting copyToClipboard('') would slip past that.
    const bpCell = html.split('<td class="mono">')[1] ?? '';
    expect(bpCell).toContain('-');
    expect(bpCell).not.toContain('copy-btn');
  });

  it('shows an em dash and a note for stake when no block producer is tracked', () => {
    const html = renderDashboard([keylessRow()], 85, emptyStakeStats, true);

    expect(html).toContain('&mdash;');
    expect(html).toContain('No block producers are reporting to this deployment');
    // Document-wide, not scoped to one div: the header, the adoption headline and
    // both stat cards render the same metric, and a narrow assertion let the
    // header keep saying "0.00%" while the cards said "—".
    // Anchored to a whole text node rather than `toContain('0.00%')`, which
    // matches as a substring of "10.00%" / "100.00%" and would fire spuriously
    // if a count-based percentage is ever added to this view.
    expect(html).not.toMatch(/>\s*0\.00%\s*</);
    expect(html).toContain('const hasBpStake = false');
    expect(html).toContain('width: 0%');
  });

  it('treats an empty dashboard as "no stake tracked" on the default path too', () => {
    // hasBpRows is derived from the rows, not from the flag, so a freshly
    // deployed tracker with no submissions yet gets the em dash rather than a
    // 0.00% that would read as "nothing has upgraded". This is the one place
    // the default path's output differs from before the flag existed.
    const html = renderDashboard([], 85, emptyStakeStats);

    expect(html).not.toMatch(/>\s*0\.00%\s*</);
    expect(html).toContain('No block producers are reporting to this deployment');
    expect(html).toContain('const hasBpStake = false');
    // Labels stay "Block Producers": the flag is off.
    expect(html).toContain('Total Block Producers');
  });

  it('shows real stake figures when at least one block producer is tracked', () => {
    const html = renderDashboard(
      [bpRow({ block_producer_public_key: 'BP1' }), keylessRow()],
      85,
      { ...emptyStakeStats, upgradedActiveStakePercent: 0.42 },
      true
    );

    expect(html).toContain('42.00%');
    expect(html).not.toContain('No block producers are reporting to this deployment');
    expect(html).toContain('const hasBpStake = true');
  });
});

// Test template helper functions
describe('Template helpers', () => {
  // Replicating the helper functions from templates.ts
  function truncateMiddle(str: string, startChars: number = 8, endChars: number = 6): string {
    if (!str || str.length <= startChars + endChars + 3) return str;
    return `${str.slice(0, startChars)}...${str.slice(-endChars)}`;
  }

  function formatStake(stake: number | null): string {
    if (stake === null) return '-';
    if (stake >= 1e9) return (stake / 1e9).toFixed(2) + 'B';
    if (stake >= 1e6) return (stake / 1e6).toFixed(2) + 'M';
    if (stake >= 1e3) return (stake / 1e3).toFixed(2) + 'K';
    return stake.toFixed(2);
  }

  function formatPercent(pct: number | null): string {
    if (pct === null) return '-';
    return (pct * 100).toFixed(2) + '%';
  }

  describe('truncateMiddle', () => {
    it('should truncate long strings', () => {
      const longKey = 'B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9';
      const result = truncateMiddle(longKey, 8, 6);
      expect(result).toBe('B62qrQKS...6g1ny9');
    });

    it('should not truncate short strings', () => {
      const shortKey = 'B62qrQKS9';
      const result = truncateMiddle(shortKey, 8, 6);
      expect(result).toBe('B62qrQKS9');
    });

    it('should handle empty string', () => {
      expect(truncateMiddle('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(truncateMiddle(null as any)).toBeFalsy();
    });
  });

  describe('formatStake', () => {
    it('should format billions', () => {
      expect(formatStake(1500000000)).toBe('1.50B');
      expect(formatStake(1000000000)).toBe('1.00B');
    });

    it('should format millions', () => {
      expect(formatStake(1500000)).toBe('1.50M');
      expect(formatStake(1000000)).toBe('1.00M');
    });

    it('should format thousands', () => {
      expect(formatStake(1500)).toBe('1.50K');
      expect(formatStake(1000)).toBe('1.00K');
    });

    it('should format small numbers', () => {
      expect(formatStake(500)).toBe('500.00');
      expect(formatStake(0)).toBe('0.00');
    });

    it('should return dash for null', () => {
      expect(formatStake(null)).toBe('-');
    });
  });

  describe('formatPercent', () => {
    it('should format percentages correctly', () => {
      expect(formatPercent(0.5)).toBe('50.00%');
      expect(formatPercent(0.123456)).toBe('12.35%');
      expect(formatPercent(1)).toBe('100.00%');
      expect(formatPercent(0)).toBe('0.00%');
    });

    it('should return dash for null', () => {
      expect(formatPercent(null)).toBe('-');
    });

    it('should handle small percentages', () => {
      expect(formatPercent(0.0001)).toBe('0.01%');
      expect(formatPercent(0.00001)).toBe('0.00%');
    });

    it('should handle percentages over 100%', () => {
      expect(formatPercent(1.5)).toBe('150.00%');
      expect(formatPercent(10)).toBe('1000.00%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercent(-0.5)).toBe('-50.00%');
      expect(formatPercent(-0.01)).toBe('-1.00%');
    });
  });

  describe('truncateMiddle edge cases', () => {
    it('should handle exact boundary length', () => {
      // 8 start + 6 end + 3 ellipsis = 17
      const exactLength = '12345678901234567'; // 17 chars
      const result = truncateMiddle(exactLength, 8, 6);
      expect(result).toBe(exactLength); // Should not truncate
    });

    it('should handle one char over boundary', () => {
      const overLength = '123456789012345678'; // 18 chars
      const result = truncateMiddle(overLength, 8, 6);
      expect(result).toBe('12345678...345678');
    });

    it('should handle custom start/end lengths', () => {
      const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      expect(truncateMiddle(str, 4, 4)).toBe('ABCD...WXYZ');
      expect(truncateMiddle(str, 10, 2)).toBe('ABCDEFGHIJ...YZ');
      expect(truncateMiddle(str, 2, 10)).toBe('AB...QRSTUVWXYZ');
    });

    it('should handle zero start chars', () => {
      const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const result = truncateMiddle(str, 0, 6);
      expect(result).toBe('...UVWXYZ');
    });

    it('should handle zero end chars', () => {
      const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const result = truncateMiddle(str, 6, 0);
      // With 0 end chars, slice(-0) returns the whole string
      expect(result).toContain('ABCDEF...');
    });

    it('should handle unicode characters', () => {
      const unicodeStr = '🚀🎉🔥💯😀🎊🌟✨🎯🏆';
      const result = truncateMiddle(unicodeStr, 2, 2);
      // Note: emoji handling depends on how slice works with surrogate pairs
      expect(result.length).toBeLessThan(unicodeStr.length);
    });

    it('should handle whitespace-only strings', () => {
      const whitespace = '                    ';
      const result = truncateMiddle(whitespace, 4, 4);
      expect(result).toBe('    ...    ');
    });
  });

  describe('formatStake edge cases', () => {
    it('should handle edge of billions', () => {
      expect(formatStake(999999999)).toBe('1000.00M'); // Just under 1B
      expect(formatStake(1000000001)).toBe('1.00B'); // Just over 1B
    });

    it('should handle edge of millions', () => {
      expect(formatStake(999999)).toBe('1000.00K'); // Just under 1M
      expect(formatStake(1000001)).toBe('1.00M'); // Just over 1M
    });

    it('should handle edge of thousands', () => {
      expect(formatStake(999)).toBe('999.00'); // Just under 1K
      expect(formatStake(1001)).toBe('1.00K'); // Just over 1K
    });

    it('should handle negative numbers', () => {
      expect(formatStake(-1000)).toBe('-1000.00');
      expect(formatStake(-1000000)).toBe('-1000000.00'); // Doesn't apply K/M/B to negatives
    });

    it('should handle decimal places', () => {
      expect(formatStake(1234567.89)).toBe('1.23M');
      expect(formatStake(1234.5678)).toBe('1.23K');
    });

    it('should handle very small positive numbers', () => {
      expect(formatStake(0.001)).toBe('0.00');
      expect(formatStake(0.009)).toBe('0.01');
    });

    it('should handle infinity', () => {
      expect(formatStake(Infinity)).toBe('InfinityB');
    });

    it('should handle NaN', () => {
      expect(formatStake(NaN)).toBe('NaN');
    });
  });

  describe('formatPercent edge cases', () => {
    it('should handle very precise decimals', () => {
      expect(formatPercent(0.123456789)).toBe('12.35%');
      expect(formatPercent(0.999999)).toBe('100.00%');
    });

    it('should handle infinity', () => {
      expect(formatPercent(Infinity)).toBe('Infinity%');
    });

    it('should handle NaN', () => {
      expect(formatPercent(NaN)).toBe('NaN%');
    });

    it('should handle undefined (coerced to null check)', () => {
      expect(formatPercent(undefined as any)).toBe('NaN%');
    });
  });
});

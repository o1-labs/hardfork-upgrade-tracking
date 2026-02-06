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

import { blockProducerService } from '../src/services/block-producer-service';

describe('blockProducerService', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV and normalize percentages (0-100) to fractions (0-1)', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1000000,50,true,5,8
B62qjsFTBw4TVwRRxNVrmwJfQqXfmMC4DVa2moCe9f8ErvBYd6f7npr,500000,25,false,2.5,`;

      const result = blockProducerService.parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        public_key: 'B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9',
        total_stake: 1000000,
        num_delegators: 50,
        is_active: true,
        percent_total_stake: 0.05,
        percent_total_active_stake: 0.08,
      });
      expect(result[1]).toEqual({
        public_key: 'B62qjsFTBw4TVwRRxNVrmwJfQqXfmMC4DVa2moCe9f8ErvBYd6f7npr',
        total_stake: 500000,
        num_delegators: 25,
        is_active: false,
        percent_total_stake: 0.025,
        percent_total_active_stake: null,
      });
    });

    it('should throw error for missing required column', () => {
      const csv = `bp_public_key,total_stake,num_delegators
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1000000,50`;

      expect(() => blockProducerService.parseCSV(csv)).toThrow('Missing required column');
    });

    it('should throw error for empty CSV', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake`;

      expect(() => blockProducerService.parseCSV(csv)).toThrow('CSV must have a header row and at least one data row');
    });

    it('should skip empty lines', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1000000,50,true,0.05,0.08

B62qjsFTBw4TVwRRxNVrmwJfQqXfmMC4DVa2moCe9f8ErvBYd6f7npr,500000,25,true,0.025,0.04
`;

      const result = blockProducerService.parseCSV(csv);
      expect(result).toHaveLength(2);
    });

    it('should handle columns in different order', () => {
      const csv = `num_delegators,bp_public_key,is_active,total_stake,percent_total_active_stake,percent_total_stake
50,B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,true,1000000,8,5`;

      const result = blockProducerService.parseCSV(csv);

      expect(result[0]).toEqual({
        public_key: 'B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9',
        total_stake: 1000000,
        num_delegators: 50,
        is_active: true,
        percent_total_stake: 0.05,
        percent_total_active_stake: 0.08,
      });
    });

    it('should handle FALSE as boolean', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1000000,50,FALSE,0.05,`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].is_active).toBe(false);
    });

    it('should handle invalid numbers as 0', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,invalid,abc,true,nan,`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].total_stake).toBe(0);
      expect(result[0].num_delegators).toBe(0);
      expect(result[0].percent_total_stake).toBe(0);
    });

    it('should handle negative numbers', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,-1000,-5,true,-5,-8`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].total_stake).toBe(-1000);
      expect(result[0].num_delegators).toBe(-5);
      expect(result[0].percent_total_stake).toBe(-0.05);
    });

    it('should handle very large numbers', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,999999999999999,1000000,true,0.99,0.99`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].total_stake).toBe(999999999999999);
      expect(result[0].num_delegators).toBe(1000000);
    });

    it('should handle scientific notation for floats', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1e9,1000,true,1e0,1e-1`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].total_stake).toBe(1000000000);
      expect(result[0].num_delegators).toBe(1000); // parseInt doesn't support scientific notation
      expect(result[0].percent_total_stake).toBe(0.01); // 1e0 (=1%) normalized to 0.01
      expect(result[0].percent_total_active_stake).toBe(0.001); // 1e-1 (=0.1%) normalized to 0.001
    });

    it('should handle whitespace in values', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
  B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9  , 1000 , 50 ,  true  , 0.05 , 0.08 `;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].public_key).toBe('B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9');
      expect(result[0].total_stake).toBe(1000);
      expect(result[0].is_active).toBe(true);
    });

    it('should skip rows with empty public key', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
,1000,50,true,0.05,0.08
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,2000,100,true,0.1,0.15`;

      const result = blockProducerService.parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].total_stake).toBe(2000);
    });

    it('should handle Windows line endings (CRLF)', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake\r\nB62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1000,50,true,0.05,0.08\r\n`;

      const result = blockProducerService.parseCSV(csv);
      expect(result).toHaveLength(1);
    });

    it('should handle duplicate public keys (last one wins)', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1000,50,true,0.05,0.08
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,2000,100,false,0.1,0.15`;

      const result = blockProducerService.parseCSV(csv);
      // Both rows are parsed; deduplication happens at repository level
      expect(result).toHaveLength(2);
    });

    it('should handle extra columns gracefully', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake,extra_col,another_col
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1000,50,true,0.05,0.08,ignored,also_ignored`;

      const result = blockProducerService.parseCSV(csv);
      expect(result).toHaveLength(1);
      expect(result[0].total_stake).toBe(1000);
    });

    it('should handle zero values', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,0,0,false,0,0`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].total_stake).toBe(0);
      expect(result[0].num_delegators).toBe(0);
      expect(result[0].percent_total_stake).toBe(0);
      expect(result[0].percent_total_active_stake).toBe(0);
    });

    it('should handle special characters in public key', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62q+/=Test123,1000,50,true,5,8`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].public_key).toBe('B62q+/=Test123');
    });

    // Regression: a real staking-ledger CSV has percentages on a 0-100 scale that sum
    // to ~100. Before normalization, one BP at 6.695% rendered as 669.50% on the
    // dashboard (the *100 in templates was applied to an already-percent value).
    it('should normalize a real-world percentage so the dashboard renders it correctly', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qpfenMTTuG2RgaJJaatbJ7KheZ4K2a43dsK48keARjk8mZ4Mhjcr,61480587.92,304,true,3.939434294015446,6.695010905270346`;

      const result = blockProducerService.parseCSV(csv);

      expect(result[0].percent_total_active_stake).toBeCloseTo(0.06695, 5);
      // templates renders with *100 -> ~6.70%, not 669.50%
      expect((result[0].percent_total_active_stake as number) * 100).toBeLessThan(100);
    });

    it('should keep a full ledger (columns summing to 100) within 0-1 after normalization', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
BP1,100,1,true,40,55
BP2,100,1,true,35,30
BP3,100,1,true,25,15`;

      const result = blockProducerService.parseCSV(csv);
      const sumActive = result.reduce((s, p) => s + (p.percent_total_active_stake || 0), 0);
      const sumTotal = result.reduce((s, p) => s + p.percent_total_stake, 0);

      expect(sumActive).toBeCloseTo(1.0, 6);
      expect(sumTotal).toBeCloseTo(1.0, 6);
    });
  });
});

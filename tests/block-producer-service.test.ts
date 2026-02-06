import { blockProducerService } from '../src/services/block-producer-service';

describe('blockProducerService', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV with all columns', () => {
      const csv = `bp_public_key,total_stake,num_delegators,is_active,percent_total_stake,percent_total_active_stake
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1000000,50,true,0.05,0.08
B62qjsFTBw4TVwRRxNVrmwJfQqXfmMC4DVa2moCe9f8ErvBYd6f7npr,500000,25,false,0.025,`;

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
50,B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,true,1000000,0.08,0.05`;

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
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,-1000,-5,true,-0.05,-0.08`;

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
B62qrQKS9ghd91shs73TCmBJRW9GzvTJK443DPx2YbqcyoLc56g1ny9,1e9,1000,true,1e-2,1e-3`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].total_stake).toBe(1000000000);
      expect(result[0].num_delegators).toBe(1000); // parseInt doesn't support scientific notation
      expect(result[0].percent_total_stake).toBe(0.01);
      expect(result[0].percent_total_active_stake).toBe(0.001);
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
B62q+/=Test123,1000,50,true,0.05,0.08`;

      const result = blockProducerService.parseCSV(csv);
      expect(result[0].public_key).toBe('B62q+/=Test123');
    });
  });
});

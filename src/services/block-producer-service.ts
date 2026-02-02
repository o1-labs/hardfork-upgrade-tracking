import { BlockProducer } from '../types/block-producer';
import { blockProducerRepository } from '../repositories/block-producer-repository';

interface CSVBlockProducer {
  public_key: string;
  total_stake: number;
  num_delegators: number;
  is_active: boolean;
  percent_total_stake: number;
  percent_total_active_stake: number | null;
}

export const blockProducerService = {
  parseCSV(csvContent: string): CSVBlockProducer[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const header = lines[0].split(',').map((h) => h.trim());
    const expectedHeaders = [
      'bp_public_key',
      'total_stake',
      'num_delegators',
      'is_active',
      'percent_total_stake',
      'percent_total_active_stake',
    ];

    for (const expected of expectedHeaders) {
      if (!header.includes(expected)) {
        throw new Error(`Missing required column: ${expected}`);
      }
    }

    const colIndex = {
      public_key: header.indexOf('bp_public_key'),
      total_stake: header.indexOf('total_stake'),
      num_delegators: header.indexOf('num_delegators'),
      is_active: header.indexOf('is_active'),
      percent_total_stake: header.indexOf('percent_total_stake'),
      percent_total_active_stake: header.indexOf('percent_total_active_stake'),
    };

    const producers: CSVBlockProducer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',');

      const publicKey = values[colIndex.public_key]?.trim();
      if (!publicKey) continue;

      const percentActiveStakeStr = values[colIndex.percent_total_active_stake]?.trim();

      producers.push({
        public_key: publicKey,
        total_stake: parseFloat(values[colIndex.total_stake]) || 0,
        num_delegators: parseInt(values[colIndex.num_delegators], 10) || 0,
        is_active: values[colIndex.is_active]?.trim().toLowerCase() === 'true',
        percent_total_stake: parseFloat(values[colIndex.percent_total_stake]) || 0,
        percent_total_active_stake: percentActiveStakeStr ? parseFloat(percentActiveStakeStr) : null,
      });
    }

    return producers;
  },

  async uploadCSV(csvContent: string): Promise<{ total: number; inserted: number; updated: number; unchanged: number }> {
    const producers = this.parseCSV(csvContent);
    const result = await blockProducerRepository.syncFromCSV(producers);
    return { total: producers.length, ...result };
  },

  async getLastSyncTime(): Promise<string | null> {
    return blockProducerRepository.getLastSyncTime();
  },

  async getAll(): Promise<BlockProducer[]> {
    return blockProducerRepository.findAll();
  },

  async getByPublicKey(publicKey: string): Promise<BlockProducer | null> {
    return blockProducerRepository.findByPublicKey(publicKey);
  },
};

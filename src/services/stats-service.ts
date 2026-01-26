import { NodeStats } from '../types/node-stats';
import { statsRepository } from '../repositories/stats-repository';

export const statsService = {
  async submitStats(stats: NodeStats): Promise<void> {
    await statsRepository.save(stats);
  },

  async getAll(): Promise<NodeStats[]> {
    return statsRepository.findAll();
  },

  async getByPeerId(peerId: string): Promise<NodeStats | null> {
    return statsRepository.findByPeerId(peerId);
  },
};

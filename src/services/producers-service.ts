import { BlockProducer } from '../types/block-producer';
import { producersRepository } from '../repositories/producers-repository';

export const producersService = {
  async getAll(): Promise<BlockProducer[]> {
    return producersRepository.findAll();
  },

  async getByPublicKey(publicKey: string): Promise<BlockProducer | null> {
    return producersRepository.findByPublicKey(publicKey);
  },

  async getUpgraded(): Promise<BlockProducer[]> {
    return producersRepository.findUpgraded();
  },

  async getPending(): Promise<BlockProducer[]> {
    return producersRepository.findPending();
  },

  async getStats() {
    const all = await producersRepository.findAll();
    const upgraded = await producersRepository.findUpgraded();

    const activeProducers = all.filter(p => p.is_active);
    const upgradedActive = upgraded.filter(p => p.is_active);

    const totalActiveStake = activeProducers.reduce(
      (sum, p) => sum + (p.percent_total_active_stake || 0),
      0
    );
    const upgradedActiveStake = upgradedActive.reduce(
      (sum, p) => sum + (p.percent_total_active_stake || 0),
      0
    );

    return {
      total: all.length,
      upgraded: upgraded.length,
      pending: all.length - upgraded.length,
      percentage: all.length > 0 ? Math.round((upgraded.length / all.length) * 100) : 0,
      totalActiveStake,
      upgradedActiveStake,
      stakePercentage: totalActiveStake > 0 ? Math.round((upgradedActiveStake / totalActiveStake) * 100) : 0,
    };
  },
};

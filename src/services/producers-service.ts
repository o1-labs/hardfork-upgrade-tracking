import { BlockProducer } from '../types/block-producer';
import { producersRepository } from '../repositories/producers-repository';

export const producersService = {
  getAll(): BlockProducer[] {
    return producersRepository.findAll();
  },

  getByPublicKey(publicKey: string): BlockProducer | undefined {
    return producersRepository.findByPublicKey(publicKey);
  },

  getUpgraded(): BlockProducer[] {
    return producersRepository.findUpgraded();
  },

  getPending(): BlockProducer[] {
    return producersRepository.findPending();
  },

  getStats() {
    const all = producersRepository.findAll();
    const upgraded = producersRepository.findUpgraded();
    const totalStake = all.reduce((sum, p) => sum + p.stake, 0);
    const upgradedStake = upgraded.reduce((sum, p) => sum + p.stake, 0);

    return {
      total: all.length,
      upgraded: upgraded.length,
      pending: all.length - upgraded.length,
      percentage: Math.round((upgraded.length / all.length) * 100),
      totalStake,
      upgradedStake,
      stakePercentage: Math.round((upgradedStake / totalStake) * 100),
    };
  },
};

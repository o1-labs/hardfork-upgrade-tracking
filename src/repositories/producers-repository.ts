import { BlockProducer } from '../types/block-producer';
import { blockProducers } from '../data/block-producers';

export const producersRepository = {
  findAll(): BlockProducer[] {
    return blockProducers;
  },

  findByPublicKey(publicKey: string): BlockProducer | undefined {
    return blockProducers.find(p => p.block_producer_public_key === publicKey);
  },

  findUpgraded(): BlockProducer[] {
    return blockProducers.filter(p => p.upgraded);
  },

  findPending(): BlockProducer[] {
    return blockProducers.filter(p => !p.upgraded);
  },
};

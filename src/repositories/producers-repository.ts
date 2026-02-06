import { blockProducerRepository } from './block-producer-repository';

export const producersRepository = {
  findAll() {
    return blockProducerRepository.findAll();
  },

  findByPublicKey(publicKey: string) {
    return blockProducerRepository.findByPublicKey(publicKey);
  },

  findUpgraded() {
    return blockProducerRepository.findUpgraded();
  },

  findPending() {
    return blockProducerRepository.findPending();
  },
};

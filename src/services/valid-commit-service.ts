import { validCommitRepository, ValidCommit } from '../repositories/valid-commit-repository';
import { clearUpgradeCache } from '../utils/upgrade-check';

export const validCommitService = {
  async addCommit(hash: string, label?: string): Promise<ValidCommit> {
    const commit = await validCommitRepository.addCommit(hash, label);
    clearUpgradeCache();
    return commit;
  },

  async addCommits(commits: { hash: string; label?: string }[]): Promise<{ added: number }> {
    const count = await validCommitRepository.addCommits(commits);
    clearUpgradeCache();
    return { added: count };
  },

  async getAll(): Promise<ValidCommit[]> {
    return validCommitRepository.findAll();
  },

  async isValid(hash: string): Promise<boolean> {
    return validCommitRepository.isValidCommit(hash);
  },

  async deleteCommit(hash: string): Promise<void> {
    await validCommitRepository.deleteByHash(hash);
    clearUpgradeCache();
  },

  async getValidHashes(): Promise<Set<string>> {
    return validCommitRepository.getAllHashes();
  },
};

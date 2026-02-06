import { prisma } from '../db';

export interface ValidCommit {
  hash: string;
  label?: string | null;
  createdAt: Date;
}

export const validCommitRepository = {
  async addCommit(hash: string, label?: string): Promise<ValidCommit> {
    const record = await prisma.validCommit.create({
      data: { hash, label },
    });
    return record;
  },

  async addCommits(commits: { hash: string; label?: string }[]): Promise<number> {
    const result = await prisma.validCommit.createMany({
      data: commits,
      skipDuplicates: true,
    });
    return result.count;
  },

  async findAll(): Promise<ValidCommit[]> {
    return prisma.validCommit.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByHash(hash: string): Promise<ValidCommit | null> {
    return prisma.validCommit.findUnique({
      where: { hash },
    });
  },

  async isValidCommit(hash: string): Promise<boolean> {
    const record = await prisma.validCommit.findUnique({
      where: { hash },
    });
    return record !== null;
  },

  async deleteByHash(hash: string): Promise<void> {
    await prisma.validCommit.delete({
      where: { hash },
    });
  },

  async getAllHashes(): Promise<Set<string>> {
    const records = await prisma.validCommit.findMany({
      select: { hash: true },
    });
    return new Set(records.map((r) => r.hash));
  },
};

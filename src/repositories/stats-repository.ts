import { prisma } from '../db';
import { NodeStats as PrismaNodeStats } from '../generated/prisma/client';
import { NodeStats } from '../types/node-stats';
import { isUpgraded } from '../utils/upgrade-check';

export const statsRepository = {
  async save(stats: NodeStats): Promise<void> {
    const upgraded = await isUpgraded(stats);
    await prisma.nodeStats.upsert({
      where: { peerId: stats.peer_id },
      update: {
        maxObservedBlockHeight: stats.max_observed_block_height,
        commitHash: stats.commit_hash,
        chainId: stats.chain_id,
        peerCount: stats.peer_count,
        timestamp: new Date(stats.timestamp),
        blockProducerPublicKey: stats.block_producer_public_key,
        upgraded,
      },
      create: {
        maxObservedBlockHeight: stats.max_observed_block_height,
        commitHash: stats.commit_hash,
        chainId: stats.chain_id,
        peerId: stats.peer_id,
        peerCount: stats.peer_count,
        timestamp: new Date(stats.timestamp),
        blockProducerPublicKey: stats.block_producer_public_key,
        upgraded,
      },
    });
  },

  async findAll(): Promise<NodeStats[]> {
    const records = await prisma.nodeStats.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: PrismaNodeStats) => ({
      max_observed_block_height: r.maxObservedBlockHeight,
      commit_hash: r.commitHash,
      chain_id: r.chainId,
      peer_id: r.peerId,
      peer_count: r.peerCount,
      timestamp: r.timestamp.toISOString(),
      block_producer_public_key: r.blockProducerPublicKey ?? undefined,
      upgraded: r.upgraded,
    }));
  },

  async findByPeerId(peerId: string): Promise<NodeStats | null> {
    const record = await prisma.nodeStats.findUnique({
      where: { peerId },
    });
    if (!record) return null;
    return {
      max_observed_block_height: record.maxObservedBlockHeight,
      commit_hash: record.commitHash,
      chain_id: record.chainId,
      peer_id: record.peerId,
      peer_count: record.peerCount,
      timestamp: record.timestamp.toISOString(),
      block_producer_public_key: record.blockProducerPublicKey ?? undefined,
      upgraded: record.upgraded,
    };
  },
};

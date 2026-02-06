import { prisma } from '../db';
import { BlockProducer } from '../types/block-producer';
import { BlockProducer as PrismaBlockProducer } from '../generated/prisma/client';

interface CSVBlockProducer {
  public_key: string;
  total_stake: number;
  num_delegators: number;
  is_active: boolean;
  percent_total_stake: number;
  percent_total_active_stake: number | null;
}

export const blockProducerRepository = {
  async syncFromCSV(producers: CSVBlockProducer[]): Promise<{ inserted: number; updated: number; unchanged: number }> {
    const total = producers.length;
    console.log(`Starting sync of ${total} block producers...`);

    // Fetch all existing records into a Map for fast lookup
    console.log('Fetching existing records...');
    const existingRecords = await prisma.blockProducer.findMany();
    const existingMap = new Map(existingRecords.map((r) => [r.publicKey, r]));
    console.log(`Found ${existingRecords.length} existing records`);

    const toInsert: CSVBlockProducer[] = [];
    const toUpdate: CSVBlockProducer[] = [];
    let unchanged = 0;

    // Compare and categorize
    for (const producer of producers) {
      const existing = existingMap.get(producer.public_key);
      if (!existing) {
        toInsert.push(producer);
      } else if (
        existing.totalStake !== producer.total_stake ||
        existing.numDelegators !== producer.num_delegators ||
        existing.isActive !== producer.is_active ||
        existing.percentTotalStake !== producer.percent_total_stake ||
        existing.percentTotalActiveStake !== producer.percent_total_active_stake
      ) {
        toUpdate.push(producer);
      } else {
        unchanged++;
      }
    }

    console.log(`To insert: ${toInsert.length}, To update: ${toUpdate.length}, Unchanged: ${unchanged}`);

    // Bulk insert new records
    if (toInsert.length > 0) {
      console.log(`Inserting ${toInsert.length} new records...`);
      const BATCH_SIZE = 5000;
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        await prisma.blockProducer.createMany({
          data: batch.map((producer) => ({
            publicKey: producer.public_key,
            totalStake: producer.total_stake,
            numDelegators: producer.num_delegators,
            isActive: producer.is_active,
            percentTotalStake: producer.percent_total_stake,
            percentTotalActiveStake: producer.percent_total_active_stake,
            upgraded: false,
          })),
        });
        console.log(`Inserted ${Math.min(i + BATCH_SIZE, toInsert.length)}/${toInsert.length}`);
      }
    }

    // Update changed records (no transaction needed, each update is independent)
    if (toUpdate.length > 0) {
      console.log(`Updating ${toUpdate.length} changed records...`);
      const BATCH_SIZE = 100;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map((producer) =>
            prisma.blockProducer.update({
              where: { publicKey: producer.public_key },
              data: {
                totalStake: producer.total_stake,
                numDelegators: producer.num_delegators,
                isActive: producer.is_active,
                percentTotalStake: producer.percent_total_stake,
                percentTotalActiveStake: producer.percent_total_active_stake,
              },
            })
          )
        );
        console.log(`Updated ${Math.min(i + BATCH_SIZE, toUpdate.length)}/${toUpdate.length}`);
      }
    }

    // Update sync metadata
    await prisma.syncMetadata.upsert({
      where: { key: 'block_producers_last_sync' },
      update: { value: new Date().toISOString() },
      create: { key: 'block_producers_last_sync', value: new Date().toISOString() },
    });

    console.log(`Done! Inserted: ${toInsert.length}, Updated: ${toUpdate.length}, Unchanged: ${unchanged}`);
    return { inserted: toInsert.length, updated: toUpdate.length, unchanged };
  },

  async getLastSyncTime(): Promise<string | null> {
    const record = await prisma.syncMetadata.findUnique({
      where: { key: 'block_producers_last_sync' },
    });
    return record?.value ?? null;
  },

  async findAll(): Promise<BlockProducer[]> {
    const records = await prisma.blockProducer.findMany({
      orderBy: { percentTotalStake: 'desc' },
    });
    return records.map((r: PrismaBlockProducer) => ({
      public_key: r.publicKey,
      total_stake: r.totalStake,
      num_delegators: r.numDelegators,
      is_active: r.isActive,
      percent_total_stake: r.percentTotalStake,
      percent_total_active_stake: r.percentTotalActiveStake,
      upgraded: r.upgraded,
    }));
  },

  async findByPublicKey(publicKey: string): Promise<BlockProducer | null> {
    const record = await prisma.blockProducer.findUnique({
      where: { publicKey },
    });
    if (!record) return null;
    return {
      public_key: record.publicKey,
      total_stake: record.totalStake,
      num_delegators: record.numDelegators,
      is_active: record.isActive,
      percent_total_stake: record.percentTotalStake,
      percent_total_active_stake: record.percentTotalActiveStake,
      upgraded: record.upgraded,
    };
  },

  async findUpgraded(): Promise<BlockProducer[]> {
    const records = await prisma.blockProducer.findMany({
      where: { upgraded: true },
      orderBy: { percentTotalStake: 'desc' },
    });
    return records.map((r: PrismaBlockProducer) => ({
      public_key: r.publicKey,
      total_stake: r.totalStake,
      num_delegators: r.numDelegators,
      is_active: r.isActive,
      percent_total_stake: r.percentTotalStake,
      percent_total_active_stake: r.percentTotalActiveStake,
      upgraded: r.upgraded,
    }));
  },

  async findPending(): Promise<BlockProducer[]> {
    const records = await prisma.blockProducer.findMany({
      where: { upgraded: false },
      orderBy: { percentTotalStake: 'desc' },
    });
    return records.map((r: PrismaBlockProducer) => ({
      public_key: r.publicKey,
      total_stake: r.totalStake,
      num_delegators: r.numDelegators,
      is_active: r.isActive,
      percent_total_stake: r.percentTotalStake,
      percent_total_active_stake: r.percentTotalActiveStake,
      upgraded: r.upgraded,
    }));
  },

  async deleteAll(): Promise<void> {
    await prisma.blockProducer.deleteMany();
  },

  async setUpgraded(publicKey: string, upgraded: boolean): Promise<void> {
    await prisma.blockProducer.update({
      where: { publicKey },
      data: { upgraded },
    });
  },
};

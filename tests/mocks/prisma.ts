// Mock Prisma client for testing
export const mockPrisma = {
  nodeStats: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
  },
  blockProducer: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  validCommit: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    delete: jest.fn(),
  },
  syncMetadata: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
};

jest.mock('../../src/db', () => ({
  prisma: mockPrisma,
}));

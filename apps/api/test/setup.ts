// Jest setup file
import 'reflect-metadata';

// Mock console.warn and console.error in tests to reduce noise
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test utilities
global.createMockPrismaService = () => ({
  invoice: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  company: {
    findUnique: jest.fn(),
  },
  wallet: {
    findMany: jest.fn(),
  },
  exchangeAccount: {
    findMany: jest.fn(),
  },
  cryptoAsset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  cryptoLot: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  cryptoTransaction: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  priceHistory: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  fiscalYear: {
    findFirst: jest.fn(),
  },
  $queryRaw: jest.fn(),
});

// Re-export everything from Prisma Client
export * from '@prisma/client';

// Export NestJS integration
export { PrismaService } from './prisma.service.js';
export { PrismaModule } from './prisma.module.js';
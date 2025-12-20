import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService extends PrismaClient and integrates with NestJS lifecycle.
 * Handles connection and disconnection automatically.
 * Supports read replicas for multi-region deployment.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readReplicas: Map<string, PrismaClient> = new Map();
  private replicaUrls: Map<string, string> = new Map();

  constructor() {
    super({
      log:
        process.env['NODE_ENV'] === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });

    this.initializeReadReplicas();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.connectReadReplicas();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.disconnectReadReplicas();
  }

  /**
   * Initialize read replica configurations from environment variables.
   */
  private initializeReadReplicas(): void {
    if (process.env['DATABASE_READ_REPLICA_EU']) {
      this.replicaUrls.set('eu', process.env['DATABASE_READ_REPLICA_EU']);
    }
    if (process.env['DATABASE_READ_REPLICA_US']) {
      this.replicaUrls.set('us', process.env['DATABASE_READ_REPLICA_US']);
    }
    if (process.env['DATABASE_READ_REPLICA_ASIA']) {
      this.replicaUrls.set('asia', process.env['DATABASE_READ_REPLICA_ASIA']);
    }
  }

  /**
   * Connect all read replicas.
   */
  private async connectReadReplicas(): Promise<void> {
    for (const [region, url] of this.replicaUrls.entries()) {
      const replica = new PrismaClient({
        datasources: {
          db: {
            url,
          },
        },
        log:
          process.env['NODE_ENV'] === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
      });

      await replica.$connect();
      this.readReplicas.set(region, replica);
    }
  }

  /**
   * Disconnect all read replicas.
   */
  private async disconnectReadReplicas(): Promise<void> {
    for (const replica of this.readReplicas.values()) {
      await replica.$disconnect();
    }
    this.readReplicas.clear();
  }

  /**
   * Get a read replica client for the specified region.
   * Falls back to primary database if replica is not available.
   *
   * @param region - The region to get the read replica for (eu, us, asia)
   * @returns PrismaClient instance for the region
   */
  getReadReplica(region?: string): PrismaClient {
    if (!region || this.readReplicas.size === 0) {
      return this;
    }

    const replica = this.readReplicas.get(region);
    if (replica) {
      return replica;
    }

    // Fallback to any available replica
    const firstReplica = this.readReplicas.values().next().value;
    if (firstReplica) {
      return firstReplica as PrismaClient;
    }

    // Fallback to primary
    return this;
  }

  /**
   * Execute a read operation on the nearest read replica.
   * Automatically selects the replica based on the region.
   *
   * @param region - The region to read from
   * @param operation - The read operation to execute
   * @returns The result of the operation
   */
  async readFromReplica<T>(
    region: string | undefined,
    operation: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const client = this.getReadReplica(region);
    return operation(client);
  }

  /**
   * Get the number of connected read replicas.
   */
  getReplicaCount(): number {
    return this.readReplicas.size;
  }

  /**
   * Get the list of available replica regions.
   */
  getAvailableRegions(): string[] {
    return Array.from(this.readReplicas.keys());
  }

  /**
   * Clean database for testing purposes.
   * Only available in test environment.
   */
  async cleanDatabase(): Promise<void> {
    if (process.env['NODE_ENV'] !== 'test') {
      throw new Error('cleanDatabase can only be called in test environment');
    }

    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }
}
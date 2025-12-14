import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private readonly defaultTTL = 3600; // 1 hour

  constructor(private configService: ConfigService) {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              this.logger.error('Redis connection failed after 3 retries');
              return null;
            }
            return Math.min(times * 200, 1000);
          },
        });

        this.redis.on('connect', () => {
          this.logger.log('Redis connected successfully');
        });

        this.redis.on('error', (err) => {
          this.logger.error('Redis connection error:', err);
        });
      } else {
        this.logger.warn('Redis URL not configured, caching will be disabled');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const fullKey = this.buildKey(key, options);
      const value = await this.redis.get(fullKey);

      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.redis) return;

    try {
      const fullKey = this.buildKey(key, options);
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);

      await this.redis.setex(fullKey, ttl, serialized);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string, options?: CacheOptions): Promise<void> {
    if (!this.redis) return;

    try {
      const fullKey = this.buildKey(key, options);
      await this.redis.del(fullKey);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern: string, options?: CacheOptions): Promise<void> {
    if (!this.redis) return;

    try {
      const fullPattern = this.buildKey(pattern, options);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Deleted ${keys.length} keys matching pattern: ${fullPattern}`);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return cached;
    }

    // Cache miss - fetch data
    this.logger.debug(`Cache miss for key: ${key}, fetching...`);
    const data = await fetchFn();

    // Store in cache for next time
    await this.set(key, data, options);

    return data;
  }

  /**
   * Invalidate all cache entries for a company
   */
  async invalidateCompanyCache(companyId: string): Promise<void> {
    await this.deletePattern(`company:${companyId}:*`);
  }

  /**
   * Invalidate all cache entries for a user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.deletePattern(`user:${userId}:*`);
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string, options?: CacheOptions): string {
    const prefix = options?.prefix || 'crypto-erp';
    return `${prefix}:${key}`;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ hits: number; misses: number; keys: number }> {
    if (!this.redis) {
      return { hits: 0, misses: 0, keys: 0 };
    }

    try {
      const info = await this.redis.info('stats');
      const hits = this.parseInfoValue(info, 'keyspace_hits');
      const misses = this.parseInfoValue(info, 'keyspace_misses');

      const dbSize = await this.redis.dbsize();

      return {
        hits,
        misses,
        keys: dbSize,
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return { hits: 0, misses: 0, keys: 0 };
    }
  }

  private parseInfoValue(info: string, key: string): number {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.flushdb();
      this.logger.log('All cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

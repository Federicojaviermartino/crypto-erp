"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CacheService", {
    enumerable: true,
    get: function() {
        return CacheService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _ioredis = require("ioredis");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CacheService = class CacheService {
    initializeRedis() {
        try {
            const redisUrl = this.configService.get('REDIS_URL');
            if (redisUrl) {
                this.redis = new _ioredis.Redis(redisUrl, {
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times)=>{
                        if (times > 3) {
                            this.logger.error('Redis connection failed after 3 retries');
                            return null;
                        }
                        return Math.min(times * 200, 1000);
                    }
                });
                this.redis.on('connect', ()=>{
                    this.logger.log('Redis connected successfully');
                });
                this.redis.on('error', (err)=>{
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
   */ async get(key, options) {
        if (!this.redis) return null;
        try {
            const fullKey = this.buildKey(key, options);
            const value = await this.redis.get(fullKey);
            if (!value) return null;
            return JSON.parse(value);
        } catch (error) {
            this.logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }
    /**
   * Set a value in cache
   */ async set(key, value, options) {
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
   */ async delete(key, options) {
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
   */ async deletePattern(pattern, options) {
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
   */ async getOrSet(key, fetchFn, options) {
        // Try to get from cache first
        const cached = await this.get(key, options);
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
   */ async invalidateCompanyCache(companyId) {
        await this.deletePattern(`company:${companyId}:*`);
    }
    /**
   * Invalidate all cache entries for a user
   */ async invalidateUserCache(userId) {
        await this.deletePattern(`user:${userId}:*`);
    }
    /**
   * Build full cache key with prefix
   */ buildKey(key, options) {
        const prefix = options?.prefix || 'crypto-erp';
        return `${prefix}:${key}`;
    }
    /**
   * Health check
   */ async isHealthy() {
        if (!this.redis) return false;
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        } catch  {
            return false;
        }
    }
    /**
   * Get cache statistics
   */ async getStats() {
        if (!this.redis) {
            return {
                hits: 0,
                misses: 0,
                keys: 0
            };
        }
        try {
            const info = await this.redis.info('stats');
            const hits = this.parseInfoValue(info, 'keyspace_hits');
            const misses = this.parseInfoValue(info, 'keyspace_misses');
            const dbSize = await this.redis.dbsize();
            return {
                hits,
                misses,
                keys: dbSize
            };
        } catch (error) {
            this.logger.error('Failed to get cache stats:', error);
            return {
                hits: 0,
                misses: 0,
                keys: 0
            };
        }
    }
    parseInfoValue(info, key) {
        const match = info.match(new RegExp(`${key}:(\\d+)`));
        return match ? parseInt(match[1], 10) : 0;
    }
    /**
   * Clear all cache
   */ async clearAll() {
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
   */ async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(CacheService.name);
        this.redis = null;
        this.defaultTTL = 3600; // 1 hour
        this.initializeRedis();
    }
};
CacheService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], CacheService);

//# sourceMappingURL=cache.service.js.map
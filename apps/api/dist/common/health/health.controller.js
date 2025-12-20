"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "HealthController", {
    enumerable: true,
    get: function() {
        return HealthController;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _bullmq = require("@nestjs/bullmq");
const _bullmq1 = require("bullmq");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let HealthController = class HealthController {
    async check() {
        const [dbOk, redisOk] = await Promise.all([
            this.checkDatabase(),
            this.checkRedis()
        ]);
        return {
            status: dbOk && redisOk ? 'ok' : 'error',
            timestamp: new Date(),
            services: {
                database: dbOk ? 'healthy' : 'unhealthy',
                redis: redisOk ? 'healthy' : 'unhealthy'
            },
            uptime: process.uptime()
        };
    }
    async liveness() {
        return {
            status: 'ok',
            timestamp: new Date()
        };
    }
    async readiness() {
        return this.check();
    }
    async regionalHealth() {
        const primaryRegion = process.env['DATABASE_PRIMARY_REGION'] || 'eu';
        const [primaryOk, replicaStatuses, redisOk] = await Promise.all([
            this.checkDatabase(),
            this.checkReadReplicas(),
            this.checkRedis()
        ]);
        const replicaCount = this.prisma.getReplicaCount();
        const allHealthy = primaryOk && redisOk && replicaStatuses.every((r)=>r.status === 'healthy');
        const anyUnhealthy = !primaryOk || !redisOk || replicaStatuses.some((r)=>r.status === 'unhealthy');
        return {
            status: allHealthy ? 'ok' : anyUnhealthy ? 'error' : 'degraded',
            timestamp: new Date(),
            region: primaryRegion,
            services: {
                primaryDatabase: primaryOk ? 'healthy' : 'unhealthy',
                readReplicas: replicaStatuses,
                redis: redisOk ? 'healthy' : 'unhealthy'
            },
            replicaCount,
            uptime: process.uptime()
        };
    }
    async checkDatabase() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
    async checkRedis() {
        try {
            await this.emailQueue.client.ping();
            return true;
        } catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    }
    async checkReadReplicas() {
        const regions = this.prisma.getAvailableRegions();
        const results = await Promise.all(regions.map(async (region)=>{
            const startTime = Date.now();
            try {
                const replica = this.prisma.getReadReplica(region);
                await replica.$queryRaw`SELECT 1`;
                const latency = Date.now() - startTime;
                return {
                    region,
                    status: 'healthy',
                    latency
                };
            } catch (error) {
                console.error(`Read replica health check failed for ${region}:`, error);
                return {
                    region,
                    status: 'unhealthy',
                    latency: -1
                };
            }
        }));
        return results;
    }
    constructor(prisma, emailQueue){
        this.prisma = prisma;
        this.emailQueue = emailQueue;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
_ts_decorate([
    (0, _common.Get)('liveness'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], HealthController.prototype, "liveness", null);
_ts_decorate([
    (0, _common.Get)('readiness'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], HealthController.prototype, "readiness", null);
_ts_decorate([
    (0, _common.Get)('regional'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], HealthController.prototype, "regionalHealth", null);
HealthController = _ts_decorate([
    (0, _common.Controller)('health'),
    _ts_param(1, (0, _bullmq.InjectQueue)('email-send')),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _bullmq1.Queue === "undefined" ? Object : _bullmq1.Queue
    ])
], HealthController);

//# sourceMappingURL=health.controller.js.map
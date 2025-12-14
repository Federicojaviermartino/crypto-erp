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
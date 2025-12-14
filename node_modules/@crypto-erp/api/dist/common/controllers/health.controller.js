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
const _swagger = require("@nestjs/swagger");
const _database = require("../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let HealthController = class HealthController {
    async check() {
        const startTime = Date.now();
        try {
            // Check database connection
            await this.prisma.$queryRaw`SELECT 1`;
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                responseTime: Date.now() - startTime,
                checks: {
                    database: 'ok'
                }
            };
        } catch  {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                responseTime: Date.now() - startTime,
                checks: {
                    database: 'error'
                }
            };
        }
    }
    async ready() {
        return {
            status: 'ready',
            timestamp: new Date().toISOString()
        };
    }
    async live() {
        return {
            status: 'alive',
            timestamp: new Date().toISOString()
        };
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
_ts_decorate([
    (0, _common.Get)(),
    (0, _swagger.ApiOperation)({
        summary: 'Health check endpoint'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Service is healthy'
    }),
    (0, _swagger.ApiResponse)({
        status: 503,
        description: 'Service is unhealthy'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], HealthController.prototype, "check", null);
_ts_decorate([
    (0, _common.Get)('ready'),
    (0, _swagger.ApiOperation)({
        summary: 'Readiness check endpoint'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Service is ready'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
_ts_decorate([
    (0, _common.Get)('live'),
    (0, _swagger.ApiOperation)({
        summary: 'Liveness check endpoint'
    }),
    (0, _swagger.ApiResponse)({
        status: 200,
        description: 'Service is alive'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], HealthController.prototype, "live", null);
HealthController = _ts_decorate([
    (0, _swagger.ApiTags)('Health'),
    (0, _common.Controller)('health'),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], HealthController);

//# sourceMappingURL=health.controller.js.map
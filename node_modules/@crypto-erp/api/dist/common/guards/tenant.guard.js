"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TenantGuard", {
    enumerable: true,
    get: function() {
        return TenantGuard;
    }
});
const _common = require("@nestjs/common");
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
let TenantGuard = class TenantGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new _common.ForbiddenException('User not authenticated');
        }
        const companyId = this.extractCompanyId(request);
        if (!companyId) {
            throw new _common.BadRequestException('Company ID required. Use X-Company-Id header.');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(companyId)) {
            throw new _common.BadRequestException('Invalid company ID format');
        }
        const companyUser = await this.prisma.companyUser.findUnique({
            where: {
                userId_companyId: {
                    userId: user.sub,
                    companyId
                }
            },
            include: {
                company: true
            }
        });
        if (!companyUser) {
            throw new _common.ForbiddenException('Access denied to this company');
        }
        if (companyUser.company.deletedAt) {
            throw new _common.ForbiddenException('Company has been deleted');
        }
        request.companyContext = {
            company: companyUser.company,
            role: companyUser.role
        };
        return true;
    }
    extractCompanyId(request) {
        const header = request.headers['x-company-id'];
        if (typeof header === 'string') return header;
        const params = request.params;
        if (params['companyId']) return params['companyId'];
        const query = request.query;
        if (typeof query['companyId'] === 'string') return query['companyId'];
        return null;
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
TenantGuard = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], TenantGuard);

//# sourceMappingURL=tenant.guard.js.map
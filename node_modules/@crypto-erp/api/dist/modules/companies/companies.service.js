"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CompaniesService", {
    enumerable: true,
    get: function() {
        return CompaniesService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../libs/database/src");
const _pgcaccounts = require("./data/pgc-accounts.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let CompaniesService = class CompaniesService {
    async create(userId, dto) {
        return this.prisma.$transaction(async (tx)=>{
            // Create company
            const company = await tx.company.create({
                data: {
                    name: dto.name,
                    legalName: dto.legalName,
                    taxId: dto.taxId,
                    taxIdType: dto.taxIdType,
                    address: dto.address,
                    city: dto.city,
                    province: dto.province,
                    postalCode: dto.postalCode,
                    country: dto.country || 'ES',
                    phone: dto.phone,
                    email: dto.email,
                    website: dto.website,
                    fiscalYearStart: dto.fiscalYearStart || 1
                }
            });
            // Create CompanyUser with OWNER role
            await tx.companyUser.create({
                data: {
                    userId,
                    companyId: company.id,
                    role: _database.UserRole.OWNER,
                    isDefault: true
                }
            });
            // Seed PGC accounts
            await tx.account.createMany({
                data: _pgcaccounts.SPANISH_PGC_ACCOUNTS.map((acc)=>({
                        companyId: company.id,
                        code: acc.code,
                        name: acc.name,
                        type: acc.type,
                        parentCode: acc.parentCode,
                        isSystem: true,
                        isCrypto: acc.code.startsWith('305')
                    }))
            });
            // Seed invoice series
            await tx.invoiceSeries.createMany({
                data: _pgcaccounts.DEFAULT_INVOICE_SERIES.map((series)=>({
                        companyId: company.id,
                        code: series.code,
                        name: series.name,
                        type: series.type,
                        isDefault: series.isDefault
                    }))
            });
            // Seed crypto assets
            await tx.cryptoAsset.createMany({
                data: _pgcaccounts.DEFAULT_CRYPTO_ASSETS.map((asset)=>({
                        companyId: company.id,
                        symbol: asset.symbol,
                        name: asset.name,
                        decimals: asset.decimals,
                        coingeckoId: asset.coingeckoId
                    }))
            });
            // Create current fiscal year
            const currentYear = new Date().getFullYear();
            const fiscalStart = dto.fiscalYearStart || 1;
            await tx.fiscalYear.create({
                data: {
                    companyId: company.id,
                    name: String(currentYear),
                    startDate: new Date(currentYear, fiscalStart - 1, 1),
                    endDate: new Date(currentYear + 1, fiscalStart - 1, 0)
                }
            });
            return company;
        });
    }
    async findAllByUser(userId) {
        const companyUsers = await this.prisma.companyUser.findMany({
            where: {
                userId
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        legalName: true,
                        taxId: true,
                        city: true,
                        country: true,
                        createdAt: true
                    }
                }
            },
            orderBy: {
                company: {
                    name: 'asc'
                }
            }
        });
        return companyUsers.map((cu)=>({
                ...cu.company,
                role: cu.role,
                isDefault: cu.isDefault
            }));
    }
    async findById(companyId, userId) {
        const companyUser = await this.prisma.companyUser.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId
                }
            },
            include: {
                company: true
            }
        });
        if (!companyUser) {
            throw new _common.NotFoundException('Company not found');
        }
        return {
            ...companyUser.company,
            role: companyUser.role
        };
    }
    async update(companyId, userId, dto) {
        const companyUser = await this.prisma.companyUser.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId
                }
            }
        });
        if (!companyUser) {
            throw new _common.NotFoundException('Company not found');
        }
        if (companyUser.role !== _database.UserRole.OWNER && companyUser.role !== _database.UserRole.ADMIN) {
            throw new _common.ForbiddenException('Only OWNER or ADMIN can update company');
        }
        return this.prisma.company.update({
            where: {
                id: companyId
            },
            data: dto
        });
    }
    async delete(companyId, userId) {
        const companyUser = await this.prisma.companyUser.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId
                }
            }
        });
        if (!companyUser) {
            throw new _common.NotFoundException('Company not found');
        }
        if (companyUser.role !== _database.UserRole.OWNER) {
            throw new _common.ForbiddenException('Only OWNER can delete company');
        }
        // Soft delete
        return this.prisma.company.update({
            where: {
                id: companyId
            },
            data: {
                deletedAt: new Date()
            }
        });
    }
    async setDefault(companyId, userId) {
        // Remove default from all user's companies
        await this.prisma.companyUser.updateMany({
            where: {
                userId
            },
            data: {
                isDefault: false
            }
        });
        // Set new default
        return this.prisma.companyUser.update({
            where: {
                userId_companyId: {
                    userId,
                    companyId
                }
            },
            data: {
                isDefault: true
            }
        });
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
CompaniesService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], CompaniesService);

//# sourceMappingURL=companies.service.js.map
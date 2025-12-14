"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AccountsService", {
    enumerable: true,
    get: function() {
        return AccountsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let AccountsService = class AccountsService {
    async findAll(companyId, query) {
        const where = {
            companyId,
            ...query.type && {
                type: query.type
            },
            ...query.isActive !== undefined && {
                isActive: query.isActive
            },
            ...query.search && {
                OR: [
                    {
                        code: {
                            contains: query.search,
                            mode: 'insensitive'
                        }
                    },
                    {
                        name: {
                            contains: query.search,
                            mode: 'insensitive'
                        }
                    }
                ]
            }
        };
        return this.prisma.account.findMany({
            where,
            orderBy: {
                code: 'asc'
            }
        });
    }
    async findById(companyId, id) {
        const account = await this.prisma.account.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!account) {
            throw new _common.NotFoundException(`Account with ID ${id} not found`);
        }
        return account;
    }
    async findByCode(companyId, code) {
        return this.prisma.account.findFirst({
            where: {
                companyId,
                code
            }
        });
    }
    async findTree(companyId) {
        const accounts = await this.prisma.account.findMany({
            where: {
                companyId,
                isActive: true
            },
            orderBy: {
                code: 'asc'
            }
        });
        // Build tree structure using parentCode
        const accountByCode = new Map();
        const rootAccounts = [];
        // First pass: create map by code
        for (const account of accounts){
            accountByCode.set(account.code, {
                ...account,
                children: []
            });
        }
        // Second pass: build tree using parentCode
        for (const account of accounts){
            const node = accountByCode.get(account.code);
            if (account.parentCode) {
                const parent = accountByCode.get(account.parentCode);
                if (parent) {
                    parent.children = parent.children || [];
                    parent.children.push(node);
                } else {
                    rootAccounts.push(node);
                }
            } else {
                rootAccounts.push(node);
            }
        }
        return rootAccounts;
    }
    async getBalance(companyId, accountId, startDate, endDate) {
        const account = await this.findById(companyId, accountId);
        const where = {
            accountId,
            journalEntry: {
                companyId,
                status: 'POSTED',
                ...startDate && {
                    date: {
                        gte: startDate
                    }
                },
                ...endDate && {
                    date: {
                        lte: endDate
                    }
                }
            }
        };
        const result = await this.prisma.journalLine.aggregate({
            where,
            _sum: {
                debit: true,
                credit: true
            }
        });
        const debit = result._sum.debit?.toNumber() || 0;
        const credit = result._sum.credit?.toNumber() || 0;
        // Calculate balance based on account type
        // ASSET and EXPENSE accounts: debit increases, credit decreases
        // LIABILITY, EQUITY, and INCOME accounts: credit increases, debit decreases
        const isDebitNormal = [
            'ASSET',
            'EXPENSE'
        ].includes(account.type);
        const balance = isDebitNormal ? debit - credit : credit - debit;
        return {
            debit,
            credit,
            balance
        };
    }
    async getBalanceForMultiple(companyId, accountIds, startDate, endDate) {
        const accounts = await this.prisma.account.findMany({
            where: {
                id: {
                    in: accountIds
                },
                companyId
            }
        });
        const accountTypeMap = new Map(accounts.map((a)=>[
                a.id,
                a.type
            ]));
        const lines = await this.prisma.journalLine.groupBy({
            by: [
                'accountId'
            ],
            where: {
                accountId: {
                    in: accountIds
                },
                journalEntry: {
                    companyId,
                    status: 'POSTED',
                    ...startDate && {
                        date: {
                            gte: startDate
                        }
                    },
                    ...endDate && {
                        date: {
                            lte: endDate
                        }
                    }
                }
            },
            _sum: {
                debit: true,
                credit: true
            }
        });
        const result = new Map();
        for (const line of lines){
            const debit = line._sum.debit?.toNumber() || 0;
            const credit = line._sum.credit?.toNumber() || 0;
            const accountType = accountTypeMap.get(line.accountId);
            const isDebitNormal = accountType && [
                'ASSET',
                'EXPENSE'
            ].includes(accountType);
            const balance = isDebitNormal ? debit - credit : credit - debit;
            result.set(line.accountId, {
                debit,
                credit,
                balance
            });
        }
        // Add zero balances for accounts with no entries
        for (const accountId of accountIds){
            if (!result.has(accountId)) {
                result.set(accountId, {
                    debit: 0,
                    credit: 0,
                    balance: 0
                });
            }
        }
        return result;
    }
    async create(companyId, dto) {
        // Check if code already exists
        const existing = await this.findByCode(companyId, dto.code);
        if (existing) {
            throw new _common.ConflictException(`Account with code ${dto.code} already exists`);
        }
        // Validate parent if provided
        if (dto.parentCode) {
            const parent = await this.findByCode(companyId, dto.parentCode);
            if (!parent) {
                throw new _common.NotFoundException(`Parent account with code ${dto.parentCode} not found`);
            }
        }
        return this.prisma.account.create({
            data: {
                code: dto.code,
                name: dto.name,
                type: dto.type,
                parentCode: dto.parentCode || null,
                companyId,
                isActive: true
            }
        });
    }
    async update(companyId, id, dto) {
        await this.findById(companyId, id);
        const updateData = {};
        if (dto.name) updateData.name = dto.name;
        if (dto.type) updateData.type = dto.type;
        if (dto.parentCode !== undefined) {
            if (dto.parentCode) {
                const parent = await this.findByCode(companyId, dto.parentCode);
                if (!parent) {
                    throw new _common.NotFoundException(`Parent account with code ${dto.parentCode} not found`);
                }
            }
            updateData.parentCode = dto.parentCode || null;
        }
        return this.prisma.account.update({
            where: {
                id
            },
            data: updateData
        });
    }
    async deactivate(companyId, id) {
        await this.findById(companyId, id);
        return this.prisma.account.update({
            where: {
                id
            },
            data: {
                isActive: false
            }
        });
    }
    async activate(companyId, id) {
        await this.findById(companyId, id);
        return this.prisma.account.update({
            where: {
                id
            },
            data: {
                isActive: true
            }
        });
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
AccountsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], AccountsService);

//# sourceMappingURL=accounts.service.js.map
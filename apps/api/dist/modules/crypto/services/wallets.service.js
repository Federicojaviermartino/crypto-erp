"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "WalletsService", {
    enumerable: true,
    get: function() {
        return WalletsService;
    }
});
const _common = require("@nestjs/common");
const _database = require("../../../../../../libs/database/src");
const _covalentclient = require("../blockchain/covalent.client.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let WalletsService = class WalletsService {
    async findAll(companyId) {
        return this.prisma.wallet.findMany({
            where: {
                companyId
            },
            orderBy: [
                {
                    isActive: 'desc'
                },
                {
                    createdAt: 'desc'
                }
            ]
        });
    }
    async findById(companyId, id) {
        const wallet = await this.prisma.wallet.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!wallet) {
            throw new _common.NotFoundException(`Wallet with ID ${id} not found`);
        }
        return wallet;
    }
    async findByAddress(companyId, chain, address) {
        return this.prisma.wallet.findFirst({
            where: {
                companyId,
                chain: chain.toLowerCase(),
                address: address.toLowerCase()
            }
        });
    }
    async create(companyId, dto) {
        const normalizedAddress = dto.address.toLowerCase();
        const normalizedChain = dto.chain.toLowerCase();
        // Check for duplicate wallet
        const existing = await this.findByAddress(companyId, normalizedChain, normalizedAddress);
        if (existing) {
            throw new _common.ConflictException(`Wallet ${normalizedAddress} on ${normalizedChain} already exists`);
        }
        return this.prisma.wallet.create({
            data: {
                address: normalizedAddress,
                chain: normalizedChain,
                label: dto.label,
                type: dto.type || 'EXTERNAL',
                accountCode: dto.accountCode,
                syncStatus: 'PENDING',
                companyId
            }
        });
    }
    async update(companyId, id, dto) {
        await this.findById(companyId, id);
        return this.prisma.wallet.update({
            where: {
                id
            },
            data: {
                ...dto.label !== undefined && {
                    label: dto.label
                },
                ...dto.type !== undefined && {
                    type: dto.type
                },
                ...dto.accountCode !== undefined && {
                    accountCode: dto.accountCode
                },
                ...dto.isActive !== undefined && {
                    isActive: dto.isActive
                }
            }
        });
    }
    async delete(companyId, id) {
        const wallet = await this.findById(companyId, id);
        // Check for transactions linked to this wallet
        const txCount = await this.prisma.cryptoTransaction.count({
            where: {
                walletId: id
            }
        });
        if (txCount > 0) {
            throw new _common.ConflictException(`Cannot delete wallet with ${txCount} transactions. Deactivate instead.`);
        }
        await this.prisma.wallet.delete({
            where: {
                id
            }
        });
    }
    async getWalletWithBalances(companyId, id) {
        const wallet = await this.findById(companyId, id);
        if (!this.covalent.isConfigured()) {
            this.logger.warn('Covalent API not configured - cannot fetch balances');
            return wallet;
        }
        try {
            const balances = await this.covalent.getBalances(wallet.chain, wallet.address);
            const totalValueEur = balances.reduce((sum, b)=>sum + (b.quote || 0), 0);
            return {
                ...wallet,
                balances,
                totalValueEur
            };
        } catch (error) {
            this.logger.error(`Failed to fetch balances for wallet ${id}:`, error);
            return wallet;
        }
    }
    async setSyncStatus(id, status, error, lastBlock) {
        await this.prisma.wallet.update({
            where: {
                id
            },
            data: {
                syncStatus: status,
                syncError: error || null,
                ...status === 'SYNCED' && {
                    lastSyncAt: new Date()
                },
                ...lastBlock !== undefined && {
                    lastSyncBlock: lastBlock
                }
            }
        });
    }
    async getWalletsForSync(companyId) {
        return this.prisma.wallet.findMany({
            where: {
                isActive: true,
                ...companyId && {
                    companyId
                },
                syncStatus: {
                    not: 'SYNCING'
                }
            },
            orderBy: {
                lastSyncAt: 'asc'
            }
        });
    }
    async countTransactions(walletId) {
        return this.prisma.cryptoTransaction.count({
            where: {
                walletId
            }
        });
    }
    async getWalletStats(companyId, id) {
        const wallet = await this.findById(companyId, id);
        const [transactionCount, lastTx, assets] = await Promise.all([
            this.prisma.cryptoTransaction.count({
                where: {
                    walletId: id
                }
            }),
            this.prisma.cryptoTransaction.findFirst({
                where: {
                    walletId: id
                },
                orderBy: {
                    blockTimestamp: 'desc'
                },
                select: {
                    blockTimestamp: true
                }
            }),
            this.prisma.cryptoTransaction.groupBy({
                by: [
                    'assetIn',
                    'assetOut'
                ],
                where: {
                    walletId: id
                }
            })
        ]);
        // Count unique assets
        const uniqueAssetSet = new Set();
        assets.forEach((a)=>{
            if (a.assetIn) uniqueAssetSet.add(a.assetIn);
            if (a.assetOut) uniqueAssetSet.add(a.assetOut);
        });
        return {
            transactionCount,
            lastTransaction: lastTx?.blockTimestamp || null,
            uniqueAssets: uniqueAssetSet.size
        };
    }
    constructor(prisma, covalent){
        this.prisma = prisma;
        this.covalent = covalent;
        this.logger = new _common.Logger(WalletsService.name);
    }
};
WalletsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService,
        typeof _covalentclient.CovalentClient === "undefined" ? Object : _covalentclient.CovalentClient
    ])
], WalletsService);

//# sourceMappingURL=wallets.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CryptoAssetsService", {
    enumerable: true,
    get: function() {
        return CryptoAssetsService;
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
let CryptoAssetsService = class CryptoAssetsService {
    async findAll(companyId) {
        return this.prisma.cryptoAsset.findMany({
            where: {
                companyId
            },
            orderBy: {
                symbol: 'asc'
            }
        });
    }
    async findById(companyId, id) {
        const asset = await this.prisma.cryptoAsset.findFirst({
            where: {
                id,
                companyId
            }
        });
        if (!asset) {
            throw new _common.NotFoundException(`Crypto asset with ID ${id} not found`);
        }
        return asset;
    }
    async findBySymbol(companyId, symbol) {
        return this.prisma.cryptoAsset.findFirst({
            where: {
                companyId,
                symbol: symbol.toUpperCase()
            }
        });
    }
    async create(companyId, dto) {
        // Check for duplicate symbol
        const existing = await this.findBySymbol(companyId, dto.symbol);
        if (existing) {
            throw new _common.ConflictException(`Crypto asset with symbol ${dto.symbol} already exists`);
        }
        return this.prisma.cryptoAsset.create({
            data: {
                symbol: dto.symbol.toUpperCase(),
                name: dto.name,
                decimals: dto.decimals ?? 8,
                coingeckoId: dto.coingeckoId,
                isActive: dto.isActive ?? true,
                companyId
            }
        });
    }
    async update(companyId, id, dto) {
        await this.findById(companyId, id);
        // Check for duplicate symbol if changing
        if (dto.symbol) {
            const existing = await this.prisma.cryptoAsset.findFirst({
                where: {
                    companyId,
                    symbol: dto.symbol.toUpperCase(),
                    NOT: {
                        id
                    }
                }
            });
            if (existing) {
                throw new _common.ConflictException(`Crypto asset with symbol ${dto.symbol} already exists`);
            }
        }
        return this.prisma.cryptoAsset.update({
            where: {
                id
            },
            data: {
                ...dto.symbol && {
                    symbol: dto.symbol.toUpperCase()
                },
                ...dto.name && {
                    name: dto.name
                },
                ...dto.decimals !== undefined && {
                    decimals: dto.decimals
                },
                ...dto.coingeckoId !== undefined && {
                    coingeckoId: dto.coingeckoId
                },
                ...dto.isActive !== undefined && {
                    isActive: dto.isActive
                }
            }
        });
    }
    async delete(companyId, id) {
        const asset = await this.findById(companyId, id);
        // Check for cost basis lots referencing this asset
        const lotCount = await this.prisma.cryptoLot.count({
            where: {
                cryptoAssetId: id
            }
        });
        if (lotCount > 0) {
            throw new _common.ConflictException(`Cannot delete asset with ${lotCount} cost basis lots. Deactivate instead.`);
        }
        await this.prisma.cryptoAsset.delete({
            where: {
                id
            }
        });
    }
    constructor(prisma){
        this.prisma = prisma;
    }
};
CryptoAssetsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], CryptoAssetsService);

//# sourceMappingURL=crypto-assets.service.js.map
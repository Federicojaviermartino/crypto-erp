import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CreateCryptoAssetDto } from '../dto/index.js';
import { CryptoAsset } from '@prisma/client';

@Injectable()
export class CryptoAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string): Promise<CryptoAsset[]> {
    return this.prisma.cryptoAsset.findMany({
      where: { companyId },
      orderBy: { symbol: 'asc' },
    });
  }

  async findById(companyId: string, id: string): Promise<CryptoAsset> {
    const asset = await this.prisma.cryptoAsset.findFirst({
      where: { id, companyId },
    });

    if (!asset) {
      throw new NotFoundException(`Crypto asset with ID ${id} not found`);
    }

    return asset;
  }

  async findBySymbol(companyId: string, symbol: string): Promise<CryptoAsset | null> {
    return this.prisma.cryptoAsset.findFirst({
      where: { companyId, symbol: symbol.toUpperCase() },
    });
  }

  async create(companyId: string, dto: CreateCryptoAssetDto): Promise<CryptoAsset> {
    // Check for duplicate symbol
    const existing = await this.findBySymbol(companyId, dto.symbol);
    if (existing) {
      throw new ConflictException(`Crypto asset with symbol ${dto.symbol} already exists`);
    }

    return this.prisma.cryptoAsset.create({
      data: {
        symbol: dto.symbol.toUpperCase(),
        name: dto.name,
        decimals: dto.decimals ?? 8,
        coingeckoId: dto.coingeckoId,
        isActive: dto.isActive ?? true,
        companyId,
      },
    });
  }

  async update(
    companyId: string,
    id: string,
    dto: Partial<CreateCryptoAssetDto>,
  ): Promise<CryptoAsset> {
    await this.findById(companyId, id);

    // Check for duplicate symbol if changing
    if (dto.symbol) {
      const existing = await this.prisma.cryptoAsset.findFirst({
        where: {
          companyId,
          symbol: dto.symbol.toUpperCase(),
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(`Crypto asset with symbol ${dto.symbol} already exists`);
      }
    }

    return this.prisma.cryptoAsset.update({
      where: { id },
      data: {
        ...(dto.symbol && { symbol: dto.symbol.toUpperCase() }),
        ...(dto.name && { name: dto.name }),
        ...(dto.decimals !== undefined && { decimals: dto.decimals }),
        ...(dto.coingeckoId !== undefined && { coingeckoId: dto.coingeckoId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(companyId: string, id: string): Promise<void> {
    const asset = await this.findById(companyId, id);

    // Check for cost basis lots referencing this asset
    const lotCount = await this.prisma.cryptoLot.count({
      where: { cryptoAssetId: id },
    });

    if (lotCount > 0) {
      throw new ConflictException(
        `Cannot delete asset with ${lotCount} cost basis lots. Deactivate instead.`,
      );
    }

    await this.prisma.cryptoAsset.delete({ where: { id } });
  }
}

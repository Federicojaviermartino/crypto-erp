import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService, UserRole } from '@crypto-erp/database';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/index.js';
import {
  SPANISH_PGC_ACCOUNTS,
  DEFAULT_INVOICE_SERIES,
  DEFAULT_CRYPTO_ASSETS,
} from './data/pgc-accounts.js';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCompanyDto) {
    return this.prisma.$transaction(async (tx) => {
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
          fiscalYearStart: dto.fiscalYearStart || 1,
        },
      });

      // Create CompanyUser with OWNER role
      await tx.companyUser.create({
        data: {
          userId,
          companyId: company.id,
          role: UserRole.OWNER,
          isDefault: true,
        },
      });

      // Seed PGC accounts
      await tx.account.createMany({
        data: SPANISH_PGC_ACCOUNTS.map((acc) => ({
          companyId: company.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          parentCode: acc.parentCode,
          isSystem: true,
          isCrypto: acc.code.startsWith('305'),
        })),
      });

      // Seed invoice series
      await tx.invoiceSeries.createMany({
        data: DEFAULT_INVOICE_SERIES.map((series) => ({
          companyId: company.id,
          code: series.code,
          name: series.name,
          type: series.type,
          isDefault: series.isDefault,
        })),
      });

      // Seed crypto assets
      await tx.cryptoAsset.createMany({
        data: DEFAULT_CRYPTO_ASSETS.map((asset) => ({
          companyId: company.id,
          symbol: asset.symbol,
          name: asset.name,
          decimals: asset.decimals,
          coingeckoId: asset.coingeckoId,
        })),
      });

      // Create current fiscal year
      const currentYear = new Date().getFullYear();
      const fiscalStart = dto.fiscalYearStart || 1;
      await tx.fiscalYear.create({
        data: {
          companyId: company.id,
          name: String(currentYear),
          startDate: new Date(currentYear, fiscalStart - 1, 1),
          endDate: new Date(currentYear + 1, fiscalStart - 1, 0),
        },
      });

      return company;
    });
  }

  async findAllByUser(userId: string) {
    const companyUsers = await this.prisma.companyUser.findMany({
      where: { userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            legalName: true,
            taxId: true,
            city: true,
            country: true,
            createdAt: true,
          },
        },
      },
      orderBy: { company: { name: 'asc' } },
    });

    return companyUsers.map((cu) => ({
      ...cu.company,
      role: cu.role,
      isDefault: cu.isDefault,
    }));
  }

  async findById(companyId: string, userId: string) {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
      include: { company: true },
    });

    if (!companyUser) {
      throw new NotFoundException('Company not found');
    }

    return { ...companyUser.company, role: companyUser.role };
  }

  async findCurrentByUser(userId: string) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { userId, isDefault: true },
      include: { company: true },
    });

    if (!companyUser) {
      // If no default company, try to get the first one
      const firstCompanyUser = await this.prisma.companyUser.findFirst({
        where: { userId },
        include: { company: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!firstCompanyUser) {
        return null;
      }

      return { ...firstCompanyUser.company, role: firstCompanyUser.role };
    }

    return { ...companyUser.company, role: companyUser.role };
  }

  async updateCurrent(userId: string, dto: UpdateCompanyDto) {
    const companyUser = await this.prisma.companyUser.findFirst({
      where: { userId, isDefault: true },
    });

    if (!companyUser) {
      // If no default company, try to get the first one
      const firstCompanyUser = await this.prisma.companyUser.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (!firstCompanyUser) {
        throw new NotFoundException('No company found for user');
      }

      if (
        firstCompanyUser.role !== UserRole.OWNER &&
        firstCompanyUser.role !== UserRole.ADMIN
      ) {
        throw new ForbiddenException('Only OWNER or ADMIN can update company');
      }

      return this.prisma.company.update({
        where: { id: firstCompanyUser.companyId },
        data: dto,
      });
    }

    if (
      companyUser.role !== UserRole.OWNER &&
      companyUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Only OWNER or ADMIN can update company');
    }

    return this.prisma.company.update({
      where: { id: companyUser.companyId },
      data: dto,
    });
  }

  async update(companyId: string, userId: string, dto: UpdateCompanyDto) {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!companyUser) {
      throw new NotFoundException('Company not found');
    }

    if (
      companyUser.role !== UserRole.OWNER &&
      companyUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('Only OWNER or ADMIN can update company');
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: dto,
    });
  }

  async delete(companyId: string, userId: string) {
    const companyUser = await this.prisma.companyUser.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });

    if (!companyUser) {
      throw new NotFoundException('Company not found');
    }

    if (companyUser.role !== UserRole.OWNER) {
      throw new ForbiddenException('Only OWNER can delete company');
    }

    // Soft delete
    return this.prisma.company.update({
      where: { id: companyId },
      data: { deletedAt: new Date() },
    });
  }

  async setDefault(companyId: string, userId: string) {
    // Remove default from all user's companies
    await this.prisma.companyUser.updateMany({
      where: { userId },
      data: { isDefault: false },
    });

    // Set new default
    return this.prisma.companyUser.update({
      where: { userId_companyId: { userId, companyId } },
      data: { isDefault: true },
    });
  }
}

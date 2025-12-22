import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { CreatePartnerDto } from './dto/create-partner.dto.js';
import { UpdatePartnerDto } from './dto/update-partner.dto.js';
import { CreateCommissionDto } from './dto/create-commission.dto.js';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * Partners Service
 *
 * Manages the partner/reseller program:
 * - Partner registration and management
 * - Customer assignment to partners
 * - Commission tracking
 * - Payout management
 * - Partner analytics
 */
@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new partner
   */
  async createPartner(dto: CreatePartnerDto) {
    // Check if partner with email already exists
    const existing = await this.prisma.partner.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Partner with this email already exists');
    }

    // Generate API key for partner
    const apiKey = this.generateApiKey();
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    const partner = await this.prisma.partner.create({
      data: {
        ...dto,
        apiKey,
        apiKeyHash,
        status: 'PENDING', // Requires approval
      },
    });

    this.logger.log(`Created new partner: ${partner.name} (${partner.id})`);

    return {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      apiKey, // Return API key only once
      status: partner.status,
      commissionRate: partner.commissionRate,
      createdAt: partner.createdAt,
    };
  }

  /**
   * List all partners
   */
  async listPartners(filters?: { status?: string; isActive?: boolean }) {
    const partners = await this.prisma.partner.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      include: {
        _count: {
          select: {
            customers: true,
            commissions: true,
            payouts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return partners;
  }

  /**
   * Get partner by ID
   */
  async getPartnerById(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        customers: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            commissions: true,
            payouts: true,
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException(`Partner not found: ${partnerId}`);
    }

    return partner;
  }

  /**
   * Update partner
   */
  async updatePartner(partnerId: string, dto: UpdatePartnerDto) {
    const partner = await this.prisma.partner.update({
      where: { id: partnerId },
      data: dto,
    });

    this.logger.log(`Updated partner: ${partner.name} (${partnerId})`);
    return partner;
  }

  /**
   * Assign a company to a partner
   */
  async assignCustomerToPartner(partnerId: string, companyId: string) {
    // Check if partner exists
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      throw new NotFoundException(`Partner not found: ${partnerId}`);
    }

    if (partner.status !== 'ACTIVE') {
      throw new BadRequestException('Partner is not active');
    }

    // Check if company already assigned to another partner
    const existing = await this.prisma.partnerCustomer.findUnique({
      where: { companyId },
    });

    if (existing) {
      throw new BadRequestException('Company is already assigned to a partner');
    }

    const partnerCustomer = await this.prisma.partnerCustomer.create({
      data: {
        partnerId,
        companyId,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.logger.log(`Assigned company ${companyId} to partner ${partnerId}`);
    return partnerCustomer;
  }

  /**
   * Record a commission for a partner
   */
  async createCommission(dto: CreateCommissionDto) {
    const commission = await this.prisma.partnerCommission.create({
      data: {
        partnerId: dto.partnerId,
        companyId: dto.companyId,
        transactionType: dto.transactionType,
        transactionId: dto.transactionId,
        baseAmount: dto.baseAmount,
        commissionRate: dto.commissionRate,
        commissionAmount: dto.commissionAmount,
        currency: dto.currency || 'EUR',
        status: dto.status || 'PENDING',
        periodStart: new Date(),
        periodEnd: new Date(),
      },
    });

    this.logger.log(
      `Created commission ${commission.id} for partner ${dto.partnerId}: €${dto.commissionAmount}`,
    );

    return commission;
  }

  /**
   * Calculate commission for a transaction
   */
  async calculateCommission(
    companyId: string,
    transactionType: string,
    baseAmount: number,
  ): Promise<{ shouldCreateCommission: boolean; commission?: CreateCommissionDto }> {
    // Check if company has a partner
    const partnerCustomer = await this.prisma.partnerCustomer.findUnique({
      where: { companyId },
      include: { partner: true },
    });

    if (!partnerCustomer || partnerCustomer.status !== 'ACTIVE') {
      return { shouldCreateCommission: false };
    }

    const partner = partnerCustomer.partner;

    if (partner.status !== 'ACTIVE' || !partner.isActive) {
      return { shouldCreateCommission: false };
    }

    // Use custom rate if set, otherwise partner's default
    const commissionRate = partnerCustomer.customCommissionRate || partner.commissionRate;
    const commissionAmount = (baseAmount * commissionRate) / 100;

    return {
      shouldCreateCommission: true,
      commission: {
        partnerId: partner.id,
        companyId,
        transactionType,
        baseAmount,
        commissionRate,
        commissionAmount,
        currency: 'EUR',
        status: 'PENDING' as any,
      },
    };
  }

  /**
   * Get partner commissions
   */
  async getPartnerCommissions(
    partnerId: string,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const commissions = await this.prisma.partnerCommission.findMany({
      where: {
        partnerId,
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.startDate &&
          filters?.endDate && {
            periodStart: { gte: filters.startDate },
            periodEnd: { lte: filters.endDate },
          }),
      },
      include: {
        payout: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total
    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalPending = commissions
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalPaid = commissions
      .filter((c) => c.status === 'PAID')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    return {
      commissions,
      summary: {
        total: totalCommission,
        pending: totalPending,
        paid: totalPaid,
        count: commissions.length,
      },
    };
  }

  /**
   * Create a payout for partner
   */
  async createPayout(
    partnerId: string,
    periodStart: Date,
    periodEnd: Date,
    paymentMethod?: string,
  ) {
    // Get all approved but unpaid commissions
    const commissions = await this.prisma.partnerCommission.findMany({
      where: {
        partnerId,
        status: 'APPROVED',
        payoutId: null,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
    });

    if (commissions.length === 0) {
      throw new BadRequestException('No approved commissions found for this period');
    }

    const totalAmount = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);

    // Create payout
    const payout = await this.prisma.partnerPayout.create({
      data: {
        partnerId,
        amount: totalAmount,
        currency: 'EUR',
        periodStart,
        periodEnd,
        paymentMethod,
        status: 'PENDING',
        scheduledAt: new Date(),
      },
    });

    // Link commissions to payout
    await this.prisma.partnerCommission.updateMany({
      where: {
        id: { in: commissions.map((c) => c.id) },
      },
      data: {
        payoutId: payout.id,
      },
    });

    this.logger.log(
      `Created payout ${payout.id} for partner ${partnerId}: €${totalAmount} (${commissions.length} commissions)`,
    );

    return payout;
  }

  /**
   * Mark payout as paid
   */
  async markPayoutAsPaid(payoutId: string, paymentReference?: string) {
    const payout = await this.prisma.partnerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentReference,
      },
    });

    // Mark all associated commissions as paid
    await this.prisma.partnerCommission.updateMany({
      where: { payoutId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    this.logger.log(`Marked payout ${payoutId} as paid`);
    return payout;
  }

  /**
   * Get partner analytics
   */
  async getPartnerAnalytics(partnerId: string) {
    const [partner, customers, commissions, payouts] = await Promise.all([
      this.prisma.partner.findUnique({ where: { id: partnerId } }),
      this.prisma.partnerCustomer.count({ where: { partnerId, status: 'ACTIVE' } }),
      this.prisma.partnerCommission.aggregate({
        where: { partnerId },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      this.prisma.partnerPayout.aggregate({
        where: { partnerId, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    if (!partner) {
      throw new NotFoundException(`Partner not found: ${partnerId}`);
    }

    return {
      partnerId: partner.id,
      partnerName: partner.name,
      activeCustomers: customers,
      totalCommissions: commissions._sum.commissionAmount || 0,
      commissionCount: commissions._count,
      totalPayouts: payouts._sum.amount || 0,
      payoutCount: payouts._count,
      pendingCommissions:
        (commissions._sum.commissionAmount || 0) - (payouts._sum.amount || 0),
    };
  }

  /**
   * Helper: Generate API key
   */
  private generateApiKey(): string {
    return 'pk_' + crypto.randomBytes(32).toString('hex');
  }
}

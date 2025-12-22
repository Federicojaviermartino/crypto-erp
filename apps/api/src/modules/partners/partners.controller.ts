import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PartnersService } from './partners.service.js';
import { CreatePartnerDto } from './dto/create-partner.dto.js';
import { UpdatePartnerDto } from './dto/update-partner.dto.js';
import { CreateCommissionDto } from './dto/create-commission.dto.js';

/**
 * Partners Controller
 *
 * Endpoints for managing the partner/reseller program:
 * - Partner CRUD
 * - Customer assignment
 * - Commission tracking
 * - Payouts
 * - Analytics
 */
@Controller('partners')
@UseGuards(JwtAuthGuard)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  /**
   * Create a new partner
   * POST /partners
   *
   * Body:
   * {
   *   "name": "Partner Name",
   *   "legalName": "Partner Legal Name",
   *   "email": "partner@example.com",
   *   "commissionRate": 20,
   *   "revenueShareModel": "PERCENTAGE"
   * }
   */
  @Post()
  async createPartner(@Body() dto: CreatePartnerDto) {
    return this.partnersService.createPartner(dto);
  }

  /**
   * List all partners
   * GET /partners?status=ACTIVE&isActive=true
   */
  @Get()
  async listPartners(
    @Query('status') status?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.partnersService.listPartners({
      status,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  /**
   * Get partner by ID
   * GET /partners/:id
   */
  @Get(':id')
  async getPartnerById(@Param('id') partnerId: string) {
    return this.partnersService.getPartnerById(partnerId);
  }

  /**
   * Update partner
   * PUT /partners/:id
   */
  @Put(':id')
  async updatePartner(@Param('id') partnerId: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.updatePartner(partnerId, dto);
  }

  /**
   * Get partner analytics
   * GET /partners/:id/analytics
   */
  @Get(':id/analytics')
  async getPartnerAnalytics(@Param('id') partnerId: string) {
    return this.partnersService.getPartnerAnalytics(partnerId);
  }

  /**
   * Assign a company to a partner
   * POST /partners/:id/customers
   *
   * Body:
   * {
   *   "companyId": "uuid"
   * }
   */
  @Post(':id/customers')
  async assignCustomerToPartner(
    @Param('id') partnerId: string,
    @Body('companyId') companyId: string,
  ) {
    if (!companyId) {
      throw new BadRequestException('companyId is required');
    }

    return this.partnersService.assignCustomerToPartner(partnerId, companyId);
  }

  /**
   * Get partner commissions
   * GET /partners/:id/commissions?status=PENDING&startDate=2025-01-01&endDate=2025-12-31
   */
  @Get(':id/commissions')
  async getPartnerCommissions(
    @Param('id') partnerId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.partnersService.getPartnerCommissions(partnerId, {
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Record a commission
   * POST /partners/:id/commissions
   *
   * Body:
   * {
   *   "companyId": "uuid",
   *   "transactionType": "subscription",
   *   "baseAmount": 100.00,
   *   "commissionRate": 20,
   *   "commissionAmount": 20.00
   * }
   */
  @Post(':id/commissions')
  async createCommission(
    @Param('id') partnerId: string,
    @Body() dto: Omit<CreateCommissionDto, 'partnerId'>,
  ) {
    return this.partnersService.createCommission({
      ...dto,
      partnerId,
    } as CreateCommissionDto);
  }

  /**
   * Create a payout for partner
   * POST /partners/:id/payouts
   *
   * Body:
   * {
   *   "periodStart": "2025-01-01",
   *   "periodEnd": "2025-01-31",
   *   "paymentMethod": "bank_transfer"
   * }
   */
  @Post(':id/payouts')
  async createPayout(
    @Param('id') partnerId: string,
    @Body('periodStart') periodStart: string,
    @Body('periodEnd') periodEnd: string,
    @Body('paymentMethod') paymentMethod?: string,
  ) {
    if (!periodStart || !periodEnd) {
      throw new BadRequestException('periodStart and periodEnd are required');
    }

    return this.partnersService.createPayout(
      partnerId,
      new Date(periodStart),
      new Date(periodEnd),
      paymentMethod,
    );
  }

  /**
   * Mark payout as paid
   * PUT /partners/payouts/:payoutId/paid
   *
   * Body:
   * {
   *   "paymentReference": "TXN123456"
   * }
   */
  @Put('payouts/:payoutId/paid')
  async markPayoutAsPaid(
    @Param('payoutId') payoutId: string,
    @Body('paymentReference') paymentReference?: string,
  ) {
    return this.partnersService.markPayoutAsPaid(payoutId, paymentReference);
  }
}

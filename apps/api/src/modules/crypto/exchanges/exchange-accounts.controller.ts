import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ExchangeAccountsService } from './exchange-accounts.service.js';

@Controller('crypto/exchanges')
export class ExchangeAccountsController {
  constructor(private readonly exchangeAccountsService: ExchangeAccountsService) {}

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  @Get('supported')
  getSupportedExchanges() {
    return this.exchangeAccountsService.getSupportedExchanges();
  }

  @Get('accounts')
  findAll(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.exchangeAccountsService.findAll(companyId);
  }

  @Get('accounts/:id')
  findOne(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.exchangeAccountsService.findOne(companyId, id);
  }

  @Post('accounts')
  create(
    @Headers() headers: Record<string, string>,
    @Body() body: {
      exchange: string;
      label?: string;
      apiKey: string;
      apiSecret: string;
    },
  ) {
    const companyId = this.getCompanyId(headers);
    return this.exchangeAccountsService.create(companyId, body);
  }

  @Put('accounts/:id')
  update(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: {
      label?: string;
      apiKey?: string;
      apiSecret?: string;
    },
  ) {
    const companyId = this.getCompanyId(headers);
    return this.exchangeAccountsService.update(companyId, id, body);
  }

  @Delete('accounts/:id')
  delete(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.exchangeAccountsService.delete(companyId, id);
  }

  @Post('accounts/:id/test')
  async testConnection(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const success = await this.exchangeAccountsService.testConnection(companyId, id);
    return { success };
  }

  @Get('accounts/:id/balances')
  getBalances(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.exchangeAccountsService.getBalances(companyId, id);
  }

  @Post('accounts/:id/sync/trades')
  syncTrades(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: { startTime?: string; endTime?: string },
  ) {
    const companyId = this.getCompanyId(headers);
    return this.exchangeAccountsService.syncTrades(companyId, id, {
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    });
  }

  @Post('accounts/:id/sync/deposits-withdrawals')
  syncDepositsWithdrawals(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: { startTime?: string; endTime?: string },
  ) {
    const companyId = this.getCompanyId(headers);
    return this.exchangeAccountsService.syncDepositsWithdrawals(companyId, id, {
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    });
  }

  @Post('accounts/:id/sync/all')
  async syncAll(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() body: { startTime?: string; endTime?: string },
  ) {
    const companyId = this.getCompanyId(headers);
    const options = {
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
    };

    const [trades, depositsWithdrawals] = await Promise.all([
      this.exchangeAccountsService.syncTrades(companyId, id, options),
      this.exchangeAccountsService.syncDepositsWithdrawals(companyId, id, options),
    ]);

    return {
      trades: trades.imported,
      deposits: depositsWithdrawals.deposits,
      withdrawals: depositsWithdrawals.withdrawals,
    };
  }
}

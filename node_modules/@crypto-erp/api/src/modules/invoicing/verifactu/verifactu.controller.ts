import {
  Controller,
  Get,
  Post,
  Param,
  Headers,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { VerifactuService } from './verifactu.service.js';

@Controller('invoicing/verifactu')
export class VerifactuController {
  constructor(private readonly verifactuService: VerifactuService) {}

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  @Post('invoices/:invoiceId/generate')
  async generateRecord(
    @Headers() headers: Record<string, string>,
    @Param('invoiceId') invoiceId: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.verifactuService.generateVerifactuRecord(companyId, invoiceId);
  }

  @Post('invoices/:invoiceId/send')
  async sendToAEAT(
    @Headers() headers: Record<string, string>,
    @Param('invoiceId') invoiceId: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.verifactuService.sendToAEAT(companyId, invoiceId);
  }

  @Get('invoices/:invoiceId/status')
  async getStatus(
    @Headers() headers: Record<string, string>,
    @Param('invoiceId') invoiceId: string,
  ) {
    const companyId = this.getCompanyId(headers);
    return this.verifactuService.getVerificationStatus(companyId, invoiceId);
  }

  @Get('invoices/:invoiceId/xml')
  async getXML(
    @Headers() headers: Record<string, string>,
    @Param('invoiceId') invoiceId: string,
    @Res() res: Response,
  ) {
    const companyId = this.getCompanyId(headers);
    const record = await this.verifactuService.generateVerifactuRecord(companyId, invoiceId);
    const xml = this.verifactuService.generateXML(record);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=verifactu_${invoiceId}.xml`);
    res.send(xml);
  }

  @Get('chain/validate')
  async validateChain(@Headers() headers: Record<string, string>) {
    const companyId = this.getCompanyId(headers);
    return this.verifactuService.validateChainIntegrity(companyId);
  }
}

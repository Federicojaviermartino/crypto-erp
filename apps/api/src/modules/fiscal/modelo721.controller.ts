import {
  Controller,
  Get,
  Param,
  Headers,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Modelo721Service, Modelo721Summary, Modelo720CryptoItem } from './modelo721.service.js';

@Controller('fiscal/modelo721')
export class Modelo721Controller {
  constructor(private readonly modelo721Service: Modelo721Service) {}

  private getCompanyId(headers: Record<string, string>): string {
    const companyId = headers['x-company-id'];
    if (!companyId) {
      throw new BadRequestException('X-Company-Id header is required');
    }
    return companyId;
  }

  @Get(':year')
  async getModelo721(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
  ): Promise<Modelo721Summary> {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    return this.modelo721Service.generateModelo721(companyId, year);
  }

  @Get(':year/validate')
  async validateModelo721(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    return this.modelo721Service.validateForSubmission(companyId, year);
  }

  @Get(':year/export/aeat')
  async exportAEAT(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
    @Res() res: Response,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    const content = await this.modelo721Service.exportToAEATFormat(companyId, year);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=modelo721_${year}.xml`);
    res.send(content);
  }

  @Get(':year/export/csv')
  async exportCSV(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
    @Res() res: Response,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    const content = await this.modelo721Service.exportToCSV(companyId, year);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=modelo721_${year}.csv`);
    res.send('\uFEFF' + content); // BOM for Excel UTF-8
  }

  @Get(':year/modelo720')
  async getModelo720Crypto(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
  ): Promise<Modelo720CryptoItem[]> {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    return this.modelo721Service.generateModelo720Crypto(companyId, year);
  }

  @Get(':year/modelo720/export/aeat')
  async exportModelo720AEAT(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
    @Res() res: Response,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    const content = await this.modelo721Service.exportModelo720ToAEATFormat(companyId, year);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=modelo720_subgrupo8_${year}.xml`);
    res.send(content);
  }

  @Get(':year/summary')
  async getSummary(
    @Headers() headers: Record<string, string>,
    @Param('year') yearStr: string,
  ) {
    const companyId = this.getCompanyId(headers);
    const year = parseInt(yearStr, 10);

    if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
      throw new BadRequestException('Invalid year');
    }

    return this.modelo721Service.getSummary(companyId, year);
  }
}

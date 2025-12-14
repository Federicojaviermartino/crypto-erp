import { IsEnum, IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ProspectiveTransactionType {
  SELL = 'SELL',
  BUY = 'BUY',
}

export class PredictTaxImpactDto {
  @ApiProperty({
    description: 'Type of prospective transaction',
    enum: ProspectiveTransactionType,
    example: 'SELL',
  })
  @IsEnum(ProspectiveTransactionType)
  transactionType: ProspectiveTransactionType;

  @ApiProperty({
    description: 'Crypto asset symbol',
    example: 'BTC',
  })
  @IsString()
  asset: string;

  @ApiProperty({
    description: 'Amount of crypto asset',
    example: 0.5,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Price in EUR per unit',
    example: 45000,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceEur: number;

  @ApiPropertyOptional({
    description: 'Date of prospective sale/purchase (defaults to current date)',
    example: '2025-01-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfSale?: string;
}

export class ConsumedLotDto {
  @ApiProperty({ description: 'Acquisition date of the lot' })
  acquisitionDate: Date;

  @ApiProperty({ description: 'Quantity consumed from this lot' })
  quantity: number;

  @ApiProperty({ description: 'Cost basis per unit in EUR' })
  costBasisPerUnit: number;

  @ApiProperty({ description: 'Total cost basis in EUR' })
  totalCostBasis: number;

  @ApiProperty({ description: 'Capital gain/loss from this lot in EUR' })
  gainLoss: number;

  @ApiProperty({ description: 'Holding period in days' })
  holdingPeriodDays: number;
}

export class TaxPredictionResponseDto {
  @ApiProperty({
    description: 'Total capital gain/loss in EUR',
    example: 5234.5,
  })
  capitalGain: number;

  @ApiProperty({
    description: 'Estimated tax owed in EUR',
    example: 1099.25,
  })
  taxOwed: number;

  @ApiProperty({
    description: 'Effective IRPF tax rate applied (%)',
    example: 21,
  })
  effectiveTaxRate: number;

  @ApiProperty({
    description: 'Lots consumed by FIFO method',
    type: [ConsumedLotDto],
  })
  lotsConsumed: ConsumedLotDto[];

  @ApiProperty({
    description: 'AI-generated recommendation',
    example: 'Consider holding for more than 1 year to benefit from potential future tax advantages',
  })
  recommendation: string;

  @ApiProperty({
    description: 'Total proceeds from sale in EUR',
    example: 22500,
  })
  totalProceeds: number;

  @ApiProperty({
    description: 'Total acquisition cost in EUR',
    example: 17265.5,
  })
  totalAcquisitionCost: number;
}

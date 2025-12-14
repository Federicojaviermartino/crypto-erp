import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CryptoTransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  SWAP = 'SWAP',
  STAKING_REWARD = 'STAKING_REWARD',
  AIRDROP = 'AIRDROP',
  MINING = 'MINING',
  FEE = 'FEE',
}

export class CreateCryptoTransactionDto {
  @ApiProperty({ enum: CryptoTransactionType })
  @IsEnum(CryptoTransactionType)
  type: CryptoTransactionType;

  @ApiProperty({ description: 'Crypto asset ID' })
  @IsUUID()
  assetId: string;

  @ApiProperty({ example: 0.5, description: 'Amount of crypto' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 50000, description: 'Price per unit in fiat' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerUnit?: number;

  @ApiPropertyOptional({ example: 'EUR', default: 'EUR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  fiatCurrency?: string;

  @ApiPropertyOptional({ example: 25000, description: 'Total fiat value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiatValue?: number;

  @ApiPropertyOptional({ example: 0.0001, description: 'Transaction fee in crypto' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @ApiPropertyOptional({ description: 'Fee asset ID (if different from main asset)' })
  @IsOptional()
  @IsUUID()
  feeAssetId?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Binance', description: 'Exchange or wallet name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  exchange?: string;

  @ApiPropertyOptional({ example: '0x123...abc', description: 'Transaction hash' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  txHash?: string;

  @ApiPropertyOptional({ description: 'Wallet address from' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fromAddress?: string;

  @ApiPropertyOptional({ description: 'Wallet address to' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  toAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  // For SWAP transactions
  @ApiPropertyOptional({ description: 'Asset ID received (for SWAP)' })
  @IsOptional()
  @IsUUID()
  swapToAssetId?: string;

  @ApiPropertyOptional({ description: 'Amount received (for SWAP)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  swapToAmount?: number;
}

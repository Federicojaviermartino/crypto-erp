import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCryptoAssetDto {
  @ApiProperty({ example: 'BTC', description: 'Ticker symbol' })
  @IsString()
  @MaxLength(20)
  symbol: string;

  @ApiProperty({ example: 'Bitcoin', description: 'Full name of the asset' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 8, description: 'Decimal places for the asset', default: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(18)
  decimals?: number;

  @ApiPropertyOptional({ example: 'bitcoin', description: 'CoinGecko ID for price fetching' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  coingeckoId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

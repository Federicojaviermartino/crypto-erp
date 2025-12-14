import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType } from '@prisma/client';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Blockchain wallet address (format varies by chain)',
    examples: {
      ethereum: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bB0b',
      solana: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
      bitcoin: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    },
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Blockchain network',
    example: 'ethereum',
    enum: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base', 'avalanche', 'solana', 'bitcoin'],
  })
  @IsString()
  @IsNotEmpty()
  chain: string;

  @ApiPropertyOptional({
    description: 'User-friendly label for the wallet',
    example: 'Mi Wallet Principal',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    description: 'Wallet type',
    enum: WalletType,
    default: 'EXTERNAL',
  })
  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;

  @ApiPropertyOptional({
    description: 'Accounting code to link for automatic journal entries',
    example: '5700001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountCode?: string;
}

export class UpdateWalletDto {
  @ApiPropertyOptional({
    description: 'User-friendly label for the wallet',
    example: 'Mi Wallet Principal',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    description: 'Wallet type',
    enum: WalletType,
  })
  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;

  @ApiPropertyOptional({
    description: 'Accounting code to link for automatic journal entries',
    example: '5700001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accountCode?: string;

  @ApiPropertyOptional({
    description: 'Whether the wallet is active',
  })
  @IsOptional()
  isActive?: boolean;
}

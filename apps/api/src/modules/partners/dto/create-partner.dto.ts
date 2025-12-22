import { IsString, IsEmail, IsOptional, IsNumber, IsEnum, MaxLength, Min, Max } from 'class-validator';

export enum RevenueShareModel {
  PERCENTAGE = 'PERCENTAGE',
  TIERED = 'TIERED',
  FLAT_FEE = 'FLAT_FEE',
  HYBRID = 'HYBRID',
}

/**
 * DTO for creating a new partner
 */
export class CreatePartnerDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  legalName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number; // Default 20%

  @IsOptional()
  @IsEnum(RevenueShareModel)
  revenueShareModel?: RevenueShareModel;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTerms?: string; // "NET30", "NET60"

  @IsOptional()
  @IsString()
  @MaxLength(500)
  webhookUrl?: string;
}

import { IsString, IsNumber, IsOptional, IsUUID, IsEnum, Min } from 'class-validator';

export enum CommissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

/**
 * DTO for recording a commission
 */
export class CreateCommissionDto {
  @IsUUID()
  partnerId: string;

  @IsUUID()
  companyId: string;

  @IsString()
  transactionType: string; // "subscription", "invoice", "addon"

  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsNumber()
  @Min(0)
  commissionRate: number;

  @IsNumber()
  @Min(0)
  commissionAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;
}

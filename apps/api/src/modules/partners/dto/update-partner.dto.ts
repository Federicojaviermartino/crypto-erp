import { PartialType } from '@nestjs/mapped-types';
import { CreatePartnerDto } from './create-partner.dto.js';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';

export enum PartnerStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

/**
 * DTO for updating a partner
 */
export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {
  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

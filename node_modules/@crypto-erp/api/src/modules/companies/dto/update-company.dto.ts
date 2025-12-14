import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto.js';

export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, ['taxId'] as const),
) {}

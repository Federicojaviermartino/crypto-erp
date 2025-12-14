import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSeriesDto {
  @ApiProperty({ example: 'F', description: 'Series prefix (e.g., F for facturas, R for rectificativas)' })
  @IsString()
  @MaxLength(10)
  prefix: string;

  @ApiProperty({ example: 'Standard Sales Invoices', description: 'Series name/description' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 1, description: 'Next number to use', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  nextNumber?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether this is the default series for sales invoices' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether this series is for sales (true) or purchases (false)' })
  @IsOptional()
  @IsBoolean()
  isSales?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

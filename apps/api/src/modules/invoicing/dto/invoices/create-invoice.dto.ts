import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum InvoiceType {
  STANDARD = 'STANDARD',
  RECTIFICATIVE = 'RECTIFICATIVE',
  SIMPLIFIED = 'SIMPLIFIED',
}

export class InvoiceLineDto {
  @ApiProperty({ example: 'Consulting services' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 2, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 100.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 21, description: 'VAT rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional({ example: 0, description: 'Discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({ description: 'Optional account code for accounting integration' })
  @IsOptional()
  @IsString()
  accountCode?: string;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({ description: 'Contact (customer/supplier) ID' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Counterparty name (when no contact is selected)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  counterpartyName?: string;

  @ApiPropertyOptional({ description: 'Counterparty tax ID (NIF/CIF)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  counterpartyTaxId?: string;

  @ApiPropertyOptional({ description: 'Counterparty address' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  counterpartyAddress?: string;

  @ApiPropertyOptional({ description: 'Counterparty city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  counterpartyCity?: string;

  @ApiPropertyOptional({ description: 'Counterparty country (ISO code)', example: 'ES' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  counterpartyCountry?: string;

  @ApiPropertyOptional({ enum: InvoiceType, default: InvoiceType.STANDARD })
  @IsOptional()
  @IsEnum(InvoiceType)
  type?: InvoiceType;

  @ApiPropertyOptional({ description: 'Invoice series ID. If not provided, default series will be used' })
  @IsOptional()
  @IsUUID()
  seriesId?: string;

  @ApiProperty({ example: '2024-01-15', description: 'Invoice date' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: '2024-02-15', description: 'Due date for payment' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Notes/description for the invoice' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Original invoice number (for rectificative invoices)' })
  @IsOptional()
  @IsString()
  originalInvoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Original invoice ID (for rectificative invoices)' })
  @IsOptional()
  @IsUUID()
  originalInvoiceId?: string;

  @ApiProperty({ type: [InvoiceLineDto], description: 'Invoice lines' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineDto)
  lines: InvoiceLineDto[];
}

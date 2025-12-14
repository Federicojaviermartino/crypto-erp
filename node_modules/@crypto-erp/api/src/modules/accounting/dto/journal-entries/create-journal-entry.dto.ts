import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  MaxLength,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JournalLineDto {
  @ApiProperty({ example: '572' })
  @IsString()
  @MaxLength(20)
  accountCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ example: 1000.0 })
  @IsNumber()
  @Min(0)
  debit: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  credit: number;

  @ApiPropertyOptional({ description: 'Crypto amount (for crypto accounts)' })
  @IsOptional()
  @IsNumber()
  cryptoAmount?: number;

  @ApiPropertyOptional({ example: 'BTC' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cryptoAsset?: string;

  @ApiPropertyOptional({ description: 'EUR price at transaction time' })
  @IsOptional()
  @IsNumber()
  cryptoPrice?: number;
}

export class CreateJournalEntryDto {
  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'Bank deposit' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: 'INV-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiProperty({ type: [JournalLineDto], minItems: 2 })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => JournalLineDto)
  lines: JournalLineDto[];
}

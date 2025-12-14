import { IsDateString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum LibroRegistroType {
  EMITIDAS = 'emitidas',
  RECIBIDAS = 'recibidas',
  AMBAS = 'ambas',
}

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

export class GenerateLibroRegistroDto {
  @ApiProperty({
    description: 'Start date for the libro registro period (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'End date for the libro registro period (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    description: 'Type of invoices to include',
    enum: LibroRegistroType,
    default: LibroRegistroType.AMBAS,
    required: false,
  })
  @IsEnum(LibroRegistroType)
  @IsOptional()
  type?: LibroRegistroType = LibroRegistroType.AMBAS;

  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    default: ExportFormat.JSON,
    required: false,
  })
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat = ExportFormat.JSON;
}

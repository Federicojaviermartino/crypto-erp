import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'], description: 'Message role' })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;
}

class AiContextDto {
  @ApiProperty({ required: false, description: 'Company name' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ required: false, description: 'Current fiscal year' })
  @IsOptional()
  @IsString()
  fiscalYear?: string;

  @ApiProperty({ required: false, description: 'Recent transactions summary' })
  @IsOptional()
  @IsString()
  recentTransactions?: string;

  @ApiProperty({ required: false, description: 'Account balances summary' })
  @IsOptional()
  @IsString()
  accountBalances?: string;

  @ApiProperty({
    required: false,
    enum: ['es', 'en'],
    description: 'Response language (Spanish or English)',
    default: 'es'
  })
  @IsOptional()
  @IsIn(['es', 'en'])
  language?: 'es' | 'en';
}

export class ChatRequestDto {
  @ApiProperty({ type: [ChatMessageDto], description: 'Conversation messages' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiProperty({ required: false, type: AiContextDto, description: 'Additional context' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiContextDto)
  context?: AiContextDto;
}

export class AnalyzeTransactionDto {
  @ApiProperty({ description: 'Transaction description to analyze' })
  @IsString()
  description: string;
}

export class GenerateReportDto {
  @ApiProperty({
    enum: ['summary', 'recommendations', 'tax-planning'],
    description: 'Type of report to generate',
  })
  @IsIn(['summary', 'recommendations', 'tax-planning'])
  reportType: 'summary' | 'recommendations' | 'tax-planning';

  @ApiProperty({ description: 'Data for the report' })
  data: Record<string, unknown>;
}

export class ExplainCryptoTaxDto {
  @ApiProperty({
    description: 'Array of crypto transactions',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        amount: { type: 'number' },
        gainLoss: { type: 'number' },
      },
    },
  })
  @IsArray()
  transactions: Array<{ type: string; amount: number; gainLoss?: number }>;
}

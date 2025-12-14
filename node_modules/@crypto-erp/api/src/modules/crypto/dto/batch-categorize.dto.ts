import { IsArray, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchCategorizeDto {
  @ApiPropertyOptional({
    description: 'Array of specific transaction IDs to categorize',
    type: [String],
    example: ['tx-123', 'tx-456', 'tx-789'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transactionIds?: string[];

  @ApiPropertyOptional({
    description: 'Wallet ID to categorize all uncategorized transactions',
    example: 'wallet-123',
  })
  @IsOptional()
  @IsString()
  walletId?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class BatchCategorizeResponseDto {
  @ApiProperty({
    description: 'BullMQ job ID for tracking progress',
    example: 'batch-cat-1234567890',
  })
  jobId: string;

  @ApiProperty({
    description: 'Number of transactions queued for categorization',
    example: 42,
  })
  transactionCount: number;

  @ApiProperty({
    description: 'Estimated time to completion in seconds',
    example: 120,
  })
  estimatedTime: number;
}

export class BatchJobStatusResponseDto {
  @ApiProperty({
    description: 'Job ID',
    example: 'batch-cat-1234567890',
  })
  jobId: string;

  @ApiProperty({
    description: 'Current job state',
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed'],
    example: 'active',
  })
  state: string;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 67,
  })
  progress: number;

  @ApiPropertyOptional({
    description: 'Result data (available when completed)',
    type: 'object',
    example: {
      success: true,
      processedCount: 42,
      successCount: 40,
      failedIds: ['tx-123', 'tx-456'],
    },
  })
  result?: {
    success: boolean;
    processedCount: number;
    successCount: number;
    failedIds: string[];
    error?: string;
  };

  @ApiPropertyOptional({
    description: 'Error message (if failed)',
    example: 'No AI provider configured',
  })
  error?: string;
}

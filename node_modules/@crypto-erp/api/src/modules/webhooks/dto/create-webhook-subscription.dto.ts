import { IsString, IsUrl, IsArray, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWebhookSubscriptionDto {
  @ApiProperty({
    description: 'Webhook endpoint URL',
    example: 'https://example.com/webhooks/crypto-erp',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'List of events to subscribe to',
    example: ['invoice.created', 'invoice.sent', 'crypto_transaction.created'],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiProperty({
    description: 'Optional description for this webhook',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Number of retry attempts on failure',
    example: 3,
    required: false,
    minimum: 0,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  retryCount?: number;

  @ApiProperty({
    description: 'Request timeout in milliseconds',
    example: 30000,
    required: false,
    minimum: 5000,
    maximum: 60000,
  })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(60000)
  timeout?: number;

  @ApiProperty({
    description: 'Custom metadata (JSON object)',
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

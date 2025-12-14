import { PartialType } from '@nestjs/swagger';
import { CreateWebhookSubscriptionDto } from './create-webhook-subscription.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWebhookSubscriptionDto extends PartialType(CreateWebhookSubscriptionDto) {
  @ApiProperty({
    description: 'Enable or disable the webhook',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

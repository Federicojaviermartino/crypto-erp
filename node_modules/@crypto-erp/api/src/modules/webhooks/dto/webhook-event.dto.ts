import { IsString, IsObject, IsUUID } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  event: string;

  @IsString()
  entityType: string;

  @IsUUID()
  entityId: string;

  @IsObject()
  payload: Record<string, any>;
}

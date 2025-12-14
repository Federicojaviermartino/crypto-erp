import { IsUUID } from 'class-validator';

export class AcceptInvitationDto {
  @IsUUID()
  token: string;
}

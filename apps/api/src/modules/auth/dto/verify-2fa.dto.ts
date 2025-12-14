import { IsString, IsNotEmpty } from 'class-validator';

export class Verify2FADto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

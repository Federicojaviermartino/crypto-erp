import { IsString, IsNotEmpty } from 'class-validator';

export class Disable2FADto {
  @IsString()
  @IsNotEmpty()
  password: string;
}

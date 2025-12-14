import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';

export class Enable2FADto {
  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsArray()
  @ArrayMinSize(10)
  @IsString({ each: true })
  backupCodes: string[];
}

import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  password: string;

  @ApiProperty({ example: '123456', required: false, description: '2FA token (if enabled)' })
  @IsOptional()
  @IsString()
  twoFactorToken?: string;

    @ApiProperty({ example: 'client', required: false, description: 'User role type' })
    @IsOptional()
    @IsString()
    role?: string;
}

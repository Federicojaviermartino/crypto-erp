import { IsEmail, IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ example: 'client', required: false, description: 'User role for login' })
  @IsOptional()
  @IsString()
  @IsIn(['client', 'admin'])
  role?: string;

  @ApiPropertyOptional({ description: 'Remember user session', default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

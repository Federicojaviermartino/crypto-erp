import { IsString, IsOptional, IsArray, IsUrl, IsInt, Min, Max } from 'class-validator';

export class CreateOAuthAppDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsArray()
  @IsUrl({}, { each: true })
  redirectUris: string[];

  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(10000)
  rateLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(100000)
  dailyQuota?: number;
}

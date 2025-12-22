import { IsString, IsOptional, IsArray, IsBoolean, IsHexColor, MaxLength } from 'class-validator';

/**
 * DTO for updating white-label configuration
 */
export class UpdateWhiteLabelDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brandName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  faviconUrl?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @IsString()
  customCss?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @IsOptional()
  @IsBoolean()
  domainVerified?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  emailFromName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  emailReplyTo?: string;

  @IsOptional()
  @IsString()
  emailFooterText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledFeatures?: string[];
}

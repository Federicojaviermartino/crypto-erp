import { IsString, IsOptional, IsArray } from 'class-validator';

export class AuthorizeDto {
  @IsString()
  clientId: string;

  @IsString()
  redirectUri: string;

  @IsString()
  responseType: string; // "code" for authorization code flow

  @IsOptional()
  @IsString()
  state?: string; // CSRF protection

  @IsArray()
  @IsString({ each: true })
  scopes: string[];
}

export class TokenDto {
  @IsString()
  grantType: string; // "authorization_code" or "refresh_token"

  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;

  @IsOptional()
  @IsString()
  code?: string; // For authorization_code grant

  @IsOptional()
  @IsString()
  refreshToken?: string; // For refresh_token grant

  @IsOptional()
  @IsString()
  redirectUri?: string; // For authorization_code grant
}

export class RevokeTokenDto {
  @IsString()
  token: string; // Access or refresh token to revoke

  @IsOptional()
  @IsString()
  tokenTypeHint?: string; // "access_token" or "refresh_token"
}

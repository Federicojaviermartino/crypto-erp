import { IsOptional, IsString, MaxLength, IsUrl, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Allowed domains for avatar URLs to prevent SSRF attacks
 */
const ALLOWED_AVATAR_DOMAINS_PATTERN =
  /^https:\/\/(storage\.googleapis\.com|s3\.amazonaws\.com|s3\.[a-z0-9-]+\.amazonaws\.com|res\.cloudinary\.com|i\.imgur\.com|images\.unsplash\.com|avatars\.githubusercontent\.com|lh3\.googleusercontent\.com|gravatar\.com)\//;

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'https://storage.googleapis.com/bucket/avatar.jpg',
    description: 'Avatar URL must be from an approved storage provider',
  })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar must be a valid URL' })
  @Matches(ALLOWED_AVATAR_DOMAINS_PATTERN, {
    message:
      'Avatar URL must be from an approved storage provider (Google Cloud Storage, AWS S3, Cloudinary, Imgur, Unsplash, GitHub, Google, or Gravatar)',
  })
  @MaxLength(500)
  avatarUrl?: string;
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiUsageService } from '../api-usage.service.js';
import { OAuthService } from '../oauth.service.js';

/**
 * Enhanced Rate Limiting Guard for OAuth Apps
 * Checks both hourly rate limits and daily quotas
 *
 * Usage:
 * @UseGuards(OAuthGuard, OAuthRateLimitGuard)
 * async someEndpoint() { ... }
 */
@Injectable()
export class OAuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly apiUsageService: ApiUsageService,
    private readonly oauthService: OAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check if request has OAuth context (set by OAuthGuard)
    const oauth = request.oauth;
    if (!oauth || !oauth.app) {
      // Not an OAuth request, allow through
      return true;
    }

    const appId = oauth.app.id;

    // Get app details for rate limits
    const app = await this.oauthService.getAppByClientId(oauth.app.clientId);

    // Check hourly rate limit
    const hourlyCount = await this.apiUsageService.getHourlyRequestCount(appId);
    if (hourlyCount >= app.rateLimit) {
      const resetTime = new Date(
        Math.ceil(Date.now() / (60 * 60 * 1000)) * 60 * 60 * 1000,
      );

      response.setHeader('X-RateLimit-Limit', app.rateLimit.toString());
      response.setHeader('X-RateLimit-Remaining', '0');
      response.setHeader(
        'X-RateLimit-Reset',
        Math.floor(resetTime.getTime() / 1000).toString(),
      );
      response.setHeader('Retry-After', Math.ceil((resetTime.getTime() - Date.now()) / 1000).toString());

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Limit: ${app.rateLimit} requests per hour`,
          error: 'Too Many Requests',
          retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check daily quota
    const dailyCount = await this.apiUsageService.getDailyRequestCount(appId);
    if (dailyCount >= app.dailyQuota) {
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Midnight next day

      response.setHeader('X-DailyQuota-Limit', app.dailyQuota.toString());
      response.setHeader('X-DailyQuota-Remaining', '0');
      response.setHeader(
        'X-DailyQuota-Reset',
        Math.floor(resetTime.getTime() / 1000).toString(),
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Daily quota exceeded. Limit: ${app.dailyQuota} requests per day`,
          error: 'Too Many Requests',
          retryAfter: Math.ceil((resetTime.getTime() - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', app.rateLimit.toString());
    response.setHeader(
      'X-RateLimit-Remaining',
      (app.rateLimit - hourlyCount - 1).toString(),
    );
    const hourlyResetTime = new Date(
      Math.ceil(Date.now() / (60 * 60 * 1000)) * 60 * 60 * 1000,
    );
    response.setHeader(
      'X-RateLimit-Reset',
      Math.floor(hourlyResetTime.getTime() / 1000).toString(),
    );

    response.setHeader('X-DailyQuota-Limit', app.dailyQuota.toString());
    response.setHeader(
      'X-DailyQuota-Remaining',
      (app.dailyQuota - dailyCount - 1).toString(),
    );
    const dailyResetTime = new Date();
    dailyResetTime.setHours(24, 0, 0, 0);
    response.setHeader(
      'X-DailyQuota-Reset',
      Math.floor(dailyResetTime.getTime() / 1000).toString(),
    );

    return true;
  }
}

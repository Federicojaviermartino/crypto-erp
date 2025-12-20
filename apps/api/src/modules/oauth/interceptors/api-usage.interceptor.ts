import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiUsageService } from '../api-usage.service.js';

/**
 * API Usage Tracking Interceptor
 * Automatically tracks all API requests for OAuth apps
 *
 * Tracks:
 * - Request endpoint and method
 * - Response status code
 * - Response time
 * - IP address and user agent
 */
@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private readonly apiUsageService: ApiUsageService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.trackRequest(request, response, startTime);
        },
        error: () => {
          this.trackRequest(request, response, startTime);
        },
      }),
    );
  }

  private trackRequest(request: any, response: any, startTime: number) {
    const responseTime = Date.now() - startTime;

    // Only track if OAuth context is available
    const oauth = request.oauth;
    if (!oauth) {
      return;
    }

    // Extract request details
    const endpoint = request.route?.path || request.url;
    const method = request.method;
    const statusCode = response.statusCode;
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'];

    // Record usage asynchronously (don't block response)
    this.apiUsageService
      .recordRequest({
        appId: oauth.app.id,
        companyId: oauth.companyId,
        userId: oauth.userId,
        endpoint,
        method,
        statusCode,
        responseTime,
        ipAddress,
        userAgent,
      })
      .catch(error => {
        console.error('Failed to track API usage:', error);
      });
  }

  private getIpAddress(request: any): string | undefined {
    // Try various headers for the real IP (behind proxies)
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress
    );
  }
}

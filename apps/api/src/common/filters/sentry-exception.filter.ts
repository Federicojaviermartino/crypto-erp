import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Determine error message
    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Capture in Sentry (only for 500 errors or non-HTTP exceptions)
    if (status >= 500 || !(exception instanceof HttpException)) {
      Sentry.captureException(exception, {
        user: request.user
          ? {
              id: request.user.id,
              email: request.user.email,
            }
          : undefined,
        tags: {
          companyId: request.companyId,
          endpoint: request.url,
          method: request.method,
        },
        extra: {
          body: request.body,
          params: request.params,
          query: request.query,
        },
      });
    }

    // Send response to client
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object') {
        Object.assign(errorResponse, exceptionResponse);
      } else {
        errorResponse.message = exceptionResponse;
      }
    } else {
      errorResponse.message = message;
    }

    response.status(status).json(errorResponse);
  }
}

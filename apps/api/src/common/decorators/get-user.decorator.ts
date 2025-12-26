import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from './current-user.decorator.js';

/**
 * Decorator to extract current user ID from request.
 * Simplified version of CurrentUser for controllers that just need the user ID.
 * Must be used after JwtAuthGuard.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@GetUser() userId: string) {
 *   return this.usersService.findOne(userId);
 * }
 * ```
 */
export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.sub ?? null;
  },
);

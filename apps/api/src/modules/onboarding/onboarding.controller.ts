import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';
import { User } from '@prisma/client';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('progress')
  @ApiOperation({
    summary: 'Get user onboarding progress',
    description: 'Returns the current onboarding progress for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding progress retrieved successfully',
  })
  async getProgress(@GetUser() user: User) {
    return this.onboarding.getOnboardingProgress(user.id);
  }

  @Get('steps')
  @ApiOperation({
    summary: 'Get onboarding steps',
    description: 'Returns all onboarding steps with completion status',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding steps retrieved successfully',
  })
  async getSteps(@GetUser() user: User) {
    return this.onboarding.getOnboardingSteps(user.id);
  }

  @Post('steps/:stepId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark onboarding step as completed',
    description: 'Marks a specific onboarding step as completed',
  })
  @ApiResponse({
    status: 200,
    description: 'Step marked as completed',
  })
  @ApiResponse({
    status: 404,
    description: 'Step not found',
  })
  async completeStep(@GetUser() user: User, @Param('stepId') stepId: string) {
    return this.onboarding.completeStep(user.id, stepId);
  }

  @Post('steps/:stepId/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Skip onboarding step',
    description: 'Marks a specific onboarding step as skipped',
  })
  @ApiResponse({
    status: 200,
    description: 'Step marked as skipped',
  })
  @ApiResponse({
    status: 404,
    description: 'Step not found',
  })
  async skipStep(@GetUser() user: User, @Param('stepId') stepId: string) {
    return this.onboarding.skipStep(user.id, stepId);
  }

  @Post('dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dismiss onboarding',
    description: 'Permanently dismisses the onboarding flow for the user',
  })
  @ApiResponse({
    status: 204,
    description: 'Onboarding dismissed',
  })
  async dismissOnboarding(@GetUser() user: User) {
    await this.onboarding.dismissOnboarding(user.id);
  }

  @Post('restart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restart onboarding',
    description: 'Resets onboarding progress to start from the beginning',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding restarted',
  })
  async restartOnboarding(@GetUser() user: User) {
    return this.onboarding.restartOnboarding(user.id);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get onboarding statistics',
    description: 'Returns aggregated onboarding statistics (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats() {
    return this.onboarding.getOnboardingStats();
  }
}

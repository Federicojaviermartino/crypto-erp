import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@crypto-erp/database';
import { UserOnboardingStatus } from '@prisma/client';

export interface OnboardingProgress {
  userId: string;
  status: UserOnboardingStatus;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  order: number;
  isCompleted: boolean;
  isSkipped: boolean;
  path?: string;
  action?: string;
}

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  private readonly ONBOARDING_STEPS: Omit<OnboardingStep, 'isCompleted' | 'isSkipped'>[] = [
    {
      id: 'complete-profile',
      title: 'Complete your profile',
      description: 'Add your personal information and configure your account',
      order: 1,
      path: '/settings/profile',
      action: 'Complete profile',
    },
    {
      id: 'create-company',
      title: 'Create your company',
      description: 'Register your company and configure tax settings',
      order: 2,
      path: '/settings/company',
      action: 'Create company',
    },
    {
      id: 'configure-accounting',
      title: 'Configure chart of accounts',
      description: 'Select or customize your accounting chart of accounts',
      order: 3,
      path: '/accounting/chart-of-accounts',
      action: 'Configure accounts',
    },
    {
      id: 'create-first-invoice',
      title: 'Create your first invoice',
      description: 'Create an invoice with automatic Verifactu compliance',
      order: 4,
      path: '/invoicing/invoices/new',
      action: 'Create invoice',
    },
    {
      id: 'add-crypto-wallet',
      title: 'Add a crypto wallet',
      description: 'Register your first wallet for asset tracking',
      order: 5,
      path: '/crypto/wallets/new',
      action: 'Add wallet',
    },
    {
      id: 'explore-ai-chat',
      title: 'Try the AI assistant',
      description: 'Ask your first question to the accounting assistant',
      order: 6,
      path: '/ai/chat',
      action: 'Open chat',
    },
  ];

  async getOnboardingProgress(userId: string): Promise<OnboardingProgress> {
    let progress = await this.prisma.userOnboarding.findUnique({
      where: { userId },
    });

    if (!progress) {
      // Create initial onboarding record
      progress = await this.prisma.userOnboarding.create({
        data: {
          userId,
          status: UserOnboardingStatus.IN_PROGRESS,
          currentStep: 1,
          completedSteps: [],
          skippedSteps: [],
        },
      });
    }

    return {
      userId: progress.userId,
      status: progress.status,
      currentStep: progress.currentStep,
      completedSteps: progress.completedSteps as string[],
      skippedSteps: progress.skippedSteps as string[],
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
      lastActivityAt: progress.lastActivityAt,
    };
  }

  async getOnboardingSteps(userId: string): Promise<OnboardingStep[]> {
    const progress = await this.getOnboardingProgress(userId);

    return this.ONBOARDING_STEPS.map(step => ({
      ...step,
      isCompleted: progress.completedSteps.includes(step.id),
      isSkipped: progress.skippedSteps.includes(step.id),
    }));
  }

  async completeStep(userId: string, stepId: string): Promise<OnboardingProgress> {
    const progress = await this.getOnboardingProgress(userId);

    // Check if step exists
    const step = this.ONBOARDING_STEPS.find(s => s.id === stepId);
    if (!step) {
      throw new NotFoundException(`Onboarding step '${stepId}' not found`);
    }

    // Don't add if already completed
    if (progress.completedSteps.includes(stepId)) {
      return progress;
    }

    // Remove from skipped if it was there
    const skippedSteps = progress.skippedSteps.filter(id => id !== stepId);

    // Add to completed
    const completedSteps = [...progress.completedSteps, stepId];

    // Calculate progress
    const totalSteps = this.ONBOARDING_STEPS.length;
    const completedCount = completedSteps.length;
    const isFullyCompleted = completedCount >= totalSteps;

    // Update next step
    const nextStep = isFullyCompleted ? totalSteps : Math.max(progress.currentStep, step.order + 1);

    const updated = await this.prisma.userOnboarding.update({
      where: { userId },
      data: {
        completedSteps,
        skippedSteps,
        currentStep: nextStep,
        status: isFullyCompleted ? UserOnboardingStatus.COMPLETED : UserOnboardingStatus.IN_PROGRESS,
        completedAt: isFullyCompleted ? new Date() : null,
        lastActivityAt: new Date(),
      },
    });

    return {
      userId: updated.userId,
      status: updated.status,
      currentStep: updated.currentStep,
      completedSteps: updated.completedSteps as string[],
      skippedSteps: updated.skippedSteps as string[],
      startedAt: updated.startedAt,
      completedAt: updated.completedAt,
      lastActivityAt: updated.lastActivityAt,
    };
  }

  async skipStep(userId: string, stepId: string): Promise<OnboardingProgress> {
    const progress = await this.getOnboardingProgress(userId);

    // Check if step exists
    const step = this.ONBOARDING_STEPS.find(s => s.id === stepId);
    if (!step) {
      throw new NotFoundException(`Onboarding step '${stepId}' not found`);
    }

    // Don't add if already skipped or completed
    if (progress.skippedSteps.includes(stepId) || progress.completedSteps.includes(stepId)) {
      return progress;
    }

    // Add to skipped
    const skippedSteps = [...progress.skippedSteps, stepId];

    // Update next step
    const nextStep = Math.max(progress.currentStep, step.order + 1);

    const updated = await this.prisma.userOnboarding.update({
      where: { userId },
      data: {
        skippedSteps,
        currentStep: nextStep,
        lastActivityAt: new Date(),
      },
    });

    return {
      userId: updated.userId,
      status: updated.status,
      currentStep: updated.currentStep,
      completedSteps: updated.completedSteps as string[],
      skippedSteps: updated.skippedSteps as string[],
      startedAt: updated.startedAt,
      completedAt: updated.completedAt,
      lastActivityAt: updated.lastActivityAt,
    };
  }

  async dismissOnboarding(userId: string): Promise<void> {
    await this.prisma.userOnboarding.update({
      where: { userId },
      data: {
        status: UserOnboardingStatus.DISMISSED,
        lastActivityAt: new Date(),
      },
    });
  }

  async restartOnboarding(userId: string): Promise<OnboardingProgress> {
    const updated = await this.prisma.userOnboarding.update({
      where: { userId },
      data: {
        status: UserOnboardingStatus.IN_PROGRESS,
        currentStep: 1,
        completedSteps: [],
        skippedSteps: [],
        completedAt: null,
        lastActivityAt: new Date(),
      },
    });

    return {
      userId: updated.userId,
      status: updated.status,
      currentStep: updated.currentStep,
      completedSteps: updated.completedSteps as string[],
      skippedSteps: updated.skippedSteps as string[],
      startedAt: updated.startedAt,
      completedAt: updated.completedAt,
      lastActivityAt: updated.lastActivityAt,
    };
  }

  async getOnboardingStats(): Promise<{
    total: number;
    inProgress: number;
    completed: number;
    dismissed: number;
    notStarted: number;
  }> {
    const [total, inProgress, completed, dismissed] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userOnboarding.count({
        where: { status: UserOnboardingStatus.IN_PROGRESS },
      }),
      this.prisma.userOnboarding.count({
        where: { status: UserOnboardingStatus.COMPLETED },
      }),
      this.prisma.userOnboarding.count({
        where: { status: UserOnboardingStatus.DISMISSED },
      }),
    ]);

    const notStarted = total - (inProgress + completed + dismissed);

    return {
      total,
      inProgress,
      completed,
      dismissed,
      notStarted,
    };
  }
}

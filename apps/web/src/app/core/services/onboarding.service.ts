import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, tap, switchMap, map } from 'rxjs';

export interface OnboardingProgress {
  userId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
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

@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private progressSignal = signal<OnboardingProgress | null>(null);
  private stepsSignal = signal<OnboardingStep[]>([]);

  // Public readonly signals
  progress = this.progressSignal.asReadonly();
  steps = this.stepsSignal.asReadonly();

  // Computed signals
  isOnboardingActive = computed(() => {
    const progress = this.progress();
    return progress?.status === 'IN_PROGRESS';
  });

  completionPercentage = computed(() => {
    const steps = this.steps();
    if (steps.length === 0) return 0;
    const completedCount = steps.filter((s) => s.isCompleted).length;
    return Math.round((completedCount / steps.length) * 100);
  });

  nextStep = computed(() => {
    const steps = this.steps();
    return steps.find((s) => !s.isCompleted && !s.isSkipped);
  });

  constructor(private api: ApiService) {}

  loadProgress(): Observable<OnboardingProgress> {
    return this.api.get<OnboardingProgress>('/onboarding/progress').pipe(
      tap((progress) => this.progressSignal.set(progress)),
      switchMap((progress) => this.loadSteps().pipe(map(() => progress)))
    );
  }

  loadSteps(): Observable<OnboardingStep[]> {
    return this.api.get<OnboardingStep[]>('/onboarding/steps').pipe(
      tap((steps) => this.stepsSignal.set(steps))
    );
  }

  completeStep(stepId: string): Observable<OnboardingProgress> {
    return this.api.post<OnboardingProgress>(`/onboarding/steps/${stepId}/complete`, {}).pipe(
      tap((progress) => this.progressSignal.set(progress)),
      switchMap((progress) => this.loadSteps().pipe(map(() => progress)))
    );
  }

  skipStep(stepId: string): Observable<OnboardingProgress> {
    return this.api.post<OnboardingProgress>(`/onboarding/steps/${stepId}/skip`, {}).pipe(
      tap((progress) => this.progressSignal.set(progress)),
      switchMap((progress) => this.loadSteps().pipe(map(() => progress)))
    );
  }

  dismissOnboarding(): Observable<void> {
    return this.api.post<void>('/onboarding/dismiss', {}).pipe(
      tap(() => {
        this.progressSignal.update((p) => (p ? { ...p, status: 'DISMISSED' } : null));
      })
    );
  }

  restartOnboarding(): Observable<OnboardingProgress> {
    return this.api.post<OnboardingProgress>('/onboarding/restart', {}).pipe(
      tap((progress) => this.progressSignal.set(progress)),
      switchMap((progress) => this.loadSteps().pipe(map(() => progress)))
    );
  }
}

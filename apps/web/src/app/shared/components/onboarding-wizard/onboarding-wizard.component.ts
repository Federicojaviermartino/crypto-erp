import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OnboardingService, OnboardingStep } from '@core/services/onboarding.service';
import { DialogService } from '@core/services/dialog.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (onboarding.isOnboardingActive()) {
      <div class="onboarding-wizard">
        <!-- Header -->
        <div class="wizard-header">
          <div class="wizard-title">
            <h3>Getting Started Guide</h3>
            <span class="wizard-progress">{{ onboarding.completionPercentage() }}% complete</span>
          </div>
          <button class="btn-dismiss" (click)="dismissOnboarding()" title="Close guide">
            ✕
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="onboarding.completionPercentage()"></div>
        </div>

        <!-- Steps List -->
        <div class="steps-list">
          @for (step of onboarding.steps(); track step.id) {
            <div class="step-card" [class.completed]="step.isCompleted" [class.skipped]="step.isSkipped" [class.current]="!step.isCompleted && !step.isSkipped && isCurrentStep(step)">
              <!-- Status Icon -->
              <div class="step-icon">
                @if (step.isCompleted) {
                  <span class="icon-completed">✓</span>
                } @else if (step.isSkipped) {
                  <span class="icon-skipped">−</span>
                } @else {
                  <span class="icon-pending">{{ step.order }}</span>
                }
              </div>

              <!-- Step Info -->
              <div class="step-info">
                <h4>{{ step.title }}</h4>
                <p>{{ step.description }}</p>
              </div>

              <!-- Actions -->
              <div class="step-actions">
                @if (!step.isCompleted && !step.isSkipped) {
                  <button
                    class="btn btn-sm btn-primary"
                    [routerLink]="step.path"
                    (click)="navigateToStep(step)"
                  >
                    {{ step.action || 'Go' }}
                  </button>
                  <button
                    class="btn btn-sm btn-ghost"
                    (click)="skipStep(step.id)"
                  >
                    Skip
                  </button>
                } @else if (step.isCompleted) {
                  <span class="badge badge-success">Completed</span>
                } @else if (step.isSkipped) {
                  <button
                    class="btn btn-sm btn-ghost"
                    (click)="undoSkip(step.id)"
                  >
                    Undo
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Footer Actions -->
        <div class="wizard-footer">
          @if (onboarding.completionPercentage() === 100) {
            <div class="completion-message">
              <span class="celebration-icon">🎉</span>
              <p>Congratulations! You've completed the initial setup.</p>
              <button class="btn btn-primary" (click)="completeOnboarding()">
                Finish guide
              </button>
            </div>
          } @else {
            <button class="btn btn-link" (click)="dismissOnboarding()">
              Close guide (you can resume it later)
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .onboarding-wizard {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: var(--radius-xl);
      padding: var(--spacing-xl);
      color: white;
      box-shadow: var(--shadow-xl);
      margin-bottom: var(--spacing-xl);
    }

    .wizard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--spacing-lg);
    }

    .wizard-title {
      h3 {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      .wizard-progress {
        font-size: 0.875rem;
        opacity: 0.9;
      }
    }

    .btn-dismiss {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: var(--radius-md);
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      cursor: pointer;
      transition: all var(--transition-fast);

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }

    .progress-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-bottom: var(--spacing-xl);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #34d399 0%, #10b981 100%);
      border-radius: var(--radius-full);
      transition: width var(--transition-slow);
    }

    .steps-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-lg);
    }

    .step-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: var(--radius-lg);
      padding: var(--spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      transition: all var(--transition-fast);

      &.current {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.02);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }

      &.completed {
        opacity: 0.7;
      }

      &.skipped {
        opacity: 0.5;
      }
    }

    .step-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      flex-shrink: 0;

      .icon-completed {
        background: #10b981;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-full);
        font-size: 1.25rem;
      }

      .icon-skipped {
        background: rgba(255, 255, 255, 0.3);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-full);
        font-size: 1.5rem;
      }

      .icon-pending {
        background: rgba(255, 255, 255, 0.2);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-full);
      }
    }

    .step-info {
      flex: 1;

      h4 {
        margin: 0 0 var(--spacing-xs) 0;
        font-size: 1rem;
        font-weight: 500;
      }

      p {
        margin: 0;
        font-size: 0.875rem;
        opacity: 0.9;
      }
    }

    .step-actions {
      display: flex;
      gap: var(--spacing-sm);
      flex-shrink: 0;

      .btn {
        white-space: nowrap;
      }

      .badge-success {
        background: #10b981;
        color: white;
        padding: var(--spacing-xs) var(--spacing-md);
        border-radius: var(--radius-md);
        font-size: 0.875rem;
      }
    }

    .wizard-footer {
      text-align: center;
      padding-top: var(--spacing-lg);
      border-top: 1px solid rgba(255, 255, 255, 0.2);

      .btn-link {
        background: none;
        border: none;
        color: white;
        text-decoration: underline;
        cursor: pointer;
        opacity: 0.8;

        &:hover {
          opacity: 1;
        }
      }
    }

    .completion-message {
      .celebration-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: var(--spacing-md);
      }

      p {
        margin: 0 0 var(--spacing-lg) 0;
        font-size: 1.125rem;
      }
    }

    @media (max-width: 768px) {
      .step-card {
        flex-direction: column;
        align-items: flex-start;
      }

      .step-actions {
        width: 100%;
        justify-content: stretch;

        .btn {
          flex: 1;
        }
      }
    }
  `],
})
export class OnboardingWizardComponent implements OnInit {
  loading = signal(false);

  private dialogService = inject(DialogService);
  private notificationService = inject(NotificationService);

  constructor(
    public onboarding: OnboardingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOnboarding();
  }

  private loadOnboarding(): void {
    this.loading.set(true);
    this.onboarding.loadProgress().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  isCurrentStep(step: OnboardingStep): boolean {
    const nextStep = this.onboarding.nextStep();
    return nextStep?.id === step.id;
  }

  navigateToStep(step: OnboardingStep): void {
    if (step.path) {
      this.router.navigate([step.path]);
    }
  }

  skipStep(stepId: string): void {
    this.onboarding.skipStep(stepId).subscribe();
  }

  undoSkip(stepId: string): void {
    // Re-activate the step by completing it with empty state
    // In a real scenario, you might want a separate "unskip" endpoint
    this.onboarding.skipStep(stepId).subscribe();
  }

  async dismissOnboarding(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Close Guide',
      message: 'Are you sure you want to close the guide? You can resume it from Settings.',
      confirmText: 'Close',
      cancelText: 'Continue',
      confirmColor: 'primary',
    });

    if (confirmed) {
      this.onboarding.dismissOnboarding().subscribe();
    }
  }

  completeOnboarding(): void {
    this.onboarding.dismissOnboarding().subscribe({
      next: () => {
        this.notificationService.success('Guide completed! You can now use all features.');
      },
    });
  }
}

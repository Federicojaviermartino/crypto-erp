import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <h1>My Profile</h1>
        <p class="text-muted">Manage your personal information and security</p>
      </header>

      @if (loading()) {
        <div class="text-center p-lg">
          <span class="spinner"></span>
        </div>
      } @else {
        <!-- Personal Info -->
        <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()">
          <div class="card mb-lg">
            <div class="card-header">
              <h3>Personal Information</h3>
            </div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">First Name *</label>
                  <input type="text" class="form-input" formControlName="firstName" />
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name *</label>
                  <input type="text" class="form-input" formControlName="lastName" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" formControlName="email" />
                <small class="form-hint">Email cannot be changed</small>
              </div>
            </div>
          </div>

          @if (profileSuccess()) {
            <div class="alert alert-success mb-lg">Profile updated successfully</div>
          }

          @if (profileError()) {
            <div class="alert alert-danger mb-lg">{{ profileError() }}</div>
          }

          <button type="submit" class="btn btn-primary mb-xl" [disabled]="savingProfile()">
            @if (savingProfile()) {
              <span class="spinner"></span>
            }
            Save Changes
          </button>
        </form>

        <!-- Change Password -->
        <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()">
          <div class="card mb-lg">
            <div class="card-header">
              <h3>Change Password</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Current Password *</label>
                <input type="password" class="form-input" formControlName="currentPassword" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">New Password *</label>
                  <input type="password" class="form-input" formControlName="newPassword" />
                  <small class="form-hint">Minimum 8 characters</small>
                </div>
                <div class="form-group">
                  <label class="form-label">Confirm Password *</label>
                  <input type="password" class="form-input" formControlName="confirmPassword" />
                </div>
              </div>
            </div>
          </div>

          @if (passwordSuccess()) {
            <div class="alert alert-success mb-lg">Password changed successfully</div>
          }

          @if (passwordError()) {
            <div class="alert alert-danger mb-lg">{{ passwordError() }}</div>
          }

          <button type="submit" class="btn btn-secondary" [disabled]="savingPassword()">
            @if (savingPassword()) {
              <span class="spinner"></span>
            }
            Change Password
          </button>
        </form>

        <!-- Sessions -->
        <div class="card mt-xl">
          <div class="card-header d-flex justify-between align-center">
            <h3>Active Sessions</h3>
            <button class="btn btn-sm btn-danger" (click)="logoutAllSessions()">
              Close All
            </button>
          </div>
          <div class="card-body">
            <div class="session-list">
              <div class="session-item current">
                <div class="session-info">
                  <span class="session-device">This device</span>
                  <span class="session-details">Current session</span>
                </div>
                <span class="badge badge-success">Active</span>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page {
      padding: var(--spacing-xl);
      max-width: 800px;
    }

    .form-row {
      display: flex;
      gap: var(--spacing-md);

      .form-group { flex: 1; }
    }

    .form-hint {
      display: block;
      margin-top: var(--spacing-xs);
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .alert {
      padding: var(--spacing-md);
      border-radius: var(--radius-md);

      &-success { background: #dcfce7; color: #166534; }
      &-danger { background: #fee2e2; color: #991b1b; }
    }

    .session-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .session-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      background: var(--gray-50);
      border-radius: var(--radius-md);

      &.current {
        background: #eff6ff;
        border: 1px solid var(--primary-light);
      }
    }

    .session-info {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .session-device {
      font-weight: 500;
    }

    .session-details {
      font-size: 0.875rem;
      color: var(--gray-500);
    }
  `],
})
export class ProfileSettingsComponent implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;

  loading = signal(true);
  savingProfile = signal(false);
  savingPassword = signal(false);
  profileSuccess = signal(false);
  profileError = signal<string | null>(null);
  passwordSuccess = signal(false);
  passwordError = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private api: ApiService,
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.profileForm.patchValue({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
    this.loading.set(false);
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    this.profileSuccess.set(false);
    this.profileError.set(null);

    const { firstName, lastName } = this.profileForm.getRawValue();

    this.api.put('/users/profile', { firstName, lastName }).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.profileSuccess.set(true);
        setTimeout(() => this.profileSuccess.set(false), 3000);
      },
      error: (err) => {
        this.savingProfile.set(false);
        this.profileError.set(err.error?.message || 'Error saving profile');
      },
    });
  }

  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.passwordError.set('Passwords do not match');
      return;
    }

    this.savingPassword.set(true);
    this.passwordSuccess.set(false);
    this.passwordError.set(null);

    this.api.post('/users/change-password', { currentPassword, newPassword }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordSuccess.set(true);
        this.passwordForm.reset();
        setTimeout(() => this.passwordSuccess.set(false), 3000);
      },
      error: (err) => {
        this.savingPassword.set(false);
        this.passwordError.set(err.error?.message || 'Error changing password');
      },
    });
  }

  logoutAllSessions(): void {
    if (confirm('Close all sessions? You will need to log in again.')) {
      this.auth.logout();
    }
  }
}

import { Injectable, ComponentRef, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialogRef: ComponentRef<ConfirmDialogComponent> | null = null;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector,
  ) {}

  /**
   * Show a confirmation dialog
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  async confirm(config: ConfirmDialogConfig): Promise<boolean> {
    // Create the dialog component dynamically
    this.dialogRef = createComponent(ConfirmDialogComponent, {
      environmentInjector: this.injector,
    });

    // Attach to the application
    this.appRef.attachView(this.dialogRef.hostView);
    document.body.appendChild(this.dialogRef.location.nativeElement);

    // Open the dialog and wait for result
    const result = await this.dialogRef.instance.open(config);

    // Cleanup
    this.appRef.detachView(this.dialogRef.hostView);
    this.dialogRef.destroy();
    this.dialogRef = null;

    return result;
  }

  /**
   * Convenience method for delete confirmations
   */
  confirmDelete(itemName: string): Promise<boolean> {
    return this.confirm({
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'danger',
    });
  }

  /**
   * Convenience method for close/dismiss confirmations
   */
  confirmClose(message: string): Promise<boolean> {
    return this.confirm({
      title: 'Confirm',
      message,
      confirmText: 'Yes',
      cancelText: 'No',
      confirmColor: 'primary',
    });
  }

  /**
   * Convenience method for logout confirmations
   */
  confirmLogout(): Promise<boolean> {
    return this.confirm({
      title: 'Logout',
      message: 'Are you sure you want to log out?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      confirmColor: 'warning',
    });
  }
}

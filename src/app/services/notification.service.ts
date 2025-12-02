import { Injectable, signal } from '@angular/core';

export interface NotificationConfig {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Signal for modal state
  isOpen = signal(false);
  config = signal<NotificationConfig>({
    title: '',
    message: '',
    type: 'info'
  });
  
  private resolver: ((value: boolean) => void) | null = null;
  
  /**
   * Show a confirmation dialog
   */
  confirm(config: NotificationConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.config.set({
        ...config,
        confirmText: config.confirmText || 'Confirmer',
        cancelText: config.cancelText || 'Annuler'
      });
      this.resolver = resolve;
      this.isOpen.set(true);
    });
  }
  
  /**
   * Show an info/success/error message (auto-closes or requires OK)
   */
  alert(config: Omit<NotificationConfig, 'cancelText'>): Promise<void> {
    return new Promise((resolve) => {
      this.config.set({
        ...config,
        confirmText: config.confirmText || 'OK',
        cancelText: undefined
      });
      this.resolver = () => resolve();
      this.isOpen.set(true);
    });
  }
  
  /**
   * Called when user confirms
   */
  onConfirm(): void {
    this.isOpen.set(false);
    if (this.resolver) {
      this.resolver(true);
      this.resolver = null;
    }
  }
  
  /**
   * Called when user cancels
   */
  onCancel(): void {
    this.isOpen.set(false);
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }
  }
}


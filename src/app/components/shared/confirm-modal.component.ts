import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmModalConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  icon?: string;
}

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="modal-container" [class]="'modal-' + (config.type || 'info')" (click)="$event.stopPropagation()">
        <div class="modal-icon">
          <span>{{ getIcon() }}</span>
        </div>
        <div class="modal-content">
          <h3 class="modal-title">{{ config.title }}</h3>
          <p class="modal-message">{{ config.message }}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-cancel" (click)="onCancel()">
            {{ config.cancelText || 'Annuler' }}
          </button>
          <button class="btn btn-confirm" [class]="'btn-' + (config.type || 'info')" (click)="onConfirm()">
            {{ config.confirmText || 'Confirmer' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .modal-container {
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      animation: slideUp 0.3s ease-out;
      text-align: center;
    }
    
    .modal-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
    }
    
    .modal-info .modal-icon {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #2563eb;
    }
    
    .modal-warning .modal-icon {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #d97706;
    }
    
    .modal-danger .modal-icon {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      color: #dc2626;
    }
    
    .modal-success .modal-icon {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      color: #059669;
    }
    
    .modal-title {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 12px;
    }
    
    .modal-message {
      font-size: 15px;
      color: #64748b;
      margin: 0 0 28px;
      line-height: 1.6;
    }
    
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    
    .btn {
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      min-width: 120px;
    }
    
    .btn-cancel {
      background: #f1f5f9;
      color: #475569;
    }
    
    .btn-cancel:hover {
      background: #e2e8f0;
    }
    
    .btn-confirm {
      color: white;
    }
    
    .btn-info {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }
    
    .btn-info:hover {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      transform: translateY(-1px);
    }
    
    .btn-warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    
    .btn-warning:hover {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      transform: translateY(-1px);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    
    .btn-danger:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      transform: translateY(-1px);
    }
    
    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .btn-success:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      transform: translateY(-1px);
    }
  `]
})
export class ConfirmModalComponent {
  @Input() isOpen = false;
  @Input() config: ConfirmModalConfig = {
    title: 'Confirmation',
    message: 'Êtes-vous sûr ?',
    type: 'info'
  };
  
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
  
  getIcon(): string {
    if (this.config.icon) return this.config.icon;
    
    switch (this.config.type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'danger': return '🗑';
      default: return 'ℹ';
    }
  }
  
  onConfirm(): void {
    this.confirmed.emit();
  }
  
  onCancel(): void {
    this.cancelled.emit();
  }
}


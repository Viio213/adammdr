import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserRole, ROLE_LABELS, ROLE_PERMISSIONS, PERMISSION_LABELS } from '../../models/user.model';
import { NotificationService } from '../../services/notification.service';

const STORAGE_KEY_CUSTOM_PERMISSIONS = 'adammdr_custom_permissions';

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Gestion des Permissions</h2>
          <div class="header-actions">
            <button class="btn btn-secondary" (click)="reinitialiserPermissions()">
              Réinitialiser aux valeurs par défaut
            </button>
            <button class="btn btn-primary" (click)="sauvegarderPermissions()">
              Sauvegarder
            </button>
          </div>
        </div>

        <div class="permissions-info">
          <p>
            Configurez les permissions pour chaque rôle. Les modifications seront appliquées immédiatement après sauvegarde.
          </p>
        </div>

        <div class="permissions-table-container">
          <table class="permissions-table">
            <thead>
              <tr>
                <th class="th-permission">Permission</th>
                <th *ngFor="let role of roles" class="th-role">
                  {{ getRoleLabel(role) }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let permission of permissions">
                <td class="td-permission">
                  <strong>{{ getPermissionLabel(permission) }}</strong>
                </td>
                <td *ngFor="let role of roles" class="td-checkbox">
                  <input 
                    type="checkbox" 
                    [checked]="getPermission(role, permission)"
                    [disabled]="role === UserRole.ADMIN && permission === 'canManagePermissions'"
                    (change)="togglePermission(role, permission, $event)"
                    class="permission-checkbox"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="permissions-note">
          <p><strong>Note :</strong> L'administrateur doit toujours avoir accès à la gestion des permissions.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 16px;
    }
    
    .card-header h2 {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .permissions-info {
      padding: 20px;
      background: #f8fafc;
      border-radius: 10px;
      margin: 24px 0;
      border-left: 4px solid #6366f1;
    }

    .permissions-info p {
      margin: 0;
      color: #475569;
      font-size: 14px;
      line-height: 1.6;
    }

    .permissions-table-container {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin: 24px 0;
    }

    .permissions-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    thead {
      background: #1e293b;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    thead th {
      color: #fff;
      padding: 14px 16px;
      text-align: center;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.3px;
    }

    .th-permission {
      text-align: left;
      min-width: 250px;
    }

    .th-role {
      min-width: 150px;
    }

    tbody tr {
      border-bottom: 1px solid #e2e8f0;
      transition: background 0.2s;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    tbody td {
      padding: 16px;
      vertical-align: middle;
    }

    .td-permission {
      font-weight: 500;
      color: #1e293b;
    }

    .td-checkbox {
      text-align: center;
    }

    .permission-checkbox {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #6366f1;
    }

    .permission-checkbox:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .permissions-note {
      padding: 16px;
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      margin-top: 24px;
    }

    .permissions-note p {
      margin: 0;
      color: #92400e;
      font-size: 13px;
    }

    @media (max-width: 768px) {
      .card-header {
        flex-direction: column;
        align-items: stretch;
      }

      .header-actions {
        width: 100%;
      }

      .header-actions .btn {
        flex: 1;
      }
    }
  `]
})
export class PermissionsComponent {
  private authService = inject(AuthService);
  private notification = inject(NotificationService);

  readonly UserRole = UserRole;
  readonly roles = Object.values(UserRole) as UserRole[];
  readonly permissions: string[] = Object.keys(PERMISSION_LABELS);
  
  // Custom permissions stored in localStorage
  customPermissions = signal<Record<string, Record<string, boolean>>>(this.loadCustomPermissions());

  constructor() {
    // Check if user is admin
    if (!this.authService.hasPermission('canManagePermissions')) {
      this.notification.alert({
        title: 'Accès refusé',
        message: 'Seuls les administrateurs peuvent gérer les permissions.',
        type: 'danger'
      });
    }
  }

  getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }

  getPermissionLabel(permission: string): string {
    return PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS] || permission;
  }

  getPermission(role: UserRole, permission: string): boolean {
    const custom = this.customPermissions();
    if (custom[role] && custom[role][permission] !== undefined) {
      return custom[role][permission];
    }
    // Fallback to default permissions
    const defaultPerms = ROLE_PERMISSIONS[role] as Record<string, boolean>;
    return defaultPerms[permission] ?? false;
  }

  togglePermission(role: UserRole, permission: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    
    // Cannot disable canManagePermissions for ADMIN
    if (role === UserRole.ADMIN && permission === 'canManagePermissions' && !checked) {
      this.notification.alert({
        title: 'Action interdite',
        message: 'L\'administrateur doit toujours avoir accès à la gestion des permissions.',
        type: 'warning'
      });
      (event.target as HTMLInputElement).checked = true;
      return;
    }

    const custom = { ...this.customPermissions() };
    if (!custom[role]) {
      custom[role] = {};
    }
    custom[role][permission] = checked;
    this.customPermissions.set(custom);
  }

  sauvegarderPermissions(): void {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_PERMISSIONS, JSON.stringify(this.customPermissions()));
      this.notification.alert({
        title: 'Succès',
        message: 'Les permissions ont été sauvegardées avec succès.',
        type: 'success'
      });
      // Reload page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      this.notification.alert({
        title: 'Erreur',
        message: 'Erreur lors de la sauvegarde des permissions.',
        type: 'danger'
      });
    }
  }

  reinitialiserPermissions(): void {
    this.notification.confirm({
      title: 'Réinitialiser les permissions',
      message: 'Êtes-vous sûr de vouloir réinitialiser toutes les permissions aux valeurs par défaut ?',
      confirmText: 'Réinitialiser',
      cancelText: 'Annuler',
      type: 'warning'
    }).then(confirmed => {
      if (confirmed) {
        localStorage.removeItem(STORAGE_KEY_CUSTOM_PERMISSIONS);
        this.customPermissions.set({});
        this.notification.alert({
          title: 'Succès',
          message: 'Les permissions ont été réinitialisées.',
          type: 'success'
        });
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });
  }

  private loadCustomPermissions(): Record<string, Record<string, boolean>> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_PERMISSIONS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading custom permissions:', error);
    }
    return {};
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mon-compte',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Mon compte</h2>
        </div>

        <div class="card-content">
          <div class="user-info-section">
            <h3>Informations personnelles</h3>
            <div class="info-row">
              <span class="info-label">Nom d'utilisateur :</span>
              <span class="info-value">{{ currentUser()?.username }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Nom :</span>
              <span class="info-value">{{ currentUser()?.nom }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Prénom :</span>
              <span class="info-value">{{ currentUser()?.prenom }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Rôle :</span>
              <span class="info-value">{{ getRoleLabel() }}</span>
            </div>
          </div>

          <div class="password-section">
            <h3>Modifier le mot de passe</h3>
            <form (ngSubmit)="onChangePassword()" class="password-form">
              <div class="form-group">
                <label for="currentPassword">Mot de passe actuel</label>
                <input
                  type="password"
                  id="currentPassword"
                  [(ngModel)]="currentPassword"
                  name="currentPassword"
                  class="form-control"
                  placeholder="Entrez votre mot de passe actuel"
                  required
                />
              </div>

              <div class="form-group">
                <label for="newPassword">Nouveau mot de passe</label>
                <input
                  type="password"
                  id="newPassword"
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  class="form-control"
                  placeholder="Entrez votre nouveau mot de passe"
                  required
                  minlength="4"
                />
              </div>

              <div class="form-group">
                <label for="confirmPassword">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  id="confirmPassword"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  class="form-control"
                  placeholder="Confirmez votre nouveau mot de passe"
                  required
                />
              </div>

              <div class="error-message" *ngIf="errorMessage">
                {{ errorMessage }}
              </div>

              <div class="success-message" *ngIf="successMessage">
                {{ successMessage }}
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary" [disabled]="isLoading">
                  <span *ngIf="!isLoading">Modifier le mot de passe</span>
                  <span *ngIf="isLoading">Modification en cours...</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .card-header {
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      padding: 24px 30px;
      color: white;
    }

    .card-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
    }

    .card-content {
      padding: 30px;
    }

    .user-info-section {
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #e2e8f0;
    }

    .user-info-section h3 {
      margin: 0 0 20px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }

    .info-value {
      color: #1e293b;
      font-size: 14px;
    }

    .password-section h3 {
      margin: 0 0 24px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }

    .password-form {
      max-width: 500px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #334155;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s ease;
      background: #f8fafc;
    }

    .form-control:focus {
      outline: none;
      border-color: #4a6fa5;
      background: white;
      box-shadow: 0 0 0 4px rgba(74, 111, 165, 0.1);
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .success-message {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .form-actions {
      margin-top: 24px;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(74, 111, 165, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }

      .card-content {
        padding: 20px;
      }

      .info-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class MonCompteComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isLoading = signal<boolean>(false);

  getRoleLabel(): string {
    const user = this.currentUser();
    if (!user) return '';
    
    const roleLabels: { [key: string]: string } = {
      'ADMIN': 'Administrateur',
      'CHEF_EQUIPE': 'Chef d\'équipe',
      'UTILISATEUR': 'Agent'
    };
    
    return roleLabels[user.role] || user.role;
  }

  async onChangePassword(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.currentUser();
    if (!user) {
      this.errorMessage = 'Utilisateur non connecté';
      return;
    }

    // Validate current password
    if (user.password !== this.currentPassword) {
      this.errorMessage = 'Le mot de passe actuel est incorrect';
      return;
    }

    // Validate new password
    if (this.newPassword.length < 4) {
      this.errorMessage = 'Le nouveau mot de passe doit contenir au moins 4 caractères';
      return;
    }

    // Validate confirmation
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    // Check if new password is different
    if (this.currentPassword === this.newPassword) {
      this.errorMessage = 'Le nouveau mot de passe doit être différent de l\'actuel';
      return;
    }

    this.isLoading.set(true);

    try {
      await this.authService.changePassword(user.id, this.newPassword);
      this.successMessage = 'Mot de passe modifié avec succès';
      
      // Clear form
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    } catch (error) {
      console.error('Error changing password:', error);
      this.errorMessage = 'Erreur lors de la modification du mot de passe. Veuillez réessayer.';
    } finally {
      this.isLoading.set(false);
    }
  }
}


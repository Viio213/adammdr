import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <span class="logo-icon">ADAMMDR</span>
            <h1>ADAMMDR</h1>
          </div>
          <p class="subtitle">Planning Automatique</p>
        </div>

        <form (ngSubmit)="onLogin()" class="login-form">
          <div class="form-group">
            <label for="username">Identifiant</label>
            <input 
              type="text" 
              id="username"
              [(ngModel)]="username" 
              name="username"
              class="form-control"
              placeholder="Entrez votre identifiant"
              autocomplete="username"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Mot de passe</label>
            <input 
              type="password" 
              id="password"
              [(ngModel)]="password" 
              name="password"
              class="form-control"
              placeholder="Entrez votre mot de passe"
              autocomplete="current-password"
              required
            />
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>

          <button type="submit" class="btn btn-primary btn-login" [disabled]="isLoading">
            <span *ngIf="!isLoading">Se connecter</span>
            <span *ngIf="isLoading">Connexion...</span>
          </button>
        </form>

        <div class="login-footer">
          <p>Première connexion ?</p>
          <small>Identifiant: <strong>admin</strong> | Mot de passe: <strong>admin123</strong></small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a3a0d 0%, #2d5016 50%, #3d6b1e 100%);
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 420px;
      overflow: hidden;
    }

    .login-header {
      background: linear-gradient(135deg, #2d5016 0%, #3d6b1e 100%);
      padding: 40px 30px;
      text-align: center;
      color: white;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .logo-icon {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
      display: none;
    }

    .logo h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 2px;
    }

    .subtitle {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
      letter-spacing: 1px;
    }

    .login-form {
      padding: 40px 30px;
    }

    .form-group {
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 15px;
      transition: all 0.2s ease;
      background: #f8fafc;
    }

    .form-control:focus {
      outline: none;
      border-color: #2d5016;
      background: white;
      box-shadow: 0 0 0 4px rgba(45, 80, 22, 0.1);
    }

    .form-control::placeholder {
      color: #94a3b8;
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
      text-align: center;
    }

    .btn-login {
      width: 100%;
      padding: 16px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 10px;
      background: linear-gradient(135deg, #2d5016 0%, #3d6b1e 100%);
      border: none;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-login:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(45, 80, 22, 0.3);
    }

    .btn-login:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .login-footer {
      padding: 20px 30px;
      background: #f8fafc;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }

    .login-footer p {
      margin: 0 0 4px 0;
      color: #64748b;
      font-size: 13px;
    }

    .login-footer small {
      color: #94a3b8;
      font-size: 12px;
    }

    .login-footer strong {
      color: #475569;
    }

    @media (max-width: 480px) {
      .login-card {
        border-radius: 0;
      }

      .login-header {
        padding: 30px 20px;
      }

      .login-form {
        padding: 30px 20px;
      }
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor() {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/planning']);
    }
  }

  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Simulate network delay for UX
    setTimeout(() => {
      const result = this.authService.login(this.username, this.password);
      
      if (result.success) {
        this.router.navigate(['/planning']);
      } else {
        this.errorMessage = result.message;
      }
      
      this.isLoading = false;
    }, 500);
  }
}


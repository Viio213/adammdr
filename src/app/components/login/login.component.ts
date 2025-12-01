import { Component, inject, signal } from '@angular/core';
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
            <h1>SmartPlanner</h1>
          </div>
          <p class="subtitle">Gestion intelligente des plannings</p>
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

      <div class="login-credit">
        Développé par <strong>Fetchit SRL</strong>
      </div>
    </div>

    <!-- Modal Conditions d'utilisation -->
    <div class="modal-overlay" *ngIf="showTermsModal()">
      <div class="modal-terms">
        <div class="modal-terms-header">
          <h2>Charte d'utilisation du programme</h2>
        </div>
        <div class="modal-terms-content">
          <p class="intro">
            Ce programme a été développé par <strong>FetchIT</strong>, en collaboration avec <strong>Adem Ait Abdallah</strong>, 
            et est mis à disposition du Service de la Cohésion Sociale – Département Civil et Social de la Ville de Namur.
          </p>

          <div class="terms-section">
            <h3>1. Accès autorisé</h3>
            <ul>
              <li>L'accès est strictement réservé aux agents dont l'identifiant figure dans la base de données du programme.</li>
              <li>Toute tentative d'accès non autorisé est interdite.</li>
            </ul>
          </div>

          <div class="terms-section">
            <h3>2. Usage professionnel uniquement</h3>
            <ul>
              <li>Le programme doit être utilisé exclusivement dans le cadre des missions du Service de la Cohésion Sociale.</li>
              <li>Toute utilisation personnelle, extérieure ou non conforme au rôle de l'agent est prohibée.</li>
            </ul>
          </div>

          <div class="terms-section">
            <h3>3. Respect des consignes</h3>
            <ul>
              <li>L'utilisateur s'engage à suivre les consignes fournies par le prestataire, Adem Ait Abdallah.</li>
              <li>Toute modification non autorisée, altération des données ou manipulation inappropriée est interdite.</li>
            </ul>
          </div>

          <div class="terms-section">
            <h3>4. Protection intellectuelle</h3>
            <ul>
              <li>Le programme et son contenu sont protégés par les droits de propriété intellectuelle de FetchIT.</li>
              <li>Toute reproduction, copie, extraction, diffusion ou adaptation non autorisée est strictement interdite.</li>
            </ul>
          </div>

          <div class="terms-section">
            <h3>5. Fraude et détournement</h3>
            <ul>
              <li>Toute utilisation en dehors du cadre défini, tout détournement ou tentative de contournement des règles est considéré comme une fraude.</li>
              <li>De telles actions pourront entraîner des poursuites judiciaires.</li>
            </ul>
          </div>

          <div class="terms-section">
            <h3>6. Responsabilité de l'utilisateur</h3>
            <ul>
              <li>L'utilisateur est responsable de toute action effectuée avec son identifiant.</li>
              <li>En cas de doute ou d'erreur, il s'engage à prévenir immédiatement sa hiérarchie.</li>
            </ul>
          </div>

          <div class="terms-contact">
            <p>
              <strong>Contact :</strong> La société Fetchit via le mail suivant : 
              <a href="mailto:thomas.iovino@fetchit.be">thomas.iovino&#64;fetchit.be</a>
            </p>
          </div>
        </div>
        <div class="modal-terms-footer">
          <label class="checkbox-accept">
            <input type="checkbox" [(ngModel)]="termsAccepted" />
            <span>J'ai lu et j'accepte les conditions d'utilisation</span>
          </label>
          <button 
            class="btn btn-primary btn-accept" 
            [disabled]="!termsAccepted"
            (click)="acceptTerms()">
            Continuer
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(74, 111, 165, 0.15);
      width: 100%;
      max-width: 420px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .login-header {
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
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

    .logo h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 1px;
    }

    .subtitle {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
      letter-spacing: 0.5px;
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
      color: #334155;
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
      border-color: #4a6fa5;
      background: white;
      box-shadow: 0 0 0 4px rgba(74, 111, 165, 0.1);
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
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      border: none;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-login:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(74, 111, 165, 0.3);
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

    .login-credit {
      margin-top: 24px;
      color: #64748b;
      font-size: 13px;
    }

    .login-credit strong {
      color: #4a6fa5;
    }

    /* Modal Terms */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      padding: 20px;
    }

    .modal-terms {
      background: white;
      border-radius: 16px;
      max-width: 700px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .modal-terms-header {
      padding: 24px 30px;
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      border-radius: 16px 16px 0 0;
    }

    .modal-terms-header h2 {
      margin: 0;
      color: white;
      font-size: 22px;
      font-weight: 700;
    }

    .modal-terms-content {
      padding: 24px 30px;
      overflow-y: auto;
      flex: 1;
    }

    .intro {
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 10px;
      border-left: 4px solid #4a6fa5;
    }

    .terms-section {
      margin-bottom: 20px;
    }

    .terms-section h3 {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 10px 0;
    }

    .terms-section ul {
      margin: 0;
      padding-left: 20px;
    }

    .terms-section li {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 6px;
    }

    .terms-contact {
      margin-top: 24px;
      padding: 16px;
      background: #e8f1fb;
      border-radius: 10px;
      border: 1px solid #b8d0ed;
    }

    .terms-contact p {
      margin: 0;
      font-size: 14px;
      color: #3d5a87;
    }

    .terms-contact a {
      color: #4a6fa5;
      text-decoration: none;
      font-weight: 600;
    }

    .terms-contact a:hover {
      text-decoration: underline;
    }

    .modal-terms-footer {
      padding: 20px 30px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-radius: 0 0 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .checkbox-accept {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: 14px;
      color: #1e293b;
    }

    .checkbox-accept input {
      width: 20px;
      height: 20px;
      accent-color: #4a6fa5;
      cursor: pointer;
    }

    .btn-accept {
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      border-radius: 10px;
      background: linear-gradient(135deg, #4a6fa5 0%, #5b9bd5 100%);
      border: none;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-accept:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(74, 111, 165, 0.3);
    }

    .btn-accept:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
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

      .modal-terms {
        max-height: 100vh;
        border-radius: 0;
      }

      .modal-terms-header {
        border-radius: 0;
      }

      .modal-terms-footer {
        border-radius: 0;
      }
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  private readonly TERMS_ACCEPTED_KEY = 'smartplanner_terms_accepted';

  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;
  termsAccepted = false;

  showTermsModal = signal<boolean>(!this.hasAcceptedTerms());

  constructor() {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/planning']);
    }
  }

  hasAcceptedTerms(): boolean {
    try {
      return localStorage.getItem(this.TERMS_ACCEPTED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  acceptTerms(): void {
    if (this.termsAccepted) {
      try {
        localStorage.setItem(this.TERMS_ACCEPTED_KEY, 'true');
      } catch {
        // Silently fail if localStorage is not available
      }
      this.showTermsModal.set(false);
    }
  }

  async onLogin(): Promise<void> {
    if (!this.username || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService.login(this.username, this.password);
      
      if (result.success) {
        this.router.navigate(['/planning']);
      } else {
        this.errorMessage = result.message;
      }
    } catch (error) {
      this.errorMessage = 'Erreur de connexion. Veuillez réessayer.';
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}

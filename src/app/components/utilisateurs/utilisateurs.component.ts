import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User, UserRole, ROLE_LABELS } from '../../models/user.model';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div class="card">
        <div class="card-header">
          <h2>Gestion des Utilisateurs</h2>
          <button class="btn btn-primary" (click)="ouvrirModalAjout()">
            Ajouter un Utilisateur
          </button>
        </div>

        <div class="users-list">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Identifiant</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users()" [class.current-user]="isCurrentUser(user)">
                <td><strong>{{ user.nom }}</strong></td>
                <td>{{ user.prenom }}</td>
                <td>{{ user.username }}</td>
                <td>
                  <span [class]="'badge ' + getRoleBadgeClass(user.role)">
                    {{ getRoleLabel(user.role) }}
                  </span>
                </td>
                <td>
                  <span [class]="'badge ' + (user.actif ? 'badge-success' : 'badge-danger')">
                    {{ user.actif ? 'Actif' : 'Inactif' }}
                  </span>
                </td>
                <td>{{ formatDate(user.derniereConnexion) }}</td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="editerUtilisateur(user)">
                    Modifier
                  </button>
                  <button 
                    class="btn btn-warning btn-sm" 
                    (click)="changerMotDePasse(user)"
                    [disabled]="isCurrentUser(user)">
                    Mot de passe
                  </button>
                  <button 
                    class="btn btn-danger btn-sm" 
                    (click)="supprimerUtilisateur(user.id)"
                    [disabled]="isCurrentUser(user)">
                    Supprimer
                  </button>
                </td>
              </tr>
              <tr *ngIf="users().length === 0">
                <td colspan="7" class="text-center">Aucun utilisateur</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Ajout/Édition Utilisateur -->
    <div class="modal" *ngIf="afficherModal" (click)="fermerModal($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ utilisateurEnEdition ? 'Modifier' : 'Ajouter' }} un Utilisateur</h3>
          <button class="btn-close" (click)="fermerModal()">×</button>
        </div>
        <form [formGroup]="userForm" (ngSubmit)="sauvegarderUtilisateur()">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nom *</label>
              <input type="text" formControlName="nom" class="form-control" />
            </div>
            <div class="form-group">
              <label class="form-label">Prénom *</label>
              <input type="text" formControlName="prenom" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Identifiant *</label>
            <input type="text" formControlName="username" class="form-control" 
                   [readonly]="utilisateurEnEdition" />
            <small *ngIf="utilisateurEnEdition" class="form-hint">
              L'identifiant ne peut pas être modifié
            </small>
          </div>

          <div class="form-group" *ngIf="!utilisateurEnEdition">
            <label class="form-label">Mot de passe *</label>
            <input type="password" formControlName="password" class="form-control" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Rôle *</label>
              <select formControlName="role" class="form-control">
                <option [value]="UserRole.ADMIN">{{ getRoleLabel(UserRole.ADMIN) }}</option>
                <option [value]="UserRole.CHEF_EQUIPE">{{ getRoleLabel(UserRole.CHEF_EQUIPE) }}</option>
                <option [value]="UserRole.UTILISATEUR">{{ getRoleLabel(UserRole.UTILISATEUR) }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Statut</label>
              <select formControlName="actif" class="form-control">
                <option [ngValue]="true">Actif</option>
                <option [ngValue]="false">Inactif</option>
              </select>
            </div>
          </div>

          <div class="role-info">
            <h4>Permissions du rôle sélectionné :</h4>
            <ul>
              <li *ngIf="userForm.value.role === UserRole.ADMIN">
                ✅ Accès complet à toutes les fonctionnalités<br>
                ✅ Gestion des utilisateurs
              </li>
              <li *ngIf="userForm.value.role === UserRole.CHEF_EQUIPE">
                ✅ Accès au planning, staff, historique, statistiques, paramètres<br>
                ❌ Pas d'accès à la gestion des utilisateurs
              </li>
              <li *ngIf="userForm.value.role === UserRole.UTILISATEUR">
                ✅ Consultation du planning uniquement<br>
                ❌ Ne peut pas générer de planning<br>
                ❌ Pas d'accès aux autres fonctionnalités
              </li>
            </ul>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="fermerModal()">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="!userForm.valid">
              {{ utilisateurEnEdition ? 'Modifier' : 'Ajouter' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Changement Mot de Passe -->
    <div class="modal" *ngIf="afficherModalPassword" (click)="fermerModalPassword($event)">
      <div class="modal-content modal-small" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Changer le mot de passe</h3>
          <button class="btn-close" (click)="fermerModalPassword()">×</button>
        </div>
        <form (ngSubmit)="sauvegarderMotDePasse()">
          <p class="password-user">Utilisateur : <strong>{{ utilisateurPassword?.nom }} {{ utilisateurPassword?.prenom }}</strong></p>
          
          <div class="form-group">
            <label class="form-label">Nouveau mot de passe *</label>
            <input type="password" [(ngModel)]="nouveauMotDePasse" name="password" class="form-control" required />
          </div>

          <div class="form-group">
            <label class="form-label">Confirmer le mot de passe *</label>
            <input type="password" [(ngModel)]="confirmationMotDePasse" name="confirmPassword" class="form-control" required />
          </div>

          <div class="error-message" *ngIf="passwordError">
            {{ passwordError }}
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" (click)="fermerModalPassword()">
              Annuler
            </button>
            <button type="submit" class="btn btn-primary">
              Changer
            </button>
          </div>
        </form>
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
    }

    .card-header h2 {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      margin: 0 2px;
    }

    .btn-warning {
      background: #f59e0b;
      color: white;
    }

    .btn-warning:hover:not(:disabled) {
      background: #d97706;
    }

    .current-user {
      background: #f0fdf4 !important;
    }

    .current-user:hover {
      background: #dcfce7 !important;
    }

    .badge-admin {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-chef {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-user {
      background: #f3f4f6;
      color: #374151;
    }

    .text-center {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
    }

    .modal {
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
      z-index: 2000;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      animation: slideUp 0.3s ease;
    }

    .modal-small {
      max-width: 400px;
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 2px solid #e2e8f0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: #1e293b;
    }

    .btn-close {
      background: #f1f5f9;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #64748b;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-close:hover {
      background: #e2e8f0;
      color: #1e293b;
    }

    .modal-content form {
      padding: 24px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-hint {
      display: block;
      margin-top: 4px;
      color: #94a3b8;
      font-size: 12px;
    }

    .role-info {
      background: #f8fafc;
      border-radius: 10px;
      padding: 16px;
      margin: 16px 0;
      border: 1px solid #e2e8f0;
    }

    .role-info h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #475569;
    }

    .role-info ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .role-info li {
      font-size: 13px;
      color: #64748b;
      line-height: 1.8;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
    }

    .password-user {
      margin: 0 0 20px 0;
      padding: 12px 16px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 14px;
      color: #475569;
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class UtilisateursComponent {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  users = signal<User[]>([]);
  afficherModal = false;
  afficherModalPassword = false;
  utilisateurEnEdition: User | null = null;
  utilisateurPassword: User | null = null;
  nouveauMotDePasse = '';
  confirmationMotDePasse = '';
  passwordError = '';

  readonly UserRole = UserRole;

  userForm: FormGroup = this.fb.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', Validators.required],
    role: [UserRole.UTILISATEUR, Validators.required],
    actif: [true]
  });

  constructor() {
    this.chargerUtilisateurs();
  }

  chargerUtilisateurs(): void {
    this.users.set(this.authService.getUsers());
  }

  isCurrentUser(user: User): boolean {
    return this.authService.currentUser()?.id === user.id;
  }

  getRoleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN: return 'badge-admin';
      case UserRole.CHEF_EQUIPE: return 'badge-chef';
      default: return 'badge-user';
    }
  }

  formatDate(date?: Date): string {
    if (!date) return 'Jamais';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  ouvrirModalAjout(): void {
    this.utilisateurEnEdition = null;
    this.userForm.reset({ role: UserRole.UTILISATEUR, actif: true });
    this.userForm.get('password')?.setValidators(Validators.required);
    this.userForm.get('username')?.enable();
    this.afficherModal = true;
  }

  editerUtilisateur(user: User): void {
    this.utilisateurEnEdition = user;
    this.userForm.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      username: user.username,
      role: user.role,
      actif: user.actif
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.afficherModal = true;
  }

  fermerModal(event?: Event): void {
    if (!event || (event.target as HTMLElement).classList.contains('modal')) {
      this.afficherModal = false;
      this.utilisateurEnEdition = null;
      this.userForm.reset();
    }
  }

  sauvegarderUtilisateur(): void {
    if (!this.userForm.valid) return;

    const formValue = this.userForm.value;

    if (this.utilisateurEnEdition) {
      const updatedUser: User = {
        ...this.utilisateurEnEdition,
        nom: formValue.nom,
        prenom: formValue.prenom,
        role: formValue.role,
        actif: formValue.actif
      };
      this.authService.updateUser(updatedUser);
    } else {
      const newUser: User = {
        id: this.generateId(),
        username: formValue.username,
        password: formValue.password,
        nom: formValue.nom,
        prenom: formValue.prenom,
        role: formValue.role,
        actif: formValue.actif,
        dateCreation: new Date()
      };
      
      const result = this.authService.addUser(newUser);
      if (!result.success) {
        alert(result.message);
        return;
      }
    }

    this.chargerUtilisateurs();
    this.fermerModal();
  }

  supprimerUtilisateur(id: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      const result = this.authService.deleteUser(id);
      if (!result.success) {
        alert(result.message);
        return;
      }
      this.chargerUtilisateurs();
    }
  }

  changerMotDePasse(user: User): void {
    this.utilisateurPassword = user;
    this.nouveauMotDePasse = '';
    this.confirmationMotDePasse = '';
    this.passwordError = '';
    this.afficherModalPassword = true;
  }

  fermerModalPassword(event?: Event): void {
    if (!event || (event.target as HTMLElement).classList.contains('modal')) {
      this.afficherModalPassword = false;
      this.utilisateurPassword = null;
      this.nouveauMotDePasse = '';
      this.confirmationMotDePasse = '';
      this.passwordError = '';
    }
  }

  sauvegarderMotDePasse(): void {
    if (!this.nouveauMotDePasse || !this.confirmationMotDePasse) {
      this.passwordError = 'Veuillez remplir tous les champs';
      return;
    }

    if (this.nouveauMotDePasse !== this.confirmationMotDePasse) {
      this.passwordError = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.nouveauMotDePasse.length < 4) {
      this.passwordError = 'Le mot de passe doit contenir au moins 4 caractères';
      return;
    }

    if (this.utilisateurPassword) {
      this.authService.changePassword(this.utilisateurPassword.id, this.nouveauMotDePasse);
      this.fermerModalPassword();
      alert('Mot de passe modifié avec succès');
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}


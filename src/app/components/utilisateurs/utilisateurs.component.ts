import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { NotificationService } from '../../services/notification.service';
import { User, UserRole, ROLE_LABELS } from '../../models/user.model';
import { Agent, JourSemaine, DemiJournee, Disponibilite, TypeContrat } from '../../models/agent.model';

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
                <th>Agent lié</th>
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
                  <span *ngIf="getAgentName(user.agentId)" class="badge badge-agent">
                    {{ getAgentName(user.agentId) }}
                  </span>
                  <span *ngIf="!user.agentId" class="text-muted">Non lié</span>
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
                <td colspan="8" class="text-center">Aucun utilisateur</td>
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
          <button class="btn-close" (click)="fermerModal()">Fermer</button>
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
                <option [value]="UserRole.REFERENT_ADMIN">{{ getRoleLabel(UserRole.REFERENT_ADMIN) }}</option>
                <option [value]="UserRole.CHEF_EQUIPE">{{ getRoleLabel(UserRole.CHEF_EQUIPE) }}</option>
                <option [value]="UserRole.UTILISATEUR">{{ getRoleLabel(UserRole.UTILISATEUR) }}</option>
                <option [value]="UserRole.COORDINATEUR">{{ getRoleLabel(UserRole.COORDINATEUR) }}</option>
                <option [value]="UserRole.CHEF_CELLULE">{{ getRoleLabel(UserRole.CHEF_CELLULE) }}</option>
                <option [value]="UserRole.CHEF_SERVICE">{{ getRoleLabel(UserRole.CHEF_SERVICE) }}</option>
                <option [value]="UserRole.ADJOINT">{{ getRoleLabel(UserRole.ADJOINT) }}</option>
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

          <!-- Agent linking section -->
          <div class="agent-section">
            <label class="form-label">Lier à un agent</label>
            <div class="agent-options">
              <label class="radio-option">
                <input type="radio" formControlName="agentLinkType" value="none" />
                <span>Aucun agent</span>
              </label>
              <label class="radio-option">
                <input type="radio" formControlName="agentLinkType" value="existing" />
                <span>Agent existant</span>
              </label>
              <label class="radio-option">
                <input type="radio" formControlName="agentLinkType" value="new" />
                <span>Créer un nouvel agent</span>
              </label>
            </div>

            <!-- Existing agent dropdown -->
            <div class="form-group" *ngIf="userForm.value.agentLinkType === 'existing'">
              <label class="form-label">Sélectionner un agent</label>
              <select formControlName="agentId" class="form-control">
                <option value="">-- Choisir un agent --</option>
                <option *ngFor="let agent of agentsDisponibles()" [value]="agent.id">
                  {{ agent.nom }} ({{ agent.typeContrat }})
                </option>
              </select>
              <small class="form-hint" *ngIf="agentsDisponibles().length === 0">
                Tous les agents sont déjà liés à un utilisateur
              </small>
            </div>

            <!-- New agent info -->
            <div class="new-agent-info" *ngIf="userForm.value.agentLinkType === 'new'">
              <p class="info-text">
                <span class="info-icon">ℹ️</span>
                Un nouvel agent sera créé automatiquement avec les informations du compte (nom, prénom).
              </p>
            </div>
          </div>

          <div class="role-info">
            <h4>Permissions du rôle sélectionné :</h4>
            <ul>
              <li *ngIf="userForm.value.role === UserRole.ADMIN">
                - Accès complet à toutes les fonctionnalités<br>
                - Gestion des utilisateurs<br>
                - ❌ Pas d'accès à la création des agents
              </li>
              <li *ngIf="userForm.value.role === UserRole.CHEF_EQUIPE">
                - Accès complet au planning, staff, historique, statistiques, paramètres<br>
                - Gestion des agents<br>
                - ❌ Pas d'accès à la gestion des utilisateurs
              </li>
              <li *ngIf="userForm.value.role === UserRole.UTILISATEUR">
                - Consultation du planning (lecture seule)<br>
                - Planning des congés (lecture)<br>
                - Demande de congés<br>
                - Statistiques (lecture seule)<br>
                - ❌ Ne peut pas générer de planning
              </li>
              <li *ngIf="userForm.value.role === UserRole.COORDINATEUR || 
                         userForm.value.role === UserRole.CHEF_CELLULE || 
                         userForm.value.role === UserRole.CHEF_SERVICE || 
                         userForm.value.role === UserRole.ADJOINT">
                - Accès complet à toutes les fonctionnalités<br>
                - Gestion des agents<br>
                - Gestion des utilisateurs
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
          <button class="btn-close" (click)="fermerModalPassword()">Fermer</button>
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

    .badge-agent {
      background: #ecfdf5;
      color: #059669;
    }

    .text-muted {
      color: #94a3b8;
      font-style: italic;
      font-size: 13px;
    }

    .agent-section {
      background: #f8fafc;
      border-radius: 10px;
      padding: 16px;
      margin: 16px 0;
      border: 1px solid #e2e8f0;
    }

    .agent-options {
      display: flex;
      gap: 20px;
      margin: 12px 0;
      flex-wrap: wrap;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      color: #475569;
    }

    .radio-option input[type="radio"] {
      width: 18px;
      height: 18px;
      accent-color: #3b82f6;
    }

    .new-agent-info {
      margin-top: 12px;
    }

    .info-text {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      margin: 0;
    }

    .info-icon {
      font-size: 16px;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .agent-options {
        flex-direction: column;
        gap: 10px;
      }
    }
  `]
})
export class UtilisateursComponent {
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  // Use computed to reactively get data from services
  users = computed(() => this.authService.users());
  agents = computed(() => this.dataService.agents());
  
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
    actif: [true],
    agentLinkType: ['none'],
    agentId: ['']
  });

  // Agents not already linked to a user - computed reactively
  agentsDisponibles = computed(() => {
    const usersWithAgents = this.users()
      .filter(u => u.agentId && u.id !== this.utilisateurEnEdition?.id)
      .map(u => u.agentId);
    
    return this.agents().filter(a => !usersWithAgents.includes(a.id));
  });

  private notification = inject(NotificationService);

  constructor() {
    // No need to manually load, computed signals will react to changes
  }

  getAgentName(agentId?: string): string {
    if (!agentId) return '';
    const agent = this.agents().find(a => a.id === agentId);
    return agent?.nom || '';
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
      case UserRole.COORDINATEUR:
      case UserRole.CHEF_CELLULE:
      case UserRole.CHEF_SERVICE:
      case UserRole.ADJOINT:
        return 'badge-chef';
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
    this.userForm.reset({ 
      role: UserRole.UTILISATEUR, 
      actif: true, 
      agentLinkType: 'none',
      agentId: ''
    });
    this.userForm.get('password')?.setValidators(Validators.required);
    this.userForm.get('username')?.enable();
    this.afficherModal = true;
  }

  editerUtilisateur(user: User): void {
    this.utilisateurEnEdition = user;
    
    // Determine current agent link type
    let agentLinkType = 'none';
    if (user.agentId) {
      agentLinkType = 'existing';
    }
    
    this.userForm.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      username: user.username,
      role: user.role,
      actif: user.actif,
      agentLinkType: agentLinkType,
      agentId: user.agentId || ''
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

  async sauvegarderUtilisateur(): Promise<void> {
    if (!this.userForm.valid) return;

    const formValue = this.userForm.value;
    let agentId: string | undefined = undefined;

    // Determine agent ID based on link type
    if (formValue.agentLinkType === 'existing' && formValue.agentId) {
      agentId = formValue.agentId;
    } else if (formValue.agentLinkType === 'new') {
      agentId = await this.createNewAgent(formValue.nom, formValue.prenom);
    }

    // Unlink previous agent if changing
    if (this.utilisateurEnEdition?.agentId && this.utilisateurEnEdition.agentId !== agentId) {
      await this.unlinkAgent(this.utilisateurEnEdition.agentId);
    }

    if (this.utilisateurEnEdition) {
      const updatedUser: User = {
        ...this.utilisateurEnEdition,
        nom: formValue.nom,
        prenom: formValue.prenom,
        role: formValue.role,
        actif: formValue.actif,
        agentId: agentId
      };
      await this.authService.updateUser(updatedUser);
      
      // Update agent link
      if (agentId) {
        await this.linkAgentToUser(agentId, updatedUser.id);
      }
    } else {
      const userId = this.generateId();
      const newUser: User = {
        id: userId,
        username: formValue.username,
        password: formValue.password,
        nom: formValue.nom,
        prenom: formValue.prenom,
        role: formValue.role,
        actif: formValue.actif,
        dateCreation: new Date(),
        agentId: agentId
      };
      
      const result = await this.authService.addUser(newUser);
      if (!result.success) {
        await this.notification.alert({
          title: 'Erreur',
          message: result.message,
          type: 'danger'
        });
        return;
      }

      // Update agent link with the new user ID
      if (agentId) {
        await this.linkAgentToUser(agentId, userId);
      }
    }

    // No need to manually reload, computed signals will update automatically
    this.fermerModal();
  }

  private async createNewAgent(nom: string, prenom: string): Promise<string> {
    const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
    const jours: JourSemaine[] = [
      JourSemaine.LUNDI, 
      JourSemaine.MARDI, 
      JourSemaine.MERCREDI, 
      JourSemaine.JEUDI, 
      JourSemaine.VENDREDI
    ];
    
    const disponibilites: Disponibilite[] = [];
    jours.forEach(jour => {
      disponibilites.push({ jour, demiJournee: DemiJournee.MATIN, disponible: true });
      disponibilites.push({ jour, demiJournee: DemiJournee.APRES_MIDI, disponible: true });
    });

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      nom: initials,
      nomComplet: `${prenom} ${nom}`,
      typeContrat: TypeContrat.TEMPS_PLEIN,
      disponibilites: disponibilites,
      enService: true
    };
    
    await this.dataService.addAgent(newAgent);
    return newAgent.id;
  }

  private async linkAgentToUser(agentId: string, userId: string): Promise<void> {
    const agent = this.agents().find(a => a.id === agentId);
    if (agent) {
      const updatedAgent = { ...agent, userId: userId };
      await this.dataService.updateAgent(updatedAgent);
    }
  }

  private async unlinkAgent(agentId: string): Promise<void> {
    const agent = this.agents().find(a => a.id === agentId);
    if (agent) {
      const updatedAgent = { ...agent, userId: undefined };
      await this.dataService.updateAgent(updatedAgent);
    }
  }

  async supprimerUtilisateur(id: string): Promise<void> {
    const confirmed = await this.notification.confirm({
      title: 'Supprimer l\'utilisateur',
      message: 'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    });
    
    if (confirmed) {
      const result = await this.authService.deleteUser(id);
      if (!result.success) {
        await this.notification.alert({
          title: 'Erreur',
          message: result.message,
          type: 'danger'
        });
      }
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

  async sauvegarderMotDePasse(): Promise<void> {
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
      await this.authService.changePassword(this.utilisateurPassword.id, this.nouveauMotDePasse);
      this.fermerModalPassword();
      await this.notification.alert({
        title: 'Succès',
        message: 'Mot de passe modifié avec succès',
        type: 'success'
      });
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}


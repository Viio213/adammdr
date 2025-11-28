import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole, ROLE_PERMISSIONS } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY_USERS = 'adammdr_users';
  private readonly STORAGE_KEY_CURRENT_USER = 'adammdr_current_user';

  // Signals for reactive state
  currentUser = signal<User | null>(this.loadCurrentUser());
  users = signal<User[]>(this.loadUsers());

  // Computed permissions
  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  isChefEquipe = computed(() => this.currentUser()?.role === UserRole.CHEF_EQUIPE);
  isUtilisateur = computed(() => this.currentUser()?.role === UserRole.UTILISATEUR);

  constructor(private router: Router) {
    // Initialize with default admin if no users exist
    if (this.users().length === 0) {
      this.initializeDefaultUsers();
    }
  }

  /**
   * Attempt to login with username and password
   */
  login(username: string, password: string): { success: boolean; message: string } {
    const user = this.users().find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      return { success: false, message: 'Identifiant ou mot de passe incorrect' };
    }

    if (!user.actif) {
      return { success: false, message: 'Ce compte est désactivé' };
    }

    // Update last login
    user.derniereConnexion = new Date();
    this.updateUser(user);

    // Set current user
    this.currentUser.set(user);
    this.saveCurrentUser(user);

    return { success: true, message: 'Connexion réussie' };
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem(this.STORAGE_KEY_CURRENT_USER);
    this.router.navigate(['/login']);
  }

  /**
   * Check if current user has a specific permission
   */
  hasPermission(permission: keyof typeof ROLE_PERMISSIONS[UserRole.ADMIN]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role][permission];
  }

  /**
   * Get all permissions for current user
   */
  getPermissions() {
    const user = this.currentUser();
    if (!user) return null;
    return ROLE_PERMISSIONS[user.role];
  }

  // User management (Admin only)
  getUsers(): User[] {
    return this.users();
  }

  addUser(user: User): { success: boolean; message: string } {
    // Check if username already exists
    if (this.users().some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
      return { success: false, message: 'Ce nom d\'utilisateur existe déjà' };
    }

    const users = [...this.users(), user];
    this.users.set(users);
    this.saveUsers(users);
    return { success: true, message: 'Utilisateur créé avec succès' };
  }

  updateUser(user: User): void {
    const users = this.users().map(u => u.id === user.id ? user : u);
    this.users.set(users);
    this.saveUsers(users);

    // Update current user if it's the same
    if (this.currentUser()?.id === user.id) {
      this.currentUser.set(user);
      this.saveCurrentUser(user);
    }
  }

  deleteUser(id: string): { success: boolean; message: string } {
    // Cannot delete yourself
    if (this.currentUser()?.id === id) {
      return { success: false, message: 'Vous ne pouvez pas supprimer votre propre compte' };
    }

    // Cannot delete the last admin
    const user = this.users().find(u => u.id === id);
    if (user?.role === UserRole.ADMIN) {
      const adminCount = this.users().filter(u => u.role === UserRole.ADMIN && u.actif).length;
      if (adminCount <= 1) {
        return { success: false, message: 'Impossible de supprimer le dernier administrateur' };
      }
    }

    const users = this.users().filter(u => u.id !== id);
    this.users.set(users);
    this.saveUsers(users);
    return { success: true, message: 'Utilisateur supprimé' };
  }

  changePassword(userId: string, newPassword: string): void {
    const users = this.users().map(u => 
      u.id === userId ? { ...u, password: newPassword } : u
    );
    this.users.set(users);
    this.saveUsers(users);
  }

  // Persistence
  private loadUsers(): User[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_USERS);
      if (data) {
        const users = JSON.parse(data);
        return users.map((u: User) => ({
          ...u,
          dateCreation: new Date(u.dateCreation),
          derniereConnexion: u.derniereConnexion ? new Date(u.derniereConnexion) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
    return [];
  }

  private saveUsers(users: User[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users:', error);
    }
  }

  private loadCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_CURRENT_USER);
      if (data) {
        const user = JSON.parse(data);
        return {
          ...user,
          dateCreation: new Date(user.dateCreation),
          derniereConnexion: user.derniereConnexion ? new Date(user.derniereConnexion) : undefined
        };
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
    return null;
  }

  private saveCurrentUser(user: User): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving current user:', error);
    }
  }

  private initializeDefaultUsers(): void {
    const defaultAdmin: User = {
      id: this.generateId(),
      username: 'admin',
      password: 'admin123',
      nom: 'Administrateur',
      prenom: 'System',
      role: UserRole.ADMIN,
      actif: true,
      dateCreation: new Date()
    };

    this.users.set([defaultAdmin]);
    this.saveUsers([defaultAdmin]);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}


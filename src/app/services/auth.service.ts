import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole, ROLE_PERMISSIONS } from '../models/user.model';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY_CURRENT_USER = 'adammdr_current_user';
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  // Signals for reactive state
  currentUser = signal<User | null>(this.loadCurrentUser());
  users = signal<User[]>([]);
  
  // Loading state
  isLoading = signal<boolean>(true);
  private initialized = false;

  // Computed permissions
  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.role === UserRole.ADMIN);
  isChefEquipe = computed(() => this.currentUser()?.role === UserRole.CHEF_EQUIPE);
  isUtilisateur = computed(() => this.currentUser()?.role === UserRole.UTILISATEUR);

  constructor() {
    this.initializeUsers();
  }

  /**
   * Initialize users from Supabase
   */
  async initializeUsers(): Promise<void> {
    if (this.initialized) return;

    try {
      this.isLoading.set(true);
      const users = await this.supabase.getUsers();
      
      // Map from DB format
      const mappedUsers = users.map((u: any) => this.mapUserFromDb(u));
      this.users.set(mappedUsers);
      
      this.initialized = true;
    } catch (error) {
      console.error('Error loading users from Supabase:', error);
      // Fallback to localStorage
      this.loadUsersFromLocalStorage();
    } finally {
      this.isLoading.set(false);
    }
  }

  private loadUsersFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('adammdr_users');
      if (data) {
        const users = JSON.parse(data).map((u: User) => ({
          ...u,
          dateCreation: new Date(u.dateCreation),
          derniereConnexion: u.derniereConnexion ? new Date(u.derniereConnexion) : undefined
        }));
        this.users.set(users);
      }
    } catch (error) {
      console.error('Error loading users from localStorage:', error);
    }
  }

  private mapUserFromDb(data: any): User {
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      nom: data.nom,
      prenom: data.prenom,
      role: data.role as UserRole,
      actif: data.actif,
      agentId: data.agent_id,
      dateCreation: data.date_creation ? new Date(data.date_creation) : new Date(),
      derniereConnexion: data.derniere_connexion ? new Date(data.derniere_connexion) : undefined
    };
  }

  /**
   * Attempt to login with username and password
   */
  async login(username: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // First try Supabase
      const userData = await this.supabase.getUserByUsername(username);
      
      if (!userData) {
        return { success: false, message: 'Identifiant ou mot de passe incorrect' };
      }

      if (userData.password !== password) {
        return { success: false, message: 'Identifiant ou mot de passe incorrect' };
      }

      if (!userData.actif) {
        return { success: false, message: 'Ce compte est désactivé' };
      }

      const user = this.mapUserFromDb(userData);

      // Update last login
      user.derniereConnexion = new Date();
      await this.updateUser(user);

      // Set current user
      this.currentUser.set(user);
      this.saveCurrentUser(user);

      return { success: true, message: 'Connexion réussie' };
    } catch (error) {
      console.error('Login error:', error);
      // Fallback to local check
      return this.localLogin(username, password);
    }
  }

  private localLogin(username: string, password: string): { success: boolean; message: string } {
    const user = this.users().find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      return { success: false, message: 'Identifiant ou mot de passe incorrect' };
    }

    if (!user.actif) {
      return { success: false, message: 'Ce compte est désactivé' };
    }

    user.derniereConnexion = new Date();
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
   * Checks custom permissions first, then falls back to default permissions
   */
  hasPermission(permission: keyof typeof ROLE_PERMISSIONS[UserRole.ADMIN]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    
    // Check custom permissions first
    const customPerms = this.loadCustomPermissions();
    if (customPerms[user.role] && customPerms[user.role][permission] !== undefined) {
      return customPerms[user.role][permission];
    }
    
    // Fallback to default permissions
    const permissions = ROLE_PERMISSIONS[user.role] as Record<string, boolean>;
    return permissions[permission] ?? false;
  }

  /**
   * Load custom permissions from localStorage
   */
  private loadCustomPermissions(): Record<string, Record<string, boolean>> {
    try {
      const stored = localStorage.getItem('adammdr_custom_permissions');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading custom permissions:', error);
    }
    return {};
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

  async addUser(user: User): Promise<{ success: boolean; message: string }> {
    // Check if username already exists
    if (this.users().some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
      return { success: false, message: 'Ce nom d\'utilisateur existe déjà' };
    }

    try {
      const newUser = await this.supabase.createUser(user);
      const users = [...this.users(), newUser];
      this.users.set(users);
      return { success: true, message: 'Utilisateur créé avec succès' };
    } catch (error) {
      console.error('Error creating user:', error);
      // Fallback to local
      const users = [...this.users(), user];
      this.users.set(users);
      return { success: true, message: 'Utilisateur créé avec succès' };
    }
  }

  async updateUser(user: User): Promise<void> {
    try {
      await this.supabase.updateUser(user.id, user);
      const users = this.users().map(u => u.id === user.id ? user : u);
      this.users.set(users);

      // Update current user if it's the same
      if (this.currentUser()?.id === user.id) {
        this.currentUser.set(user);
        this.saveCurrentUser(user);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      // Fallback to local
      const users = this.users().map(u => u.id === user.id ? user : u);
      this.users.set(users);
    }
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
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

    try {
      await this.supabase.deleteUser(id);
      const users = this.users().filter(u => u.id !== id);
      this.users.set(users);
      return { success: true, message: 'Utilisateur supprimé' };
    } catch (error) {
      console.error('Error deleting user:', error);
      const users = this.users().filter(u => u.id !== id);
      this.users.set(users);
      return { success: true, message: 'Utilisateur supprimé' };
    }
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const user = this.users().find(u => u.id === userId);
    if (user) {
      const updatedUser = { ...user, password: newPassword };
      await this.updateUser(updatedUser);
    }
  }

  // Persistence (local only for session)
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
}

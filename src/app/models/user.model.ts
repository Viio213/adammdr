// User roles
export enum UserRole {
  ADMIN = 'ADMIN',           // Full access + user management
  CHEF_EQUIPE = 'CHEF_EQUIPE', // Full access except user management
  UTILISATEUR = 'UTILISATEUR'  // Planning view only (no generation)
}

// User model
export interface User {
  id: string;
  username: string;
  password: string; // In production, this should be hashed
  nom: string;
  prenom: string;
  role: UserRole;
  actif: boolean;
  dateCreation: Date;
  derniereConnexion?: Date;
}

// Role labels for display
export const ROLE_LABELS: { [key in UserRole]: string } = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.CHEF_EQUIPE]: 'Chef d\'équipe',
  [UserRole.UTILISATEUR]: 'Utilisateur'
};

// Role permissions
export const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: true
  },
  [UserRole.CHEF_EQUIPE]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: false
  },
  [UserRole.UTILISATEUR]: {
    canViewPlanning: true,
    canGeneratePlanning: false,
    canViewStaff: false,
    canEditStaff: false,
    canViewHistorique: false,
    canEditHistorique: false,
    canViewStatistiques: false,
    canViewParametres: false,
    canManageUsers: false
  }
};


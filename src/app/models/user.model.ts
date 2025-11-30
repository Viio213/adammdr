// User roles
export enum UserRole {
  ADMIN = 'ADMIN',           // Full access + user management (Administrateur)
  CHEF_EQUIPE = 'CHEF_EQUIPE', // Full access except user management (Audrey)
  UTILISATEUR = 'UTILISATEUR'  // Agent: congés (submit, not validate), historique, stats (view only)
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
  agentId?: string; // Link to agent for leave management
}

// Role labels for display
export const ROLE_LABELS: { [key in UserRole]: string } = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.CHEF_EQUIPE]: 'Chef d\'équipe',
  [UserRole.UTILISATEUR]: 'Agent'
};

// Role permissions
// Admin: Full access to everything
// Chef d'équipe (Audrey): Full access except user management
// Agent/Utilisateur: Can view/submit leaves, view historique and stats (read-only)
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
    canManageUsers: true,
    canValidateConge: true,    // Can validate leave requests
    canSubmitConge: true,      // Can submit leave requests
    canExportPdf: true         // Can export to PDF
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
    canManageUsers: false,     // Cannot manage users
    canValidateConge: true,    // Can validate leave requests
    canSubmitConge: true,      // Can submit leave requests
    canExportPdf: true         // Can export to PDF
  },
  [UserRole.UTILISATEUR]: {
    canViewPlanning: true,     // Can view planning
    canGeneratePlanning: false, // Cannot generate planning
    canViewStaff: false,       // Cannot view staff management
    canEditStaff: false,       // Cannot edit staff
    canViewHistorique: true,   // Can view historique (read-only)
    canEditHistorique: false,  // Cannot edit historique
    canViewStatistiques: true, // Can view statistics
    canViewParametres: false,  // Cannot access settings
    canManageUsers: false,     // Cannot manage users
    canValidateConge: false,   // Cannot validate leave requests
    canSubmitConge: true,      // Can submit leave requests
    canExportPdf: true         // Can export to PDF
  }
};

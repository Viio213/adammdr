// User roles
export enum UserRole {
  ADMIN = 'ADMIN',                    // Administrateur: Full access to everything
  REFERENT_ADMIN = 'REFERENT_ADMIN',  // Référent administratif: Full access except user management
  CHEF_EQUIPE = 'CHEF_EQUIPE',        // Chef d'équipe: Full access except user management
  UTILISATEUR = 'UTILISATEUR',        // Agent: Read-only planning, leave requests, stats
  COORDINATEUR = 'COORDINATEUR',      // Coordinateur: Full access
  CHEF_CELLULE = 'CHEF_CELLULE',      // Chef de cellule: Full access
  CHEF_SERVICE = 'CHEF_SERVICE',       // Chef de service: Full access
  ADJOINT = 'ADJOINT'                 // Adjoint: Full access
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
  [UserRole.REFERENT_ADMIN]: 'Référent administratif',
  [UserRole.CHEF_EQUIPE]: 'Chef d\'équipe',
  [UserRole.UTILISATEUR]: 'Agent',
  [UserRole.COORDINATEUR]: 'Coordinateur',
  [UserRole.CHEF_CELLULE]: 'Chef de cellule',
  [UserRole.CHEF_SERVICE]: 'Chef de service',
  [UserRole.ADJOINT]: 'Adjoint'
};

// Role permissions
// Admin: Full access to everything
// Référent administratif: Full access except user management
// Chef d'équipe: Full access except user management
// Agent: Read-only planning, leave requests, stats
// Coordinateur, Chef de cellule, Chef de service, Adjoint: Full access
export const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canManageAgents: true,
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: true,
    canValidateConge: true,
    canSubmitConge: true,
    canExportPdf: true,
    canViewPlanningConges: true,
    canManagePermissions: true  // Only ADMIN can manage permissions
  },
  [UserRole.REFERENT_ADMIN]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canManageAgents: true,
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: false,      // Cannot manage users
    canValidateConge: true,
    canSubmitConge: true,
    canExportPdf: true,
    canViewPlanningConges: true,
    canManagePermissions: false
  },
  [UserRole.CHEF_EQUIPE]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canManageAgents: true,     // Can create/manage agents
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: false,     // Cannot manage users
    canValidateConge: true,
    canSubmitConge: true,
    canExportPdf: true,
    canViewPlanningConges: true,
    canManagePermissions: false
  },
  [UserRole.UTILISATEUR]: {
    canViewPlanning: true,     // Can view planning
    canGeneratePlanning: false, // Cannot generate planning
    canViewStaff: false,       // Cannot view staff management
    canEditStaff: false,       // Cannot edit staff
    canManageAgents: false,    // Cannot create/manage agents
    canViewHistorique: false,  // Cannot view historique
    canEditHistorique: false,  // Cannot edit historique
    canViewStatistiques: true, // Can view statistics
    canViewParametres: false,  // Cannot access settings
    canManageUsers: false,     // Cannot manage users
    canValidateConge: false,   // Cannot validate leave requests
    canSubmitConge: true,      // Can submit leave requests
    canExportPdf: false,       // Cannot export to PDF
    canViewPlanningConges: true, // Can view leave planning
    canManagePermissions: false
  },
  [UserRole.COORDINATEUR]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canManageAgents: true,     // Can create/manage agents
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: true,
    canValidateConge: true,
    canSubmitConge: true,
    canExportPdf: true,
    canViewPlanningConges: true,
    canManagePermissions: false
  },
  [UserRole.CHEF_CELLULE]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canManageAgents: true,     // Can create/manage agents
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: true,
    canValidateConge: true,
    canSubmitConge: true,
    canExportPdf: true,
    canViewPlanningConges: true,
    canManagePermissions: false
  },
  [UserRole.CHEF_SERVICE]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canManageAgents: true,     // Can create/manage agents
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: true,
    canValidateConge: true,
    canSubmitConge: true,
    canExportPdf: true,
    canViewPlanningConges: true,
    canManagePermissions: false
  },
  [UserRole.ADJOINT]: {
    canViewPlanning: true,
    canGeneratePlanning: true,
    canViewStaff: true,
    canEditStaff: true,
    canManageAgents: true,     // Can create/manage agents
    canViewHistorique: true,
    canEditHistorique: true,
    canViewStatistiques: true,
    canViewParametres: true,
    canManageUsers: true,
    canValidateConge: true,
    canSubmitConge: true,
    canExportPdf: true,
    canViewPlanningConges: true,
    canManagePermissions: false
  }
};

// Permission labels for display
export const PERMISSION_LABELS: { [key: string]: string } = {
  canViewPlanning: 'Voir le planning',
  canGeneratePlanning: 'Générer le planning',
  canViewStaff: 'Voir les disponibilités',
  canEditStaff: 'Modifier les disponibilités',
  canManageAgents: 'Gérer les agents',
  canViewHistorique: 'Voir l\'historique',
  canEditHistorique: 'Modifier l\'historique',
  canViewStatistiques: 'Voir les statistiques',
  canViewParametres: 'Voir les paramètres',
  canManageUsers: 'Gérer les utilisateurs',
  canValidateConge: 'Valider les congés',
  canSubmitConge: 'Demander des congés',
  canExportPdf: 'Exporter en PDF',
  canViewPlanningConges: 'Voir le planning des congés',
  canManagePermissions: 'Gérer les permissions'
};

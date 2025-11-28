# 📅 Planning Automatique ADAMMDR

Application Angular pour la génération automatique de plannings avec gestion des binômes/trinômes, historique et statistiques.

## 🎯 Fonctionnalités

### ✅ Génération Automatique de Planning
- Génération de binômes et trinômes selon les disponibilités
- Respect des contraintes :
  - Pas d'agent seul (minimum binôme, maximum trinôme)
  - Un seul trinôme possible par demi-journée
  - Changements automatiques matin/après-midi
  - Évite les répétitions (même binôme matin et après-midi)
  - Évite les répétitions excessives d'une semaine à l'autre
- Gestion automatique des absences et congés

### 👥 Gestion du Staff
- Ajout, modification et suppression d'agents
- Gestion des disponibilités par jour et demi-journée
- Zones habituelles par agent
- Indications spéciales (mi-temps, congés, absences)
- Statut actif/inactif

### 📋 Planning
- Affichage du planning de la semaine
- Visualisation claire des binômes/trinômes
- Possibilité d'afficher/masquer les zones
- Édition des zones directement dans le planning
- Structure fixe et alignée même avec des absences

### 📚 Historique
- Enregistrement automatique de chaque génération
- Filtrage par date
- Édition des zones, missions, réunions et commentaires
- Export des données

### 📊 Statistiques
- Statistiques des binômes (qui travaille avec qui)
- Statistiques des zones
- Statistiques par agent (matin/après-midi, zones, partenaires)
- Identification des paires les plus/moins fréquentes

### ⚙️ Paramètres
- Export/Import de toutes les données (backup)
- Réinitialisation des données
- Informations sur les données stockées

## 🚀 Installation

### Prérequis
- Node.js (version 18 ou supérieure)
- npm ou yarn

### Installation des dépendances
```bash
npm install
```

### Lancement de l'application
```bash
npm start
```

L'application sera accessible sur `http://localhost:4200`

### Build de production
```bash
npm run build
```

## 📖 Utilisation

### 1. Gérer le Staff
1. Allez dans l'onglet **Staff**
2. Cliquez sur **Ajouter un Agent**
3. Remplissez les informations :
   - Nom de l'agent
   - Zones habituelles (optionnel)
   - Indications spéciales (optionnel)
   - Disponibilités (cochez les cases pour chaque jour/demi-journée)
4. Cliquez sur **Ajouter**

### 2. Générer un Planning
1. Allez dans l'onglet **Planning**
2. Sélectionnez la date de début de la semaine (lundi)
3. Cliquez sur **Générer Planning**
4. Le planning est automatiquement généré et enregistré dans l'historique

### 3. Consulter l'Historique
1. Allez dans l'onglet **Historique**
2. Utilisez les filtres de date si nécessaire
3. Éditez les zones, missions, réunions ou commentaires directement dans le tableau
4. Exportez les données si besoin

### 4. Analyser les Statistiques
1. Allez dans l'onglet **Statistiques**
2. Consultez :
   - Les binômes les plus fréquents
   - La répartition par zones
   - Les statistiques individuelles par agent
   - Les paires les plus/moins fréquentes

### 5. Sauvegarder/Restaurer
1. Allez dans l'onglet **Paramètres**
2. Cliquez sur **Exporter toutes les données** pour créer un backup
3. Utilisez **Choisir un fichier** pour restaurer un backup précédent

## 🏗️ Architecture

### Structure des dossiers
```
src/
├── app/
│   ├── components/
│   │   ├── planning/          # Composant de génération et affichage du planning
│   │   ├── staff/             # Composant de gestion du staff
│   │   ├── historique/        # Composant d'affichage de l'historique
│   │   ├── statistiques/      # Composant des statistiques
│   │   ├── parametres/        # Composant des paramètres
│   │   └── navigation/        # Composant de navigation
│   ├── models/                # Modèles de données TypeScript
│   ├── services/              # Services Angular
│   │   ├── data.service.ts           # Gestion des données (localStorage)
│   │   ├── planning-generator.service.ts  # Génération du planning
│   │   └── statistiques.service.ts   # Calcul des statistiques
│   ├── app.component.ts       # Composant racine
│   └── app.routes.ts          # Configuration du routing
├── styles.css                 # Styles globaux
└── main.ts                    # Point d'entrée
```

### Technologies utilisées
- **Angular 18** : Framework principal
- **TypeScript** : Langage de programmation
- **Signals** : Système réactif d'Angular
- **Standalone Components** : Architecture moderne d'Angular
- **LocalStorage** : Persistance des données côté client

## 🔧 Contraintes du Générateur

Le générateur de planning respecte automatiquement :

1. **Pas d'agent seul** : Toujours minimum 2 agents (binôme), maximum 3 (trinôme)
2. **Un seul trinôme par demi-journée** : Le reste doit être des binômes
3. **Gestion des absences** : Les agents absents sont automatiquement exclus
4. **Changements matin/après-midi** : Les binômes changent à 13h
5. **Évite les répétitions** :
   - Pas de binôme identique le matin et l'après-midi
   - Évite les binômes trop répétitifs (max 3 fois en 4 semaines)
6. **Structure fixe** : Même nombre de cellules, même hauteur, même alignement

## 💾 Stockage des Données

Les données sont stockées localement dans le navigateur via **localStorage** :
- `adammdr_agents` : Liste des agents
- `adammdr_historique` : Historique des plannings
- `adammdr_plannings` : Plannings générés

⚠️ **Important** : Les données sont stockées localement. Pour les sauvegarder de manière permanente, utilisez la fonction d'export dans les paramètres.

## 🎨 Personnalisation

Les styles peuvent être modifiés dans :
- `src/styles.css` : Styles globaux
- Fichiers `.ts` des composants : Styles spécifiques (section `styles`)

## 📝 Notes

- L'application fonctionne entièrement côté client (pas de serveur requis)
- Compatible avec tous les navigateurs modernes
- Responsive design (adapté mobile et tablette)
- Les données sont persistantes entre les sessions grâce à localStorage

## 🐛 Dépannage

### Les données ne se sauvegardent pas
- Vérifiez que votre navigateur autorise localStorage
- Essayez en navigation privée (certaines extensions peuvent bloquer localStorage)

### Le planning ne se génère pas
- Vérifiez qu'au moins 2 agents sont actifs et disponibles
- Vérifiez les disponibilités des agents dans l'onglet Staff

### L'application ne démarre pas
- Vérifiez que Node.js est installé : `node --version`
- Réinstallez les dépendances : `rm -rf node_modules && npm install`

## 📄 Licence

Ce projet est destiné à un usage interne.

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2024



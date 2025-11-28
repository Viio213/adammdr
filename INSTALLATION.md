# 🚀 Guide d'Installation Rapide

## Prérequis
- Node.js version 18 ou supérieure
- npm (inclus avec Node.js)

## Installation

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Lancer l'application en mode développement**
   ```bash
   npm start
   ```

3. **Ouvrir dans le navigateur**
   - L'application sera accessible sur `http://localhost:4200`

## Build de Production

Pour créer une version de production :

```bash
npm run build
```

Les fichiers compilés seront dans le dossier `dist/adammdr-planning/`

## Utilisation

1. **Première utilisation** : L'application créera automatiquement 5 agents d'exemple
2. **Gérer le staff** : Allez dans l'onglet "Staff" pour ajouter/modifier vos agents
3. **Générer un planning** : Allez dans "Planning", sélectionnez une date de début de semaine (lundi) et cliquez sur "Générer Planning"
4. **Consulter l'historique** : Tous les plannings générés sont automatiquement enregistrés
5. **Voir les statistiques** : Analysez les binômes, zones et répartitions dans l'onglet "Statistiques"

## Sauvegarde

⚠️ **Important** : Les données sont stockées localement dans le navigateur (localStorage).

Pour sauvegarder vos données :
1. Allez dans l'onglet "Paramètres"
2. Cliquez sur "Exporter toutes les données"
3. Le fichier JSON sera téléchargé

Pour restaurer :
1. Allez dans "Paramètres"
2. Cliquez sur "Choisir un fichier"
3. Sélectionnez votre fichier JSON précédemment exporté

## Support

En cas de problème :
- Vérifiez la console du navigateur (F12) pour les erreurs
- Assurez-vous que localStorage est activé dans votre navigateur
- Vérifiez que vous avez au moins 2 agents actifs pour générer un planning



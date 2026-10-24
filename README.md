# VITALFLEX Training v1.0

Application web progressive (PWA) responsive, en français canadien, sans dépendances externes.

## Fonctionnalités
- Quatre journées de callisthénie + bandes de résistance
- Saisie des séries (répétitions/durée et résistance/variante), notes et brouillons
- Journal de séances avec comparaison par journée et par exercice
- Pesées en livres et évolution d'une pesée à l'autre
- Tableau de bord et bilan hebdomadaire
- Exportation / importation JSON des données
- Cache hors ligne après installation et première visite en HTTPS

## Mise en ligne
1. Déployer **tous** les fichiers du dossier à la racine d'un hébergement web statique HTTPS (GitHub Pages, Netlify, Cloudflare Pages, etc.).
2. Ouvrir l'URL sur Chrome (Android) et utiliser « Ajouter à l'écran d'accueil » / « Installer l'application » si disponible.
3. Saisir une séance test, enregistrer puis exporter une sauvegarde.

Pour un test local : `python3 -m http.server 8080`, puis ouvrir `http://localhost:8080/`.

**Important** : aucune synchronisation entre appareils, aucun compte et aucune base de données centrale. Les données sont conservées par le stockage local du navigateur. L'effacement des données du navigateur peut les supprimer. Exporter régulièrement.

## Futur v2
- Authentification et données isolées par utilisateur
- Sauvegarde chiffrée côté serveur, politiques d'accès, consentement/confidentialité
- Catalogue modifiable d'exercices avec tutoriels validés
- Comparaisons pondérées par charge/résistance/technique
- Gestion des profils clients et contrôle d'accès

Cette application n'est pas un outil médical : les exercices du haut du corps doivent être adaptés en fonction des restrictions individuelles des épaules.

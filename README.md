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


## Nouveautés v1.1
- Type de résistance par série : bande, kg, lb, poids du corps, assistance et autre.
- Confirmation de chaque série, minuterie configurable (30 à 180 secondes), signal sonore et vibration si disponible.
- Illustrations SVG intégrées **schématiques**, non des instructions biomécaniques.
- Conservation des sauvegardes précédentes grâce à la même clé locale.
- Mise à jour : sur GitHub, remplacer les six fichiers dans la racine du dépôt puis effectuer un commit. Ne pas effacer les données du navigateur.
- Limitations : le son/vibreur et le minuteur ne sont pas garantis si l’application est mise en arrière-plan ou si l’écran est verrouillé.

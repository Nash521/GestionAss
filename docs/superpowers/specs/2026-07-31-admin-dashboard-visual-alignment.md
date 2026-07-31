# Alignement visuel du dashboard administrateur

## Objectif

Aligner le dashboard mobile sur `maquette/page_dashbord.png` sans inventer de données financières absentes du schéma.

## Composition

L'écran utilise `arriere_plan_admin.png`, intégré dans les assets de l'application pour que Metro le charge sur Android. Il contient :

- logo central, bouton Événements avec indicateur et bouton Paramètres ;
- salutation, titre et description ;
- six cartes en grille de trois colonnes, avec icônes, statistiques réelles et sous-libellés ;
- bloc graphique des cotisations avec son sélecteur et un état Finances disponible prochainement ;
- bloc Dernières transactions structuré, avec état vide Finances disponible prochainement ;
- barre de navigation basse à trois entrées : Tableau de bord, Membres, Finances.

## Données et interactions

Les six cartes réutilisent les statistiques serveur de l'organisation de l'administrateur. Les cartes Membres et Demandes d'adhésion restent utilisables. Les boutons Événements, Paramètres, Finances et les zones financières affichent explicitement un état prochainement disponible.

## Validation

Les tests de contrat vérifient l'asset intégré, le logo, les six cartes, le graphique, les transactions et la barre de navigation. L'export Android valide le chargement Metro.

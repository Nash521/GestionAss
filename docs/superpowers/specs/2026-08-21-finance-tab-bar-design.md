# Barre d’onglets Finance — Spécification

## Objectif

Remplacer les boutons actuels de sélection Finance par une barre horizontale unique inspirée de la maquette fournie.

## Comportement

- Les trois onglets restent `Mensualités`, `Cotisations exceptionnelles` et `Décaissements`.
- Le changement d’onglet conserve le chargement, la pagination et les données existantes.
- Un seul onglet est actif à la fois.

## Apparence

- Barre blanche, coins arrondis, légère ombre et bordure discrète.
- Trois segments de largeur équivalente, sans défilement horizontal.
- Icônes : calendrier pour Mensualités, cadeau pour Cotisations exceptionnelles, ouverture externe pour Décaissements.
- Onglet actif : fond vert GestionAss, icône et texte blancs.
- Onglets inactifs : fond transparent, icône et texte bleu foncé.
- Le libellé des cotisations exceptionnelles peut occuper deux lignes.
- Les segments restent contenus dans l’écran sur les petits téléphones.

## Tests

- Vérifier les trois libellés et icônes.
- Vérifier le style actif/inactif et le retour du changement d’onglet.
- Vérifier l’absence de `ScrollView` horizontal et de débordement.

## Hors périmètre

- Aucun changement de données, d’API, de navigation persistante ou de formulaire Finance.

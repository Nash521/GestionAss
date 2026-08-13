# Filtres de la page Membres sans débordement

## Objectif

Conserver les trois groupes de filtres existants — statut du membre, cotisation et rôle — tout en garantissant que chaque option reste entièrement visible sur les petits écrans.

## Comportement

Chaque groupe reste une rangée indépendante de boutons-pastilles. La rangée n’est plus défilante horizontalement : ses boutons utilisent un conteneur flexible avec retour à la ligne. Lorsqu’une option ne tient pas dans l’espace disponible, elle commence une nouvelle ligne dans son propre groupe.

Les libellés, états sélectionnés, valeurs envoyées à l’API et l’ordre des options ne changent pas. L’espace entre boutons et entre lignes reste régulier afin de préserver la lecture visuelle. Aucun élément ne doit être coupé sur le bord droit ou gauche.

## Implémentation

La fonction de rendu des filtres remplace le `ScrollView horizontal` par un `View` avec `flexDirection: "row"`, `flexWrap: "wrap"` et un espacement uniforme. Le style du conteneur ne définit aucune largeur supérieure à celle de la page, ni marge négative, ni défilement horizontal.

## Test

Le test de route vérifie que les filtres utilisent un conteneur avec `flexWrap: "wrap"` et qu’aucun `ScrollView horizontal` n’est utilisé pour les groupes de filtres.

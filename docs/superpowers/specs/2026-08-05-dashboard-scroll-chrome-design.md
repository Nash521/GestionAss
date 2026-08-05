# Animation des barres du tableau de bord

## Objectif

Rendre la consultation du tableau de bord plus immersive en masquant les barres fixes pendant la lecture, sans modifier le contenu ni les cartes.

## Comportement

- Un défilement vertical vers le bas masque l'en-tête par le haut et la barre de navigation par le bas.
- Un défilement vers le haut les ramène à leur position fixe.
- Une variation de défilement faible ne déclenche aucune animation afin d'éviter le scintillement.
- L'animation dure 200 ms dans les deux sens.

## Implémentation

Le `ScrollView` transmet sa position verticale. Le tableau de bord compare cette position à la précédente et applique deux valeurs `Animated.Value` aux translations verticales de l'en-tête et de la navigation. Les deux éléments restent en position absolue et le contenu existant conserve ses espacements.

## Tests

Le test de route vérifie la présence du gestionnaire de défilement, des valeurs animées, de la durée de 200 ms et des translations opposées de l'en-tête et de la navigation.

## Hors périmètre

Les cartes statistiques, le contenu, les icônes et les interactions de navigation ne changent pas.

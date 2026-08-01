# Fond défilant du dashboard

## Objectif

Remplacer l'arrière-plan du dashboard administrateur par `new_fond_dashbord.png` et faire défiler l'image avec le contenu.

## Conception

L'image est copiée dans `apps/mobile/assets/` pour être incluse dans le bundle Android. Le `ScrollView` devient le conteneur extérieur ; son contenu est enveloppé dans un `ImageBackground` dont le `contentContainerStyle` prend toute la hauteur nécessaire. Ainsi, l'image parcourt naturellement le dashboard du haut vers le bas, au lieu de rester fixe derrière le viewport.

## Validation

Le test de contrat vérifie la nouvelle asset et la hiérarchie `ScrollView` puis `ImageBackground`. L'export Android confirme que Metro résout l'image.

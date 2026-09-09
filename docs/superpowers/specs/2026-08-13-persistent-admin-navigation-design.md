# Navigation administrateur persistante

## Objectif

Lors d'un changement entre les pages administrateur, conserver la barre de navigation inférieure montée à l'écran. Seul le contenu de la page doit être remplacé, afin d'éviter l'impression que toute l'interface se recharge.

## Périmètre

- Les pages Tableau de bord, Membres et Demandes d'adhésion partageront une même enveloppe de navigation Expo Router.
- Cette enveloppe affichera le contenu actif dans un emplacement de route, avec `AdminNavigation` une seule fois autour de ce contenu.
- La section active sera déterminée à partir de la route courante, sans modifier les adresses existantes.
- Les en-têtes resteront propres à chaque page : seul le footer est rendu persistant dans cette itération.
- La page `Ajouter un membre` conserve son affichage plein écran, sans barre de navigation inférieure.

## Comportement attendu

- Appuyer sur Accueil, Membres ou Demandes affiche la nouvelle page au sein de la même enveloppe administrateur.
- La barre inférieure ne se démonte pas pendant cette transition et garde l'icône de la section sélectionnée.
- Les contenus conservent leur marge basse pour ne pas être recouverts par la barre.
- Les animations existantes du chrome du tableau de bord restent compatibles ; elles ne doivent plus tenter d'animer une instance locale de la navigation.

## Vérification

- Tests de rendu couvrant la présence unique de la navigation dans le layout et son absence de l'écran de création.
- Vérification TypeScript et suite de tests mobile existante.

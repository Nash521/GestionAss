# Liste des différents écrans de l’application

L’application sera divisée en trois parties :

1. les écrans communs ;
2. l’espace administrateur ;
3. l’espace membre.

Pour la première version, il faut surtout développer les écrans essentiels avant les écrans avancés.

---

# 1. Écrans communs

## 1.1. Écran de démarrage

Il affiche :

* le logo de l’organisation ;
* le nom de l’application ;
* une animation de chargement.

Cet écran redirige automatiquement vers la connexion ou vers le tableau de bord si l’utilisateur est déjà connecté.

---

## 1.2. Connexion

Champs :

* numéro de téléphone ou adresse e-mail ;
* mot de passe ;
* bouton de connexion ;
* lien « Mot de passe oublié ».

Après connexion, l’utilisateur est redirigé selon son rôle :

```text
Administrateur → Espace administrateur
Membre → Espace membre
```

---

## 1.3. Mot de passe oublié

Fonctions :

* saisir son numéro de téléphone ou son e-mail ;
* recevoir un code ou un lien ;
* saisir un nouveau mot de passe.

---

## 1.4. Création ou modification du mot de passe

Utilisé lors :

* de la première connexion ;
* d’une réinitialisation ;
* d’un changement volontaire.

---

## 1.5. Notifications

L’écran affiche :

* les paiements enregistrés ;
* les rappels de mensualités ;
* les nouvelles cotisations exceptionnelles ;
* les reçus disponibles ;
* les changements de statut ;
* les annonces générales.

Filtres possibles :

* toutes ;
* non lues ;
* paiements ;
* cotisations ;
* annonces.

---

## 1.6. Profil utilisateur

Informations :

* photo ;
* nom et prénoms ;
* numéro de téléphone ;
* adresse e-mail ;
* rôle ;
* numéro de membre, si applicable.

Actions :

* modifier certaines informations ;
* changer le mot de passe ;
* gérer les notifications ;
* se déconnecter.

---

# 2. Écrans de l’espace administrateur

# A. Tableau de bord

## 2.1. Tableau de bord principal

Il affiche :

* nombre total de membres ;
* membres actifs ;
* membres en attente ;
* membres suspendus ;
* membres en retard ;
* encaissements du mois ;
* décaissements du mois ;
* solde global ;
* solde de chaque caisse ;
* dernières opérations ;
* graphique de l’évolution des cotisations.

Actions rapides :

* ajouter un membre ;
* enregistrer un paiement ;
* créer une cotisation exceptionnelle ;
* enregistrer un décaissement.

---

## 2.2. Détail d’un indicateur

Exemple : en cliquant sur « Membres en retard », l’administrateur voit :

* la liste des membres concernés ;
* le nombre de mois dus ;
* le montant restant ;
* la dernière date de paiement.

---

# B. Gestion des membres

## 2.3. Liste des membres

L’écran contient :

* barre de recherche ;
* filtres ;
* tri ;
* photo ;
* numéro de membre ;
* nom complet ;
* téléphone ;
* statut ;
* montant restant dû.

Filtres :

* actif ;
* en attente ;
* suspendu ;
* retiré ;
* à jour ;
* en retard.

Actions :

* ajouter un membre ;
* ouvrir la fiche ;
* exporter la liste.

---

## 2.4. Ajouter un membre

Formulaire :

* numéro de membre ;
* nom ;
* prénoms ;
* téléphone ;
* e-mail ;
* photo ;
* adresse ;
* date d’adhésion ;
* montant du droit d’adhésion ;
* date de début des mensualités ;
* observations.

---

## 2.5. Modifier un membre

Permet de modifier :

* informations personnelles ;
* coordonnées ;
* photo ;
* date d’adhésion ;
* observations.

Les données financières ne doivent pas être modifiées directement depuis cet écran.

---

## 2.6. Fiche détaillée du membre

En-tête :

* photo ;
* nom complet ;
* numéro de membre ;
* statut ;
* date d’adhésion ;
* total payé ;
* total restant ;
* avance disponible.

Onglets :

```text
Vue d’ensemble
Adhésion
Mensualités
Cotisations exceptionnelles
Paiements
Reçus
Suspensions
Historique
```

Actions rapides :

* enregistrer un paiement ;
* suspendre le membre ;
* modifier le profil ;
* consulter les reçus.

---

## 2.7. Validation du droit d’adhésion

L’écran affiche :

* montant attendu ;
* montant déjà payé ;
* montant restant ;
* historique des versements ;
* statut.

Action :

* enregistrer un paiement du droit d’adhésion.

---

## 2.8. Suspension d’un membre

Formulaire :

* motif de l’enquête ;
* date de début ;
* durée prévue ;
* politique des cotisations pendant la suspension ;
* observations ;
* pièces justificatives.

---

## 2.9. Dossier d’enquête

Il affiche :

* motif ;
* historique des décisions ;
* documents ;
* statut de l’enquête ;
* dates importantes ;
* responsables.

Actions :

* réactiver le membre ;
* confirmer une violation ;
* retirer le membre ;
* annuler la suspension.

---

# C. Gestion des mensualités

## 2.10. Tableau général des mensualités

Présentation recommandée sous forme de tableau :

| Membre | Jan | Fév | Mar | Avr | Mai | Juin |
| ------ | --- | --- | --- | --- | --- | ---- |

Codes visuels :

* vert : payé ;
* orange : partiel ;
* rouge : en retard ;
* gris : à venir ;
* bleu : exempté.

Filtres :

* mois ;
* année ;
* statut ;
* membre.

---

## 2.11. Liste des mensualités d’un mois

L’écran affiche :

* tous les membres concernés ;
* montant attendu ;
* montant payé ;
* reste ;
* statut ;
* date du dernier versement.

---

## 2.12. Détail d’une mensualité

Informations :

* membre ;
* mois concerné ;
* montant attendu ;
* montant payé ;
* reste ;
* statut ;
* date limite ;
* paiements affectés.

Actions :

* enregistrer un versement ;
* accorder une exemption ;
* consulter l’historique.

---

## 2.13. Configuration du montant mensuel

L’administrateur peut :

* définir un nouveau montant ;
* choisir sa date d’application ;
* consulter les anciens tarifs ;
* voir les périodes concernées.

---

# D. Gestion des cotisations exceptionnelles

## 2.14. Liste des cotisations exceptionnelles

Chaque carte ou ligne affiche :

* titre ;
* type obligatoire ou facultatif ;
* montant demandé ;
* membres concernés ;
* montant collecté ;
* montant restant ;
* progression ;
* date limite ;
* statut.

---

## 2.15. Créer une cotisation exceptionnelle

Formulaire :

* titre ;
* description ;
* type ;
* montant demandé ;
* autorisation d’un montant personnalisé ;
* autorisation du dépassement ;
* date de début ;
* date limite ;
* membres concernés ;
* caisse associée.

---

## 2.16. Détail d’une cotisation exceptionnelle

Il affiche :

* description ;
* objectif total ;
* montant collecté ;
* reste ;
* progression ;
* caisse associée ;
* liste des membres concernés ;
* situation de chaque membre.

Actions :

* enregistrer un paiement ;
* ajouter des membres ;
* retirer un membre ;
* exempter un membre ;
* terminer ;
* archiver ;
* annuler.

---

## 2.17. Situation d’un membre pour une cotisation exceptionnelle

Informations :

* montant demandé ;
* montant payé ;
* montant restant ;
* statut ;
* historique des paiements ;
* exemption éventuelle.

---

# E. Gestion des paiements

## 2.18. Enregistrer un paiement

C’est l’un des écrans les plus importants.

Étapes :

### Étape 1 — Sélection du membre

* recherche par nom ;
* numéro de membre ;
* numéro de téléphone ;
* scan QR Code plus tard.

### Étape 2 — Type de paiement

* droit d’adhésion ;
* mensualité ;
* cotisation exceptionnelle ;
* paiement mixte.

### Étape 3 — Sélection des cotisations

* un ou plusieurs mois ;
* une ou plusieurs cotisations exceptionnelles ;
* anciennes dettes proposées automatiquement.

### Étape 4 — Montant

* montant total reçu ;
* répartition automatique ;
* modification manuelle ;
* avance éventuelle.

### Étape 5 — Informations du paiement

* date ;
* moyen de paiement ;
* référence ;
* note ;
* caisse destinataire.

### Étape 6 — Vérification

Résumé complet avant validation.

---

## 2.19. Confirmation du paiement

L’écran affiche :

* membre ;
* montant total ;
* détail de la répartition ;
* caisse ;
* moyen de paiement ;
* date.

Actions :

* confirmer ;
* revenir modifier.

---

## 2.20. Paiement réussi

Il affiche :

* confirmation ;
* numéro du paiement ;
* numéro du reçu ;
* montant ;
* solde mis à jour.

Actions :

* télécharger le reçu ;
* partager sur WhatsApp ;
* enregistrer un autre paiement ;
* retourner à la fiche membre.

---

## 2.21. Liste des paiements

Colonnes :

* numéro ;
* date ;
* membre ;
* type ;
* montant ;
* caisse ;
* moyen ;
* statut ;
* administrateur.

Filtres :

* période ;
* membre ;
* type ;
* caisse ;
* moyen de paiement ;
* statut.

---

## 2.22. Détail d’un paiement

Informations :

* montant ;
* membre ;
* affectations ;
* caisse ;
* référence ;
* auteur ;
* reçu ;
* historique des corrections.

Actions :

* corriger ;
* annuler ;
* imprimer le reçu.

---

## 2.23. Correction d’un paiement

L’écran affiche :

* anciennes valeurs ;
* nouveaux champs ;
* motif obligatoire ;
* impact sur les cotisations ;
* impact sur la caisse.

---

## 2.24. Annulation d’un paiement

L’écran affiche :

* paiement concerné ;
* montant ;
* caisse ;
* cotisations affectées ;
* motif obligatoire ;
* aperçu des conséquences.

---

# F. Gestion des caisses

## 2.25. Liste des caisses

Chaque caisse affiche :

* nom ;
* type ;
* solde ;
* encaissements ;
* décaissements ;
* statut.

Actions :

* créer une caisse ;
* consulter ;
* transférer de l’argent ;
* désactiver.

---

## 2.26. Créer une caisse

Champs :

* nom ;
* code ;
* type ;
* description ;
* solde d’ouverture éventuel ;
* statut.

---

## 2.27. Détail d’une caisse

Il affiche :

* solde actuel ;
* total des entrées ;
* total des sorties ;
* évolution ;
* dernières opérations ;
* cotisations liées.

Onglets :

```text
Vue d’ensemble
Mouvements
Encaissements
Décaissements
Transferts
```

---

## 2.28. Historique d’une caisse

Liste de tous les mouvements :

* paiement ;
* décaissement ;
* transfert entrant ;
* transfert sortant ;
* solde d’ouverture ;
* annulation.

---

## 2.29. Transfert entre caisses

Formulaire :

* caisse source ;
* caisse de destination ;
* solde disponible ;
* montant ;
* motif ;
* date.

Le système affiche un résumé avant validation.

---

# G. Gestion des décaissements

## 2.30. Liste des décaissements

Informations :

* numéro ;
* date ;
* titre ;
* bénéficiaire ;
* montant ;
* caisses utilisées ;
* catégorie ;
* statut.

---

## 2.31. Enregistrer un décaissement

Formulaire :

* titre ;
* motif ;
* catégorie ;
* montant total ;
* bénéficiaire ;
* cotisation exceptionnelle liée ;
* date ;
* justificatif ;
* note.

---

## 2.32. Répartition du décaissement entre les caisses

L’administrateur sélectionne :

* plusieurs caisses ;
* le montant retiré de chaque caisse.

L’écran affiche :

```text
Montant total du décaissement
Montant réparti
Montant restant à répartir
```

Le bouton de validation reste désactivé tant que la répartition n’est pas correcte.

---

## 2.33. Confirmation du décaissement

Résumé :

* motif ;
* montant total ;
* caisses utilisées ;
* solde avant ;
* montant retiré ;
* solde après.

---

## 2.34. Détail d’un décaissement

Il affiche :

* informations générales ;
* répartition par caisse ;
* justificatifs ;
* auteur ;
* statut ;
* historique.

Actions :

* annuler ;
* télécharger le justificatif ;
* consulter les mouvements de caisse.

---

# H. Reçus

## 2.35. Liste des reçus

Filtres :

* membre ;
* date ;
* type de paiement ;
* statut.

Informations :

* numéro du reçu ;
* membre ;
* montant ;
* date ;
* type ;
* statut.

---

## 2.36. Aperçu du reçu

Il affiche le reçu complet.

Actions :

* télécharger en PDF ;
* imprimer ;
* partager ;
* ouvrir le paiement associé.

---

# I. Rapports et statistiques

## 2.37. Rapports financiers

Rapports disponibles :

* encaissements ;
* décaissements ;
* solde par caisse ;
* solde global ;
* droits d’adhésion ;
* mensualités ;
* cotisations exceptionnelles ;
* retards ;
* avances des membres.

Filtres :

* période ;
* caisse ;
* membre ;
* type d’opération.

---

## 2.38. Rapport des membres en retard

Il affiche :

* membre ;
* mois non payés ;
* montant restant ;
* ancienneté de la dette ;
* dernier paiement.

---

## 2.39. Rapport d’une cotisation exceptionnelle

Informations :

* objectif ;
* montant collecté ;
* reste ;
* membres ayant payé ;
* membres partiels ;
* membres non payés ;
* dépenses liées.

---

## 2.40. Export des rapports

Options :

* PDF ;
* Excel ;
* impression.

---

# J. Historique et contrôle

## 2.41. Journal d’activité

Il affiche les actions sensibles :

* création ;
* modification ;
* annulation ;
* suspension ;
* exemption ;
* transfert ;
* décaissement.

Filtres :

* utilisateur ;
* date ;
* type d’action ;
* module.

---

## 2.42. Détail d’une action

Il affiche :

* auteur ;
* date ;
* ancienne valeur ;
* nouvelle valeur ;
* motif ;
* ressource concernée.

---

# K. Import des anciennes données

## 2.43. Centre d’importation

Il permet de choisir :

* membres ;
* mensualités ;
* paiements ;
* cotisations exceptionnelles ;
* décaissements ;
* soldes des caisses.

---

## 2.44. Télécharger un modèle Excel

L’administrateur peut télécharger un modèle selon le type de données.

Exemple :

```text
Modèle membres
Modèle mensualités
Modèle paiements
Modèle soldes des caisses
```

---

## 2.45. Importer un fichier

Étapes :

* sélectionner le fichier ;
* vérifier les colonnes ;
* associer les colonnes ;
* détecter les erreurs ;
* afficher un aperçu.

---

## 2.46. Résultat de l’import

Il affiche :

* lignes totales ;
* lignes réussies ;
* lignes refusées ;
* doublons ;
* erreurs.

Actions :

* télécharger le rapport d’erreurs ;
* corriger ;
* valider l’import.

---

## 2.47. Solde d’ouverture

L’administrateur peut enregistrer :

* la caisse ;
* le montant ;
* la date ;
* l’origine ;
* le justificatif.

---

# L. Paramètres

## 2.48. Paramètres de l’organisation

Champs :

* nom ;
* logo ;
* adresse ;
* téléphone ;
* e-mail ;
* devise ;
* jour limite ;
* moyens de paiement.

---

## 2.49. Gestion des administrateurs

Fonctions :

* ajouter un administrateur ;
* modifier son rôle ;
* activer ou désactiver son accès ;
* consulter ses dernières actions.

---

## 2.50. Gestion des rôles et permissions

Plus tard, cet écran permettra de gérer :

* président ;
* trésorier ;
* secrétaire ;
* contrôleur ;
* administrateur.

---

## 2.51. Paramètres des notifications

L’administrateur choisit :

* les notifications activées ;
* les rappels ;
* le nombre de jours avant l’échéance ;
* les canaux utilisés.

---

## 2.52. Paramètres de sécurité

Fonctions :

* changement de mot de passe ;
* durée des sessions ;
* déconnexion des appareils ;
* double authentification plus tard.

---

# 3. Écrans de l’espace membre

# A. Tableau de bord membre

## 3.1. Accueil du membre

Il affiche immédiatement :

* son statut ;
* indication « À jour » ou « En retard » ;
* total cotisé ;
* total restant ;
* avance disponible ;
* mensualité actuelle ;
* cotisations exceptionnelles en cours ;
* dernières opérations.

Actions rapides :

* voir mes mensualités ;
* voir mes cotisations exceptionnelles ;
* consulter mes reçus.

---

# B. Mensualités du membre

## 3.2. Mes mensualités

Présentation par année avec calendrier ou grille.

Exemple :

| Mois    | Montant |  Payé | Reste | Statut  |
| ------- | ------: | ----: | ----: | ------- |
| Janvier |   5 000 | 5 000 |     0 | Payé    |
| Février |   5 000 | 3 000 | 2 000 | Partiel |

---

## 3.3. Détail d’une mensualité

Il affiche :

* montant attendu ;
* montant payé ;
* reste ;
* date limite ;
* statut ;
* historique des versements ;
* reçus associés.

---

# C. Cotisations exceptionnelles du membre

## 3.4. Mes cotisations exceptionnelles

Deux sections :

* en cours ;
* terminées.

Chaque carte affiche :

* titre ;
* montant attendu ;
* montant versé ;
* reste ;
* progression ;
* date limite ;
* caractère obligatoire ou facultatif.

---

## 3.5. Détail d’une cotisation exceptionnelle

Informations :

* description ;
* montant demandé ;
* montant payé ;
* reste ;
* historique ;
* reçu ;
* caisse associée, si l’organisation souhaite l’afficher.

---

# D. Historique du membre

## 3.6. Mes transactions

Il affiche :

* date ;
* type ;
* montant ;
* cotisation concernée ;
* moyen de paiement ;
* statut.

Filtres :

* période ;
* type ;
* statut.

---

## 3.7. Détail d’une transaction

Il affiche :

* montant ;
* date ;
* type ;
* répartition ;
* référence ;
* administrateur ayant enregistré ;
* reçu associé.

---

# E. Reçus du membre

## 3.8. Mes reçus

Liste :

* numéro ;
* date ;
* montant ;
* type ;
* statut.

---

## 3.9. Aperçu d’un reçu

Actions :

* télécharger ;
* partager ;
* imprimer.

---

# F. Profil et compte du membre

## 3.10. Mon profil

Informations :

* photo ;
* nom ;
* numéro de membre ;
* téléphone ;
* e-mail ;
* date d’adhésion ;
* statut.

---

## 3.11. Modifier mes informations

Le membre peut modifier uniquement les données autorisées :

* photo ;
* téléphone ;
* e-mail ;
* adresse.

Les modifications sensibles peuvent nécessiter une validation administrative.

---

## 3.12. Sécurité du compte

Fonctions :

* modifier le mot de passe ;
* consulter les appareils connectés ;
* se déconnecter de tous les appareils.

---

# 4. Navigation recommandée

## Menu administrateur desktop

```text
Tableau de bord
Membres
Mensualités
Cotisations exceptionnelles
Paiements
Caisses
Décaissements
Reçus
Rapports
Historique
Importation
Paramètres
```

## Barre mobile administrateur

```text
Accueil
Membres
Paiement
Finances
Plus
```

Le bouton central `Paiement` peut être mis en avant, car c’est l’action la plus fréquente.

## Barre mobile membre

```text
Accueil
Mensualités
Cotisations
Historique
Profil
```

---

# 5. Écrans à développer en premier

Pour éviter de te disperser, commence avec seulement ces écrans.

## Administrateur

1. Connexion
2. Tableau de bord simple
3. Liste des membres
4. Ajouter un membre
5. Fiche du membre
6. Enregistrer un paiement
7. Liste des mensualités
8. Liste des cotisations exceptionnelles
9. Créer une cotisation exceptionnelle
10. Liste des caisses
11. Enregistrer un décaissement
12. Historique des paiements

## Membre

1. Connexion
2. Acceil
3. Cotisation (Mes mensualités, Mes cotisations exceptionnelles)
4. Transactions (Mes transactions, Mes reçus)
5. Mon profil

Cela donne une première version d’environ **19 écrans essentiels**. Les imports, rapports avancés, suspensions détaillées, transferts de caisses et permissions peuvent être ajoutés dans les versions suivantes.

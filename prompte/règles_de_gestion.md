# Règles de gestion — Application de gestion des cotisations

## 1. Objet de l’application

L’application permet à une organisation de gérer et de suivre :

* les membres ;
* les droits d’adhésion ;
* les cotisations mensuelles ;
* les cotisations exceptionnelles ;
* les encaissements ;
* les différentes caisses de l’organisation ;
* les décaissements ;
* les reçus ;
* l’historique des opérations ;
* les notifications ;
* la situation financière de chaque membre.

L’application comporte deux espaces principaux :

1. un espace administrateur accessible sur mobile et ordinateur ;
2. un espace membre principalement adapté au mobile.

Pour la première version, l’application gère une seule organisation.

---

# 2. Acteurs de l’application

## 2.1. Administrateur

L’administrateur peut :

* configurer les informations de l’organisation ;
* créer et gérer les membres ;
* enregistrer les droits d’adhésion ;
* enregistrer les cotisations mensuelles ;
* créer les cotisations exceptionnelles ;
* enregistrer les paiements ;
* créer et gérer les caisses ;
* enregistrer les décaissements ;
* consulter les rapports ;
* corriger ou annuler une opération ;
* suspendre un membre pendant une enquête ;
* retirer un membre après confirmation d’une violation ;
* importer les données antérieures à la création de l’application.

## 2.2. Membre

Le membre peut :

* consulter son profil ;
* consulter le statut de son droit d’adhésion ;
* consulter ses cotisations mensuelles ;
* consulter ses cotisations exceptionnelles ;
* suivre les montants déjà payés ;
* consulter les montants restants ;
* consulter son historique de transactions ;
* télécharger ses reçus ;
* recevoir des notifications.

Le membre ne peut pas modifier directement un paiement ou une opération financière.

---

# 3. Configuration de l’organisation

L’administrateur doit pouvoir définir :

* le nom de l’organisation ;
* le logo ;
* l’adresse ;
* les contacts ;
* la devise utilisée ;
* le montant du droit d’adhésion ;
* le montant de la cotisation mensuelle ;
* la date ou le jour limite de paiement des mensualités ;
* les moyens de paiement acceptés ;
* les informations de l’administrateur ;
* les différentes caisses de l’organisation.

La devise utilisée par défaut est le franc CFA, abrégé `FCFA`.

---

# 4. Modification des montants

La modification du droit d’adhésion ou de la cotisation mensuelle ne doit pas modifier rétroactivement les anciennes obligations.

Exemple :

* cotisation de janvier à juin : `5 000 FCFA` ;
* nouvelle cotisation à partir de juillet : `7 500 FCFA`.

Les mois de janvier à juin doivent rester enregistrés à `5 000 FCFA`.

Chaque modification doit comporter :

* l’ancien montant ;
* le nouveau montant ;
* la date d’application ;
* la personne ayant effectué la modification.

---

# 5. Gestion des membres

## 5.1. Création d’un membre

Seul un administrateur peut créer un membre.

Les informations minimales sont :

* numéro de membre ;
* nom ;
* prénoms ;
* numéro de téléphone ;
* photo facultative ;
* date d’adhésion ;
* statut du membre.

Le numéro de membre doit être unique.

Un même numéro de téléphone ne doit pas être associé à plusieurs comptes actifs, sauf autorisation particulière de l’administrateur.

## 5.2. Statuts d’un membre

Les statuts possibles sont :

* `En attente d’adhésion` ;
* `Actif` ;
* `Suspendu pour enquête` ;
* `Retiré`.

## 5.3. Membre en attente d’adhésion

Un membre reste en attente tant que son droit d’adhésion n’est pas entièrement payé.

## 5.4. Membre actif

Un membre devient actif lorsque son droit d’adhésion est entièrement payé et validé.

## 5.5. Membre retiré

Un membre retiré :

* ne reçoit plus de nouvelles cotisations ;
* conserve son historique financier ;
* conserve ses reçus ;
* reste visible dans les anciens rapports ;
* ne doit pas être supprimé définitivement de la base de données.

---

# 6. Droit d’adhésion

Le droit d’adhésion est payé une seule fois par membre.

Il peut être :

* non payé ;
* partiellement payé ;
* entièrement payé.

Le paiement partiel du droit d’adhésion est autorisé.

Exemple :

```text
Droit d’adhésion : 10 000 FCFA
Montant versé : 6 000 FCFA
Montant restant : 4 000 FCFA
Statut : Partiellement payé
```

Le membre devient actif uniquement lorsque le droit d’adhésion est entièrement payé.

Chaque paiement du droit d’adhésion doit être enregistré dans l’historique.

---

# 7. Début des cotisations mensuelles

Par défaut, les cotisations mensuelles commencent le mois suivant la validation complète du droit d’adhésion.

Exemple :

```text
Droit d’adhésion validé : 18 mars
Première mensualité : avril
```

L’administrateur peut exceptionnellement choisir de faire commencer les mensualités pendant le mois de validation.

Cette décision doit être enregistrée dans la fiche du membre.

---

# 8. Gestion des cotisations mensuelles

## 8.1. Création des mensualités

Une cotisation mensuelle doit être générée pour chaque membre actif et pour chaque mois concerné.

Chaque mensualité contient :

* le membre ;
* le mois ;
* l’année ;
* le montant attendu ;
* le montant payé ;
* le montant restant ;
* la date limite ;
* le statut.

## 8.2. Statuts d’une mensualité

Les statuts possibles sont :

* `À venir` ;
* `Non payé` ;
* `Partiellement payé` ;
* `Payé` ;
* `En retard`.

## 8.3. Règles de calcul du statut

Une mensualité est :

* `À venir` lorsque le mois concerné n’a pas encore commencé ;
* `Non payé` lorsque le mois a commencé et qu’aucun paiement n’a été effectué ;
* `Partiellement payé` lorsque le montant versé est inférieur au montant attendu ;
* `Payé` lorsque le montant total attendu a été versé ;
* `En retard` lorsque la date limite est dépassée et que le paiement n’est pas complet.

Un membre en retard de paiement n’est pas automatiquement suspendu.

Les retards financiers et les sanctions disciplinaires doivent rester séparés.

---

# 9. Paiement partiel d’une mensualité

Le paiement partiel est autorisé.

Exemple :

```text
Montant attendu : 5 000 FCFA
Premier paiement : 3 000 FCFA
Montant restant : 2 000 FCFA
Statut : Partiellement payé
```

Un autre paiement de `2 000 FCFA` permet de clôturer la mensualité.

Chaque versement doit apparaître séparément dans l’historique du membre.

---

# 10. Paiement de plusieurs mois

Un membre peut payer plusieurs mois en une seule opération.

Exemple :

```text
Mensualité : 5 000 FCFA
Montant versé : 15 000 FCFA
Mois concernés : avril, mai et juin
```

L’application doit proposer automatiquement l’affectation du paiement aux mensualités les plus anciennes non réglées.

L’administrateur peut modifier cette proposition avant de valider le paiement.

Par défaut, les paiements sont affectés aux anciennes dettes avant les mois futurs.

---

# 11. Paiement supérieur au montant attendu

Lorsqu’un membre verse un montant supérieur à la cotisation sélectionnée, le surplus ne doit pas être perdu.

Le surplus peut être :

* affecté à une autre mensualité ;
* affecté à une cotisation exceptionnelle ;
* conservé comme avance du membre.

Exemple :

```text
Montant attendu : 5 000 FCFA
Montant reçu : 8 000 FCFA
Affecté à la mensualité : 5 000 FCFA
Avance restante : 3 000 FCFA
```

L’administrateur doit voir la répartition avant de valider le paiement.

Le membre doit pouvoir consulter son avance disponible.

---

# 12. Cotisations exceptionnelles

## 12.1. Création

L’administrateur peut créer une cotisation exceptionnelle pour un événement ou un besoin particulier.

Exemples :

* mariage ;
* décès ;
* cérémonie ;
* anniversaire de l’organisation ;
* projet commun ;
* aide à un membre ;
* achat de matériel.

Une cotisation exceptionnelle contient :

* un titre ;
* une description ;
* un montant demandé par membre ;
* une date de début ;
* une date limite ;
* les membres concernés ;
* son caractère obligatoire ou facultatif ;
* une caisse associée ;
* un statut.

## 12.2. Membres concernés

Une cotisation exceptionnelle peut concerner :

* tous les membres actifs ;
* une sélection de membres ;
* une catégorie de membres.

Un membre non concerné ne doit pas apparaître comme débiteur.

Un nouveau membre ne doit pas être ajouté automatiquement à une cotisation exceptionnelle déjà en cours, sauf décision explicite de l’administrateur.

## 12.3. Statuts d’une cotisation exceptionnelle

Les statuts possibles sont :

* `Brouillon` ;
* `En cours` ;
* `Terminée` ;
* `Archivée` ;
* `Annulée`.

Une cotisation archivée doit rester consultable dans l’historique.

## 12.4. Statut de paiement du membre

Pour chaque membre concerné, l’application doit afficher :

* le montant demandé ;
* le montant versé ;
* le montant restant ;
* le pourcentage de progression ;
* le statut.

Les statuts possibles sont :

* `Non payé` ;
* `Partiellement payé` ;
* `Payé`.

---

# 13. Cotisation exceptionnelle obligatoire ou facultative

## 13.1. Cotisation obligatoire

Le montant non payé reste dû par le membre.

Le reste apparaît dans sa situation financière.

## 13.2. Cotisation facultative

Le membre peut :

* ne rien verser ;
* verser une partie ;
* verser le montant proposé ;
* verser un montant supérieur si cela est autorisé.

Une cotisation facultative non payée ne doit pas être considérée comme une dette ou un retard.

---

# 14. Exemption d’une cotisation

Une exemption signifie qu’un membre normalement concerné est libéré de l’obligation de payer une cotisation donnée.

L’exemption peut être accordée pour une mensualité ou une cotisation exceptionnelle, selon une décision officielle de l’organisation.

Une exemption doit obligatoirement contenir :

* le membre concerné ;
* la cotisation concernée ;
* le motif ;
* la date ;
* l’administrateur ayant enregistré la décision.

Une cotisation exemptée :

* ne génère pas de dette ;
* ne génère pas de retard ;
* n’est pas comptée comme payée ;
* reste visible dans l’historique avec le statut `Exempté`.

L’exemption ne doit pas supprimer la cotisation d’origine.

---

# 15. Enregistrement d’un paiement

Lorsqu’un administrateur reçoit un paiement, il doit enregistrer :

* le membre ;
* le type de paiement ;
* la ou les cotisations concernées ;
* le montant total reçu ;
* la répartition du montant ;
* la date du paiement ;
* le moyen de paiement ;
* une référence facultative ;
* une note facultative ;
* l’administrateur ayant enregistré l’opération.

Les types de paiements sont :

* droit d’adhésion ;
* cotisation mensuelle ;
* cotisation exceptionnelle ;
* autre paiement autorisé.

Les moyens de paiement peuvent être :

* espèces ;
* Orange Money ;
* MTN Mobile Money ;
* Moov Money ;
* Wave ;
* virement bancaire ;
* autre.

---

# 16. Statuts d’un paiement

Les statuts possibles sont :

* `En attente` ;
* `Validé` ;
* `Annulé`.

Pour la première version, un paiement enregistré par un administrateur autorisé peut être directement validé.

Seuls les paiements validés doivent être pris en compte dans :

* les montants payés par le membre ;
* les soldes des caisses ;
* les statistiques ;
* les rapports financiers.

---

# 17. Reçu de paiement

Chaque paiement validé doit générer un reçu unique.

Le reçu contient :

* le nom et le logo de l’organisation ;
* un numéro unique ;
* le nom du membre ;
* le numéro du membre ;
* le type de paiement ;
* la cotisation ou la période concernée ;
* le montant payé ;
* la date ;
* le moyen de paiement ;
* la référence éventuelle ;
* le nom de l’administrateur.

Le membre peut :

* consulter le reçu ;
* le télécharger ;
* le partager, notamment par WhatsApp.

---

# 18. Correction et annulation d’un paiement

Un paiement validé ne doit pas être supprimé définitivement.

L’administrateur peut :

* corriger le paiement ;
* annuler le paiement ;
* créer une opération de remplacement.

Toute correction doit conserver :

* les anciennes informations ;
* les nouvelles informations ;
* le motif de la correction ;
* la date ;
* l’auteur de la correction.

L’annulation d’un paiement doit automatiquement corriger :

* le montant payé par le membre ;
* la situation de la cotisation ;
* le solde de la caisse concernée ;
* les statistiques de l’organisation.

---

# 19. Gestion des caisses

## 19.1. Séparation des caisses

Toutes les caisses de l’organisation doivent être séparées.

Chaque caisse possède :

* un nom ;
* une description ;
* un type ;
* un solde ;
* un statut ;
* un historique propre.

Exemples :

* caisse des droits d’adhésion ;
* caisse des mensualités ;
* caisse générale ;
* caisse mariage ;
* caisse décès ;
* caisse d’un projet particulier ;
* caisse d’une cotisation exceptionnelle.

## 19.2. Affectation des encaissements

Chaque paiement doit être affecté à une caisse déterminée.

Exemples :

```text
Droit d’adhésion
→ Caisse des droits d’adhésion
```

```text
Cotisation mensuelle
→ Caisse des mensualités
```

```text
Cotisation Projet de siège
→ Caisse Projet de siège
```

Une cotisation exceptionnelle doit normalement posséder sa propre caisse ou être rattachée à une caisse existante choisie par l’administrateur.

## 19.3. Calcul du solde d’une caisse

```text
Solde de la caisse =
Total des encaissements validés
- Total des décaissements validés
- Total des transferts sortants
+ Total des transferts entrants
```

Chaque caisse doit afficher son historique complet.

---

# 20. Transfert entre les caisses

Un transfert entre deux caisses doit être enregistré comme une opération distincte.

Un transfert contient :

* la caisse source ;
* la caisse de destination ;
* le montant ;
* la date ;
* le motif ;
* l’administrateur ;
* le statut.

Le montant transféré doit être inférieur ou égal au solde disponible dans la caisse source.

Un transfert ne doit jamais être réalisé en modifiant directement les soldes.

---

# 21. Gestion des décaissements

## 21.1. Définition

Un décaissement représente une sortie d’argent de l’organisation.

Un décaissement doit contenir :

* un titre ;
* un motif ;
* une catégorie ;
* le montant total ;
* la date ;
* le bénéficiaire éventuel ;
* la cotisation exceptionnelle liée, si nécessaire ;
* un justificatif facultatif ;
* une note ;
* l’administrateur ayant enregistré l’opération.

Les catégories peuvent être :

* aide à un membre ;
* dépense d’événement ;
* fonctionnement ;
* achat de matériel ;
* transport ;
* communication ;
* autre.

## 21.2. Décaissement depuis plusieurs caisses

Un seul décaissement peut prélever de l’argent dans plusieurs caisses.

L’administrateur doit sélectionner les caisses et préciser le montant retiré de chacune.

Exemple :

```text
Décaissement total : 300 000 FCFA

Caisse des mensualités : 100 000 FCFA
Caisse mariage : 150 000 FCFA
Caisse générale : 50 000 FCFA
```

La règle suivante doit toujours être respectée :

```text
Somme des montants retirés des caisses
=
Montant total du décaissement
```

Le système doit refuser la validation si les deux montants sont différents.

## 21.3. Contrôle des soldes

Il est interdit de retirer d’une caisse un montant supérieur à son solde disponible.

Exemple :

```text
Solde de la caisse : 80 000 FCFA
Montant demandé : 100 000 FCFA
Résultat : Décaissement refusé
```

Le système doit vérifier chaque caisse individuellement avant la validation.

## 21.4. Statuts d’un décaissement

Les statuts possibles sont :

* `En attente` ;
* `Validé` ;
* `Annulé`.

Seuls les décaissements validés diminuent les soldes des caisses.

---

# 22. Solde global de l’organisation

Le solde global correspond à la somme des soldes de toutes les caisses actives.

```text
Solde global =
Somme des soldes de toutes les caisses
```

Le tableau de bord doit afficher séparément :

* le solde global ;
* le solde de chaque caisse ;
* les encaissements du mois ;
* les décaissements du mois ;
* les montants attendus ;
* les montants réellement collectés.

---

# 23. Suspension disciplinaire d’un membre

## 23.1. Motif de suspension

Un membre ne peut être suspendu que dans le cadre d’une enquête concernant une possible violation du règlement intérieur.

Un retard ou un défaut de paiement ne doit pas entraîner automatiquement une suspension disciplinaire.

## 23.2. Informations de la suspension

La suspension doit contenir :

* le membre concerné ;
* le motif ;
* la date de début ;
* la personne ayant décidé la suspension ;
* la durée prévue ;
* les observations ;
* les pièces justificatives éventuelles ;
* le statut de l’enquête.

## 23.3. Situation du membre pendant l’enquête

Pendant la période d’enquête, le membre :

* conserve l’accès à son historique ;
* conserve l’accès à ses reçus ;
* reste présent dans les rapports ;
* ne doit pas être supprimé ;
* peut être empêché d’effectuer certaines actions selon les règles de l’organisation.

La gestion de ses nouvelles cotisations pendant la suspension doit être décidée par l’administrateur ou le bureau.

Deux choix sont possibles :

* continuer à générer ses cotisations ;
* suspendre temporairement la génération de nouvelles cotisations.

La décision prise doit être enregistrée dans le dossier de suspension.

## 23.4. Fin de l’enquête

Si aucune violation n’est confirmée :

```text
Statut du membre → Actif
```

Si une violation est confirmée et que la sanction prévoit son retrait :

```text
Statut du membre → Retiré
```

La décision finale doit contenir :

* le résultat de l’enquête ;
* la date de la décision ;
* le motif ;
* les personnes responsables de la décision ;
* les observations finales.

---

# 24. Situation financière du membre

Pour chaque membre, l’application doit calculer :

```text
Reste du droit d’adhésion =
Montant du droit d’adhésion
- Montant payé
```

```text
Reste des mensualités =
Somme des mensualités dues
- Somme des montants payés
```

```text
Reste exceptionnel =
Somme des cotisations exceptionnelles obligatoires
- Somme des paiements exceptionnels
```

```text
Total restant dû =
Reste du droit d’adhésion
+ Reste des mensualités
+ Reste des cotisations exceptionnelles obligatoires
```

Les cotisations facultatives non payées et les cotisations exemptées ne doivent pas être incluses dans le total restant dû.

---

# 25. Tableau de bord administrateur

Le tableau de bord administrateur doit afficher au minimum :

* le nombre total de membres ;
* le nombre de membres actifs ;
* le nombre de membres en attente ;
* le nombre de membres suspendus ;
* le nombre de membres en retard de paiement ;
* le total des droits d’adhésion collectés ;
* le total des mensualités collectées ;
* le total des cotisations exceptionnelles collectées ;
* le total des décaissements ;
* le solde global ;
* le solde de chaque caisse ;
* l’évolution des cotisations ;
* les dernières transactions.

---

# 26. Tableau de bord du membre

Le tableau de bord du membre doit afficher :

* son statut ;
* le statut de son droit d’adhésion ;
* le total de ses paiements ;
* le montant restant dû ;
* le nombre de mensualités payées ;
* le nombre de mensualités en retard ;
* ses cotisations exceptionnelles en cours ;
* son avance disponible ;
* ses dernières transactions.

Le membre doit pouvoir consulter ses mensualités sous forme de calendrier ou de liste mensuelle.

---

# 27. Historique des opérations

L’application doit conserver un historique complet des opérations.

L’historique doit inclure :

* les paiements ;
* les corrections ;
* les annulations ;
* les exemptions ;
* les décaissements ;
* les transferts entre caisses ;
* les modifications de montants ;
* les suspensions ;
* les retraits de membres.

Chaque opération doit contenir :

* le type d’opération ;
* la date ;
* l’auteur ;
* le montant éventuel ;
* la description ;
* les anciennes valeurs, si nécessaire ;
* les nouvelles valeurs, si nécessaire.

---

# 28. Notifications

Le membre reçoit une notification lorsque :

* son compte est créé ;
* son droit d’adhésion est validé ;
* un paiement est enregistré ;
* un paiement est corrigé ;
* un paiement est annulé ;
* une nouvelle cotisation exceptionnelle est créée ;
* une échéance approche ;
* une mensualité devient en retard ;
* un reçu est disponible ;
* son statut change.

Une notification peut être envoyée par :

* notification interne ;
* SMS ;
* WhatsApp ;
* e-mail.

Pour la première version, les notifications internes peuvent être prioritaires.

---

# 29. Données antérieures à la création de l’application

## 29.1. Principe

Les informations existant avant le lancement doivent être intégrées dans l’application par une migration initiale.

Les données peuvent provenir :

* de fichiers Excel ;
* de cahiers ;
* de reçus papier ;
* de documents Word ;
* d’anciennes bases de données ;
* de relevés Mobile Money.

## 29.2. Données à importer

L’import initial peut contenir :

* la liste des membres ;
* les droits d’adhésion ;
* les mensualités historiques ;
* les cotisations exceptionnelles ;
* les paiements exceptionnels ;
* les décaissements ;
* les soldes des caisses ;
* les anciens membres retirés.

## 29.3. Import détaillé

L’import détaillé consiste à enregistrer chaque ancienne opération avec :

* le membre ;
* le montant ;
* la date ;
* la période concernée ;
* le moyen de paiement ;
* la référence éventuelle.

Cette méthode permet de conserver un historique complet.

## 29.4. Solde d’ouverture

Lorsque les anciennes transactions ne sont pas suffisamment détaillées, l’administrateur peut enregistrer un solde d’ouverture.

Un solde d’ouverture peut être enregistré pour :

* une caisse ;
* un membre ;
* une période ;
* une cotisation exceptionnelle.

Exemple :

```text
Caisse des mensualités
Solde avant lancement : 1 250 000 FCFA
Date d’ouverture : 1er janvier 2026
Origine : Ancienne comptabilité
```

## 29.5. Approche recommandée

L’approche recommandée est :

* importer le détail de l’année en cours ;
* utiliser des soldes d’ouverture pour les anciennes années ;
* importer tous les membres actifs ;
* conserver les anciens fichiers comme justificatifs ;
* importer les membres retirés lorsque leur historique doit être conservé.

## 29.6. Traçabilité des données importées

Toutes les données importées doivent être marquées avec :

```text
Origine : Import initial
```

Chaque import doit conserver :

* la date de l’import ;
* l’administrateur ayant effectué l’import ;
* le nom du fichier source ;
* une note ;
* le nombre de lignes importées ;
* le nombre d’erreurs ;
* le résultat de la vérification.

## 29.7. Vérification avant import

Avant l’import définitif, il faut :

1. supprimer ou corriger les doublons ;
2. vérifier les numéros de membre ;
3. uniformiser les noms et les numéros de téléphone ;
4. vérifier les dates ;
5. vérifier les montants ;
6. comparer les totaux avec la comptabilité existante ;
7. effectuer un import de test ;
8. faire valider le résultat par un responsable ;
9. effectuer l’import définitif.

## 29.8. Règle de cohérence des caisses

Au moment du lancement :

```text
Somme des soldes d’ouverture des caisses
=
Somme réellement disponible dans l’organisation
```

Si les montants ne correspondent pas, l’import ne doit pas être validé tant que l’écart n’est pas expliqué.

---

# 30. Sécurité et traçabilité

Les règles suivantes doivent être respectées :

* aucune opération financière validée ne doit être supprimée définitivement ;
* chaque correction doit être tracée ;
* chaque opération doit être liée à son auteur ;
* un membre ne peut consulter que ses propres données ;
* les mots de passe doivent être sécurisés ;
* les accès administrateurs doivent être protégés ;
* les données financières doivent être sauvegardées ;
* les documents justificatifs doivent rester accessibles ;
* les actions sensibles doivent être enregistrées dans un journal d’activité.

---

# 31. Règles principales validées pour la première version

Les décisions suivantes sont retenues :

```text
Première mensualité :
Mois suivant la validation de l’adhésion
```

```text
Paiement partiel :
Autorisé
```

```text
Paiement de plusieurs mois :
Autorisé
```

```text
Affectation par défaut :
Anciennes mensualités non payées en premier
```

```text
Surplus de paiement :
Affectation à une autre cotisation ou conservation comme avance
```

```text
Cotisation exceptionnelle :
Obligatoire ou facultative
```

```text
Caisses :
Séparées
```

```text
Décaissement :
Possible depuis une ou plusieurs caisses
```

```text
Suspension :
Uniquement dans le cadre d’une enquête liée au règlement intérieur
```

```text
Retard de paiement :
N’entraîne pas automatiquement une suspension
```

```text
Suppression des opérations financières :
Interdite après validation
```

```text
Données historiques :
Import détaillé ou solde d’ouverture
```

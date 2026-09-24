# Historique des paiements mensuels — conception

## Objectif

Dans l’onglet « Mensualités », remplacer la liste actuelle des soldes de mensualités par les six paiements mensuels les plus récents. Conserver le bouton de relance WhatsApp. Ajouter en bas un lien vers l’historique complet, affiché par pages.

## Expérience utilisateur

- Le résumé financier existant reste inchangé.
- Chaque ligne correspond à un paiement réel d’une mensualité, et non au solde agrégé de la mensualité.
- Chaque ligne affiche le nom du membre, le mois concerné, le montant de cette transaction, sa date, son mode, et le statut du solde après cette transaction.
- Afficher le reste uniquement quand le statut est « Partiel »; ne pas afficher de reste pour « Payé ».
- Garder le bouton WhatsApp avec son comportement actuel et son affichage conditionné à un numéro exploitable.
- Au-dessous des six éléments, le lien « Voir toutes les transactions » ouvre une page d’historique paginée utilisant les mêmes informations par transaction.
- Le tri du plus récent au plus ancien utilise la date de paiement, puis l’horodatage d’enregistrement et l’identifiant pour départager les égalités.

## Règles métier et données

- Inclure uniquement les lignes de `contribution_payments` liées à `monthly_contribution_due_id`; exclure les paiements d’adhésion et les cotisations exceptionnelles.
- Relier chaque paiement à sa mensualité et au membre concerné, tout en conservant le cloisonnement à l’organisation de l’administrateur actif.
- Le schéma stocke `payment_source` comme `wave` ou `manual`. Afficher `wave` comme « Wave » et, selon la confirmation du demandeur, `manual` comme « Espèces ».
- Calculer l’état après chaque transaction par cumul des paiements de la même mensualité dans l’ordre chronologique (`paid_on`, `created_at`, `id`). Le statut est « Payé » si le cumul atteint le montant dû, sinon « Partiel ». Calculer le reste comme montant dû moins cumul; ne l’afficher que pour « Partiel ».
- Le lot initial contient au plus six paiements. L’historique complet est chargé progressivement par pages pour éviter une requête et une liste non bornées.
- Le changement est en lecture seule et ne modifie aucune écriture financière existante.

## Architecture

- Ajouter une lecture serveur de paiements mensuels au contrat finance existant ou à un contrat dédié, sans casser les résumés agrégés utilisés par les autres onglets.
- L’appel reste derrière une Edge Function authentifiée et une RPC limitée à l’organisation; aucun accès direct nouveau n’est accordé au client mobile.
- Le modèle mobile représente un paiement et son contexte mensuel (membre, mois, statut après paiement, reste éventuel, source et date).
- Ajouter une page d’historique avec pagination; la vue principale affiche les six plus récents et un lien accessible vers cette page.
- Préserver les états de chargement, liste vide, erreur réessayable, ainsi que le bouton WhatsApp.

## Vérification

- pgTAP : isolation par organisation, inclusion des seuls paiements mensuels, ordre et limite des six plus récents, cumul/statut/reste pour paiements partiels et complets, et stabilité du tri en cas d’égalité de date.
- Tests Edge : authentification, validation de pagination, cloisonnement, propagation du contrat et masquage des erreurs internes.
- Tests mobiles : contenu des cartes, affichage conditionnel du reste, libellés `Wave`/`Espèces`, conservation de WhatsApp, lien vers l’historique, pagination, états vide et erreur.
- Typecheck et suite qualité complète; validation manuelle de l’onglet et de l’historique sur téléphone avec des données de test.

## Hors périmètre

- Modifier le formulaire de paiement, les écritures ou les sources financières.
- Ajouter des modes de paiement en dehors de `wave` et `manual`.
- Modifier les totaux du résumé ou les listes des cotisations exceptionnelles et décaissements.

# Variante avec liens de paiement Wave

Cette branche est une copie de la PR #5. Elle remplace, dans l'interface des paramètres Finance, la saisie des clés API par deux liens Wave Business : un pour la mensualité complète et un pour la demi-mensualité. À la création d'une cotisation exceptionnelle, un lien Wave propre à son montant est obligatoire. Le membre sélectionne son versement et ouvre le lien correspondant.

L'administrateur doit créer et vérifier dans Wave un lien distinct pour chaque montant. Les liens de type `https://pay.wave.com/m/M_ci_…/c/ci/?amount=1000` sont acceptés. L'application vérifie que le paramètre `amount` correspond au montant attendu ; cela ne garantit pas le montant réellement encaissé. Le membre doit relire le montant et le bénéficiaire dans Wave avant de confirmer. Si une cotisation exceptionnelle est partiellement réglée, son lien initial est masqué car il ne correspond plus au solde.

Ouvrir le lien ne prouve pas que le paiement a abouti. La comptabilité reste mise à jour par l'administrateur après vérification du paiement reçu. Les anciennes tables et fonctions de clés API sont conservées pour que cette branche reste compatible avec le schéma issu de la PR #5, mais leur configuration n'est plus proposée dans l'interface.

Appliquer la migration `202610120001_wave_payment_links.sql` avant de tester cette variante. Aucun lien réel, identifiant marchand ou secret n'est ajouté au dépôt.

# Récupération du mot de passe

Le même parcours s'applique aux administrateurs et aux membres actifs : **Connexion → Mot de passe oublié ? → numéro → code SMS → nouveau mot de passe → connexion**. Le code comporte six chiffres, expire après dix minutes et est limité en tentatives. Pour éviter l'énumération des comptes, la demande de code répond de la même façon lorsque le numéro est inconnu.

Le serveur vérifie que le numéro appartient à un compte actif de l'association, qu'il s'agisse d'un administrateur ou d'un membre. Les comptes créés directement par un administrateur sont donc éligibles sans demande d'adhésion préalable. Le nouveau mot de passe exige huit caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.

En local, renseigner `OTP_HASH_SECRET` dans le fichier ignoré `supabase/functions/.env`. Pour voir les codes SMS simulés dans le terminal qui exécute `supabase functions serve`, définir `LOCAL_SMS_LOG_CODES=true` ; le code n'est jamais renvoyé à l'application. En production, configurer `DENO_ENV=production` et les secrets `ORANGE_SMS_API_URL`, `ORANGE_SMS_ACCESS_TOKEN` et `ORANGE_SMS_SENDER` pour envoyer de vrais SMS. Les valeurs d'exemple figurent dans `supabase/.env.example`.

Après la modification, l'application efface la connexion biométrique enregistrée et déconnecte la session locale avant de demander une nouvelle connexion. Les autres sessions déjà ouvertes ne sont pas révoquées immédiatement par Supabase ; une révocation globale demanderait un mécanisme de version de session supplémentaire.

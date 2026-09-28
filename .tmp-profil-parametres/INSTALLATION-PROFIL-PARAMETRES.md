# SMMC — profil et paramètres du stock

## Installation

Le dossier `backend` est le projet Django complet, et `frontend` le projet React complet. Intégrez les fichiers dans votre projet après sauvegarde des modifications locales. Ne remplacez pas votre base de données, vos médias ou vos secrets.

```bash
cd backend
python -m pip install -r requirements.txt  # si votre projet dispose déjà de ce fichier
python manage.py migrate
python manage.py check
cd ../frontend
npm ci
npm run build
```

Gardez votre configuration PostgreSQL et vos variables d'environnement habituelles. Il faut une fiche `Personnel` liée au compte Django (`per_user`) pour consulter le profil. Le super administrateur doit être un compte Django `is_superuser=True` et se connecter à `/super-admin/login`.

## Pages et accès

- `/profil`, `/parametres` : responsable du stock ; `/chef/profil`, `/chef/parametres` : chef de département.
- `/super-admin` : création, rôle, désactivation et réinitialisation des comptes ; `/super-admin/parametres` : paramètres globaux, journal et export.
- API : `/api/account/profile/`, `/api/account/photo/`, `/api/account/password/`, `/api/account/preferences/`, `/api/stock/notifications/`, `/api/admin/settings/`, `/api/admin/audit/`, `/api/admin/backup/`.

Les préférences sont dans `Personnel.per_metadata.stock_preferences` sans migration de Personnel. La migration `core.0002_stockconfiguration` crée les réglages globaux. Les changements de mot de passe suivent la politique Django et la longueur globale ; les nouveaux jetons d'accès JWT utilisent la durée configurée. Les jetons déjà délivrés conservent leur échéance.

Le seuil par défaut s'applique aux créations d'articles lorsque le champ n'est pas fourni. Le tableau Articles utilise le nombre de lignes choisi. Les préfixes, la devise et le format de rapport sont stockés comme conventions ; les écrans de saisie existants demandent encore les codes manuellement et les exports existants gardent leur format actuel. Le backend Django utilise un service email console dans la configuration actuelle : l'option email enregistre une préférence, mais un service SMTP et une tâche d'expédition sont nécessaires pour envoyer des messages. Les alertes internes affichent le stock faible et les propres événements d'audit de l'utilisateur.

L'export JSON inclut les tables métier du stock et `StockConfiguration`, mais ne constitue pas une sauvegarde PostgreSQL complète : RH, utilisateurs, fichiers média et autres applications sont exclus. Avant une restauration, créez une sauvegarde PostgreSQL complète, vérifiez les clés étrangères et utilisez `python manage.py loaddata fichier.json` en maintenance sur une base préparée ; aucune restauration destructrice n'est déclenchée depuis l'interface.

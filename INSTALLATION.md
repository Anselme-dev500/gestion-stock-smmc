# SMMC — Espace super administrateur et création des comptes

## Fichiers

- `frontend/` : version complète du frontend, y compris les pages précédentes et les nouvelles routes `/super-admin/login` et `/super-admin`.
- `backend/core/` : ajouter `admin_api.py`, `urls.py`, `authentication.py`, remplacer `serializers.py` et `views.py`.
- `backend/config/urls.py` : remplacer le fichier correspondant pour activer les nouvelles routes.
- Garder `backend/config/settings.py` du projet et vérifier que `AUTHENTICATION_BACKENDS` contient `core.authentication.MatriculeBackend` puis `django.contrib.auth.backends.ModelBackend`.
- Dans l'ancien projet, supprimer/ignorer `core/Authentication.py` avec A majuscule : seul `authentication.py` doit servir au chargement Django.

## Créer le premier compte administrateur

Depuis le dossier `backend` et après les migrations de votre base :

```powershell
python manage.py createsuperuser
python manage.py runserver
```

`createsuperuser` ne demande qu'un nom d'utilisateur et un mot de passe. Il ne crée pas de fiche Personnel. Utiliser ces identifiants sur `/super-admin/login`, et non sur `/login`.

Dans un second terminal :

```powershell
cd frontend
npm install
npm run dev
```

Ouvrir `http://localhost:5173/super-admin/login`. Créer un utilisateur avec le rôle « Responsable stock » ; il pourra ensuite se connecter sur `http://localhost:5173/login` avec son matricule et le mot de passe initial.

Créer une fonction RH depuis Django Admin (`http://127.0.0.1:8000/admin/`) si le choix « Fonction » est vide. Les champs date de naissance, CIN, date d'embauche, contrat et fonction sont requis par le modèle Personnel déjà présent ; le formulaire les recueille sans créer de fausses valeurs.

Le super administrateur peut changer le rôle des comptes stock, désactiver ou réactiver leurs comptes et définir un nouveau mot de passe. Les autres comptes ne peuvent pas appeler ces routes : le contrôle `is_superuser` s'effectue côté Django. Les fiches Personnel déjà enregistrées doivent être rattachées à un compte depuis Django Admin afin d'éviter de les dupliquer.

L'interface utilise les routes JWT `api/auth/login/`, `api/auth/admin-login/`, `api/auth/refresh/` et le préfixe `api/admin/stock-users/`. Les appels sont transmis par le proxy Vite vers Django local. Les autres pages métier ont encore des écarts de contrat API avec l'archive Django et nécessitent une intégration séparée.

Vérifier après copie : `python manage.py check`, `python manage.py makemigrations --check --dry-run`, puis tester la création et la connexion sur votre base de développement. Le présent ajout n'exige pas de nouveau modèle ou migration, mais les changements antérieurs à `rh_service`, `rh_departement` et `stock` doivent être migrés suivant leur état réel avant usage.

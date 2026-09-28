# Interface SMMC — installation

Ce dossier contient le frontend React + Vite modifié. La connexion par matricule envoie `POST /api/auth/login/` avec `{ "matricule": "...", "password": "..." }` et attend les champs JWT `access` et `refresh`. Elle correspond aux trois fichiers backend de la correction d'authentification transmise précédemment.

Sous Windows, lancer le backend Django sur `http://127.0.0.1:8000`, puis dans `frontend` :

```powershell
npm install
npm run dev
```

Ouvrir l'adresse indiquée par Vite, normalement `http://localhost:5173/login`. La configuration Vite transmet `/api` au backend local. Sur un autre poste, adapter `vite.config.ts`.

Fonctions ajoutées : page de connexion responsive, routes protégées, stockage de la session, rafraîchissement automatique du jeton, déconnexion et affichage du nom de l'utilisateur, nouvelle présentation du tableau de bord et style harmonisé pour les pages de stock. Les pages métier fournies restent présentes.

Important : la page de connexion exige qu'un compte Django actif, avec mot de passe, soit lié à une fiche `Personnel` active. Le backend doit exposer la route `/api/auth/login/`. Certaines pages du projet d'origine (`demandes`, `rapports`, `mouvements`) supposent encore des formats d'API différents de ceux de l'archive Django reçue : leurs interactions métier devront être raccordées au backend avant usage en production. La connexion et la présentation n'établissent pas à elles seules ce raccordement.

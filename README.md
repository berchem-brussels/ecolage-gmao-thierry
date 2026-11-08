# GMAO communale

Application de gestion technique de l'Administration communale et du CPAS : demandes d'intervention, réservations de salles et de matériel, suivi des interventions, patrimoine, maintenance préventive, stock et véhicules. Elle remplace la partie technique de l'outil utilisé jusqu'ici. Elle suit le « Standard des applications communales v3.3 » (`STANDARD.md`) ; elle part du gabarit v3 1.1.0 et reprend du gabarit 1.3.0 les modules du standard v3.3 (étape 8 bis). Licence EUPL-1.2.

Version 0.13.0 : photo de l'endroit sur la fiche d'une demande pour le service technique, case « Sans photo » dans Patrimoine, en-tête des téléphones tenu dans 320 px (iPhone et Android), journal d'audit sans code brut ; depuis la 0.12.0, aide par écran (bouton « Aide » sur chaque écran, une fiche par écran en FR et en NL avec ses captures, « ? » à côté de chaque champ, centre d'aide avec recherche et impression, FAQ locale par entité, question résolue transformée en question de la FAQ) ; depuis la 0.11.0, tickets (bouton « Signaler » sur chaque écran, questions sur l'application traitées par le service technique de l'entité, incidents, bugs et souhaits par l'administrateur, écran Tickets, lecture par l'assistant) ; depuis la 0.10.0, connexion Microsoft 365 compatible avec Portal ; depuis la 0.9.0, service technique (tableau de bord, liste filtrée, qualification, échéances et retard) ; photos et PDF joints aux demandes (0.8.0) ; formulaire de demande complet (0.7.0) ; demandes d'intervention numérotées par entité, « Mes demandes » (0.5.0) ; référentiel des demandes (catégories, priorités P1 à P4, délais, calendrier) ; référentiel des lieux avec photos ; administration (paramètres, modules, réglages par entité, journal d'audit, notes de version) ; socle (entités, comptes, rôles par entité, entité active). Le contenu métier arrive étape par étape selon `PLANNING-GMAO.md` (fichiers du projet).

## Structure

| Dossier | Contenu |
| --- | --- |
| `backend/` | Express 4 en JavaScript CommonJS, `sql.js` derrière la couche `prepare()`, API REST, serveur MCP dans le processus |
| `backend/config/` | Défauts de l'instance (`instance.defaut.json`), catalogue des rôles pour l'application Droits (`roles.json`), listes de valeurs et valeurs livrées (`listes-valeurs.json`) |
| `frontend/` | React 18, TypeScript, Vite 5, Ant Design 5 ; `dist/` construit avant livraison et copié par l'image nginx |
| `docs/fr`, `docs/nl`, `docs/en` | Documentation technique (le français fait foi) |
| `docs/fonctionnel/` | Fiches fonctionnelles |

## Développement

```bash
cd backend && npm ci && npm run dev
```

```bash
cd frontend && npm ci && npm run dev
```

L'interface répond sur `http://localhost:5173` et relaie `/api` vers le port 3001. Au premier lancement, l'assistant d'installation demande le nom du pouvoir local, la première entité et le premier administrateur.

## Tests

| Commande | Contenu |
| --- | --- |
| `cd backend && npm test` | API, cloison entre entités, sécurité, MCP, lieux, listes de valeurs et photos, réception des fichiers et pièces jointes, commande de démonstration, portabilité, version |
| `cd frontend && npm test` | Écrans en FR et NL avec audit `axe-core`, traductions, chatbot |
| `cd frontend && npm run build` | Typage puis construction de `dist/` |
| `cd frontend && npm run a11y` | Accessibilité statique |

Les décomptes de chaque version sont dans `MANIFESTE.md`. Sur GitHub, `.github/workflows/ci.yml` (travail `tests`, Node 20) rejoue ces quatre commandes et `npm audit --omit=dev --audit-level=high` du serveur à chaque demande de fusion et à chaque envoi sur `main`.

## Installation et mise à jour

`docs/fr/INSTALLATION.md` pour une première installation, `docs/fr/APRES-DEPLOIEMENT.md` pour chaque version. Les notes de livraison de chaque version donnent les commandes de l'hôte d'acceptance. Dans ce dépôt public, l'adresse, les ports et les dossiers de l'hôte sont des valeurs d'exemple (`192.0.2.10`, ports 18443 et 18080, `/volume1/docker/monapp`) : les valeurs réelles restent hors du dépôt.

## Documentation

`docs/fr/ARCHITECTURE.md`, `EXPLOITATION.md`, `MCP.md`, `SECURITE.md`, `ACCESSIBILITE.md`. Versions néerlandaise et anglaise dans `docs/nl` et `docs/en`.

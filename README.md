# GMAO communale

Application de gestion technique de l'Administration communale et du CPAS : demandes d'intervention, réservations de salles et de matériel, suivi des interventions, patrimoine, maintenance préventive, stock et véhicules. Elle remplace la partie technique de l'outil utilisé jusqu'ici. Elle suit le « Standard des applications communales v3.2 » (`STANDARD.md`) et part du gabarit v3 1.1.0. Licence EUPL-1.2.

Version 0.8.0 (photos et PDF joints aux demandes : réduits et nettoyés, gardés avec le brouillon, visibles sur la fiche, retirés pour de bon ; plafonds par entité ; autres fonctions de la 0.7.5) : socle (entités en données, comptes, rôles par entité, entité active choisie dans l'en-tête), référentiel des lieux (sites, bâtiments, niveaux, locaux par entité, photo d'un lieu, types de lieux en liste de valeurs FR et NL) et administration (paramètres de l'instance, modules activables, réglages par entité, journal d'audit lisible, notes de version) et référentiel des demandes (catégories en arbre avec leurs tuiles, priorités P1 à P4 et délais, calendrier des jours ouvrables et simulateur d'échéance, par entité ; traçabilité « Modifié le … par … » sur chaque fiche et journal limité aux champs changés), et demandes d'intervention (accueil selon le rôle, formulaire Où, Quoi, Description, numérotation par entité `AC-DI-2026-00001`, « Mes demandes », demandes de l'entité en lecture, recherche de lieu sans accents) avec, depuis la 0.7.0, le formulaire complet (demandes ouvertes du même bâtiment et « Moi aussi », case « Danger », « Pour », date souhaitée, brouillon, questions propres à la catégorie, mentions RGPD par entité). Le contenu métier arrive étape par étape selon `PLANNING-GMAO.md` (fichiers du projet).

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

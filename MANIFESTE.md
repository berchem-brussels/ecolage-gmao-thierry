# Manifeste

Version de l'application : **0.7.5** · Mis à jour le 29/10/2026

Fichiers changés, dépendances et suites par version. Les décomptes sont recopiés de la sortie des commandes.

## 0.7.5 (29/10/2026)

Fichiers comparés à l'archive 0.7.4 par `diff -rq` (hors `node_modules` et `dist`). Pour le contrôle du `git status` (`GITHUB.md`, section 5) : aucune ligne `D` attendue ; deux lignes `A`, les autres `M`.

- Nouveaux : `backend/tests/lieux-recents.test.js` ; `NOTES_LIVRAISON_v0.7.5.md`.
- Modifiés, serveur : `src/services/demandes.js` (`lieuxRecents`) ; `src/services/session.js` (`lieux_recents` du profil) ; `src/mcp.js` (instructions du client) ; `config/notes-version.json` (note 0.7.5) ; `tests/notes-version.test.js` (listes décalées d'une note, un test nouveau) ; `package.json` (numéro ; `lieux-recents.test.js` ajouté au script `test`) ; `package-lock.json` (numéro seulement).
- Modifiés, interface : `src/components/demandes/LieuPicker.tsx` (« Vos lieux récents ») ; `src/contexts/AuthContext.tsx` (type du profil) ; `src/pages/LoginPage.tsx` (bandeau effacé) ; `src/pages/JournalPage.tsx` (« Oui » et « Non », champs vides masqués) ; `src/i18n.ts` (`demande.lieu.recents`, `audit.aucun`, rubriques d'aide) ; `src/test/pages.test.tsx` et `src/test/demandes.test.tsx` (trois tests nouveaux, un test renforcé) ; `package.json` et `package-lock.json` (numéro seulement). `frontend/dist/` reconstruit.
- Modifiés, documentation : `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md` ; `docs/fr`, `docs/nl`, `docs/en` (`SECURITE.md`, section 0.7.5) ; `docs/fonctionnel/demandes.md` (règle 29), `docs/fonctionnel/administration.md` (règle 12).
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`, `.gitignore`, `.github/workflows/ci.yml`. Aucune migration, aucune route, aucun outil MCP nouveau.
- Retirés : aucun fichier.
- Dépendances : aucune dépendance nouvelle ; verrous inchangés hors numéro de version. Aucun `npm audit fix`.
- Suites (Node 22.23.4, bac à sable, après `npm ci`) : serveur `npm test` 309 tests, 309 réussis, 0 échec, 0 sauté (300 en 0.7.4) ; interface `npm test` 4 fichiers, 132 tests, 132 réussis sur trois lancements consécutifs ; `npm run build` réussi ; `npm run a11y` 0 erreur.
- Parcours du travail `tests` (`ci.yml`) rejoué sous Node 20.20.2 sur une copie ne contenant que les fichiers que Git verse : voir `ETAT.md`, section 2.
- `npm audit --omit=dev` : serveur 0 vulnérabilité ; interface 3 modérées (E-09), inchangées.
- Preuves d'échec : `docs/fr/SECURITE.md`, section 0.7.5.
- Images Docker : non reconstruites dans le bac à sable ; les deux images changent (code du serveur, `frontend/dist/`).

## 0.7.4 (29/10/2026)

Fichiers comparés à l'archive 0.7.3 par `diff -rq` (hors `node_modules` et `dist`). Pour le contrôle du `git status` (`GITHUB.md`, section 5) : aucune ligne `D` attendue ; deux lignes `A`, les autres `M`.

- Nouveaux : `backend/tests/journal-noms.test.js` ; `NOTES_LIVRAISON_v0.7.4.md`.
- Modifiés, serveur : `src/services/journal.js` (`noms` par chemin du détail, deux requêtes constantes par page, `json_each(?)`) ; `src/mcp.js` (description FR et NL de `get_audit`) ; `config/notes-version.json` (note 0.7.4, une ligne pour l'administrateur) ; `tests/notes-version.test.js` (tests de la 0.7.2 et de la 0.7.3 décalés d'une note, un test nouveau pour la 0.7.4) ; `package.json` (numéro de version ; `journal-noms.test.js` ajouté au script `test`) ; `package-lock.json` (numéro seulement).
- Modifiés, interface : `src/pages/JournalPage.tsx` (noms du lieu et de la catégorie, valeur composée champ par champ) ; `src/i18n.ts` (16 clés `audit.detail.*` et `audit.introuvable`, rubrique `help.guide.journal`) ; `src/test/pages.test.tsx` (deux lignes de journal de plus dans la maquette, deux tests nouveaux FR et NL, décompte d'un test existant) ; `package.json` et `package-lock.json` (numéro seulement). `frontend/dist/` reconstruit.
- Modifiés, documentation : `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` (E-32 et E-33 recopiés du projet) ; `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md` ; `docs/fr`, `docs/nl`, `docs/en` (`SECURITE.md`, section 0.7.4) ; `docs/fonctionnel/administration.md` (écran du journal, règle 12).
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`, `.gitignore`, `.github/workflows/ci.yml`. Aucune migration, aucune route, aucun outil MCP nouveau.
- Retirés : aucun fichier.
- Dépendances : aucune dépendance nouvelle ; verrous inchangés hors numéro de version. Aucun `npm audit fix`.
- Contrôle DV-09 de la séance, avant toute modification : archive 0.7.3 conforme à `ETAT.md` (2 230 587 octets, 352 entrées, SHA-256 `44b472fd…823bc`) ; serveur 293/293 ; `npm audit --omit=dev` du serveur 0 ; interface 127/127 sur trois lancements consécutifs ; construction et accessibilité 0 erreur. Aucun test instable.
- Suites (Node 22.23.4, bac à sable, après `npm ci`) : serveur `npm test` 300 tests, 300 réussis, 0 échec, 0 sauté (293 en 0.7.3) ; interface `npm test` 4 fichiers, 129 tests, 129 réussis sur trois lancements consécutifs ; `npm run build` réussi ; `npm run a11y` 0 erreur.
- Parcours du travail `tests` (`ci.yml`) rejoué sous Node 20.20.2 sur une copie ne contenant que les fichiers que Git verse : voir `ETAT.md`, section 2.
- `npm audit --omit=dev` : serveur 0 vulnérabilité ; interface 3 modérées (E-09), inchangées.
- Preuves d'échec : `docs/fr/SECURITE.md`, section 0.7.4.
- Images Docker : non reconstruites dans le bac à sable ; les deux images changent (code du serveur, `frontend/dist/`).

## 0.7.3 (29/10/2026)

Fichiers comparés à l'archive 0.7.2 par `diff -rq` (hors `node_modules` et `dist`). Pour le contrôle du `git status` (`GITHUB.md`, section 5) : aucune ligne `D` attendue ; deux lignes `A`, les autres `M`.

- Nouveaux : `backend/tests/dependances.test.js` ; `NOTES_LIVRAISON_v0.7.3.md`.
- Modifiés, serveur : `package-lock.json` (numéro de version ; `body-parser` 1.20.9, `fast-uri` 3.1.9, `qs` 6.16.2, aucun autre paquet) ; `package.json` (numéro de version ; `dependances.test.js` ajouté au script `test`) ; `config/notes-version.json` (note 0.7.3, une ligne pour l'administrateur) ; `tests/notes-version.test.js` (test de la 0.7.2 adapté, un test nouveau pour la 0.7.3).
- Modifiés, interface : `package.json` et `package-lock.json` (numéro seulement). `frontend/dist/` reconstruit, identique à celui de la 0.7.2 (`diff -rq` vide).
- Modifiés, documentation : `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md` ; `docs/fr`, `docs/nl`, `docs/en` (`SECURITE.md`, section 0.7.3).
- Inchangés : tout le code du serveur et de l'interface ; les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`, `.gitignore`, `.github/workflows/ci.yml`. Aucune migration, aucune route, aucun outil MCP.
- Retirés : aucun fichier.
- Dépendances : aucune dépendance nouvelle ; `package.json` inchangé hors numéro et script de test ; verrou du serveur mis à jour par `npm update body-parser qs fast-uri --no-save` (diff du verrou : ces trois paquets seulement). Aucun `npm audit fix`.
- Contrôle DV-09 de la séance, avant toute modification : archive 0.7.2 conforme à `ETAT.md` (2 225 863 octets, 350 entrées, SHA-256 `6f947ca8…a05fd8`) ; serveur 290/290 ; interface 127/127 sur trois lancements consécutifs. Aucun test instable.
- Suites (Node 22.23.4, bac à sable, après `npm ci`) : serveur `npm test` 293 tests, 293 réussis, 0 échec, 0 sauté (290 en 0.7.2) ; interface `npm test` 4 fichiers, 127 tests, 127 réussis sur trois lancements consécutifs ; `npm run build` réussi ; `npm run a11y` 0 erreur.
- `npm ls --depth=0` du serveur après la mise à jour (STANDARD.md, section 4.4) : `ajv` 8.20.0, `ajv-formats` 3.0.1, `bcryptjs` 3.0.3, `express` 4.22.3, `express-rate-limit` 8.7.1, `sql.js` 1.14.2, inchangés ; `npm ls --omit=dev` sans erreur ; aucune dépendance de développement au serveur.
- Parcours du travail `tests` (`ci.yml`) rejoué sous Node 20.20.2 sur une copie ne contenant que les 221 fichiers que Git verse : serveur 293/293, `npm audit --omit=dev --audit-level=high` **sortie 0** ; interface 127/127, construction et accessibilité 0 erreur.
- Recherche sur les fichiers versés : aucune occurrence de l'adresse, des ports ni du dossier de NIXUS ; seul `.env.example` en `.env` ; aucune base, aucun `dist/`.
- `npm audit --omit=dev` : serveur 0 vulnérabilité (1 haute et 2 modérées en 0.7.2) ; interface 3 modérées (E-09), inchangées.
- Preuves d'échec : `docs/fr/SECURITE.md`, section 0.7.3.
- Images Docker : non reconstruites dans le bac à sable ; l'image du serveur change (`npm ci` avec le nouveau verrou), celle de l'interface non.

## 0.7.2 (29/10/2026)

Fichiers comparés à l'archive 0.7.1 par `diff -rq` (hors `node_modules` et `dist`). Pour le contrôle du `git status` (`GITHUB.md`, section 5) : aucune ligne `D` attendue.

- Nouveaux : `.github/workflows/ci.yml` (section 7 de `GITHUB.md`, à l'identique) ; `NOTES_LIVRAISON_v0.7.2.md`.
- Modifiés, dépôt : `.gitignore` (complété) ; `CONTRIBUTING.md` (tests sur GitHub, ce qui n'entre jamais dans le dépôt).
- Modifiés, serveur : `config/notes-version.json` (note 0.7.2, une ligne pour l'administrateur) ; tests `notes-version.test.js` (un test nouveau ; la note de la version installée est lue par l'administrateur) et `portabilite.test.js` (motif élargi à toute adresse IPv4 privée) ; `package.json` et `package-lock.json` (numéro seulement).
- Modifiés, interface : `src/test/pages.test.tsx` (adresse d'exemple au lieu d'une adresse professionnelle) ; `package.json` et `package-lock.json` (numéro seulement). `frontend/dist/` reconstruit, identique à celui de la 0.7.1 (`diff -rq` vide).
- Valeurs d'exemple à la place de l'adresse, des ports et des dossiers de NIXUS (DV-70) : `verifier-ports.sh` (commentaire d'usage seulement), `STANDARD.md` (copie, avertissement en tête), `ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `NOTES_LIVRAISON_v0.1.0.md` à `NOTES_LIVRAISON_v0.7.1.md` ; `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md`, `docs/fr/SECURITE.md`, `docs/nl/APRES-DEPLOIEMENT.md`, `docs/en/APRES-DEPLOIEMENT.md`.
- Modifiés, documentation : `README.md`, `README.nl.md`, `README.en.md`, `MANIFESTE.md` ; `docs/fr`, `docs/nl`, `docs/en` (`SECURITE.md`, section 0.7.2).
- Inchangés : tout le code du serveur et de l'interface hors tests et note de version ; les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh` (son chemin de sauvegarde par défaut, modèle `/volume1/backups/<APP_NAME>`, est gardé pour ne pas changer le comportement sur NIXUS). Aucune migration, aucune route, aucun outil MCP. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun fichier.
- Dépendances : aucune dépendance nouvelle ; verrous inchangés hors numéro de version. Aucun `npm audit fix`.
- Contrôle DV-09 de la séance, avant toute modification : archive 0.7.1 conforme à `ETAT.md` (2 217 438 octets, 346 entrées, SHA-256 `fcd49592…cdeda7`) ; serveur 289/289 ; interface 127/127 sur trois lancements consécutifs ; construction et accessibilité 0 erreur. Aucun test instable.
- Suites (Node 22.23.4, bac à sable, après `npm ci`) : serveur `npm test` 290 tests, 290 réussis, 0 échec, 0 sauté (289 en 0.7.1) ; interface `npm test` 4 fichiers, 127 tests, 127 réussis sur trois lancements consécutifs ; `npm run build` réussi ; `npm run a11y` 0 erreur.
- Parcours du travail `tests` (`ci.yml`) rejoué sous Node 20.20.2 sur une copie ne contenant que les 220 fichiers que Git verse (`git add -A` avec le nouveau `.gitignore`, sans `.env`, base, `node_modules` ni `dist/`) : serveur 290/290, `npm audit --omit=dev --audit-level=high` **sortie 1** (E-24, E-30) ; interface 127/127, construction et accessibilité 0 erreur.
- Recherche sur les fichiers versés : aucune occurrence de l'adresse, des ports ni du dossier de NIXUS ; aucun motif de secret ; aucun `.env`, aucune base, aucun `dist/`.
- `npm audit --omit=dev` : serveur 1 haute et 2 modérées, inchangées (E-24) ; interface 3 modérées (E-09).
- Preuves d'échec : `docs/fr/SECURITE.md`, section 0.7.2.
- Images Docker : non reconstruites dans le bac à sable ; seul `config/notes-version.json` change dans l'image du serveur.

## 0.7.1 (28/10/2026)

Fichiers comparés à l'archive 0.7.0 (hors `node_modules` et `dist`).

- Nouveau : `NOTES_LIVRAISON_v0.7.1.md`.
- Modifiés, serveur : `src/schemas.js` (`brouillonSave` : `nature` permise dans le lieu) ; `config/parametres-entite.json` (mentions complètes FR et NL livrées) ; `config/notes-version.json` (note 0.7.1) ; tests `formulaire.test.js` (un test nouveau, trois attentes de texte) et `notes-version.test.js` (un test nouveau, listes et rangs décalés d'une note).
- Modifiés, interface : `pages/NouvelleDemandePage.tsx` (lieu du brouillon réduit aux champs connus) ; `test/demandes.test.tsx` (lieu proposé avec sa nature, champs envoyés comparés à l'identique) ; `frontend/dist/`.
- Modifiés, documentation : `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr/APRES-DEPLOIEMENT.md`, `ARCHITECTURE.md`, `EXPLOITATION.md`, `MCP.md`, `SECURITE.md` ; `docs/nl` et `docs/en` (`APRES-DEPLOIEMENT.md`, `MCP.md`, `SECURITE.md`) ; `docs/fonctionnel/demandes.md` (règle 28), `docs/fonctionnel/administration.md` (règle 11).
- Les deux `package.json` et verrous : numéro de version seulement.
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`, `verifier-ports.sh`. Aucune migration, aucune route, aucun outil MCP nouveaux. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun fichier.
- Dépendances : aucune dépendance nouvelle ; aucun `npm audit fix`.
- Suites (Node 22.23.4, bac à sable, `node_modules` de la séance, verrous inchangés hors numéro) : serveur `npm test` 289 tests, 289 réussis, 0 échec, 0 sauté (287 en 0.7.0) ; interface `npm test` 4 fichiers, 127 tests, 127 réussis sur trois lancements consécutifs ; `npm run build` réussi ; `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 1 haute et 2 modérées, inchangées (E-24) ; interface 3 modérées (E-09).
- Preuves d'échec : `docs/fr/SECURITE.md`, section 0.7.1.
- Contrôle visuel (Chromium, gabarit iPhone 13, interface construite servie par `vite preview` avec relais de `/api`, API réelle sur une base jetable avec les comptes et lieux de démonstration) : `agent.ac` avec un lieu de travail habituel ; « Nouvelle demande » sans changer de lieu, description tapée : « Brouillon enregistré à 15:29 » sous le bouton ; brouillon relu sur le serveur avec le lieu ; page rechargée, « Reprendre » remet la description ; « En savoir plus » : « Responsable du traitement : Administration communale. Les données de cette demande servent… ». Script Playwright hors suite.
- Images Docker : non reconstruites dans le bac à sable ; aucun fichier de l'image changé, `dist/` reconstruit.

## 0.7.0 (28/10/2026)

Fichiers comparés à l'archive 0.5.2 (hors `node_modules` et `dist`), en neuf points (0 à 7, avec 6 bis) et quatre archives de travail (`gmao-v0_7_0-travail-p4`, `p5`, `p6`, `p6bis`).

- Nouveaux : serveur `src/services/brouillons.js`, `src/services/questions-categorie.js`, `src/routes/questions-categorie.js`, tests `voisines.test.js` et `formulaire.test.js` (ajoutés à `npm test`) ; interface `components/demandes/DemandesVoisines.tsx`, `ComplementsDemande.tsx`, `QuestionsCategorie.tsx`, `components/referentiel/QuestionsFiche.tsx`, `couleurs.ts`, `test/couleurs.test.tsx` ; `NOTES_LIVRAISON_v0.7.0.md`.
- Modifiés, serveur : `src/database.js` (migration 006, valeurs livrées des questions), `src/schemas.js`, `src/i18n-server.js` (douze codes), `src/mcp.js`, `src/app.js`, `src/audit.js`, `src/routes/demandes.js`, `src/routes/categories.js`, `src/routes/public.js`, `src/services/demandes.js`, `src/services/categories.js`, `src/services/entites.js`, `src/services/session.js`, `src/services/parametres-entite.js` ; `config/categories.json` (questions livrées), `config/parametres-entite.json` (groupe `rgpd`), `config/notes-version.json` (note 0.7.0) ; `package.json` et `package-lock.json` (numéro) ; tests `cloison.test.js`, `demandes.test.js`, `categories.test.js`, `numerotation.test.js`, `parametres.test.js`, `parametres-entite.test.js`, `mcp.test.js`, `notes-version.test.js`.
- Modifiés, interface : `App.tsx` (rouge du thème), `components/ErreurObligatoire.tsx`, `ReglagesForm.tsx` (type `texte_long`), `components/demandes/TuilesCategories.tsx`, `components/referentiel/CategoriesTab.tsx`, `contexts/AuthContext.tsx`, `pages/NouvelleDemandePage.tsx`, `DemandesPage.tsx`, `HelpPage.tsx`, `ReglagesEntitePage.tsx`, `demandes.ts`, `referentiel.ts`, `i18n.ts`, `index.css` ; tests `demandes.test.tsx`, `pages.test.tsx`, `i18n.test.ts` ; `package.json` et `package-lock.json` (numéro) ; `dist/` reconstruit.
- Modifiés, documentation : `README.md`, `README.nl.md`, `README.en.md` ; `docs/fr`, `docs/nl`, `docs/en` (`APRES-DEPLOIEMENT.md`, `ARCHITECTURE.md`, `EXPLOITATION.md`, `MCP.md`, `SECURITE.md`, `ACCESSIBILITE.md`) ; `docs/fonctionnel/demandes.md`, `referentiel-demandes.md`, `administration.md` ; `ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `MANIFESTE.md`.
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`, `verifier-ports.sh`. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun fichier.
- Dépendances : aucune dépendance nouvelle ; verrous inchangés hors numéro de version. Aucun `npm audit fix`.
- Contrôles DV-09 : sur l'archive 0.5.2 (serveur 238, interface 95 ×3) au début de l'étape ; sur `gmao-v0_7_0-travail-p4.tar.gz` (2 112 711 octets, 337 entrées, SHA-256 `b5419fb4…63820` ; serveur 266, interface 111 ×3) au début de la séance du 28/10/2026 ; construction et accessibilité 0 erreur.
- Suites (Node 22.23.4, bac à sable, après `rm -rf node_modules && npm ci`) : serveur `npm test` 287 tests, 287 réussis, 0 échec, 0 sauté (238 en 0.5.2) ; interface `npm test` 4 fichiers, 127 tests, 127 réussis sur trois lancements consécutifs (95 en 0.5.2) ; `npm run build` et `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 1 haute (`body-parser`) et 2 modérées (`fast-uri`, `qs`, nouvel avis sans changement du verrou) (E-24) ; interface 3 modérées (E-09) ; audit complet de l'interface : 1 basse, 7 modérées, 6 hautes, outillage (E-18).
- Preuves d'échec des nouveaux tests : `docs/fr/SECURITE.md`, section 0.7.0.
- Contrôle visuel (Chromium, interface construite servie par `vite preview` avec relais de `/api`, API réelle sur une base jetable : AC, CPAS, 21 comptes, 31 lieux de démonstration) : à 1280 et 360 px, gabarits Galaxy S9+ (FR) et iPhone 13 (NL), thèmes clair et sombre ; demandes voisines et « Moi aussi », danger, « Pour », calendrier, brouillon, questions (fiche du responsable, aperçu, formulaire, fiche du gestionnaire), mentions et aide, rouge des erreurs, note de version ; aucun défilement horizontal. Corrections faites pendant ces contrôles : voir `docs/fr/SECURITE.md` et les notes de livraison.
- Migration : `006_demandes_formulaire` appliquée sur une base neuve (`[DB] Migration 006_demandes_formulaire appliquée`, `[APP] API 0.7.0`) et sur une base 0.3.1 par le test de migration de `categories.test.js` (migrations 004 à 006, questions livrées à chaque entité active, pas de relance). Images Docker non reconstruites : aucun fichier de l'image changé.

## 0.5.2 (27/10/2026)

Fichiers comparés à l'archive 0.5.1 par `diff -rq` (hors `node_modules` et `dist`).

- Nouveau : `NOTES_LIVRAISON_v0.5.2.md`.
- Modifiés : `backend/config/notes-version.json` (note 0.5.2) ; `backend/tests/notes-version.test.js` ; `frontend/src/pages/NouvelleDemandePage.tsx` (boutons de suite dans un `Space wrap`), `index.css` (champs en 16 px jusqu'à 768 px), `validation.ts` (`courriel(t)`), `i18n.ts` (`form.courriel` ; `parametres.courriel.invalide` retiré), `pages/UsersPage.tsx`, `LoginPage.tsx` (assistant d'installation et connexion), `components/ReglagesForm.tsx` (contact de l'entité), `test/demandes.test.tsx`, `test/pages.test.tsx` ; `frontend/dist/` ; les deux `package.json` et verrous (version seulement) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (APRES-DEPLOIEMENT, ARCHITECTURE, EXPLOITATION, MCP, SECURITE) ; `docs/fonctionnel/demandes.md` (règles 16 et 17).
- Inchangés : tout le code du serveur hors note de version et numéro ; `frontend/index.html` (balise `viewport` sans `maximum-scale`) ; les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`. Aucune migration. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun fichier.
- Dépendances : aucune dépendance nouvelle ; verrous inchangés hors numéro de version. Aucun `npm audit fix`.
- Contrôle DV-09 de la séance, avant toute modification (point 0) : archive 0.5.1 conforme à `ETAT.md` (2 115 640 octets, 331 entrées, SHA-256 `66914a27…c423ee10`), fichiers de suivi de l'archive au numéro 0.5.1 ; serveur 237/237 ; interface 89/89 sur trois lancements consécutifs ; construction et accessibilité 0 erreur. Aucun test instable.
- Suites (Node 22.23.4, bac à sable, après `rm -rf node_modules && npm ci`) : serveur `npm test` 238 tests, 238 réussis, 0 échec, 0 sauté (237 en 0.5.1) ; interface `npm test` 3 fichiers, 95 tests, 95 réussis sur trois lancements consécutifs (89 en 0.5.1) ; `npm run build` (`tsc -b` puis `vite build`) réussi ; `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 1 haute (`body-parser`) et 1 modérée (`fast-uri`), inchangées (E-24) ; interface 3 modérées (E-09) ; audit complet de l'interface : 1 basse, 7 modérées, 6 hautes, outillage (E-18).
- Preuves d'échec des nouveaux tests : `docs/fr/SECURITE.md`, section 0.5.2 (5 échecs sur 95 avec les sept fichiers de la 0.5.1 ; 8 sur 238 côté serveur sans la note).
- Contrôle visuel (Chromium, interface construite servie par `vite preview` avec relais de `/api`, API réelle sur une base jetable avec l'AC, le CPAS, les 21 comptes et les 31 lieux de démonstration) : `agent.ac` à 360 px, gabarits Galaxy S9+ et iPhone 13 : demande envoyée, écart mesuré de 12 px entre les deux boutons, aucun défilement horizontal ; administrateur, iPhone 13 et Galaxy S9+ : tous les champs visibles à 16 px sur la connexion, la nouvelle demande, les utilisateurs, le journal, les réglages de l'entité et le patrimoine, 14 px inchangés à 1280 px, journal sans défilement horizontal ; Galaxy S9+ : sous l'adresse e-mail, un seul message dans chaque cas (vide, espaces, vidée, mal formée), à la connexion et dans Utilisateurs et rôles. Le zoom de Safari ne se reproduit pas dans Chromium : à confirmer sur un iPhone à la recette. Script Playwright hors suite.
- Images Docker : non reconstruites dans le bac à sable ; aucun fichier de l'image ni migration changés, `dist/` reconstruit.

## 0.5.1 (26/10/2026)

Fichiers comparés à l'archive 0.5.0 par `diff -rq` (hors `node_modules` et `dist`).

- Nouveaux : `frontend/src/validation.ts` (règles communes des champs obligatoires), `frontend/src/components/ErreurObligatoire.tsx` ; `NOTES_LIVRAISON_v0.5.1.md`.
- Modifiés : `backend/config/notes-version.json` (note 0.5.1) ; `backend/tests/notes-version.test.js` ; `frontend/src/components/demandes/LieuPicker.tsx` (liste refermable), `pages/DemandesPage.tsx` (bouton en double retiré), `pages/NouvelleDemandePage.tsx` (description), `components/PasswordModal.tsx`, `ReglagesForm.tsx`, `components/referentiel/CalendrierTab.tsx`, `CategoriesTab.tsx`, `PrioritesTab.tsx`, `SimulateurTab.tsx`, `pages/EntitesPage.tsx`, `ListesValeursPage.tsx`, `LoginPage.tsx`, `PatrimoinePage.tsx`, `UsersPage.tsx` (règles communes, message sous les motifs), `i18n.ts` (`form.obligatoire`, libellés de la liste, aide ; `parametres.required` et `lieux.field.type.required` retirés), `test/demandes.test.tsx`, `test/pages.test.tsx` ; `frontend/dist/` ; les deux `package.json` et verrous (version seulement) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (APRES-DEPLOIEMENT, ARCHITECTURE, EXPLOITATION, MCP, SECURITE) ; `docs/fonctionnel/demandes.md`.
- Inchangés : tout le code du serveur hors note de version et numéro ; les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`. Aucune migration. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun fichier.
- Dépendances : aucune dépendance nouvelle ; verrous inchangés hors numéro de version. Aucun `npm audit fix`. Mise à jour ciblée du verrou du serveur (E-24) retirée de la version, faute d'accord de Renaud.
- Contrôle DV-09 de la séance, avant toute modification (point 0) : archive 0.5.0 conforme à `ETAT.md` (2 106 029 octets, 327 entrées, SHA-256 `8e725d98…2d2c968`), fichiers de suivi de l'archive au numéro 0.5.0 ; serveur 236/236 ; interface 81/81 sur trois lancements consécutifs ; construction et accessibilité 0 erreur. Aucun test instable.
- Suites (Node 22.23.4, bac à sable, après `rm -rf node_modules && npm ci`) : serveur `npm test` 237 tests, 237 réussis, 0 échec, 0 sauté (236 en 0.5.0) ; interface `npm test` 3 fichiers, 89 tests, 89 réussis sur trois lancements consécutifs (81 en 0.5.0) ; `npm run build` (`tsc -b` puis `vite build`) réussi ; `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 1 haute (`body-parser`) et 1 modérée (`fast-uri`), inchangées (E-24) ; interface 3 modérées (E-09) ; audit complet de l'interface : 1 basse, 7 modérées, 6 hautes, outillage (E-18).
- Preuves d'échec des nouveaux tests : `docs/fr/SECURITE.md`, section 0.5.1 (9 échecs sur 89 avec les sept écrans de la 0.5.0).
- Contrôle visuel (Chromium, interface construite servie avec relais de `/api`, API réelle sur une base jetable avec l'AC, le CPAS, les 21 comptes et les 31 lieux de démonstration), `agent.ac` à 1280 px (FR), 360 px (FR), gabarits iPhone 13 (NL) et Galaxy S9+ (FR) : liste des bâtiments ouverte (`aria-expanded` vrai), refermée par « Masquer la liste » avec le focus rendu au bouton, rouverte puis refermée par « Parcourir » ; « Ce champ est obligatoire » sous une description faite d'espaces ; « Mes demandes » sans bouton dans la page (deux boutons « Nouvelle demande » sur grand écran, en-tête et menu ; un sur téléphone, le menu étant replié) ; aucun défilement horizontal. `responsable.cpas`, Listes de valeurs : libellé fait d'espaces, deux messages « Ce champ est obligatoire », aucun « Données invalides », rien envoyé. Script Playwright hors suite.
- Images Docker : non reconstruites dans le bac à sable ; aucun fichier de l'image ni migration changés, `dist/` reconstruit.

## 0.5.0 (26/10/2026)

Fichiers comparés à l'archive 0.4.1 par `diff -rq` (hors `node_modules` et `dist`).

- Nouveaux : `backend/src/nettoyage-espaces.js`, `routes/demandes.js`, `services/demandes.js`, `services/numerotation.js` ; `backend/tests/espaces.test.js`, `numerotation.test.js`, `demandes.test.js`, `recherche-lieux.test.js` ; `frontend/src/demandes.ts`, `pages/NouvelleDemandePage.tsx`, `pages/DemandesPage.tsx`, `components/LieuHabituelModal.tsx`, `components/demandes/LieuPicker.tsx`, `components/demandes/TuilesCategories.tsx`, `test/demandes.test.tsx` ; `docs/fonctionnel/demandes.md` ; `NOTES_LIVRAISON_v0.5.0.md`.
- Modifiés : `backend/config/modules.json` (`demandes` disponible), `notes-version.json` (note 0.5.0), `parametres-entite.json` (groupe `numerotation`), `roles.json` (`demandes:creer`, `demandes:entite`) ; `backend/src/app.js`, `database.js` (migration `005_demandes` avec étape JavaScript), `i18n-server.js`, `mcp.js` (outils, nettoyage des arguments), `schemas.js`, `validation.js` (`nettoyer()`), `routes/auth.js` (`PUT /api/auth/lieu-habituel`), `services/lieux.js` (recherche sans accents, chemin), `parametres-entite.js` (types `choix` et `motif`), `session.js` (`lieu_propose`), `users.js` (`lieu_habituel_id`) ; `backend/tests/categories.test.js`, `cloison.test.js`, `mcp.test.js`, `modules.test.js`, `notes-version.test.js`, `parametres-entite.test.js`, `parametres.test.js` ; `backend/package.json` (liste des suites, version) ; `frontend/src/App.tsx`, `moduleMap.ts`, `components/AppLayout.tsx`, `ReglagesForm.tsx`, `contexts/AuthContext.tsx`, `i18n.ts`, `index.css`, `pages/HelpPage.tsx`, `HomePage.tsx`, `ReglagesEntitePage.tsx`, `test/i18n.test.ts`, `test/pages.test.tsx` ; `frontend/dist/` ; les deux `package.json` et verrous (version seulement) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (APRES-DEPLOIEMENT, ARCHITECTURE, EXPLOITATION, MCP, SECURITE).
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun.
- Dépendances : aucune dépendance nouvelle ; verrous inchangés hors numéro de version. Aucun `npm audit fix`.
- Contrôle DV-09 de la séance, avant toute modification : archive 0.4.1 conforme à `ETAT.md` (2 028 553 octets, 304 entrées, SHA-256 `ba0f9582…ef2caa61`) ; serveur 193/193 ; interface 63/63 sur trois lancements consécutifs ; construction et accessibilité 0 erreur. Aucun test instable : pas de point 0.
- Suites (Node 22.23.4, bac à sable, après `rm -rf node_modules && npm ci`) : serveur `npm test` 236 tests, 236 réussis, 0 échec, 0 sauté (193 en 0.4.1) ; interface `npm test` 3 fichiers, 81 tests, 81 réussis (63 en 0.4.1) ; `npm run build` (`tsc -b` puis `vite build`) réussi ; `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 1 haute (`body-parser`) et 1 modérée (`fast-uri`), avis publiés après la 0.4.1, verrou inchangé (écart E-24) ; interface 3 modérées (E-09) ; audit complet de l'interface : 1 basse, 7 modérées, 6 hautes, outillage (E-18).
- Preuves d'échec des nouveaux tests : `docs/fr/SECURITE.md`, section 0.5.0.
- Contrôle visuel (Chromium, interface construite servie avec relais de `/api`, API réelle sur une base jetable avec l'AC, le CPAS, les 21 comptes et les 31 lieux de démonstration) : dépôt complet par `agent.ac` à 1280 px (FR), 768 px (NL), 360 px (FR), gabarits iPhone 13 (NL) et Galaxy S9+ (FR) : numéros `AC-DI-2026-00001` à `00010`, recherche sans accent (« rez chaussee », « gelijkvloers »), bouton d'envoi actif une fois les trois blocs remplis, aucun défilement horizontal ; `gestionnaire.ac` voit 10 demandes, `gestionnaire.cpas` aucune. Corrigés pendant le contrôle : compteur de caractères qui recouvrait l'aide sur téléphone, bouton de l'assistant qui masquait l'envoi, titre « Mes demandes en cours » collé à « Tout voir ». Script Playwright hors suite.
- Images Docker (bac à sable, Docker 29.9.2, images de base prises sur `mirror.gcr.io`, Dockerfile de test avec le certificat du proxy, non livrés) : 0.4.1 d'origine installée par son assistant (AC), entité CPAS, commande de démonstration (21 comptes, 31 lieux) ; sous la 0.4.1, domaine « Mobilier » du CPAS renommé « Mobilier␣ » par l'API (espace finale enregistrée). Mise à jour vers la 0.5.0 sur les mêmes volumes : `[DB] Espaces retirés sur 1 fiche(s)`, `[DB] Migration 005_demandes appliquée`, `[APP] API 0.5.0`, `/api/version` 0.5.0 à travers nginx ; « Mobilier » sans espace, trace de la 0.4.1 gardée, journal `systeme.espaces` `{"avant":{"libelle_fr":"Mobilier "},"apres":{"libelle_fr":"Mobilier"}}` canal `cli` ; demande déposée par `agent.ac` à travers nginx : `AC-DI-2026-00001`, description sans espaces autour, délai annoncé ; `gestionnaire.cpas` 0 demande, `gestionnaire.ac` 1 ; CSP servie sur `/demandes/nouvelle` ; `id -u` 10001 ; `backup.sh` : sauvegarde de la base. Retour à la 0.4.1 sur la même base : `healthy`, `/api/version` 0.4.1, aucune migration ; puis retour à la 0.5.0 sans migration, la demande toujours là.

## 0.4.1 (23/10/2026)

Fichiers comparés à l'archive 0.4.0 par `diff -rq` (hors `node_modules` et `dist`).

- Nouveaux : `backend/src/services/trace.js` ; `backend/tests/journal-diff.test.js`, `trace.test.js` ; `frontend/src/components/referentiel/TraceFiche.tsx` ; `NOTES_LIVRAISON_v0.4.1.md`.
- Modifiés : `backend/config/notes-version.json` (note 0.4.1) ; `backend/src/audit.js` (`changements()`), `services/categories.js`, `calendrier.js`, `priorites.js` (trace, journal des champs changés), `services/lieux.js`, `listes-valeurs.js`, `entites.js` (journal des champs changés) ; `backend/tests/notes-version.test.js` ; `backend/package.json` (liste des suites, version) ; `frontend/src/components/referentiel/SimulateurTab.tsx`, `CategoriesTab.tsx`, `CalendrierTab.tsx`, `PrioritesTab.tsx`, `referentiel.ts` (type `Trace`), `i18n.ts`, `index.css`, `pages/HelpPage.tsx` (question 15), `test/i18n.test.ts`, `test/pages.test.tsx` ; `frontend/dist/` ; les deux `package.json` et verrous (version) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (APRES-DEPLOIEMENT, ARCHITECTURE, EXPLOITATION, MCP, SECURITE) ; `docs/fonctionnel/referentiel-demandes.md`, `administration.md`.
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`. Aucune migration. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun.
- Dépendances : aucune dépendance nouvelle. Aucun `npm audit fix`.
- Contrôle DV-09 de la séance, avant toute modification : archive 0.4.0 conforme à `ETAT.md` (2 022 743 octets, 299 entrées, SHA-256 `111db82b…386b738bf`) ; serveur 180/180 ; interface 59/59 dans 2 lancements sur 4, 58/59 dans les 2 autres (test dépassant sa limite de 5 s, écart E-20) ; construction et accessibilité 0 erreur.
- Suites (Node 22.22.0, bac à sable, après `rm -rf node_modules && npm ci`) : serveur `npm test` 193 tests, 193 réussis, 0 échec, 0 sauté (180 en 0.4.0) ; interface `npm test` 2 fichiers, 63 tests, 63 réussis (59 en 0.4.0) ; `npm run build` (`tsc -b` puis `vite build`) réussi ; `npm run a11y` 0 erreur. Après le point 0, la suite de l'interface a passé 5 lancements consécutifs sans échec.
- `npm audit --omit=dev` : serveur 0 vulnérabilité ; interface 3 modérées (E-09) ; audit complet de l'interface : 1 basse, 7 modérées, 12 hautes, inchangé (E-18).
- Preuves d'échec des nouveaux tests : `docs/fr/SECURITE.md`, section 0.4.1 ; le nouveau test du simulateur échoue sur le code 0.4.0 ; les six tests de `journal-diff.test.js` échouent sur les services 0.4.0.
- Contrôle visuel (Chromium, interface construite servie par `vite preview`, API réelle sur une base jetable avec l'entité AC et les comptes de démonstration) : simulateur à 1280 et 360 px et aux gabarits iPhone 13 et Galaxy S9+, FR et NL : délai sous l'heure partout, libellés au-dessus des valeurs sous 576 px, aucun défilement horizontal ; mentions de modification sur Priorités, Calendrier (horaire, fermeture) et Catégories à 1280 et 360 px, FR et NL, heure de Bruxelles, aucun défilement horizontal. Script Playwright hors suite.
- Images Docker (bac à sable, Docker 29.9.2, images de base prises sur `mirror.gcr.io`, Dockerfile de test avec le certificat du proxy, non livrés) : 0.4.0 d'origine installée par son assistant (AC), entité CPAS, commande de démonstration (21 comptes, 31 lieux) ; sous la 0.4.0, « Mobilier » renommé « Mobilier de bureau » au CPAS et une fermeture ajoutée ; `backup.sh`. Mise à jour vers la 0.4.1 par la procédure (`rm -rf backend frontend docs`, extraction de l'archive) sur les mêmes volumes : aucune ligne de migration, `[APP] API 0.4.1`, `/api/version` 0.4.1 à travers nginx, CSP présente, `id -u` 10001 ; « Mobilier de bureau » : trace `modifiee` avec l'auteur et l'heure de la 0.4.0, fermeture `creee`, P3 `livree`, sans `created_by` rendu ; libellé remis à « Mobilier » : journal `{"code":"mobilier","avant":{"libelle_fr":"Mobilier de bureau"},"apres":{"libelle_fr":"Mobilier"}}` ; même formulaire renvoyé : aucune ligne de plus ; simulateur P3 au CPAS, reçue le vendredi 23/10/2026 à 13:00, prise en charge le mardi 27/10/2026 à 13:00. Retour à la 0.4.0 sur la même base : `healthy`, `/api/version` 0.4.0 ; puis retour à la 0.4.1 sans migration.

## 0.4.0 (22/10/2026)

Fichiers comparés à l'archive 0.3.1 par `diff -rq` (hors `node_modules` et `dist`).

- Nouveaux : `backend/config/categories.json`, `priorites.json`, `calendrier.json` ; `backend/src/routes/categories.js`, `priorites.js`, `horaires.js`, `jours-non-ouvres.js`, `jours-feries.js`, `echeances.js` ; `backend/src/services/categories.js`, `priorites.js`, `calendrier.js`, `echeances.js` ; `backend/tests/categories.test.js`, `priorites.test.js`, `calendrier.test.js` ; `frontend/src/referentiel.ts`, `pages/ReferentielPage.tsx`, `components/referentiel/CategoriesTab.tsx`, `PrioritesTab.tsx`, `CalendrierTab.tsx`, `SimulateurTab.tsx` ; `docs/fonctionnel/referentiel-demandes.md` ; `NOTES_LIVRAISON_v0.4.0.md`.
- Modifiés : `backend/config/roles.json` (permissions `categories:*`, `delais:*`), `notes-version.json` (note 0.4.0) ; `backend/src/app.js`, `database.js` (migration `004_referentiel_demandes`, valeurs livrées au démarrage), `i18n-server.js`, `mcp.js`, `schemas.js`, `routes/public.js` et `services/entites.js` (valeurs livrées d'une entité nouvelle) ; `backend/tests/cloison.test.js`, `mcp.test.js`, `notes-version.test.js`, `parametres.test.js` (liste des migrations) ; `frontend/src/App.tsx`, `components/AppLayout.tsx`, `i18n.ts`, `index.css`, `pages/HelpPage.tsx`, `test/i18n.test.ts`, `test/pages.test.tsx` ; `frontend/dist/` ; les deux `package.json` et verrous (version) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (APRES-DEPLOIEMENT, ARCHITECTURE, EXPLOITATION, MCP, SECURITE).
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun.
- Dépendances : aucune dépendance nouvelle ; `dayjs/plugin/customParseFormat` fait partie de `dayjs`. Aucun `npm audit fix`.
- Suites (Node 22.22.0, bac à sable, après `npm ci`) : serveur `npm test` 180 tests, 180 réussis, 0 échec, 0 sauté ; interface `npm test` 2 fichiers, 59 tests, 59 réussis ; `npm run build` (`tsc -b` puis `vite build`) réussi ; `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 0 vulnérabilité ; interface 3 modérées (E-09) ; audit complet de l'interface : 1 basse, 7 modérées, 12 hautes, inchangé (E-18).
- Preuves d'échec des nouveaux tests de sécurité : `docs/fr/SECURITE.md`, section 0.4.0.
- Contrôle visuel (Chromium, interface construite servie avec la CSP de `nginx.conf`, API réelle sur une base jetable avec l'entité AC) : quatre onglets de Catégories et délais en 1280 et 360 px, FR et NL ; aucun défilement horizontal ; 0 message de violation CSP. Script Playwright hors suite.
- Images Docker (bac à sable, Docker 29.9.1, Dockerfile de test avec le certificat du proxy, non livrés) : 0.3.1 d'origine installée par son assistant (AC), entité CPAS créée ; mise à jour vers la 0.4.0 sur le même volume : `Migration 004_referentiel_demandes appliquée`, `/api/version` 0.4.0 (aussi à travers nginx, CSP présente) ; 35 catégories, 4 priorités et 5 congés pour l'AC et le CPAS ; vendredi AC 07:45-12:00, CPAS 08:00-16:30 ; simulateur dans le conteneur réglé en UTC : P3 reçue le vendredi 23/10/2026 à 13:00, décompte le lundi à 07:45 ; `id -u` 10001. Retour à la 0.3.1 sur la base migrée : démarrage normal, `/api/version` 0.3.1 ; puis retour à la 0.4.0 sans nouvelle migration.

## 0.3.1 (22/10/2026)

Fichiers comparés à l'archive 0.3.0 par `diff -rq` (hors `node_modules` et `dist`).

- Nouveau : `NOTES_LIVRAISON_v0.3.1.md`.
- Modifiés : `backend/config/notes-version.json` (note 0.3.1) ; `backend/tests/notes-version.test.js` ; `frontend/src/i18n.ts` (question et réponse 7 de la FAQ, réponse et mots-clés de l'assistant) ; `frontend/src/test/i18n.test.ts`, `test/pages.test.tsx` ; `frontend/dist/` ; les deux `package.json` et verrous (version) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (APRES-DEPLOIEMENT, SECURITE).
- Inchangés : tout le serveur hors configuration des notes, les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`. Aucune migration.
- Dépendances : aucune dépendance nouvelle. Aucun `npm audit fix`.
- Suites (Node 22.22.0, bac à sable, après `rm -rf node_modules && npm ci`) : serveur `npm test` 135 tests, 135 réussis, 0 échec, 0 sauté ; interface `npm test` 2 fichiers, 50 tests, 50 réussis ; `npm run build` (`tsc -b` puis `vite build`) réussi ; `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 0 vulnérabilité ; interface 3 modérées (E-09) ; audit complet de l'interface : 1 basse, 7 modérées, 12 hautes, inchangé (E-18).
- Images Docker (bac à sable) : mise à jour de la 0.3.0 vers la 0.3.1 sur les mêmes volumes ; conteneurs `healthy`, `/api/version` rend 0.3.1, aucune migration ; profil d'un compte qui avait connu la 0.2.0 : notes 0.3.1 et 0.3.0 ; `backup.sh` : « photos copiées ».

## 0.3.0 (22/10/2026)

Fichiers comparés à l'archive 0.2.0 par `diff -rq` (hors `node_modules` et `dist`).

- Nouveaux : `backend/config/parametres-instance.json`, `parametres-entite.json`, `modules.json`, `notes-version.json` ; `backend/src/modules.js` ; `backend/src/routes/parametres.js`, `modules.js`, `parametres-entite.js`, `audit.js`, `notes-version.js` ; `backend/src/services/parametres.js`, `modules.js`, `parametres-entite.js`, `journal.js`, `notes-version.js` ; `backend/tests/parametres.test.js`, `modules.test.js`, `parametres-entite.test.js`, `journal.test.js`, `notes-version.test.js`, `installation.test.js` ; `frontend/src/moduleMap.ts`, `components/ReglagesForm.tsx`, `components/NouveautesModal.tsx`, `pages/ParametresPage.tsx`, `pages/ReglagesEntitePage.tsx`, `pages/JournalPage.tsx` ; `docs/fonctionnel/administration.md` ; `NOTES_LIVRAISON_v0.3.0.md`.
- Modifiés : `backend/config/instance.defaut.json` (`default_ui_mode`), `roles.json` (`parametres:gerer` pour le responsable) ; `backend/src/app.js`, `audit.js` (entité), `database.js` (migration `003_parametres`, `MIGRATIONS` exporté pour les tests), `demo.js` (`version_vue`), `i18n-server.js`, `mcp.js`, `schemas.js`, `routes/auth.js` (`PUT /api/auth/nouveautes`), `routes/public.js` (assistant, paramètres publics), `services/entites.js`, `lieux.js` (module, entité au journal), `listes-valeurs.js`, `roles-utilisateurs.js`, `session.js` (nouveautés), `users.js` (défauts de l'instance) ; `backend/tests/mcp.test.js` (parité) ; `frontend/src/App.tsx` (routes, garde de module, couleur des liens), `api.ts` (`meta` des listes), `components/AppLayout.tsx`, `Chatbot.tsx`, `contexts/AuthContext.tsx`, `SettingsContext.tsx`, `i18n.ts`, `index.css` (`.sr-only`), `pages/HelpPage.tsx`, `HomePage.tsx`, `LoginPage.tsx`, `test/i18n.test.ts`, `test/pages.test.tsx` ; `frontend/dist/` ; les deux `package.json` et verrous (version) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (APRES-DEPLOIEMENT, ARCHITECTURE, EXPLOITATION, INSTALLATION, MCP, SECURITE).
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`, `backup.sh`. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun.
- Dépendances : aucune dépendance nouvelle. Aucun `npm audit fix`.
- Suites (Node 22.22.0, bac à sable, après `rm -rf node_modules && npm ci`) : serveur `npm test` 134 tests, 134 réussis, 0 échec, 0 sauté ; interface `npm test` 2 fichiers, 49 tests, 49 réussis ; `npm run build` (`tsc -b` puis `vite build`) réussi ; `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 0 vulnérabilité ; interface 3 modérées (E-09). Audit complet de l'interface : 1 basse, 7 modérées, 12 hautes, toutes dans l'outillage (E-18), inchangé.
- Preuves d'échec des nouveaux tests de sécurité : `docs/fr/SECURITE.md`, section 0.3.0.
- Contrôle visuel (Chromium, interface construite servie avec la CSP de `nginx.conf`, API réelle sur une base jetable) : Paramètres, Modules, Réglages de l'entité, Aide, Journal d'audit, fenêtre des nouveautés, assistant d'installation, en 1280 et 360 px ; aucun débordement horizontal à 360 px ; 0 message de violation CSP. Script Playwright hors suite.
- Images Docker (bac à sable, Docker 29.9.1, Dockerfile de test avec le certificat du proxy, non livrés) : 0.2.0 d'origine installée par son assistant, entité CPAS, commande de démonstration (21 comptes, 31 lieux), une photo, `backup.sh` ; puis mise à jour vers la 0.3.0 sur les mêmes volumes selon la procédure : `Migration 003_parametres appliquée`, `/api/version` rend 0.3.0, conteneurs `healthy`, `id -u` 10001 ; photo de la 0.2.0 lue (200) ; nom du pouvoir local corrigé ; Patrimoine éteint : écriture d'un lieu 403 `MODULE_DISABLED` à travers nginx, arbre 200 ; journal lu ; `/.env` 404 ; relance de `demo.js` : 21 comptes, 0 lieu créé ; `backup.sh` : « photos copiées ». Retour arrière vers la 0.2.0 sur la base migrée : `healthy`, `/api/version` 0.2.0, arbre 200 ; puis retour à la 0.3.0.

## 0.2.0 (21/10/2026)

Fichiers comparés à l'archive 0.1.1 par `diff -rq`.

- Nouveaux : `backend/config/listes-valeurs.json` ; `backend/src/images.js`, `routes/lieux.js`, `routes/listes-valeurs.js`, `services/lieux.js`, `services/listes-valeurs.js` ; `backend/tests/lieux.test.js`, `tests/fixtures.js` ; `frontend/src/pages/PatrimoinePage.tsx`, `pages/ListesValeursPage.tsx`, `frontend/src/lieux.ts`, `photo.ts` ; `docs/fonctionnel/patrimoine.md` ; `NOTES_LIVRAISON_v0.2.0.md`.
- Modifiés : `backend/config/roles.json` (permissions des lieux et des listes) ; `backend/src/app.js`, `config.js`, `database.js` (migration `002_lieux`), `demo.js`, `i18n-server.js`, `mcp.js`, `roles.js`, `schemas.js`, `routes/public.js`, `services/entites.js` ; `backend/tests/cloison.test.js`, `mcp.test.js` ; `backup.sh` (photos) ; `frontend/src/App.tsx`, `api.ts`, `components/AppLayout.tsx`, `i18n.ts`, `pages/HelpPage.tsx`, `useRoles.ts`, `test/pages.test.tsx` ; `frontend/dist/` ; les deux `package.json` et verrous (version) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (ARCHITECTURE, EXPLOITATION, APRES-DEPLOIEMENT, MCP, SECURITE).
- Inchangés : les deux Dockerfile, `nginx.conf`, `docker-entrypoint.sh`, `docker-compose.yml`, `.env.example`. La construction n'a pas besoin de `--no-cache`.
- Retirés : aucun.
- Dépendances : aucune dépendance nouvelle. `multer`, prévu par le manifeste 0.1.1 pour l'étape 6, n'est pas ajouté : la photo arrive par `express.raw` (écart E-16). Aucun `npm audit fix`.
- Suites (Node 22.22.0, bac à sable, après `rm -rf node_modules && npm ci`) : serveur `npm test` 94 tests, 94 réussis, 0 échec ; interface `npm test` 30 tests, 30 réussis, 0 échec ; `tsc -b` 0 erreur ; `npm run build` réussi ; `npm run a11y` 0 erreur.
- `npm audit --omit=dev` : serveur 0 vulnérabilité ; interface 3 modérées (E-09). Audit complet de l'interface : 1 basse, 7 modérées, 12 hautes, toutes dans l'outillage (E-18).
- Preuves d'échec des nouveaux tests de sécurité : `docs/fr/SECURITE.md`, section 0.2.0.
- Contrôle visuel (Chromium, interface construite servie avec la CSP de `nginx.conf`, API réelle sur une base jetable, comptes et lieux de démonstration) : photo de 3 000 × 2 000 px avec EXIF et position GPS déposée par l'écran, rangée sur le disque en 1 600 × 1 067 px, 37 230 octets, sans EXIF ni GPS ; aucun dépassement horizontal à 768 et 360 px ; bascule du compte à deux entités vers CPAS sans aucun code AC dans l'arbre ; le demandeur n'a pas « Créer un site » et `/listes` le renvoie à l'accueil ; FR, NL, thème sombre ; 0 message de violation CSP. Script Playwright hors suite.
- Images Docker (bac à sable, Docker 29.9.1, Dockerfile de test avec le certificat du proxy, non livrés) : 0.1.1 installée, comptes de démonstration chargés, puis mise à jour vers la 0.2.0 sur les mêmes volumes ; `Migration 002_lieux appliquée`, `/api/version` rend 0.2.0, conteneurs `healthy` ; commande de démonstration : 31 lieux créés ; photo déposée à travers nginx (200), fichier de 1,2 Mo refusé par nginx (413), lecture sans session 401 ; `id -u` 10001, dossier `photos` à 10001 ; `backup.sh` : « photos copiées », archive `gmao-photos-….tar.gz` ; restauration des photos rejouée (lecture 200 ensuite) ; `/.env` et `/.git/config` 404.
- Archive : `gmao-v0_2_0.tar.gz`, vérifiée par `tar tzf`, sans `.env`, ni base, ni `node_modules`.

## 0.1.1 (15/10/2026)

- Modifiés : `frontend/src/pages/UsersPage.tsx`, `frontend/src/i18n.ts`, `frontend/dist/`, les deux `package.json` et verrous (version), `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, `docs/*/APRES-DEPLOIEMENT.md`, `docs/fonctionnel/socle.md`. Nouveau : `NOTES_LIVRAISON_v0.1.1.md`.
- Dépendances : aucune dépendance nouvelle. Serveur inchangé, hors numéro de version.
- Suites : serveur 58 tests, 0 échec ; interface 22 tests, 0 échec ; `tsc -b` 0 erreur ; construction réussie ; `npm run a11y` 0 erreur.
- Contrôle visuel de l'écran Utilisateurs et rôles sur l'interface construite avec la CSP de `nginx.conf` (Chromium) : à 1280 et 1920 px, le tableau tient dans sa carte (largeur défilante égale à la largeur visible : 952 sur 952 et 1592 sur 1592) et la colonne Actions est visible ; à 360 px, une seule colonne (310 sur 310), aucun débordement de la page ; aucune violation de CSP. Mesure faite par script Playwright dans le bac à sable, non ajoutée aux suites : jsdom ne calcule pas les largeurs.
- Archive : `gmao-v0_1_1.tar.gz`, 1 713 953 octets, vérifiée par `tar tzf`, sans `.env` ni base.
- Déploiement NIXUS : mise à jour faite le 15/10/2026 ; `/api/version` rend 0.1.1 ; 80 fichiers dans `frontend/dist/assets`.

## 0.1.0 (15/10/2026)

Base : gabarit v3 1.1.0. Fichiers comparés au gabarit par `diff -rq`.

- Nouveaux : `backend/config/roles.json` ; `backend/src/roles.js`, `demo.js`, `routes/entites.js`, `routes/roles.js`, `routes/roles-utilisateurs.js`, `services/entites.js`, `services/roles-utilisateurs.js`, `services/session.js` ; `backend/tests/cloison.test.js` ; `frontend/src/pages/HomePage.tsx`, `EntitesPage.tsx`, `frontend/src/useRoles.ts` ; `frontend/dist/` (interface construite) ; `CONTRIBUTING.md`, `ETAT.md`, `ECARTS-CDC.md` ; `docs/fr`, `docs/nl`, `docs/en` (ARCHITECTURE, INSTALLATION, EXPLOITATION, APRES-DEPLOIEMENT, MCP, SECURITE, ACCESSIBILITE) ; `docs/fonctionnel/socle.md` ; `NOTES_LIVRAISON_v0.1.0.md`.
- Modifiés : `backend/src/app.js`, `auth.js`, `database.js` (migration `001_noyau` de la GMAO ; aucune base du gabarit n'est reprise), `i18n-server.js`, `mcp.js`, `openapi.js`, `schemas.js`, `routes/auth.js`, `routes/public.js`, `services/users.js` ; `backend/config/instance.defaut.json` ; les deux Dockerfile, `frontend/.dockerignore`, `nginx.conf`, `docker-compose.yml`, `.env.example`, `.gitignore` ; `frontend/src/App.tsx`, `components/AppLayout.tsx`, `contexts/AuthContext.tsx`, `i18n.ts`, `pages/HelpPage.tsx`, `pages/LoginPage.tsx`, `pages/UsersPage.tsx`, tests de l'interface et du serveur ; les deux `package.json` et verrous (nom et version seulement) ; `README.md`, `README.nl.md`, `README.en.md`, `CHANGELOG.md`.
- Retirés : `backend/src/routes/items.js`, `backend/src/services/items.js`, `frontend/src/pages/ItemsPage.tsx`.
- Dépendances : aucune dépendance nouvelle. Aucun `npm audit fix`.
- Suites (Node 22.22.0, bac à sable) : serveur `npm test` 58 tests, 58 réussis, 0 échec ; interface `npm test` 22 tests, 22 réussis, 0 échec ; `tsc -b` 0 erreur ; `npm run build` réussi ; `npm run a11y` 0 erreur.
- Images : construites et démarrées dans le bac à sable (Docker 29.8.2) avec un certificat d'autorité ajouté pour le proxy du bac à sable, dans des Dockerfile de test non livrés ; `gmao-api` et `gmao-web` en `Up (healthy)`, `/api/version` rend 0.1.0, `id -u` rend 10001.
- Contrôle visuel : interface construite servie avec la CSP de `nginx.conf`, Chromium, 360, 768 et 1280 px, FR et NL, thèmes clair et sombre, aucune violation de CSP.
- Déploiement NIXUS : installation faite le 15/10/2026 avec les Dockerfile livrés ; images construites, `id -u` rend 10001, `/api/version` rend 0.1.0.

## Gabarit 1.1.0 (13/10/2026), base de la GMAO

- Fichiers modifiés : `backend/src/config.js`, `auth.js`, `database.js` (colonne `csrf_token` dans la migration `001_noyau`), `envelope.js`, `i18n-server.js`, `app.js`, `openapi.js`, `mcp.js`, `schemas.js`, `services/users.js`, `routes/auth.js`, `routes/public.js`, `routes/users.js`, tests du serveur ; `frontend/src/api.ts`, `contexts/AuthContext.tsx`, `pages/UsersPage.tsx`, `i18n.ts`, `test/pages.test.tsx` ; les deux Dockerfile ; `README.md` ; `STANDARD.md` (v3.2).
- Dépendance retirée : `jsonwebtoken`. Aucune dépendance nouvelle.
- Suites : serveur 40 tests, 0 échec ; interface 16 tests, 0 échec ; typage, construction et accessibilité statique 0 erreur.

## Gabarit 1.0.0 (12/10/2026)

- Dépendances du serveur : `express`, `sql.js`, `jsonwebtoken`, `bcryptjs`, `express-rate-limit`, `ajv`, `ajv-formats` (toutes dans la section 4.2 du standard).
- Dépendances de l'interface : `react`, `react-dom`, `react-router-dom`, `antd`, `@ant-design/icons`, `dayjs`, `@fontsource/inter` ; outillage `typescript`, `vite`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `axe-core`, `eslint`, `eslint-plugin-jsx-a11y`, `@typescript-eslint/parser`, `@types/*` (toutes dans la section 4.3). Versions : antd 5.29.3, react 18.3.1, vite 5.4.21, vitest 4.1.10, typescript 5.9.3.

## Dépendances actuelles de la GMAO

Identiques au gabarit 1.1.0 (aucune ajoutée jusqu'à la 0.5.2). Dépendances du stack à ajouter plus tard et à citer ici au moment de l'ajout (cahier des charges, TEC-03) : `nodemailer` (étape 13), `exceljs` (étape 14), `pdfkit` (étape 21), `recharts` (étape 31 ou 36), `jsonwebtoken` et `jwks-rsa` (étape 44), `@electric-sql/pglite` et `pg` (étape 43), `dompurify` si un texte riche est retenu. `multer` seulement si Renaud le retient pour l'étape 6 (écart E-16).

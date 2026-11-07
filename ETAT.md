# État de la GMAO

Version de l'application : **0.12.0** · Mis à jour le 06/11/2026 · Archive de référence : `gmao-v0_12_0.tar.gz` (taille et empreinte dans la copie du projet)

Ce fichier fait foi pour l'avancement. Ses copies dans l'archive 0.12.0 (`ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `MANIFESTE.md`, `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md`) sont alignées sur les fichiers du projet à la livraison du 06/11/2026 (installation et recette de la 0.11.0 comprises ; l'installation et la recette de la 0.12.0 entreront dans les copies de l'archive suivante), à deux différences près : seule la copie du projet donne la taille et l'empreinte de l'archive, qui ne peut pas contenir sa propre empreinte ; depuis la 0.7.2, les copies de l'archive portent des valeurs d'exemple à la place de l'adresse, des ports et des dossiers de NIXUS (`GITHUB.md`, section 6 ; DV-70).

## 1. Où en est-on

| Élément | État |
| --- | --- |
| Étape du planning | Étape 7 : versions 0.7.0 à 0.7.5, recettées du 28 au 30/10/2026 ; étape 6 : 0.8.0, recettée le 02/11/2026 ; étape 8 : 0.9.0, recettée le 03/11/2026 ; étape 8 bis (DV-95, DV-96) : 0.9.1 (DV-103), 0.10.0 (DV-106), 0.11.0 recettée le 06/11/2026 (DV-109) ; **0.12.0 (aide par écran complète, FAQ locale et remarques R1 à R6 ; anciennes 0.12.0 et 0.12.1 regroupées, DV-110) livrée le 06/11/2026, à verser sur GitHub, installer et recetter** ; ensuite 0.13.0 (photo du lieu, DV-101), 0.14.0 (cycle de vie) |
| Vérification DV-09 de la séance | Au début de la séance du 06/11/2026 (conversation ouverte avec `REPRISE-0.11.0.md`) : archive `gmao-v0_11_0.tar.gz` conforme (2 460 201 octets, 396 entrées, SHA-256 `db46cd39…4c073`), 0.11.0 dans les deux `package.json`, serveur 410/410, `npm audit --omit=dev` du serveur 0, interface 181/181 sur trois lancements, construction et accessibilité 0 erreur ; aucun test instable. Gabarit `gabarit-v3_1_3_0.tar.gz` joint (version 1.3.0) |
| Décisions de la séance | DV-110 confirmée (regroupement en une 0.12.0 ; `recette.sh` en lecture seule ; contrôles répartis d'avance entre Claude et Thierry) ; DV-111 (découpage de la 0.12.0 en sept points, « go » à chacun) |
| Prochaine étape | Verser la 0.12.0 sur GitHub (section 5 de `GITHUB.md`), l'installer sur NIXUS, lancer `sudo bash recette.sh`, puis la recette à l'écran (douze contrôles de `NOTES_LIVRAISON_v0.12.0.md`, la plus grande part par Claude dans Chrome). Puis nouvelle conversation ouverte avec la phrase de `claude/REPRISE-0.12.0.md` : 0.13.0 (photo du lieu sur la demande, DV-101), après les trois questions sur les photos |
| Points pour Renaud | Écarts de la 0.12.0 : E-44 (FAQ locale par entité, ticket transformé en entrée), E-45 (bouton « Aide » dans l'en-tête commun, accès des fiches comme le menu) ; E-37 complété (trois défauts du script de captures du gabarit corrigés, captures sous `/aide-captures` et non `/help`). Déjà ouverts : E-40, E-41, E-43, E-36, E-38, E-29, E-33, E-34, E-35. Passage en mode `sso` avant la production (DV-98) ; secret client « GMAO NIXUS » valable jusqu'au 02/05/2027. Intégration GitHub de l'organisation Claude (`GITHUB.md`, section 4.3) : dépôt pas encore relié au projet |
| Version 0.12.0 | Livrée le 06/11/2026 (étape 8 bis, DV-100, DV-109, DV-110), en sept points avec un « go » chacun : (0) R1 à R6 ; (1) FAQ locale en base, migration `011_faq`, six outils MCP, question métier résolue transformée en entrée (E-44) ; (2) cadre de l'aide du gabarit, bouton « Aide », centre `/help`, recherche, impression, « ? » (fin d'E-39) ; (3) fiches des écrans du demandeur ; (4) fiches du service technique et de l'administration, « ? » sur chaque champ, contrôles bloquants (E-45) ; (5) captures par `npm run help:capture` (`@playwright/test` ^1.56.1, E-37), 18 par langue, servies sous `/aide-captures` ; (6) `recette.sh`, documentation, preuves d'échec. Défaut trouvé dans Chromium et corrigé : en-tête à 379 px pour 360 avec le bouton « Aide » (thème dans le menu de la personne sur téléphone). Serveur 427/427, interface 217/217 |
| Version 0.11.0 | Livrée le 05/11/2026 : tickets (standard, section 13.5), quatre remarques de la recette de la 0.10.0 ; migration `010_tickets`. GitHub, le 06/11/2026 : demande de fusion #11, fusion `afc1639`, étiquette `v0.11.0`, publication non modifiable avec l'archive (SHA-256 `db46cd39…`). NIXUS, le 06/11/2026 : sauvegarde `gmao-20261105-1745.db`, images reconstruites en 68,5 s, `[DB] Migration 010_tickets appliquée`, `[APP] API 0.11.0`, deux conteneurs `healthy`. Recette du 06/11/2026 : dix contrôles sur dix conformes, le contrôle 10 par Claude in Chrome ; six remarques R1 à R6 traitées en 0.12.0 (DV-109) |
| Version 0.10.0 | Connexion Microsoft compatible avec Portal ; migration `009_sso`. GitHub : fusion `9b34027`. NIXUS, le 05/11/2026 : sauvegarde `gmao-20261105-1124.db`. Recette du 05/11/2026 : dix contrôles conformes (DV-106) |
| Version 0.9.1 | R1 et R2 de la 0.9.0 (DV-94). GitHub #9, fusion `fc5bbe2`. Recette du 05/11/2026 : six contrôles conformes (DV-103) |
| Versions 0.1.0 à 0.9.0 | Installées et recettées sur NIXUS du 15/10 au 03/11/2026 ; 0.2.1 abandonnée (DV-16), 0.7.2 jamais installée (E-30) |
| Acceptance NIXUS | `https://192.0.2.10:18443` (HTTP 18080 redirigé), dossier `/volume1/docker/monapp` |
| Version installée sur NIXUS | 0.11.0, installée le 05/11/2026 à 17:45 ; migration `010_tickets` ; connexion Microsoft en `sso_optional` ; dernière sauvegarde : `gmao-20261105-1745.db` |
| Validation à l'écran de la 0.1.1 | **À confirmer** : capture de l'écran Utilisateurs et rôles attendue |
| Base de NIXUS | Entités AC et CPAS ; 21 comptes de démonstration (`@demo.invalid`) dont `multi-entites@demo.invalid` (compte de `recette.sh`) ; 31 lieux de démonstration ; 11 photos réelles ; `.env` avec `DEMO_ALLOWED=1` ; demandes de recette `AC-DI-2026-00001` à `00007` et `CPAS-DI-2026-00001`, plus une demande de Renaud Ziegler (03/11/2026) ; tickets `TCK-2026-00001` (question métier AC, close) et `TCK-2026-00002` (bug, nouveau) ; connexion Microsoft en `sso_optional` ; le premier administrateur (compte réel), rattaché à Microsoft et en accès de secours ; compte « Test Recette SSO » désactivé |
| Référentiel des demandes sur NIXUS | 35 catégories, 4 priorités, horaire de 7 jours, 5 congés par entité ; valeurs du cahier des charges en attendant l'atelier métier (D-11) |
| Sauvegarde | `backup.sh` copie la base (tickets, captures et FAQ compris), les photos et les pièces jointes ; **tâche planifiée DSM pas encore créée** |
| Dépôt GitHub | `https://github.com/berchem-brussels/ecolage-gmao-thierry`, public, EUPL-1.2 ; `v0.7.2` à `v0.11.0` publiées, `tests` et CodeQL verts, publications non modifiables ; Dependabot (demandes de fusion ouvertes, à ne pas fusionner) ; protection de `main` (DV-78) |

## 2. Suites de tests de la 0.12.0

Décomptes recopiés de la sortie, bac à sable de Claude, Node 22.23.4, après `npm ci`.

| Suite | Commande | Résultat |
| --- | --- | --- |
| Serveur | `cd backend && npm ci && npm test` | 427 tests, 427 réussis, 0 échec, 0 sauté (410 en 0.11.0 ; `faq.test.js` : 7) |
| Interface | `cd frontend && npm ci && npm test` | 6 fichiers, 217 réussis, 1 sauté (présence des captures, joué par `npm run help:check` : 10/10), 0 échec, sur trois lancements consécutifs (181 en 0.11.0) |
| Typage et construction | `cd frontend && npm run build` | 0 erreur ; `dist/` reconstruit, captures comprises |
| Accessibilité statique | `cd frontend && npm run a11y` | 0 erreur |
| Travail `tests` de `ci.yml` | Rejoué à la main sous Node 20.20.2 sur les 333 fichiers que Git verse | Serveur 427/427 ; `npm audit --omit=dev --audit-level=high` sortie 0 ; interface 217/217, construction et accessibilité 0 erreur |
| Preuve d'échec | `docs/fr/SECURITE.md`, section 0.12.0 | Vingt-trois protections retirées une à une : au moins un échec chacune ; code de la 0.12.0 : tout réussi |
| Retour arrière | Base passée en 0.12.0 ouverte par le serveur 0.11.0, puis de nouveau par la 0.12.0 | Connexion, comptes, demandes et tickets en 0.11.0 ; FAQ retrouvée en 0.12.0 |
| Dépendances | `npm audit --omit=dev` | Serveur 0 ; interface 3 modérées (E-09). `@playwright/test` ^1.56.1 en développement seulement |
| Fichiers versés | `git add -A` sur une copie de l'archive | 333 fichiers (263 en 0.11.0 : 70 lignes `A`, aucune `D`) ; aucun `.env` (sauf `.env.example`), aucune base, aucun `node_modules` ni `dist/` ; aucune occurrence de l'adresse, des ports ni du dossier de NIXUS |
| Navigateur réel | Chromium, serveur réel sur une base jetable de démonstration | 36 captures (18 par langue) toutes « OK » ; bouton « Aide » et panneau sur chaque écran ; en-tête à 360 px ; image servie dans le panneau |
| `recette.sh` | Joué contre la base jetable (faux `docker`) | Neuf « OK » ; mot de passe faux : « ECHEC » au contrôle 7 et code de sortie 1 |
| Migration | `011_faq` | Base neuve, tests de migration (`categories`, `numerotation`, `parametres`) et base de démonstration |
| Images Docker | Non reconstruites dans le bac à sable | Les deux images changent |

## 3. Exigences du cahier des charges touchées

| Exigence | État | Preuve |
| --- | --- | --- |
| ROL-01 rôle de demandeur d'office | Fait | `api.test.js` |
| ROL-02 rôles par entité, contrôle serveur | Fait pour les ressources existantes, FAQ comprise ; à étendre à chaque ressource métier | `api.test.js`, `cloison.test.js`, `faq.test.js`, `tickets.test.js`, `mcp.test.js` |
| ROL-03 entité active, listes non mélangées | Fait ; FAQ par entité active | `cloison.test.js`, `faq.test.js`, `tickets.test.js` |
| ROL-04 valideur par service | À faire, étape 11 (E-22) | |
| ROL-05 équipes, corps de métier | À faire, étape 15 | |
| ROL-06 dernier administrateur | Fait | `api.test.js` |
| ROL-07 rôles livrés dans `backend/config/` | Fait ; `faq:gerer` en 0.12.0 | `config/roles.json` |
| ADM-01 paramètres d'instance | Fait pour l'identité, la langue et l'affichage, les modules, la connexion Microsoft et les tickets ; refus nommé (R2) | `parametres.test.js`, `sso.test.js`, `tickets.test.js` |
| ADM-02 modules activables | Fait | `modules.test.js`, `pages.test.tsx` |
| ADM-03 paramètres métier par entité | Fait pour le contact, l'urgence, la réouverture, les catégories, les priorités et délais, le calendrier, la numérotation, les questions, le DPO et les mentions, les pièces jointes ; refus nommé (R2) | `parametres-entite.test.js` |
| ADM-04 entité de plus sans modifier le code | Fait | `lieux.test.js`, `priorites.test.js`, `numerotation.test.js` |
| REF-01 à REF-08 (lieux, recherche, lieu habituel, catégories) | Fait selon les versions précédentes | `lieux.test.js`, `recherche-lieux.test.js`, `categories.test.js` |
| DEM-01 à DEM-16, NUM-01 à NUM-05, SUI-01 | Fait selon les versions précédentes (E-21, E-23) | `demandes.test.js`, `numerotation.test.js` |
| GES-01, GES-02, GES-04, PRI-01 à PRI-03 | Fait en partie (E-35) | `qualification.test.js`, `priorites.test.js` |
| SEC-01 cloison vérifiée par un test généré | Fait pour toutes les ressources à identifiant, FAQ comprise ; vérifiée aussi sur NIXUS par `recette.sh` | `cloison.test.js`, `recette.sh` |
| SEC-02 lecture limitée aux siennes | Fait | `demandes.test.js`, `tickets.test.js` |
| ERG-03 accueil adapté au rôle | Fait pour le demandeur et le service technique ; ouvrier à l'étape 18 | `demandes.test.tsx` |
| ERG-08 aucun jargon | Fait pour les écrans livrés et les fiches d'aide (contrôle bloquant) | `help.test.ts`, `i18n.test.ts` |
| ERG-01, ERG-05, ERG-06 identité, 360 px, accessibilité | Fait pour les écrans de la version ; en-tête à 360 px corrigé | `pages.test.tsx`, `a11y` |
| AID-01 à AID-04 aide par écran | Fait : bouton « Aide », seize fiches FR et NL, captures, « ? » sur chaque champ, centre d'aide, recherche, impression, FAQ locale, contrôles bloquants | `help.test.ts`, `pages.test.tsx`, `faq.test.js` |
| Tickets (standard, section 13.5) | Fait ; une question métier résolue devient une entrée de la FAQ (0.12.0) ; export (étape 14) et courriel (étape 13) à venir | `tickets.test.js`, `faq.test.js` |
| CYC-05 aucune suppression | Fait ; question de la FAQ retirée avec motif | `demandes.test.js`, `tickets.test.js`, `faq.test.js` |
| RGPD-01, RGPD-02, RGPD-10, RGPD-12 | Fait selon les versions précédentes ; 0.12.0 : aucune donnée personnelle nouvelle par conception | `NOTES_LIVRAISON_v0.12.0.md` |
| TEC-03 connexion Microsoft | Fait en 0.10.0, recetté | `sso.test.js` |
| TEC-05 acceptance NIXUS | Fait, ports 18443 et 18080 (E-14) | |
| TEC-06 `backup.sh` et tâche DSM | Script fait ; tâche DSM à créer | |
| TEC-07 commandes NIXUS une par une | Fait pour 0.1.0 à 0.12.0 ; contrôles automatiques par `recette.sh` | `NOTES_LIVRAISON_v0.12.0.md`, `APRES-DEPLOIEMENT.md` |
| API-03, API-04, API-05 | Fait pour les routes de la version, FAQ comprise, sauf quatre routes de fichiers (E-17) | `api.test.js`, `mcp.test.js` |
| Journal d'audit (standard, section 17.3) | Champs changés seulement ; FAQ avec l'entité ; détail sans code brut à l'écran (R4) | `journal-diff.test.js`, `faq.test.js`, `pages.test.tsx` |
| Toutes les autres exigences | À faire selon `PLANNING-GMAO.md` | |

## 4. Actions ouvertes

| Action | Qui | Bloque |
| --- | --- | --- |
| Verser la 0.12.0 sur GitHub (section 5 de `GITHUB.md`), publier l'archive, l'installer sur NIXUS, lancer `recette.sh`, recette à l'écran (douze contrôles) | Thierry, avec Claude pour les contrôles « C » | 0.13.0 |
| Questions sur les photos des lieux (salle de projection du CPAS, sites AC-S1 et CPAS-S1, droits de la photo AC-B3-L01), une à une à l'ouverture de la 0.13.0 | Thierry | 0.13.0 |
| Photos des lieux pour la présentation : 14 lieux actifs sans photo et une photo erronée (CPAS-B1-L03) ; dépôt à l'écran, jamais dans l'archive (DV-12) | Thierry | Présentation |
| Lancer `npm run help:capture` sur le poste (après `npx playwright install chromium`) ou le laisser « non joué » (DV-96) | Thierry | Rien |
| Renouveler le secret client de l'inscription « GMAO (écolage Thierry) » avant le 02/05/2027 (colonne Valeur) | Thierry | Connexion Microsoft après le 02/05/2027 |
| Prendre en compte E-37, E-40, E-41, E-43, E-44 et E-45 dans le gabarit ; confirmer E-36 et E-37 ; corriger E-38 | Renaud | Rien en écolage |
| Décider du passage en mode `sso` avant la production (DV-98) | Renaud et Thierry | Mise en production |
| Confirmer E-34 (métadonnées des PDF joints) avant l'utilisation réelle | Renaud | Mise en production |
| Relier le dépôt au projet Claude (`GITHUB.md`, section 4.3) quand Renaud aura activé l'intégration | Renaud, puis Thierry | Rien |
| Rediscuter E-29 (`dist/` dans l'archive) avant l'utilisation réelle (DV-79) | Renaud et Thierry | Mise en production |
| Régler le téléphone d'urgence et le contact du DPO de chaque entité | Responsables du service technique | Rien |
| Faire valider par le DPO les mentions d'information livrées | DPO, avec le responsable | Avant la production |
| Contrôles sur téléphone (iPhone, Samsung, néerlandais) (DV-80, DV-102) | Thierry | Recette finale |
| Porter au registre et à l'analyse d'impact les traitements des versions 0.4.1 à 0.11.0 (voir les versions) ; 0.12.0 : rien de nouveau ; conservation à fixer (D-09) | DPO, formalisme mené en parallèle | Rien |
| Atelier catégories, priorités, délais et questions avec le service technique de chaque entité (D-11) | Métier, responsable | Rien |
| Montrer en atelier : « Moi aussi » ; tableau de bord et qualification ; signalement d'un ticket ; bouton « Aide » et FAQ locale | Thierry, avec le métier | Rien |
| Captures de 3P côté gestionnaire ; captures d'une « Werkopdracht » et d'une « Ontlening » | Thierry | Étapes 9, 16 et 25 |
| Créer la tâche planifiée DSM de sauvegarde (`bash /volume1/docker/monapp/backup.sh`, root, 02:00) | Thierry ou l'IT | TEC-06 |
| Chercher pourquoi Container Manager s'était arrêté sur NIXUS (22/10/2026) | Thierry ou l'IT | Rien |
| Envoyer une capture de l'écran Utilisateurs et rôles 0.1.1 | Thierry | Rien |
| Décider de la mise à jour de l'outillage de l'interface (E-18) et du passage à `react-router-dom` 7 (E-09) | Renaud | Rien |
| Inscrire la GMAO (18443, 18080) au tableau 15.2 du standard | Renaud | Rien |
| Décisions ouvertes D-01 à D-13 et D-15 à D-17 | Voir le cahier des charges, section 32 | Voir `PLANNING-GMAO.md` |

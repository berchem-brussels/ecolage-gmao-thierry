# État de la GMAO

Version de l'application : **0.13.0** · Mis à jour le 08/11/2026

Ce fichier fait foi pour l'avancement. Ses copies dans l'archive 0.13.0 (`ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `MANIFESTE.md`, `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md`) sont alignées sur les fichiers du projet à la livraison du 08/11/2026 (installation et recette de la 0.12.0 comprises ; l'installation et la recette de la 0.13.0 entreront dans les copies de l'archive suivante), à deux différences près : seule la copie du projet donne la taille et l'empreinte de l'archive, qui ne peut pas contenir sa propre empreinte ; depuis la 0.7.2, les copies de l'archive portent des valeurs d'exemple à la place de l'adresse, des ports et des dossiers de NIXUS (`GITHUB.md`, section 6 ; DV-70), et aucune adresse électronique d'une personne réelle.

## 1. Où en est-on

| Élément | État |
| --- | --- |
| Étape du planning | Étape 7 : versions 0.7.0 à 0.7.5 ; étape 6 : 0.8.0 ; étape 8 : 0.9.0 ; étape 8 bis : 0.9.1, 0.10.0, 0.11.0, 0.12.0 (installée le 07/11/2026, recettée le 08/11/2026, DV-112) ; **étape 8 ter : 0.13.0 (photo de l'endroit, filtre « Sans photo », défauts D1 à D10 du contrôle complet DV-113 et remarques M1 à M5) livrée le 08/11/2026, à verser sur GitHub, installer sur NIXUS et recetter** ; ensuite 0.14.0 (cycle de vie, étape 9) |
| Vérification DV-09 de la séance | Au début de la séance du 08/11/2026 (conversation ouverte avec `REPRISE-0.12.0.md`) : archive `gmao-v0_12_0.tar.gz` conforme (7 238 851 octets, 511 entrées, SHA-256 `3413c4c9…ef1ced0`), 0.12.0 dans les deux `package.json`, serveur 427/427, `npm audit --omit=dev` du serveur 0, interface 217 (+1 ignoré) sur trois lancements, `help:check` 10/10, construction et accessibilité 0 erreur ; aucun test instable. Gabarit `gabarit-v3_1_3_0.tar.gz` joint |
| Contrôle complet DV-113 (08/11/2026) | Dans le Chrome de Thierry, en lecture seule : tous les correctifs des recettes depuis la 0.1.1 conformes sur NIXUS (ceux qui écrivent rejoués sur une copie locale de la 0.12.0) ; journal encore brut sur trois points (D2, D3). Puis contrôle de chaque écran du menu, AC et CPAS, FR et NL, avec le rôle de responsable du service technique donné au compte administrateur de Thierry et retiré à la fin (motif au journal) : console sans erreur, aucun appel refusé, captures et liens de l'aide valides, cloison AC et CPAS tenue ; dix défauts D1 à D10 (`claude/CONTROLE-DV113-0.12.0.md`), tous corrigés en 0.13.0 (DV-114) |
| Décisions de la séance | DV-114 (défauts et découpage de la 0.13.0 en sept points, « go » à chacun) ; DV-115 (photos de démonstration : salle de projection sur CPAS-B1-L03, autres photos gardées pour la démo, revues avant la production) ; DV-116 (motif d'un ticket hors du journal d'audit, E-46) |
| Prochaine étape | Livraison de la 0.13.0 : GitHub (section 5 de `GITHUB.md`), NIXUS (`NOTES_LIVRAISON_v0.13.0.md`), `recette.sh`, recette dans Chrome avec la pose des photos de démonstration (DV-115) ; puis 0.14.0 (cycle de vie) dans une nouvelle conversation ouverte avec `claude/REPRISE-0.13.0.md` |
| Points pour Renaud | Écart nouveau de la 0.13.0 : E-46 (motif d'un ticket hors du journal, à reprendre dans le gabarit). Déjà ouverts : E-44, E-45, E-37, E-40, E-41, E-43, E-36, E-38, E-29, E-33, E-34, E-35. Passage en mode `sso` avant la production (DV-98) ; secret client « GMAO NIXUS » valable jusqu'au 02/05/2027. Intégration GitHub de l'organisation Claude (`GITHUB.md`, section 4.3) : dépôt pas encore relié au projet |
| Version 0.13.0 | Livrée le 08/11/2026 (étape 8 ter, DV-101, DV-114), en sept points avec un « go » chacun : (1) téléphones (D1 : langue dans le menu de la personne sous 768 px, en-tête tenu dans 320 à 412 px FR et NL ; `npm run mobile:check`) et « Voir aussi » (D4) ; (2) journal d'audit sans code brut (D2, D3, D9, M5 ; `noms.cle`, type de lieu, codes par famille, colonne Objet) et motif d'un ticket hors du journal (D8, E-46) ; (3) textes et accessibilité (D5 singulier, D6, D7, D10 contraste, M4) ; (4) aide (M1 impression, M2 réponse du service, M3 questions d'un écran) ; (5) photo de l'endroit sur la fiche et la qualification (`photo_lieu`) ; (6) Patrimoine « Sans photo (n) » (`has_photo`) ; (7) livraison. Aucune migration. Serveur 437/437, interface 238 (+1) |
| Version 0.12.0 | Livrée le 06/11/2026 (aide par écran, FAQ locale, R1 à R6). GitHub, le 07/11/2026 : commit `7713ab7`, fusion `72774ed`, étiquette `v0.12.0`, publication non modifiable avec l'archive (SHA-256 `3413c4c9…`). NIXUS, le 07/11/2026 : sauvegarde `gmao-20261107-1916.db`, images reconstruites en 68,4 s, `[DB] Migration 011_faq appliquée`, `[APP] API 0.12.0`, `recette.sh` 9/9. Recette du 08/11/2026 (DV-112) : onze contrôles sur douze conformes, contrôle 11 (360 px) reporté sur iPhone ; M1 à M5 traitées en 0.13.0 |
| Version 0.11.0 | Livrée le 05/11/2026 : tickets ; migration `010_tickets`. GitHub, le 06/11/2026 : fusion `afc1639`, `v0.11.0`. NIXUS, le 06/11/2026 ; recette du 06/11/2026 : dix contrôles conformes ; R1 à R6 traitées en 0.12.0 (DV-109) |
| Version 0.10.0 | Connexion Microsoft compatible avec Portal ; migration `009_sso`. GitHub : fusion `9b34027`. NIXUS et recette le 05/11/2026 : dix contrôles conformes (DV-106) |
| Versions 0.1.0 à 0.9.1 | Installées et recettées sur NIXUS du 15/10 au 05/11/2026 ; 0.2.1 abandonnée (DV-16), 0.7.2 jamais installée (E-30) |
| Acceptance NIXUS | `https://192.0.2.10:18443` (HTTP 18080 redirigé), dossier `/volume1/docker/monapp` |
| Version installée sur NIXUS | 0.12.0, installée le 07/11/2026 à 19:20 ; migration `011_faq` ; connexion Microsoft en `sso_optional` ; dernière sauvegarde : `gmao-20261107-1916.db` |
| Validation à l'écran de la 0.1.1 | Faite le 08/11/2026 par Claude dans Chrome (contrôle DV-113) : colonne « Personne », Actions visibles, étiquette « Administrateur », colonne Actif absente en mode Simple |
| Base de NIXUS | Entités AC et CPAS ; 21 comptes de démonstration (`@demo.invalid`) dont `multi-entites@demo.invalid` (compte de `recette.sh`) ; 31 lieux de démonstration, dont 10 avec photo (AC : B1, B1-L02, B2, B2-L02, B3, S2-X01 ; CPAS : B1, B1-L03 avec la mauvaise photo du Conseil, B2, S1-X01) ; `.env` avec `DEMO_ALLOWED=1` ; demandes de recette `AC-DI-2026-00001` à `00008` (dont une de Renaud Ziegler) et `CPAS-DI-2026-00001` ; tickets `TCK-2026-00001` (question métier AC, close) et `TCK-2026-00002` (bug de test, nouveau) ; une entrée de la FAQ de l'AC (« Comment annuler une demande ? », écran Mes demandes) ; le compte administrateur réel de Thierry (adresse hors de l'archive) premier administrateur, rôle « Demandeur » dans l'AC et le CPAS (rôle de responsable donné puis retiré le 08/11/2026 pour le contrôle DV-113) ; compte « Test Recette SSO » désactivé |
| Référentiel des demandes sur NIXUS | 35 catégories, 4 priorités, horaire de 7 jours, 5 congés par entité ; valeurs du cahier des charges en attendant l'atelier métier (D-11) |
| Sauvegarde | `backup.sh` copie la base, les photos et les pièces jointes ; **tâche planifiée DSM pas encore créée** |
| Dépôt GitHub | `https://github.com/berchem-brussels/ecolage-gmao-thierry`, public, EUPL-1.2 ; `v0.7.2` à `v0.12.0` publiées, `tests` et CodeQL verts, publications non modifiables ; Dependabot (demandes de fusion ouvertes, à ne pas fusionner) ; protection de `main` (DV-78) |

## 2. Suites de tests de la 0.13.0

Décomptes recopiés de la sortie, bac à sable de Claude, Node 22.23.4, après `npm ci`.

| Suite | Commande | Résultat |
| --- | --- | --- |
| Serveur | `cd backend && npm ci && npm test` | 437 tests, 437 réussis, 0 échec, 0 sauté (427 en 0.12.0 ; `photo-lieu-demande.test.js` : 5) |
| Interface | `cd frontend && npm ci && npm test` | 6 fichiers, 238 réussis, 1 sauté (présence des captures, joué par `npm run help:check` : 10/10), 0 échec, sur trois lancements consécutifs (217 en 0.12.0) |
| Typage et construction | `cd frontend && npm run build` | 0 erreur ; `dist/` reconstruit, captures comprises |
| Accessibilité statique | `cd frontend && npm run a11y` | 0 erreur |
| Téléphones | `npm run mobile:check` contre une copie locale de la 0.13.0 sur une base de démonstration | 23 écrans, 4 largeurs (320, 360, 390, 412 px), FR et NL : aucun défaut ; sur l'interface 0.12.0 : en-tête trop large de 68 px à 320 px |
| Travail `tests` de `ci.yml` | Non rejoué sous Node 20 cette fois | Suites jouées sous Node 22.23.4 |
| Preuve d'échec | `docs/fr/SECURITE.md`, section 0.13.0 | Chaque correction retirée : au moins un échec ; code de la 0.13.0 : tout réussi |
| Retour arrière | Aucune migration | La 0.12.0 ouvre une base 0.13.0 sans différence |
| Dépendances | `npm audit --omit=dev` | Serveur 0 ; interface 3 modérées (E-09) ; aucune dépendance nouvelle |
| Fichiers versés | `diff -rq` avec l'archive 0.12.0 | Quatre fichiers nouveaux (`NOTES_LIVRAISON_v0.13.0.md`, `photo-lieu-demande.test.js`, `PhotoLieu.tsx`, `verifier-mobile.mjs`), aucun retiré ; aucune valeur de NIXUS ni adresse électronique réelle dans l'archive |
| Navigateur réel | Chromium, serveur réel sur une base jetable de démonstration | En-tête aux cinq largeurs ; photo de l'endroit sur la fiche et aperçu au toucher (iPhone SE FR, Android 360 px NL) ; impression avec 18 captures sur 18 ; capture de Patrimoine refaite (FR et NL) |
| `recette.sh` | Inchangé hors commentaire | Neuf contrôles ; le contrôle 5 lit `011_faq`, dernière migration |
| Images Docker | Non reconstruites dans le bac à sable | Les deux images changent |

## 3. Exigences du cahier des charges touchées

| Exigence | État | Preuve |
| --- | --- | --- |
| ROL-01 rôle de demandeur d'office | Fait | `api.test.js` |
| ROL-02 rôles par entité, contrôle serveur | Fait pour les ressources existantes ; photo de l'endroit au seul service technique ; à étendre à chaque ressource métier | `api.test.js`, `cloison.test.js`, `photo-lieu-demande.test.js` |
| ROL-03 entité active, listes non mélangées | Fait ; filtre `has_photo` dans l'entité active | `cloison.test.js`, `photo-lieu-demande.test.js` |
| ROL-04 valideur par service | À faire, étape 11 (E-22) | |
| ROL-05 équipes, corps de métier | À faire, étape 15 | |
| ROL-06 dernier administrateur | Fait | `api.test.js` |
| ROL-07 rôles livrés dans `backend/config/` | Fait | `config/roles.json` |
| ADM-01 paramètres d'instance | Fait ; réglage nommé au journal (0.13.0) | `parametres.test.js`, `journal-noms.test.js` |
| ADM-02 modules activables | Fait | `modules.test.js` |
| ADM-03 paramètres métier par entité | Fait ; explication du téléphone d'urgence à jour (0.13.0) | `parametres-entite.test.js` |
| ADM-04 entité de plus sans modifier le code | Fait | `lieux.test.js`, `numerotation.test.js` |
| REF-01 lieux et photos | Fait ; photo de l'endroit sur la demande et filtre « Sans photo » (0.13.0) | `lieux.test.js`, `photo-lieu-demande.test.js`, `pages.test.tsx` |
| REF-02 à REF-08 (recherche, lieu habituel, catégories) | Fait selon les versions précédentes | `recherche-lieux.test.js`, `categories.test.js` |
| DEM-01 à DEM-16, NUM-01 à NUM-05, SUI-01 | Fait selon les versions précédentes (E-21, E-23) | `demandes.test.js`, `numerotation.test.js` |
| GES-01, GES-02, GES-04, PRI-01 à PRI-03 | Fait en partie (E-35) ; photo de l'endroit à la qualification | `qualification.test.js`, `photo-lieu-demande.test.js` |
| SEC-01 cloison vérifiée par un test généré | Fait, photo de l'endroit comprise ; vérifiée aussi sur NIXUS (`recette.sh`, contrôle DV-113) | `cloison.test.js`, `photo-lieu-demande.test.js` |
| SEC-02 lecture limitée aux siennes | Fait | `demandes.test.js`, `tickets.test.js` |
| ERG-03 accueil adapté au rôle | Fait pour le demandeur et le service technique ; ouvrier à l'étape 18 | `demandes.test.tsx` |
| ERG-08 aucun jargon | Fait ; journal d'audit sans code brut (0.13.0) | `help.test.ts`, `i18n.test.ts`, `pages.test.tsx` |
| ERG-01, ERG-05, ERG-06 identité, 360 px, accessibilité | Fait ; en-tête tenu dans 320 px, texte discret à 4,5:1 (0.13.0) | `pages.test.tsx`, `couleurs.test.tsx`, `mobile:check` |
| AID-01 à AID-04 aide par écran | Fait ; « Voir aussi », impression, questions d'un écran dans l'onglet FAQ (0.13.0) | `help.test.ts`, `pages.test.tsx` |
| Tickets (standard, section 13.5) | Fait ; motif hors du journal (E-46), réponse du service préremplie dans la FAQ (0.13.0) | `tickets.test.js`, `pages.test.tsx` |
| CYC-05 aucune suppression | Fait | `demandes.test.js`, `faq.test.js` |
| RGPD-01, RGPD-02, RGPD-10, RGPD-12 | Fait selon les versions précédentes ; 0.13.0 : aucune donnée personnelle nouvelle, journal plus sobre (E-46) | `NOTES_LIVRAISON_v0.13.0.md` |
| TEC-03 connexion Microsoft | Fait en 0.10.0, recetté | `sso.test.js` |
| TEC-05 acceptance NIXUS | Fait, ports 18443 et 18080 (E-14) | |
| TEC-06 `backup.sh` et tâche DSM | Script fait ; tâche DSM à créer | |
| TEC-07 commandes NIXUS une par une | Fait pour 0.1.0 à 0.13.0 ; contrôles automatiques par `recette.sh` | `NOTES_LIVRAISON_v0.13.0.md`, `APRES-DEPLOIEMENT.md` |
| API-03, API-04, API-05 | Fait pour les routes de la version, sauf quatre routes de fichiers (E-17) | `api.test.js`, `mcp.test.js`, `photo-lieu-demande.test.js` |
| Journal d'audit (standard, section 17.3) | Champs changés seulement ; tout champ écrit nommé à l'écran (test d'inventaire, 0.13.0) | `journal-diff.test.js`, `journal-noms.test.js`, `pages.test.tsx` |
| Toutes les autres exigences | À faire selon `PLANNING-GMAO.md` | |

## 4. Actions ouvertes

| Action | Qui | Bloque |
| --- | --- | --- |
| Verser la 0.13.0 sur GitHub (branche `version/v0.13.0`, demande de fusion, étiquette, publication avec l'archive), puis l'installer sur NIXUS (`NOTES_LIVRAISON_v0.13.0.md`) et lancer `recette.sh` | Thierry | Recette de la 0.13.0 |
| Recette de la 0.13.0 dans Chrome (contrôles C par Claude, T par Thierry) et pose des photos de démonstration avec l'accord de Thierry (DV-115) : salle de projection sur CPAS-B1-L03 (remplace la mauvaise photo), autres photos disponibles sur leurs lieux ; le bureau au tableau couvert de papiers reste écarté | Claude et Thierry | 0.14.0, présentation |
| Contrôles sur un vrai iPhone (Safari) et un Android (Chrome) : en-tête, langue dans le menu des initiales, photo de l'endroit agrandie au toucher, contrôle 11 de la 0.12.0 (DV-80, DV-102) | Thierry (Android : avec un agent) | Recette finale |
| Photos réelles : droits de chaque photo (AC-B3-L01 en particulier) et choix définitif à revoir avant toute production (DV-115) ; photos manquantes : AC-B2-L01 (atelier rangé), CPAS-B1-L02 (bureau à refaire, tableau et bureau dégagés) | Thierry | Production |
| Lancer `npm run help:capture` et `npm run mobile:check` sur le poste (après `npx playwright install chromium`) ou les laisser « non joués » (DV-96) | Thierry | Rien |
| Renouveler le secret client de l'inscription « GMAO (écolage Thierry) » avant le 02/05/2027 (colonne Valeur) | Thierry | Connexion Microsoft après le 02/05/2027 |
| Prendre en compte E-37, E-40, E-41, E-43, E-44, E-45 et E-46 dans le gabarit ; confirmer E-36 et E-37 ; corriger E-38 | Renaud | Rien en écolage |
| Décider du passage en mode `sso` avant la production (DV-98) | Renaud et Thierry | Mise en production |
| Confirmer E-34 (métadonnées des PDF joints) avant l'utilisation réelle | Renaud | Mise en production |
| Relier le dépôt au projet Claude (`GITHUB.md`, section 4.3) quand Renaud aura activé l'intégration | Renaud, puis Thierry | Rien |
| Rediscuter E-29 (`dist/` dans l'archive) avant l'utilisation réelle (DV-79) | Renaud et Thierry | Mise en production |
| Régler le téléphone d'urgence et le contact du DPO de chaque entité | Responsables du service technique | Rien |
| Faire valider par le DPO les mentions d'information livrées | DPO, avec le responsable | Avant la production |
| Porter au registre et à l'analyse d'impact les traitements des versions 0.4.1 à 0.11.0 (voir les versions) ; 0.12.0 et 0.13.0 : rien de nouveau ; conservation à fixer (D-09) | DPO, formalisme mené en parallèle | Rien |
| Atelier catégories, priorités, délais et questions avec le service technique de chaque entité (D-11) | Métier, responsable | Rien |
| Montrer en atelier : « Moi aussi » ; tableau de bord et qualification avec la photo de l'endroit ; signalement d'un ticket ; bouton « Aide » et FAQ locale ; Patrimoine « Sans photo » | Thierry, avec le métier | Rien |
| Captures de 3P côté gestionnaire ; captures d'une « Werkopdracht » et d'une « Ontlening » | Thierry | Étapes 9, 16 et 25 |
| Créer la tâche planifiée DSM de sauvegarde (`bash /volume1/docker/monapp/backup.sh`, root, 02:00) | Thierry ou l'IT | TEC-06 |
| Chercher pourquoi Container Manager s'était arrêté sur NIXUS (22/10/2026) | Thierry ou l'IT | Rien |
| Décider de la mise à jour de l'outillage de l'interface (E-18) et du passage à `react-router-dom` 7 (E-09) | Renaud | Rien |
| Inscrire la GMAO (18443, 18080) au tableau 15.2 du standard | Renaud | Rien |
| Décisions ouvertes D-01 à D-13 et D-15 à D-17 | Voir le cahier des charges, section 32 | Voir `PLANNING-GMAO.md` |

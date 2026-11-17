# État de la GMAO

Version de l'application : **0.17.0** · Mis à jour le 17/11/2026

Ce fichier fait foi pour l'avancement. Ses copies dans l'archive 0.17.0 (`ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `MANIFESTE.md`, `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md`) sont alignées sur les fichiers du projet à la livraison du 17/11/2026 (installation et recette de la 0.16.1 comprises), à deux différences près : seule la copie du projet donne la taille et l'empreinte de l'archive, qui ne peut pas contenir sa propre empreinte ; depuis la 0.7.2, les copies de l'archive portent des valeurs d'exemple à la place de l'adresse, des ports et des dossiers de NIXUS (`GITHUB.md`, section 6 ; DV-70), et aucune adresse électronique d'une personne réelle.

## 1. Où en est-on

| Élément | État |
| --- | --- |
| Étape du planning | Étape 7 : versions 0.7.0 à 0.7.5 ; étape 6 : 0.8.0 ; étape 8 : 0.9.0 ; étape 8 bis : 0.9.1 à 0.12.0 ; étape 8 ter : 0.13.0 ; étape 9 : 0.14.0 ; étape 10 : 0.15.0 ; étapes 11 et 12 : 0.16.0 et son correctif 0.16.1 (installée et recettée le 16/11/2026, iPhone conforme, Android en réserve, DV-137) ; **étape 13 : 0.17.0 (notifications) livrée le 17/11/2026, à verser sur GitHub, installer sur NIXUS et recetter** ; ensuite 0.18.0 (étape 14 : recherche globale, exports, visite guidée) |
| Vérification DV-09 de la séance | Au début de la séance du 16/11/2026 (conversation ouverte avec `REPRISE-0.16.1.md`) : archive `gmao-v0_16_1.tar.gz` conforme (10 407 296 octets, 609 entrées, SHA-256 `ca87c85f…877784`) ; serveur 544/544 ; interface 320 (+1 ignoré) ; `help:check` 11/11 ; construction et accessibilité 0 erreur ; `dist` reconstruit identique aux noms hachés près ; `mobile:check` (`MOBILE_PARCOURS=1`) 41 écrans, six appareils, FR et NL, parcours sur deux moteurs, aucun défaut. Gabarit `gabarit-v3_1_3_0.tar.gz` joint |
| Contrôle complet DV-113 (08/11/2026) | Dans le Chrome de Thierry, en lecture seule : tous les correctifs des recettes depuis la 0.1.1 conformes sur NIXUS (ceux qui écrivent rejoués sur une copie locale de la 0.12.0) ; journal encore brut sur trois points (D2, D3). Puis contrôle de chaque écran du menu, AC et CPAS, FR et NL, avec le rôle de responsable du service technique donné au compte administrateur de Thierry et retiré à la fin (motif au journal) : console sans erreur, aucun appel refusé, captures et liens de l'aide valides, cloison AC et CPAS tenue ; dix défauts D1 à D10 (`claude/CONTROLE-DV113-0.12.0.md`), tous corrigés en 0.13.0 (DV-114) |
| Décisions de la séance | DV-138 (découpage de la 0.17.0, remarques de DV-137) ; DV-139 (socle des notifications) ; DV-140 (courriel en mode test) ; DV-141 (`nodemailer` 10.6.0, E-48) ; DV-142 (règles des avis) ; DV-143 (alertes d'échéance à qui a qualifié) ; DV-144 (méthode de `mobile:check`) |
| Prochaine étape | Verser la 0.17.0 sur GitHub (`GITHUB.md`, section 5), la publier, l'installer sur NIXUS (migration `015_notifications`, nouvelle dépendance), `recette.sh`, puis la recette à l'écran (`NOTES_LIVRAISON_v0.17.0.md`) ; ensuite 0.18.0 (étape 14) dans une nouvelle conversation ouverte avec `claude/REPRISE-0.17.0.md` |
| Points pour Renaud | 0.17.0 : E-48 ouvert (`nodemailer` 10.6.0 au lieu de ^8.0.4 ; accord avant l'envoi réel et la production) ; E-49 ouvert (libellé de l'état rendu au chef par l'API et le MCP). 0.16.0 : E-47 ouvert (chef de service lu dans Entra ID ou SAGA, ROL-04). Déjà ouverts : E-17, E-46, E-44, E-45, E-37, E-40, E-41, E-43, E-36, E-38, E-29, E-33, E-34, E-35. Passage en mode `sso` avant la production (DV-98) ; secret client « GMAO NIXUS » valable jusqu'au 02/05/2027. Intégration GitHub de l'organisation Claude (`GITHUB.md`, section 4.3) : dépôt pas encore relié au projet |
| Version 0.17.0 | Livrée le 17/11/2026 (étape 13, DV-138 à DV-144), en neuf points avec un « go » chacun : (0) remarques de DV-137 (croix d'un formulaire du volet qui ramène à la fiche, fiche du chef de service à la troisième personne) ; (1) socle des notifications et cloche (migration `015_notifications`, `config/notifications.json`, six outils MCP ; choix de l'entité dans le menu sur téléphone) ; (2) courriel (mode test livré, SMTP réglable, file avec trois essais, journal des courriels, `nodemailer` 10.6.0, cinq outils MCP) ; (3) modèles de courriel (quinze, FR et NL, aperçu, cinq outils MCP) ; (4) avis d'une demande (accusé DEM-12, validation, danger, changements d'état) ; (5) fil, mentions, tickets ; (6) alertes d'échéance (toutes les 15 minutes, rattrapage sans avis au passage) ; (7) téléphones (cloche et modèle dans `mobile:check`, ouverture depuis la cloche dans les parcours), aide, documentation ; (8) livraison. Serveur 594/594, interface 331 (+1). Seize preuves d'échec |
| Version 0.16.1 | Livrée le 16/11/2026 (DV-134 à DV-136) : R5 (le chef de service ouvre les pièces jointes des demandes à valider ; règle `valideurDe` unique), R1, R4, R2, R3, `mobile:check` sur WebKit avec parcours complets, danger sans validation (DV-135). Serveur 544/544, interface 320 (+1). GitHub, le 16/11/2026 : demande de fusion #17, commit `e21ad2c`, fusion `c9a9d41`, étiquette `v0.16.1`, publication avec l'archive. NIXUS, le 16/11/2026 : sauvegarde `gmao-20261116-1225.db`, images reconstruites en 145,1 s, `[APP] API 0.16.1` sans migration, `recette.sh` 9/9. Recette du 16/11/2026 (DV-137) : contrôles 1 à 9 conformes par Claude dans Chrome (`AC-DI-2026-00014` validée avec photo vue par le chef, `00015` danger en P1 sans validation, `00016` encodée par téléphone, journal FR et NL, fil d'une demande fermée, colonnes, regroupement, découpage) ; 10 sur l'iPhone de Thierry (Edge) : `00017` avec une photo prise à l'appareil, vue et agrandie par `valideur.ac`, `00018` danger sans validation ; 11 (Android) reporté ; 12 : danger accepté pour la démonstration ; remarques traitées en 0.17.0, point 0 |
| Version 0.16.0 | Livrée le 10/11/2026 (étapes 11 et 12, DV-121, DV-128 à DV-133), en neuf points : validation par le chef de service (migration `014_validation`), création par le gestionnaire, regroupement, découpage, colonnes par état. Serveur 541/541, interface 314 (+1). GitHub, le 14/11/2026 : commit `afeb2e0`, fusion `0583a0e`, étiquette `v0.16.0`. NIXUS, le 14/11/2026 : sauvegarde `gmao-20261114-1624.db`, `[DB] Migration 014_validation appliquée`, `demo.js` relancé (21 comptes, 2 services), `recette.sh` 9/9. Recette du 14/11/2026 (DV-134) : contrôles 1 à 10 conformes ; défauts R1 à R5 corrigés en 0.16.1 |
| Version 0.15.0 | Livrée le 09/11/2026 (étape 10, DV-123 à DV-126) : fil de messages, notes internes avec mention, modèles de réponse, abonnement ; migration `013_messages`. Serveur 513/513, interface 281 (+1). GitHub, le 10/11/2026 : commit `a78ca77`, fusion `db4e861`, `v0.15.0`. NIXUS, le 10/11/2026 : `recette.sh` 9/9. Recette du 10/11/2026 (DV-127) : douze contrôles conformes ; R1 et R2 corrigés en 0.16.0 |
| Version 0.14.0 | Livrée le 08/11/2026 (étape 9, DV-117 à DV-120) : cycle de vie ; migration `012_cycle_de_vie`. Serveur 473/473, interface 262 (+1). GitHub, le 09/11/2026 : fusion `8134582`, `v0.14.0`. NIXUS, le 09/11/2026 : `recette.sh` 9/9. Recette du 09/11/2026 (DV-122) : douze contrôles conformes ; R1 à R3 corrigés en 0.15.0 |
| Version 0.13.0 | Livrée le 08/11/2026 (étape 8 ter, DV-101, DV-114) : photo de l'endroit, « Sans photo », D1 à D10, M1 à M5 ; aucune migration. Serveur 437/437, interface 238 (+1). GitHub : fusion `5993563`, `v0.13.0`. NIXUS et recette le 08/11/2026 : douze contrôles conformes (DV-117) |
| Version 0.12.0 | Livrée le 06/11/2026 (aide par écran, FAQ locale, R1 à R6). GitHub, le 07/11/2026 : fusion `72774ed`, `v0.12.0`. NIXUS, le 07/11/2026 : `[DB] Migration 011_faq appliquée`, `recette.sh` 9/9. Recette du 08/11/2026 (DV-112) |
| Version 0.11.0 | Livrée le 05/11/2026 : tickets ; migration `010_tickets`. GitHub, le 06/11/2026 : fusion `afc1639`, `v0.11.0`. NIXUS, le 06/11/2026 ; recette du 06/11/2026 : dix contrôles conformes ; R1 à R6 traitées en 0.12.0 (DV-109) |
| Version 0.10.0 | Connexion Microsoft compatible avec Portal ; migration `009_sso`. GitHub : fusion `9b34027`. NIXUS et recette le 05/11/2026 : dix contrôles conformes (DV-106) |
| Versions 0.1.0 à 0.9.1 | Installées et recettées sur NIXUS du 15/10 au 05/11/2026 ; 0.2.1 abandonnée (DV-16), 0.7.2 jamais installée (E-30) |
| Acceptance NIXUS | `https://192.0.2.10:18443` (HTTP 18080 redirigé), dossier `/volume1/docker/monapp` |
| Version installée sur NIXUS | 0.16.1, installée le 16/11/2026 à 12:25 (sauvegarde `gmao-20261116-1225.db`, construction en 145,1 s) ; aucune migration, `[APP] API 0.16.1` ; `demo.js` non relancé (mot de passe commun du 14/11/2026) ; `recette.sh` 9/9 en saisie visible ; connexion Microsoft en `sso_optional` |
| Validation à l'écran de la 0.1.1 | Faite le 08/11/2026 par Claude dans Chrome (contrôle DV-113) : colonne « Personne », Actions visibles, étiquette « Administrateur », colonne Actif absente en mode Simple |
| Base de NIXUS | Entités AC et CPAS ; 21 comptes de démonstration (`@demo.invalid`) dont `multi-entites@demo.invalid` (compte de `recette.sh`) ; services de démonstration « AC-DEMO » (chef `valideur.ac`, membre `agent.ac`) et « CPAS-DEMO », service de test `AC-REC016` « Recette 0.16.0 (renommé) » ; 31 lieux de démonstration, avec les photos de démonstration posées le 08/11/2026 (DV-115 ; salle de projection sur CPAS-B1-L03) ; `.env` avec `DEMO_ALLOWED=1` ; demandes de recette `AC-DI-2026-00001` à `00018` (dont une de Renaud Ziegler ; regroupement `00003` dans `00004`, découpage `00011` → `00012`, dépôt avec photo `00013` sur iPhone ; recette de la 0.16.1 : `00014` validée avec photo, `00015` danger, `00016` encodée par téléphone, `00017` (en attente du chef, photo de l'iPhone) et `00018` (danger) déposées sur iPhone ; fil de recette sur `AC-DI-2026-00005`) et `CPAS-DI-2026-00001` ; tickets `TCK-2026-00001` (question métier AC, close) et `TCK-2026-00002` (bug de test, nouveau) ; une entrée de la FAQ de l'AC (« Comment annuler une demande ? », écran Mes demandes) ; le compte administrateur réel de Thierry (adresse hors de l'archive) premier administrateur, rôle « Demandeur » dans l'AC et le CPAS ; compte « Test Recette SSO » désactivé. Au passage en 0.17.0, les demandes de recette déjà en retard seront notées comme signalées, sans avis (DV-143) |
| Référentiel des demandes sur NIXUS | 35 catégories, 4 priorités, horaire de 7 jours, 5 congés par entité ; valeurs du cahier des charges en attendant l'atelier métier (D-11) ; domaine « Aménagement, déménagement, achat » en « Validation du chef de service », appliquée dès la 0.16.0 |
| Courriel sur NIXUS | Livré en mode test par la 0.17.0 (DV-140) : rien ne part ; à garder jusqu'à l'accord de Renaud sur E-48 et le choix d'un serveur SMTP de l'organisation |
| Sauvegarde | `backup.sh` copie la base, les photos et les pièces jointes (les tables des notifications et des courriels sont dans la base) ; **tâche planifiée DSM pas encore créée** |
| Dépôt GitHub | `https://github.com/berchem-brussels/ecolage-gmao-thierry`, public, EUPL-1.2 ; `v0.7.2` à `v0.16.1` publiées, `tests` et CodeQL verts, publications non modifiables ; Dependabot (demandes de fusion ouvertes, à ne pas fusionner) ; protection de `main` (DV-78) |

## 2. Suites de tests de la 0.17.0

Décomptes recopiés de la sortie, bac à sable de Claude, Node 22.23.4.

| Suite | Commande | Résultat |
| --- | --- | --- |
| Serveur | `cd backend && npm test` | 594 tests, 594 réussis, 0 échec, 0 sauté (544 en 0.16.1 ; nouveaux : `notifications.test.js` 13, `courriel.test.js` 9, `modeles-courriel.test.js` 7, `avis.test.js` 16 ; `dependances.test.js` : `nodemailer` ≥ 10.1.4 ; `notes-version.test.js` : note 0.17.0) |
| Interface | `cd frontend && npm test` | 7 fichiers, 331 réussis, 1 sauté (présence des captures, joué par `npm run help:check` : 11/11), 0 échec (320 en 0.16.1) |
| Typage et construction | `cd frontend && npm run build` | 0 erreur ; le `dist` livré est celui de la dernière construction, contrôlé par `mobile:check` |
| Accessibilité statique | `cd frontend && npm run a11y` | 0 erreur |
| Téléphones | `npm run mobile:check` (`MOBILE_PARCOURS=1`) contre une copie locale de la 0.17.0 sur une base de démonstration passée de la 0.16.1 à la 0.17.0, quatre comptes et l'agent | 45 écrans (41 de la 0.16.1, cloche ouverte du service technique et du chef de service, fiche d'un modèle de courriel de l'administrateur), six appareils (Chromium : 320, 360, 390, 412 px ; WebKit : 320 et 390 px), FR et NL, et parcours complets sur les deux moteurs (dépôt avec photo, ouverture depuis la cloche et validation par le chef, décision ouverte depuis la cloche de l'agent, regroupement, découpage, « Déplacer ») : aucun défaut (passage final du 17/11/2026, environ 16 minutes, après la dernière construction de `dist/`, sur une base 0.16.1 neuve migrée au démarrage) |
| Preuve d'échec | `docs/fr/SECURITE.md`, section 0.17.0 | Seize protections retirées une à une : au moins un échec chacune ; une mutation plus faible (description ajoutée sans être lue) sans échec, expliquée (la protection est de ne pas lire la description) |
| Migration et retour arrière | Base 0.16.1 garnie passée en 0.17.0 | `[DB] Migration 015_notifications appliquée`, `[APP] API 0.17.0` ; la 0.16.1 démarre sur la base migrée (retour sans restaurer la base) |
| Dépendances | `npm audit --omit=dev` | Serveur 0 (`nodemailer` 10.6.0, E-48) ; interface 3 modérées (E-09) |
| Fichiers versés | `diff -rq` avec l'archive 0.16.1 | Dix-neuf fichiers nouveaux, aucun retiré (`MANIFESTE.md`) ; aucune valeur de NIXUS ni adresse électronique réelle dans l'archive |
| `recette.sh` | Saisie visible (DV-117) | Contrôle 5 : `015_notifications`, ses quatre tables et les deux passages du valideur |
| Courriel SMTP | Serveur SMTP factice local (`tests/smtp-factice.js`) | Envoi, refus du compte (`EAUTH`), trois essais, échec gardé ; aucun serveur réel essayé |
| Images Docker | Non reconstruites dans le bac à sable | L'image `api` change de dépendances (`nodemailer`), l'image `web` de `dist/` |

## 3. Exigences du cahier des charges touchées

| Exigence | État | Preuve |
| --- | --- | --- |
| ROL-01 rôle de demandeur d'office | Fait | `api.test.js` |
| ROL-02 rôles par entité, contrôle serveur | Fait pour les ressources existantes ; photo de l'endroit au seul service technique ; validation au seul chef du service de la demande (0.16.0) ; notifications à la seule personne qui les reçoit (0.17.0) ; à étendre à chaque ressource métier | `api.test.js`, `cloison.test.js`, `photo-lieu-demande.test.js`, `validation.test.js`, `notifications.test.js` |
| ROL-03 entité active, listes non mélangées | Fait ; filtre `has_photo` dans l'entité active ; cloche de l'entité active, compteur des autres (0.17.0) | `cloison.test.js`, `photo-lieu-demande.test.js`, `notifications.test.js` |
| ROL-04 valideur par service | Fait en partie (0.16.0) : table service-valideur réglée par l'administrateur, suppléant pour une période ; le chef ouvre les pièces jointes des demandes à valider (0.16.1, R5) ; avis au chef et au suppléant en période (0.17.0) ; lecture dans Entra ID ou SAGA à faire (E-47) | `validation.test.js`, `avis.test.js` |
| ROL-05 équipes, corps de métier | À faire, étape 15 | |
| ROL-06 dernier administrateur | Fait | `api.test.js` |
| ROL-07 rôles livrés dans `backend/config/` | Fait | `config/roles.json` |
| ADM-01 paramètres d'instance | Fait ; réglage nommé au journal (0.13.0) ; réglages du courriel, mot de passe chiffré (0.17.0) | `parametres.test.js`, `journal-noms.test.js`, `courriel.test.js` |
| ADM-02 modules activables | Fait ; notifications d'un module éteint cachées (0.17.0) | `modules.test.js`, `notifications.test.js` |
| ADM-03 paramètres métier par entité | Fait ; explication du téléphone d'urgence à jour (0.13.0) | `parametres-entite.test.js` |
| ADM-04 entité de plus sans modifier le code | Fait | `lieux.test.js`, `numerotation.test.js` |
| REF-01 lieux et photos | Fait ; photo de l'endroit sur la demande et filtre « Sans photo » (0.13.0) | `lieux.test.js`, `photo-lieu-demande.test.js`, `pages.test.tsx` |
| REF-02 à REF-08 (recherche, lieu habituel, catégories) | Fait selon les versions précédentes | `recherche-lieux.test.js`, `categories.test.js` |
| DEM-01 à DEM-16, NUM-01 à NUM-05, SUI-01 | Fait selon les versions précédentes (E-23) ; DEM-12 accusé de réception : cloche (née lue pour qui dépose) et courriel avec numéro, lieu, délai indicatif et lien (0.17.0) ; DEM-15 validation par le chef de service selon la catégorie (0.16.0) ; un danger (DEM-06) ne passe pas par le chef (0.16.1, DV-135) | `demandes.test.js`, `numerotation.test.js`, `validation.test.js`, `avis.test.js` |
| NOT-01 événements notifiables en données | Fait (0.17.0) : seize événements dans `config/notifications.json`, dont quatre annoncés pour des modules à venir | `notifications.test.js` |
| NOT-02 canaux | Fait en partie (0.17.0) : cloche et courriel ; Teams à l'étape 39 (D-05) | `notifications.test.js`, `courriel.test.js` |
| NOT-03, NOT-05 préférences et résumé quotidien | À faire, étape 21 | |
| NOT-04 modèles de courriel FR et NL | Fait (0.17.0) : quinze modèles, variables contrôlées, aperçu, retour au texte livré | `modeles-courriel.test.js` |
| NOT-06 notification sans donnée sensible | Fait (0.17.0) : ni description, ni commentaire, ni motif, ni nom ; texte composé à la lecture | `notifications.test.js`, `avis.test.js` |
| LNG-05 courriel dans la langue du destinataire | Fait (0.17.0) | `modeles-courriel.test.js`, `avis.test.js` |
| CYC-01 passages en données | Fait (0.14.0) : 33 passages livrés depuis la 0.16.0 (valideur, regroupement), tout passage absent refusé ; passage par une route propre refusé par la route des passages ; « Planifiée » et « Confiée à un prestataire » fermés jusqu'à leurs étapes (DV-118) | `cycle.test.js`, `fusion.test.js` |
| CYC-02 historique | Fait (0.14.0) : chaque passage avec auteur, canal, motif et commentaire ; « Le chef de service » pour les passages du valideur (0.16.0) | `cycle.test.js`, `validation.test.js` |
| CYC-03 tâches | À faire, étape 16 | |
| CYC-04 libellés des états par entité | Fait (0.14.0) : texte du demandeur et de la GRC, FR et NL ; envoi à la GRC à l'étape 38 ; fiche du chef à la troisième personne à l'écran (0.17.0), pas encore par l'API (E-49) | `cycle.test.js`, `pages.test.tsx`, `demandes.test.tsx` |
| SUI-02 ligne du temps | Fait (0.14.0) | `demandes.test.tsx` |
| SUI-04 fil de messages | Fait (0.15.0) ; langue d'un message selon son texte (0.16.0, R2) ; avis d'un message par la cloche et le courriel (0.17.0) ; envoi à la GRC à l'étape 38 | `messages.test.js`, `demandes.test.tsx`, `avis.test.js` |
| SUI-09 abonnement | Fait (0.15.0) ; avis des changements d'état aux personnes qui suivent (0.17.0) | `messages.test.js`, `fusion.test.js`, `decoupage.test.js`, `avis.test.js` |
| GES-03 vue en colonnes par état | Fait (0.16.0) | `demandes.test.tsx`, `mobile:check` |
| GES-05 création par le gestionnaire | Fait (0.16.0) ; l'agent reçoit l'accusé (0.17.0) | `encodage.test.js`, `demandes.test.tsx`, `avis.test.js` |
| GES-06 fusion et découpage | Fait (0.16.0) ; croix du volet qui ramène à la fiche (0.17.0) | `fusion.test.js`, `decoupage.test.js`, `demandes.test.tsx` |
| GES-08 notes internes avec mention | Fait (0.15.0) ; mention prévenue par la cloche et le courriel (0.17.0) | `messages.test.js`, `demandes.test.tsx`, `avis.test.js` |
| GES-09 modèles de réponse | Fait (0.15.0) | `modeles-reponse.test.js`, `demandes.test.tsx` |
| SUI-05 complément et annulation | Fait (0.14.0) ; annulation aussi d'une demande en attente de validation (0.16.0) | `cycle.test.js`, `validation.test.js` |
| SUI-06 avis et réouverture | Fait (0.14.0) | `cycle.test.js`, `demandes.test.tsx` |
| CLO-01 clôture avec cause | Fait (0.14.0) | `cycle.test.js` |
| GES-01, GES-02, GES-04, PRI-01 à PRI-03 | Fait en partie (E-35) ; 0.14.0 : compteurs « En attente depuis plus de N jours ouvrés » et « À clôturer », suspension du délai ; 0.16.0 : délais d'une demande validée comptés depuis la validation ; 0.17.0 : alerte d'échéance proche et de retard (PRI-03) à qui a qualifié, sinon au service technique | `qualification.test.js`, `suspension.test.js`, `validation.test.js`, `avis.test.js` |
| SEC-01 cloison vérifiée par un test généré | Fait, notifications comprises (0.17.0) ; vérifiée aussi sur NIXUS (`recette.sh`, contrôle DV-113) | `cloison.test.js`, `photo-lieu-demande.test.js` |
| SEC-02 lecture limitée aux siennes | Fait ; notes internes au service seul ; le chef lit les seules demandes à valider de ses services (0.16.0) ; chaque personne ses seules notifications, courriels et modèles à l'administrateur seul (0.17.0) | `demandes.test.js`, `tickets.test.js`, `validation.test.js`, `notifications.test.js`, `courriel.test.js` |
| ERG-03 accueil adapté au rôle | Fait pour le demandeur, le service technique et le chef de service ; ouvrier à l'étape 18 | `demandes.test.tsx` |
| ERG-09 saisie gardée après un refus | Fait pour les formulaires du cycle de vie, du regroupement et du découpage | `demandes.test.tsx` |
| ERG-08 aucun jargon | Fait ; journal d'audit sans code brut (0.13.0) ; aucun numéro d'étape dans un texte montré (0.15.0) | `help.test.ts`, `i18n.test.ts`, `pages.test.tsx` |
| ERG-01, ERG-05, ERG-06 identité, 360 px, accessibilité | Fait ; en-tête tenu dans 320 px avec la cloche (choix de l'entité dans le menu, 0.17.0) | `pages.test.tsx`, `couleurs.test.tsx`, `mobile:check` |
| AID-01 à AID-04 aide par écran | Fait ; Paramètres (courriel, modèles), Accueil (cloche), Mes demandes (avancement) à jour (0.17.0) | `help.test.ts`, `pages.test.tsx` |
| Tickets (standard, section 13.5) | Fait ; avis de création et de réponse (0.17.0) | `tickets.test.js`, `avis.test.js` |
| CYC-05 aucune suppression | Fait | `demandes.test.js`, `faq.test.js`, `cycle.test.js`, `fusion.test.js` |
| RGPD-01, RGPD-02, RGPD-10, RGPD-12 | Fait selon les versions précédentes ; 0.17.0 : notifications et courriels sans texte libre, conservation (90 et 365 jours, courriels 90 jours), mode test sans envoi | `NOTES_LIVRAISON_v0.17.0.md` |
| TEC-03 connexion Microsoft | Fait en 0.10.0, recetté | `sso.test.js` |
| TEC-05 acceptance NIXUS | Fait, ports 18443 et 18080 (E-14) | |
| TEC-06 `backup.sh` et tâche DSM | Script fait ; tâche DSM à créer | |
| TEC-07 commandes NIXUS une par une | Fait pour 0.1.0 à 0.17.0 ; contrôles automatiques par `recette.sh` | `NOTES_LIVRAISON_v0.17.0.md`, `APRES-DEPLOIEMENT.md`, `recette.test.js` |
| API-03, API-04, API-05 | Fait pour les routes de la version, sauf six routes de fichiers (E-17) ; seize outils MCP en 0.17.0, parité testée | `api.test.js`, `mcp.test.js`, `cycle.test.js` |
| Journal d'audit (standard, section 17.3) | Champs changés seulement ; tout champ écrit nommé à l'écran ; réglages du courriel (mot de passe masqué), essai, modèles sans texte (0.17.0) | `journal-diff.test.js`, `journal-noms.test.js`, `pages.test.tsx`, `courriel.test.js`, `modeles-courriel.test.js` |
| Toutes les autres exigences | À faire selon `PLANNING-GMAO.md` | |

## 4. Actions ouvertes

| Action | Qui | Bloque |
| --- | --- | --- |
| Verser la 0.17.0 sur GitHub, la publier, l'installer sur NIXUS et la recetter (`NOTES_LIVRAISON_v0.17.0.md`) | Thierry, avec Claude | 0.18.0 |
| Obtenir l'accord de Renaud sur E-48 (`nodemailer` 10.6.0) avant tout envoi réel ; choisir le serveur SMTP de l'organisation | Thierry, Renaud | Envoi réel des courriels, production |
| Atelier : textes des quinze modèles de courriel, avis jugés utiles ou trop nombreux pour le demandeur, le chef et le service technique (D-11) | Thierry, service technique | Rien |
| Contrôle 11 (Android) de la 0.16.1 et de la 0.17.0 : dépôt d'un aménagement avec une vraie photo, photo vue chez `valideur.ac`, demande « Danger » partie sans validation, cloche (DV-137) | Thierry (avec un agent) | Prochain passage sur téléphone |
| Règle du danger sans validation (DV-135) à reconfirmer avec le service technique et les chefs de service avant la production (DV-137) | Thierry | Avant la production |
| Saisir les vrais services de l'AC et du CPAS et leurs chefs dans « Services et valideurs », rattacher les agents (atelier, D-11) ; décider avec Renaud de la lecture du chef dans Entra ID ou SAGA (E-47) | Thierry, Renaud, service technique | Production |
| Atelier : catégories soumises à validation (seul « Aménagement, déménagement, achat » l'est) ; intérêt de la vue en colonnes ; textes des quatre modèles de réponse livrés (D-11) | Thierry, service technique | Rien |
| Atelier : motifs d'attente, motifs de refus et causes de panne livrés (5, 4 et 7), motifs suspensifs, libellés des états (D-11) | Thierry, service technique | Rien |
| Atelier : lieux de démonstration sans cuisine à la Maison communale ni au CPAS (seulement à l'école) ; un responsable peut ajouter le local à l'écran ; lieux réels à l'étape 32 | Thierry, service technique | Rien |
| Contrôles sur un vrai iPhone (Edge) et un Android (Chrome) : en-tête avec la cloche, langue et entité dans le menu, photo de l'endroit agrandie au toucher, contrôle 11 de la 0.12.0 (DV-80, DV-102) | Thierry (Android : avec un agent) | Recette finale |
| Photos réelles : droits de chaque photo (AC-B3-L01 en particulier) et choix définitif à revoir avant toute production (DV-115) ; photos manquantes : AC-B2-L01 (atelier rangé), CPAS-B1-L02 (bureau à refaire, tableau et bureau dégagés) | Thierry | Production |
| Lancer `npm run help:capture` et `npm run mobile:check` sur le poste (après `npx playwright install chromium`) ou les laisser « non joués » (DV-96) | Thierry | Rien |
| Renouveler le secret client de l'inscription « GMAO (écolage Thierry) » avant le 02/05/2027 (colonne Valeur) | Thierry | Connexion Microsoft après le 02/05/2027 |
| Prendre en compte E-37, E-40, E-41, E-43, E-44, E-45 et E-46 dans le gabarit ; confirmer E-36 et E-37 ; corriger E-38 ; décider E-47, E-48 et E-49 | Renaud | Rien en écolage |
| Décider du passage en mode `sso` avant la production (DV-98) | Renaud et Thierry | Mise en production |
| Confirmer E-34 (métadonnées des PDF joints) avant l'utilisation réelle | Renaud | Mise en production |
| Relier le dépôt au projet Claude (`GITHUB.md`, section 4.3) quand Renaud aura activé l'intégration | Renaud, puis Thierry | Rien |
| Rediscuter E-29 (`dist/` dans l'archive) avant l'utilisation réelle (DV-79) | Renaud et Thierry | Mise en production |
| Régler le téléphone d'urgence et le contact du DPO de chaque entité | Responsables du service technique | Rien |
| Faire valider par le DPO les mentions d'information livrées | DPO, avec le responsable | Avant la production |
| Porter au registre et à l'analyse d'impact les traitements des versions 0.4.1 à 0.16.0 (voir les versions) ; 0.17.0 : notifications (destinataire, événement, numéro, lecture), file et journal des courriels (adresse, texte composé, résultat), alertes d'échéance ; serveur de courriel de l'organisation comme sous-traitant quand l'envoi réel sera activé ; conservation à fixer (D-09) | DPO, formalisme mené en parallèle | Rien |
| Atelier catégories, priorités, délais et questions avec le service technique de chaque entité (D-11) | Métier, responsable | Rien |
| Montrer en atelier : la cloche du chef de service puis celle de l'agent après la décision, un courriel en mode test dans le journal des courriels, un modèle de courriel et son aperçu (0.17.0) ; une demande d'aménagement validée par le chef puis transmise, une demande encodée après un appel, deux doublons regroupés, une demande découpée, la vue en colonnes (0.16.0) ; l'échange dans le fil, la note interne, un modèle de réponse (0.15.0) ; le parcours complet d'une demande (0.14.0) ; « Moi aussi » ; tableau de bord et qualification ; signalement d'un ticket ; aide et FAQ locale ; Patrimoine « Sans photo » | Thierry, avec le métier | Rien |
| Captures de 3P côté gestionnaire ; captures d'une « Werkopdracht » et d'une « Ontlening » | Thierry | Étapes 16 et 25 |
| Créer la tâche planifiée DSM de sauvegarde (`bash /volume1/docker/monapp/backup.sh`, root, 02:00) | Thierry ou l'IT | TEC-06 |
| Chercher pourquoi Container Manager s'était arrêté sur NIXUS (22/10/2026) | Thierry ou l'IT | Rien |
| Décider de la mise à jour de l'outillage de l'interface (E-18) et du passage à `react-router-dom` 7 (E-09) | Renaud | Rien |
| Inscrire la GMAO (18443, 18080) au tableau 15.2 du standard | Renaud | Rien |
| Décisions ouvertes D-01 à D-13 et D-15 à D-17 | Voir le cahier des charges, section 32 | Voir `PLANNING-GMAO.md` |

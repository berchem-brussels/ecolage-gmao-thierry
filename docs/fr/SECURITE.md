# Sécurité

Le français fait foi. Grille de la section 10.2 du standard, rejouée à chaque version. « Non joué » veut dire que le contrôle n'a pas tourné.

## 0.7.5 (29/10/2026)

Lieux récents (DV-74), bandeau de connexion (DV-53), affichage du journal d'audit (DV-76). Environnement : bac à sable de Claude, Node 22.23.4. Aucune route, aucune migration, aucune dépendance nouvelles.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Connexion inchangée côté serveur (message, limite de 15 essais) ; le bandeau d'échec s'efface à l'écran seulement | Conforme (tests, `pages.test.tsx`) |
| Autorisation | `lieux_recents` du profil : seulement les demandes de la personne elle-même, dans l'entité active | Conforme (`lieux-recents.test.js`) |
| IDOR | Aucune route nouvelle ; le profil ne prend aucun identifiant en entrée | Conforme |
| Cloison AC et CPAS | Lieux récents de l'entité active seulement ; changement d'entité testé | Conforme (`lieux-recents.test.js`, `cloison.test.js`) |
| Injections | Une requête nouvelle, constante, paramètres liés | Conforme (test statique `securite.test.js`) |
| Données | Aucune donnée enregistrée en plus : les lieux récents sont lus dans les demandes existantes ; lieux désactivés exclus | Conforme (`lieux-recents.test.js`) |
| Secrets commités | `.gitignore` inchangé | Conforme : seul `.env.example`, aucune base, aucun `dist/`, aucune valeur de NIXUS |
| Interface | Texte rendu par React, sans HTML injecté ; liste des lieux récents nommée pour les lecteurs d'écran | Conforme (tests, `a11y`, axe-core en NL) |
| Infrastructure | Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `ci.yml` inchangés | Conforme |
| Dépendances | `npm audit --omit=dev` serveur | 0 vulnérabilité |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées (E-09), inchangées |
| LLM et MCP | `get_profile` rend `lieux_recents` comme l'API ; instructions du client complétées ; aucun outil nouveau | Conforme (`lieux-recents.test.js`, `mcp.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests (0.7.5)

Services `demandes.js` et `session.js` de la 0.7.4 remis en place : `lieux-recents.test.js` échoue (1 réussi, 7 échecs). Écrans `LoginPage.tsx`, `JournalPage.tsx` et `LieuPicker.tsx` de la 0.7.4 remis en place : 5 tests de l'interface échouent (bandeau de connexion, « Oui » et « Non » du journal en FR et en NL, lieux récents en FR et en NL). Code de la 0.7.5 : tout réussi.

## 0.7.4 (29/10/2026)

Noms du lieu et de la catégorie dans le détail du journal d'audit (DV-50). Environnement : bac à sable de Claude, Node 22.23.4. Aucune route, aucune migration, aucune dépendance nouvelles.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Inchangée ; test généré sur toutes les routes | Conforme (tests) |
| Autorisation | Journal toujours réservé à l'administrateur, par l'API comme par le MCP ; les noms ne sont rendus que dans le journal | Conforme (`journal.test.js`, `journal-noms.test.js`) |
| IDOR | Aucune route nouvelle ; `GET /api/audit/:id` inchangé (administrateur seul) | Conforme (`journal-noms.test.js`) |
| Validation | Inchangée ; un identifiant du détail qui n'est pas un entier positif n'est pas cherché | Conforme (`journal-noms.test.js`) |
| Injections | Deux requêtes nouvelles, constantes, identifiants passés en un seul paramètre JSON (`json_each(?)`) ; aucune interpolation | Conforme (test statique `securite.test.js`) |
| Données | Aucune donnée enregistrée en plus : les noms sont lus à l'affichage, le journal ne change pas. Le bénéficiaire d'une demande reste un identifiant | Conforme (`journal-noms.test.js` : `details_json` sans nom) |
| Secrets commités | `.gitignore` inchangé | Conforme : seul `.env.example`, aucune base, aucun `dist/`, aucune valeur de NIXUS |
| Interface | Texte rendu par React, sans HTML injecté | Conforme (tests, `a11y`) |
| Infrastructure | Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `ci.yml` inchangés | Conforme |
| Dépendances | `npm audit --omit=dev` serveur | 0 vulnérabilité |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées (E-09), inchangées |
| LLM et MCP | `list_audit` et `get_audit` rendent `noms` comme l'API ; aucun outil nouveau | Conforme (`journal-noms.test.js`, `mcp.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests (0.7.4)

Service du journal de la 0.7.3 remis en place : `journal-noms.test.js` échoue (1 réussi, 5 échecs ; seul le test MCP passe, faute de `noms` des deux côtés) ; code de la 0.7.4 : 6 sur 6. Écran du journal de la 0.7.3 remis en place : les deux tests nouveaux de `pages.test.tsx` échouent ; code de la 0.7.4 : réussis. Sans la note 0.7.4, le test du catalogue des notes échoue.

## 0.7.3 (29/10/2026)

Correctif de sécurité des dépendances du serveur, sans changement fonctionnel (E-24, E-30), sur accord de Renaud. Environnement : bac à sable de Claude, Node 22.23.4 ; parcours du travail `tests` rejoué sous Node 20.20.2 sur les seuls fichiers versés par Git. Aucune route, aucune migration, aucune dépendance nouvelles.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Inchangée ; test généré sur toutes les routes | Conforme (tests) |
| Autorisation | Inchangée ; cloison AC et CPAS rejouée | Conforme (`cloison.test.js`) |
| Validation | Inchangée ; lecture des corps JSON par `body-parser` 1.20.9 | Conforme (tests) |
| Injections | Aucune requête nouvelle | Conforme (test statique `securite.test.js`) |
| Données | Inchangées | Conforme |
| Secrets commités | `.gitignore` inchangé ; 221 fichiers que Git verserait | Conforme : seul `.env.example`, aucune base, aucun `dist/`, aucune valeur de NIXUS |
| Interface | Inchangée | Conforme (tests) |
| Infrastructure | Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `ci.yml` inchangés | Conforme |
| Dépendances | `npm audit --omit=dev` serveur | **0 vulnérabilité** : `body-parser` 1.20.8 → 1.20.9 (haute, GHSA-27r3-jxmh-p828), `fast-uri` 3.1.8 → 3.1.9 (modérée), `qs` 6.16.0 → 6.16.2 (modérée), par `npm update body-parser qs fast-uri --no-save` ; `package.json` inchangé ; Express 4.22.3 inchangé ; jamais `npm audit fix`. E-24 et E-30 corrigés |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées (E-09), inchangées |
| LLM et MCP | Aucun outil nouveau | Conforme (`mcp.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests (0.7.3)

Verrou du serveur de la 0.7.2 remis en place : `dependances.test.js` échoue (1 réussi, 1 échec : `node_modules/body-parser 1.20.8 < 1.20.9`) ; verrou de la 0.7.3 : 2 sur 2. Sans la note 0.7.3, le test du catalogue des notes échoue ; le test nouveau de la note 0.7.3 vérifie qu'elle ne s'ouvre ni pour le demandeur ni pour le responsable.

## 0.7.2 (29/10/2026)

Version sans changement fonctionnel : code prêt pour le dépôt public GitHub (licence EUPL-1.2). Environnement : bac à sable de Claude, Node 22.23.4 ; parcours du travail `tests` rejoué aussi sous Node 20.20.2 sur une copie qui ne contient que les fichiers versés par Git. Aucune route, aucune migration, aucune dépendance nouvelles.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Inchangée ; test généré sur toutes les routes | Conforme (tests) |
| Autorisation | Inchangée ; cloison AC et CPAS rejouée | Conforme (`cloison.test.js`) |
| Validation | Inchangée | Conforme (tests) |
| Injections | Aucune requête nouvelle | Conforme (test statique `securite.test.js`) |
| Données | Adresse, ports et dossiers de l'hôte d'acceptance remplacés par des valeurs d'exemple dans tous les fichiers de l'archive (`192.0.2.10`, 18443, 18080, `/volume1/docker/monapp`) ; adresse professionnelle d'un test d'écran remplacée par `jean.dupont@exemple.test` ; test de portabilité élargi à toute adresse IPv4 privée dans le code | Conforme (recherche sur les fichiers versés par Git : aucune occurrence) ; preuve d'échec ci-dessous |
| Secrets commités | `.gitignore` complété (`.env.*` sauf `.env.example`, fichiers de base SQLite, sauvegardes, certificats, clés, journaux) ; recherche de motifs de secrets sur les 219 fichiers que Git verserait | Conforme : aucun `.env`, aucune base, aucun `dist/`, aucun secret |
| Interface | Inchangée ; axe-core sans violation, FR et NL | Conforme (tests) |
| Infrastructure | Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env` inchangés ; `.github/workflows/ci.yml` ajouté (lecture du dépôt seulement, aucun secret, aucun déploiement) | Conforme |
| Dépendances | `npm audit --omit=dev` serveur | **1 haute, 2 modérées**, inchangées (`body-parser`, `fast-uri`, `qs`) ; E-24 ouvert, décision de Renaud ; jamais `npm audit fix`. Conséquence : l'étape `npm audit --omit=dev --audit-level=high` du travail `tests` échoue tant que E-24 n'est pas tranché (E-30) |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées (E-09), inchangées |
| LLM et MCP | Aucun outil nouveau | Conforme (`mcp.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests (0.7.2)

Ligne `// 10.1.2.3` (adresse privée) ajoutée à `backend/src/config.js` : le test de portabilité élargi échoue (1 réussi, 1 échec) ; retirée : 2 sur 2. Sans la note 0.7.2, le test du catalogue des notes échoue ; le test nouveau de la note 0.7.2 vérifie qu'elle ne s'ouvre ni pour le demandeur ni pour le responsable.

## 0.7.1 (28/10/2026)

Correctif de la recette de la 0.7.0 (DV-04). Environnement : bac à sable de Claude, Node 22.23.4, Chromium (Playwright) sur l'interface construite et l'API réelle, base jetable. Aucune route, aucune migration, aucune dépendance nouvelles.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Inchangée ; test généré sur toutes les routes | Conforme (tests) |
| Autorisation | Inchangée ; cloison AC et CPAS rejouée | Conforme (`cloison.test.js`) |
| Validation | Schéma `brouillonSave` : le lieu admet `nature` (texte de 20 caractères au plus), rendu par le profil ; tout autre champ inconnu reste refusé (`additionalProperties: false`, testé). Interface : le lieu du brouillon est réduit aux champs du schéma | Conforme (`formulaire.test.js`, `demandes.test.tsx`) ; preuve d'échec ci-dessous |
| Injections | Aucune requête nouvelle | Conforme (test statique `securite.test.js`) |
| Données | Aucune donnée nouvelle ; la nature du lieu est déjà lisible par la personne ; mention complète livrée reformulée (« Responsable du traitement : … »), sens inchangé, à faire valider par le DPO comme en 0.7.0 | Conforme |
| Interface | Message « Brouillon enregistré à … » vérifié avec le lieu proposé d'office ; axe-core sans violation, FR et NL | Conforme (tests, contrôle visuel) |
| Infrastructure | Dockerfile, compose, `nginx.conf`, `.env` inchangés ; image non reconstruite dans le bac à sable | Non joué (rien de changé côté image) |
| Dépendances | `npm audit --omit=dev` serveur | **1 haute, 2 modérées**, inchangées (`body-parser`, `fast-uri`, `qs`) ; E-24 ouvert avant la production, décision de Renaud ; jamais `npm audit fix` |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées (E-09), inchangées |
| LLM et MCP | Aucun outil nouveau ; `save_brouillon` suit le schéma ; parité vérifiée | Conforme (`mcp.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests (0.7.1)

Schéma remis dans son état 0.7.0 (sans `nature`) : le test nouveau de `formulaire.test.js` échoue (27 réussis, 1 échec) ; rétabli : 28 sur 28. Lieu du brouillon envoyé tel quel par l'interface (état 0.7.0) : le test renforcé de `demandes.test.tsx` échoue ; rétabli : 127 sur 127. Sans la note 0.7.1, le test du catalogue des notes échoue. Le défaut n'avait pas été vu en 0.7.0 parce que le lieu proposé simulé par les tests de l'interface n'avait pas de nature, et qu'aucun test du serveur n'envoyait au brouillon le lieu tel que le profil le rend.

## 0.7.0 (28/10/2026)

Étape 7 du planning. Environnement : bac à sable de Claude, Node 22.23.4, Chromium (Playwright) sur l'interface construite et l'API réelle, base jetable. Migration `006_demandes_formulaire` (tables et colonnes ajoutées seulement) ; routes nouvelles : `GET /api/demandes/voisines`, `POST /api/demandes/:id/suivre`, `GET /api/demandes/beneficiaires`, `GET`, `PUT`, `DELETE /api/demandes/brouillon`, `GET` et `POST /api/categories/:id/questions`, `GET`, `PUT`, `DELETE /api/questions-categorie/:id`. Aucune dépendance nouvelle.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Test généré sur toutes les routes, nouvelles comprises | Conforme (tests) |
| Autorisation | Cloison AC et CPAS : les routes à identifiant nouvelles sont dans `RESSOURCES` et `ECRITURES` de `cloison.test.js` (lecture et écriture refusées depuis l'autre entité, par l'API et le MCP, objet inchangé) ; demandes voisines et « Moi aussi » limitées à l'entité active ; réponse à une question de l'autre entité refusée ; brouillon lu par la seule personne ; écriture des questions réservée à `categories:gerer`, des mentions à `parametres:gerer` | Conforme (`cloison.test.js`, `voisines.test.js`, `formulaire.test.js`) |
| Validation | Schémas `ajv` à `additionalProperties: false` sur chaque corps nouveau ; règles métier refusées avec un code (`DEMANDE_PROPRE`, `DEMANDE_FERMEE`, `BENEFICIAIRE_INVALIDE`, `BENEFICIAIRE_DOUBLE`, `DATE_SOUHAITEE_INVALIDE`, `QUESTION_REPONSES`, `QUESTIONS_MAX`, `QUESTION_INVALIDE`, `REPONSE_INVALIDE`, `REPONSE_OBLIGATOIRE`) ; variables inconnues d'une mention refusées ; aucun numéro consommé par un dépôt refusé | Conforme (tests) ; preuve d'échec ci-dessous |
| Injections | Requêtes nouvelles paramétrées ; la liste des lieux du bâtiment n'ajoute que des « ? » | Conforme (test statique `securite.test.js`) |
| Données | Données nouvelles : bénéficiaire, date et moment, remarque du « Moi aussi », brouillon, réponses aux questions ; minimisation : ni nom ni numéro dans la liste des demandes voisines, remarque lue par le seul service technique, nom du demandeur caché à qui suit seulement, heure P1 cachée au demandeur ; journal sans texte libre (nombre de réponses, `beneficiaire_texte` à 1) ; brouillons hors journal (écart E-27) ; mentions d'information et DPO par entité (RGPD-10) | Conforme ; E-27 à soumettre |
| Interface | axe-core sans violation, FR et NL (formulaire, questions, réglages, aide) ; rouge des erreurs à 4,5:1 au moins en clair et en sombre (E-26 corrigé, `couleurs.test.tsx`) ; contrôle visuel à 1280 et 360 px, gabarits iPhone 13 et Galaxy S9+, aucun défilement horizontal | Conforme (tests, contrôle visuel) |
| Infrastructure | Dockerfile, compose, `nginx.conf`, `.env` inchangés | Non joué (rien de changé côté image) |
| Dépendances | `npm audit --omit=dev` serveur | **1 haute, 2 modérées** : `body-parser` < 1.20.9, `fast-uri` ≤ 3.1.8 et, publié depuis la 0.5.2 sans changement du verrou, `qs` 6.7.0 à 6.16.0 (GHSA-6pq8-jhm2-2vcw, déni de service de `qs.stringify` avec `arrayFormat: 'comma'`, option que l'application n'emploie pas) ; E-24 ouvert avant la production, décision de Renaud ; jamais `npm audit fix` |
| Dépendances | `npm audit --omit=dev` interface ; `npm audit` complet | 3 modérées (E-09) ; 1 basse, 7 modérées, 6 hautes, outillage (E-18) ; inchangés |
| LLM et MCP | Onze outils nouveaux, dont deux en deux appels (`prepare_` et `confirm_`) ; parité vérifiée ; désactivation d'une question et effacement du brouillon en `prepare_` et `confirm_` | Conforme (`mcp.test.js`, `formulaire.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests (0.7.0)

Chaque contrôle nouveau retiré un à un, puis rétabli : sans le contrôle des questions obligatoires au serveur, 2 tests échouent ; sans la cloison des questions, 4 ; sans le blocage de l'envoi à l'écran, 1 ; sans le contrôle des variables d'une mention, 1 (serveur) ; sans la mention au formulaire, 2 (interface) ; sans le rouge du thème clair, 1. Rétablis : serveur 287 sur 287, interface 127 sur 127.

## 0.5.2 (27/10/2026)

Correctif de la recette du 27/10/2026 (DV-04). Environnement : bac à sable de Claude, Node 22.23.4 (après `rm -rf node_modules && npm ci`), Chromium (Playwright) sur l'interface construite et l'API réelle. Aucune route, aucune migration, aucune dépendance nouvelles ; serveur inchangé hors note de version et numéro.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Inchangée ; test généré sur toutes les routes. L'écran de connexion contrôle en plus le format de l'adresse avant l'envoi ; le serveur garde son propre contrôle et son message unique | Conforme (tests) |
| Autorisation | Inchangée ; cloison AC et CPAS rejouée | Conforme (`cloison.test.js`) |
| Validation | Interface : adresse e-mail vide ou faite d'espaces, un seul message (« Ce champ est obligatoire ») ; mal formée, « Adresse e-mail non valide » (Utilisateurs et rôles, installation, connexion, contact de l'entité). Serveur : refus inchangé, par l'API et le MCP | Conforme (`pages.test.tsx`) ; preuve d'échec ci-dessous |
| Injections | Aucune requête nouvelle | Conforme (test statique `securite.test.js`) |
| Données | Aucune donnée nouvelle ; aucune ligne de journal nouvelle | Conforme |
| Interface | Champs en 16 px jusqu'à 768 px de large ; zoom à deux doigts permis (balise `viewport` sans `maximum-scale` ni `user-scalable`, WCAG 1.4.4) ; boutons de suite d'une demande espacés de 12 px ; axe-core sans violation, FR et NL ; contrôle visuel à 1280 et 360 px, gabarits iPhone 13 et Galaxy S9+, aucun défilement horizontal. E-26 (rouge d'erreur à 3,3:1) inchangé | Conforme (tests, contrôle visuel) ; Safari réel à confirmer à la recette ; E-26 ouvert |
| Infrastructure | Dockerfile, compose, `nginx.conf`, `.env` inchangés ; image non reconstruite dans le bac à sable | Non joué (rien de changé côté image) |
| Dépendances | `npm audit --omit=dev` serveur | **1 haute, 1 modérée**, inchangées (`body-parser` < 1.20.9, `fast-uri` ≤ 3.1.8) ; E-24 ouvert avant la production, décision de Renaud ; jamais `npm audit fix` |
| Dépendances | `npm audit --omit=dev` interface ; `npm audit` complet | 3 modérées (E-09) ; 1 basse, 7 modérées, 6 hautes, outillage (E-18) ; inchangés |
| LLM et MCP | Aucun outil nouveau ; parité vérifiée | Conforme (`mcp.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests (0.5.2)

Les sept fichiers de l'interface corrigés (`NouvelleDemandePage.tsx`, `index.css`, `validation.ts`, `i18n.ts`, `UsersPage.tsx`, `LoginPage.tsx`, `ReglagesForm.tsx`) remis dans leur état 0.5.1 : 5 tests de l'interface échouent sur 95 (boutons espacés, champs en 16 px, adresse e-mail dans trois écrans), 90 réussissent. Le test de la balise `viewport` réussit dans les deux états : il garde le zoom à deux doigts contre un retour en arrière. Fichiers rétablis : 95 sur 95. Côté serveur, sans la note 0.5.2, 8 tests des notes de version échouent sur 238 ; note rétablie : 238 sur 238.

## 0.5.1 (26/10/2026)

Correctif de la recette du 26/10/2026 (DV-04). Environnement : bac à sable de Claude, Node 22.23.4 (après `rm -rf node_modules && npm ci`), Chromium (Playwright) sur l'interface construite et l'API réelle. Aucune route, aucune migration, aucune dépendance nouvelles ; serveur inchangé hors note de version et numéro.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Inchangée ; test généré sur toutes les routes | Conforme (tests) |
| Autorisation | Inchangée ; cloison AC et CPAS rejouée | Conforme (`cloison.test.js`) |
| Validation | Interface : champ obligatoire vide ou fait seulement d'espaces signalé sous le champ avant l'envoi, dans tous les formulaires ; mots de passe refusés seulement vides (espaces gardés, DV-37). Serveur : refus inchangé, par l'API et le MCP | Conforme (`pages.test.tsx`, `demandes.test.tsx`, `espaces.test.js`) ; preuve d'échec ci-dessous |
| Injections | Aucune requête nouvelle | Conforme (test statique `securite.test.js`) |
| Données | Aucune donnée nouvelle ; aucune ligne de journal nouvelle | Conforme |
| Interface | Liste des bâtiments refermable (`aria-expanded`, focus rendu) ; messages d'erreur reliés au champ (`aria-invalid`, `aria-describedby`, `role="alert"`) ; axe-core sans violation, FR et NL ; parcours à 1280 et 360 px, gabarits iPhone 13 (NL) et Galaxy S9+ (FR), aucun défilement horizontal. Le rouge d'erreur d'Ant Design (`#ff4d4f`) contraste à 3,3:1 sur blanc, sous 4,5:1 : écart E-26 | Conforme (tests, contrôle visuel) ; E-26 ouvert |
| Infrastructure | Dockerfile, compose, `nginx.conf`, `.env` inchangés ; image non reconstruite dans le bac à sable | Non joué (rien de changé côté image) |
| Dépendances | `npm audit --omit=dev` serveur | **1 haute, 1 modérée**, inchangées depuis la 0.5.0 (`body-parser` 1.20.8, `fast-uri` 3.1.8) ; sans accord de Renaud, correctif retiré de la 0.5.1 ; écart E-24 ouvert avant la production ; jamais `npm audit fix` |
| Dépendances | `npm audit --omit=dev` interface ; `npm audit` complet | 3 modérées (E-09) ; 1 basse, 7 modérées, 6 hautes, outillage (E-18) ; inchangés |
| LLM et MCP | Aucun outil nouveau ; parité vérifiée | Conforme (`mcp.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests (0.5.1)

Les sept fichiers d'écran corrigés (`LieuPicker.tsx`, `DemandesPage.tsx`, `NouvelleDemandePage.tsx`, `ListesValeursPage.tsx`, `EntitesPage.tsx`, `LoginPage.tsx`, `ReglagesForm.tsx`) remis dans leur état 0.5.0 : 9 tests de l'interface échouent sur 89 (les 8 tests nouveaux et le contrôle des clés de traduction), 80 réussissent. Fichiers rétablis : 89 sur 89. Côté serveur, le test de la note 0.5.1 échoue sans la note.

## 0.5.0 (26/10/2026)

Étape 5. Environnement : bac à sable de Claude, Node 22.23.4 (après `rm -rf node_modules && npm ci`), Chromium (Playwright) sur l'interface construite et l'API réelle, Docker 29.9.2 pour la mise à jour depuis la 0.4.1. Routes nouvelles : `GET`, `POST /api/demandes`, `GET /api/demandes/:id`, `PUT /api/auth/lieu-habituel` ; migration `005_demandes` ; aucune dépendance nouvelle.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Authentification | Les routes nouvelles exigent une session (test généré sur toutes les routes) ; écriture sans jeton anti-CSRF refusée | Conforme (tests) |
| Autorisation | Cloison : une demande, un lieu ou une catégorie de l'autre entité répond 403, par l'API et par le MCP, sans consommer de numéro ; liste de l'entité limitée à l'entité active | Conforme (`cloison.test.js`, `demandes.test.js`) ; preuve d'échec ci-dessous |
| Autorisation | SEC-02 : un demandeur ne lit que ses demandes ; la liste de l'entité (`perimetre=entite`) est réservée à `demandes:entite` (gestionnaire, responsable) | Conforme (tests) ; preuve d'échec ci-dessous |
| Autorisation | Lieu habituel : actif, dans une entité où le compte a un rôle ; sinon 409 | Conforme (tests) |
| Validation | Schéma `additionalProperties:false` : `etat`, `priorite`, `numero` envoyés par le client refusés (400) ; description de 10 caractères au moins comptés sans les espaces autour ; un seul lieu | Conforme (tests) |
| Validation | DV-37 : espaces de début et de fin retirés de toute chaîne reçue, routes et MCP, sauf les mots de passe ; champ obligatoire fait d'espaces refusé ; contrôle de tous les champs obligatoires de tous les schémas | Conforme (`espaces.test.js`) ; preuve d'échec ci-dessous |
| Logique | Numéro attribué dans la transaction, unique par contrainte (`numero`, et entité, année, rang) ; sans trou après un échec ; 40 attributions concurrentes et 20 dépôts simultanés par l'API : tous différents et consécutifs ; changement de mode sans réutilisation | Conforme (`numerotation.test.js`, `demandes.test.js`) |
| Injections | Requêtes paramétrées ; aucune valeur interpolée ; nettoyage de la migration par requêtes constantes, une par colonne | Conforme (test statique `securite.test.js`) |
| Données | Journal : `demande.create` sans la description (numéro, lieu, catégorie, priorité) ; `user.lieu_habituel` ; `systeme.espaces` avec les seuls champs changés ; empreintes des mots de passe jamais lues par le nettoyage | Conforme (tests) |
| Interface | Parcours de dépôt à 1280, 768 et 360 px, gabarits iPhone 13 et Galaxy S9+, FR et NL, aucun défilement horizontal ; axe-core sans violation sur les quatre écrans nouveaux, FR et NL | Conforme (contrôle visuel, tests) |
| Infrastructure | Image 0.5.0 : `id -u` 10001 ; CSP servie sur `/demandes/nouvelle` ; mise à jour depuis la 0.4.1 et retour, sans restauration | Conforme (bac à sable) |
| Dépendances | `npm audit --omit=dev` serveur | **1 haute, 1 modérée** : `body-parser` 1.20.8 (GHSA-27r3-jxmh-p828, déni de service par un corps compressé) et `fast-uri` 3.1.8 (quatre avis), publiées après la 0.4.1, verrou inchangé ; correctifs dans la même génération (`body-parser` 1.20.9, `fast-uri` 3.1.9) ; `npm audit fix` interdit : écart E-24, décision de Renaud |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées, inchangées (E-09) |
| Dépendances | `npm audit` complet de l'interface | 1 basse, 7 modérées, 6 hautes, outillage (E-18) ; base d'avis mise à jour depuis la 0.4.1, verrou inchangé |
| LLM et MCP | Outils `create_demande`, `list_demandes`, `get_demande`, `set_lieu_habituel` sous les droits de la personne, mêmes contrôles que l'API ; parité vérifiée | Conforme (`mcp.test.js`, `demandes.test.js`) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests

| Contrôle retiré | Suite | Résultat sans le contrôle |
| --- | --- | --- |
| `nettoyer()` retiré des routes et du MCP | `espaces.test.js` | 7 tests : 2 réussis, 5 échecs |
| SEC-02 : lecture d'une demande d'un autre agent | `demandes.test.js` | 13 tests : 11 réussis, 2 échecs |
| Cloison : entité de la demande lue et du lieu déposé | `cloison.test.js` | 33 tests : 30 réussis, 3 échecs |
| `perimetre=entite` ouvert à tout rôle | `demandes.test.js` | 13 tests : 11 réussis, 2 échecs |

Chaque contrôle remis, les suites repassent à 0 échec (53 tests sur les trois fichiers).

## 0.4.1 (23/10/2026)

Version de correctif (DV-04). Environnement : bac à sable de Claude, Node 22.22.0 (après `npm ci`), Chromium (Playwright) pour le contrôle visuel sur l'interface construite et l'API réelle. Aucune route nouvelle, aucune dépendance nouvelle, aucune migration. Seules les lignes touchées sont détaillées ; les autres contrôles de la grille ont été rejoués par les suites complètes et restent conformes.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Autorisation | Nom de l'auteur d'une modification rendu aux seules personnes qui ont un rôle dans l'entité de la fiche (`services/trace.js`, `voitLeNom`) ; hors de l'entité, la date seule ; la cloison refuse déjà la lecture de la fiche à une autre entité | Conforme (tests) ; preuve d'échec ci-dessous |
| Données | Les fiches ne rendent plus les identifiants internes des auteurs (`created_by`, `updated_by`) ; seuls un état, une date et un nom | Conforme (test) |
| Données | Journal d'audit : seuls les champs changés d'une catégorie, d'un congé, d'une fermeture, d'un lieu, d'une valeur de liste ou d'une entité, avec l'ancienne et la nouvelle valeur ; aucune ligne pour un enregistrement sans changement (minimisation) | Conforme (6 tests, tous en échec sur le code 0.4.0) |
| Injections | Lecture de la ligne avant modification par des requêtes constantes, une par table prévue ; aucun nom de table interpolé | Conforme (test statique `securite.test.js`) |
| Interface | Aucun défilement horizontal, 1280 et 360 px, gabarits iPhone 13 et Galaxy S9+, FR et NL ; axe-core sans violation sur le simulateur | Conforme (contrôle visuel, tests) |
| Dépendances | `npm audit --omit=dev` serveur | 0 vulnérabilité |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées, inchangées (E-09) |
| Dépendances | `npm audit` complet de l'interface | 1 basse, 7 modérées, 12 hautes, inchangées, outillage (E-18) |
| LLM et MCP | Aucun outil nouveau ; les outils des fiches rendent la même trace que l'API, sous les droits de la personne | Conforme (parité) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests

| Contrôle retiré | Suite | Résultat sans le contrôle |
| --- | --- | --- |
| Nom réservé aux personnes de l'entité (`voitLeNom` remplacé par « toujours ») | `trace.test.js` | 6 tests : 5 réussis, 1 échec |
| Journal limité aux champs changés (code 0.4.0 des six services) | `journal-diff.test.js` | 6 tests : 0 réussi, 6 échecs |

Chaque contrôle remis, les suites repassent à 0 échec.

## 0.4.0 (22/10/2026)

Environnement : bac à sable de Claude, Node 22.22.0 pour les suites (après `npm ci`), Chromium (Playwright) pour le contrôle visuel sur l'interface construite servie avec la CSP de `nginx.conf`. Seules les lignes touchées par la version sont détaillées ; les autres contrôles de la grille ont été rejoués par les suites et restent conformes.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Secrets | Aucun secret dans les catalogues nouveaux (`categories.json`, `priorites.json`, `calendrier.json`) | Conforme |
| Authentification | Toutes les routes nouvelles exigent une session ; la liste des routes libres est inchangée | Conforme (test d'énumération) |
| Autorisation | Écriture des catégories : permission `categories:gerer` dans l'entité active ; refus au demandeur, au gestionnaire, à l'administrateur sans rôle, par l'API et le MCP | 403 (tests) ; preuve d'échec ci-dessous |
| Autorisation | Écriture des priorités, de l'horaire, des congés et fermetures : permission `delais:gerer` ; mêmes refus | 403 (tests) ; preuve d'échec ci-dessous |
| Autorisation | Cloison : catégories et jours non ouvrés de l'autre entité refusés en lecture et en écriture, par l'API et le MCP ; nature sous un domaine de l'autre entité refusée ; priorités et horaire lus et écrits dans l'entité active seulement (personne habilitée dans les deux entités) ; simulateur avec une catégorie de l'autre entité refusé | 403 ou 409 (tests) ; preuve d'échec ci-dessous |
| Injections | Aucune interpolation de valeur dans le SQL ; `COLUMNS` et `FROM` constants dans les services nouveaux | Conforme (tests statiques) |
| Validation | Icône, priorité, couleur, unité hors catalogue ; heure `HH:MM` ; jour 1 à 7 ; `MM-JJ` et dates ISO ; délais bornés selon l'unité ; champ inconnu (`is_active: 0`, `code` d'une priorité) refusé | 400 ou 409 (tests) |
| Disponibilité | Calcul d'échéance borné : sans aucun jour ouvré sur trois ans, réponse `CALENDRIER_VIDE` au lieu d'une boucle | 409 (test) |
| Données | Aucune donnée personnelle nouvelle ; chaque écriture au journal d'audit avec l'entité ; ancienne et nouvelle valeur des priorités et de l'horaire | Conforme (tests) |
| Données | Migration `004_referentiel_demandes` sur une base 0.3.1 (AC, CPAS, une entité désactivée, un lieu) : valeurs livrées aux seules entités actives, rien d'autre touché, relance sans effet | Conforme (test) |
| Interface | Aucune violation de CSP, aucun défilement horizontal, 1280 et 360 px, FR et NL ; axe-core sans violation sur chaque onglet | Conforme (contrôle visuel, tests) |
| Dépendances | `npm audit --omit=dev` serveur | 0 vulnérabilité |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées, inchangées (E-09) |
| Dépendances | `npm audit` complet de l'interface | 1 basse, 7 modérées, 12 hautes, inchangées, outillage (E-18) |
| Dépendances | Aucune dépendance nouvelle (`dayjs/plugin/customParseFormat` fait partie de `dayjs`) | Conforme |
| LLM et MCP | Parité des routes et des outils, 25 outils exposés de plus ; désactivations et retours aux valeurs livrées en deux appels, droit contrôlé dès `prepare_*` | Conforme (tests) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests

| Contrôle retiré | Suite | Résultat sans le contrôle |
| --- | --- | --- |
| Permission `categories:gerer` (`services/categories.js`, `gestion`) | `categories.test.js` | 12 tests : 9 réussis, 3 échecs |
| Permission `delais:gerer` (`services/priorites.js`, `gestion`) | `priorites.test.js` | 8 tests : 5 réussis, 3 échecs |
| Permission `delais:gerer` (`services/calendrier.js`, `gestion`) | `calendrier.test.js` | 15 tests : 12 réussis, 3 échecs |
| Contrôle d'entité des catégories et des jours non ouvrés (`load` et `loadJour`) | `cloison.test.js` | 30 tests : 22 réussis, 8 échecs |

Chaque contrôle remis, les suites repassent à 0 échec.

## 0.3.1 (22/10/2026)

Version de contenu : texte de l'aide et de l'assistant, note de version. Aucun changement du serveur hors `config/notes-version.json`, aucune route nouvelle, aucune dépendance nouvelle, aucune migration. Grille rejouée par les suites complètes : conforme, comme en 0.3.0. `npm audit --omit=dev` : serveur 0, interface 3 modérées (E-09), inchangés. Aucun test de sécurité retiré ni affaibli. Les trois contrôles qui ne restent jamais « non joués » ont été joués par les suites (`securite.test.js`, `cloison.test.js`).

## 0.3.0 (22/10/2026)

Environnement : bac à sable de Claude, Node 22.22.0 pour les suites (après `rm -rf node_modules && npm ci`), Docker 29.9.1 pour les images (Node 20.19.5, nginx 1.27.5, prises sur `mirror.gcr.io`), Chromium pour le contrôle visuel. Images construites avec un certificat d'autorité ajouté pour le proxy du bac à sable, dans des Dockerfile de test non livrés ; les Dockerfile livrés sont inchangés depuis la 0.1.1. Seules les lignes touchées par la version sont détaillées ; les autres contrôles de la grille ont été rejoués par les suites et restent conformes.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Secrets | Aucun secret dans les catalogues de paramètres (`parametres-instance.json`, `parametres-entite.json`) ; page de connexion limitée aux paramètres marqués publics | Conforme (test : `default_ui_mode` absent de `/api/settings/public`) |
| Secrets | Archive sans `.env`, ni base, ni photo (`tar tzf`) | Conforme |
| Secrets | `/.env` par nginx | 404 (mesuré sur le compose) |
| Authentification | Toute route hors liste écrite exige une session (énumération, routes nouvelles comprises) ; la liste des routes libres est inchangée | Conforme (test) |
| Autorisation | Paramètres de l'instance et réglage des modules : administrateur seul, refus au responsable, par l'API et le MCP | 403 (tests) |
| Autorisation | Journal d'audit : administrateur seul (décision du 22/10/2026), par l'API et le MCP | 403 (tests) ; preuve d'échec ci-dessous |
| Autorisation | Réglages de l'entité : permission `parametres:gerer` dans l'entité active ; refus au gestionnaire, au demandeur, à l'administrateur sans rôle ; responsable dans une entité, simple demandeur dans l'autre : refus dans l'autre | 403 (tests) ; preuve d'échec ci-dessous |
| Autorisation | Cloison des réglages de l'entité : chaque entité lit et écrit seulement ses valeurs ; entité dans le corps refusée | Conforme (tests) |
| Autorisation | Module éteint : chaque route d'écriture des lieux, énumérée sur l'application montée, répond 403 `MODULE_DISABLED` ; outils MCP d'écriture retirés et refusés ; rôle contrôlé avant le module | Conforme (tests) ; preuve d'échec ci-dessous |
| Injections | Aucune interpolation de valeur dans le SQL ; `COLUMNS` et `FROM` du journal sont des constantes ; filtre `action` du journal en expression fermée, injection refusée (400) | Conforme (tests statiques et test) |
| Validation | Valeur d'un paramètre contrôlée selon le catalogue : choix hors liste, texte vide exigé, longueur, téléphone, adresse électronique, entier borné ; clé hors catalogue 404 | 400 ou 404 (tests) |
| Validation | Assistant d'installation : langue inconnue, module du noyau, module à venir, code inconnu refusés sans rien créer | 400 (test) |
| Validation | Dates du journal au format ISO seulement | 400 (test) |
| Données | Journal d'audit : chaque réglage, module, installation, nouveautés lues ; entité notée sur les actions d'une entité ; aucun mot de passe, empreinte ni jeton dans le détail | Conforme (tests) |
| Données | Migration `003_parametres` sur une base 0.2.0 réelle : aucune donnée perdue, photos lues ensuite ; retour à la 0.2.0 sur la base migrée | Conforme (compose du bac à sable) |
| API | Le journal n'a que deux routes de lecture ; aucune route n'écrit ni n'efface le journal | Conforme (test) |
| Ergonomie | Liens à la couleur principale de l'institution au lieu du bleu d'Ant Design (#1677ff, contraste insuffisant sur blanc) | Corrigé dans `App.tsx` |
| Dépendances | `npm audit --omit=dev` serveur | 0 vulnérabilité |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées, inchangées (E-09) ; aucune haute ni critique |
| Dépendances | `npm audit` complet de l'interface | 1 basse, 7 modérées, 12 hautes, inchangées, toutes dans l'outillage (E-18) |
| Dépendances | Aucune dépendance nouvelle | Conforme |
| Infrastructure | `id -u` dans `gmao-api` | `10001` |
| LLM et MCP | Parité des routes et des outils, routes nouvelles comprises ; retours à la valeur livrée en deux appels | Conforme (tests) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests

| Contrôle retiré | Suite | Résultat sans le contrôle |
| --- | --- | --- |
| Contrôle du module dans la gestion des lieux (`services/lieux.js`, `assertActif('patrimoine')`) | `modules.test.js` | 8 tests : 5 réussis, 3 échecs (écritures refusées, autre entité, outils MCP) |
| Contrôle de la permission `parametres:gerer` (`services/parametres-entite.js`, `gestion`) | `parametres-entite.test.js` | 6 tests : 3 réussis, 3 échecs (droits, cloison, MCP) |
| Réserve à l'administrateur (`services/journal.js`, `admin`) | `journal.test.js` | 7 tests : 6 réussis, 1 échec (lecture réservée) |

Chaque contrôle remis, les suites repassent à 0 échec.

## 0.2.0 (21/10/2026)

Environnement : bac à sable de Claude, Node 22.22.0 pour les suites, Docker 29.9.1 pour les images (Node 20.19.5, nginx 1.27.5), Chromium pour le contrôle visuel. Les images ont été construites avec un certificat d'autorité ajouté pour le proxy du bac à sable, dans des Dockerfile de test non livrés ; les Dockerfile livrés sont inchangés depuis la 0.1.1. Seules les lignes touchées par la version sont détaillées ; les autres contrôles de la grille ont été rejoués par les suites et restent conformes.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Secrets | Motifs de secrets, valeurs de repli, `eval`, `child_process` dans `src/` (tests statiques) | Conforme |
| Secrets | Archive sans `.env`, ni base, ni photo (`tar tzf`) ; aucune photo dans `demo.js` (test) | Conforme |
| Secrets | `/.env` et `/.git/config` par nginx | 404 (mesuré sur le compose) |
| Authentification | Toute route hors liste écrite exige une session (énumération, routes des lieux et des listes comprises) | Conforme (test) |
| Authentification | Photo lue sans session | 401 (test et nginx) |
| Autorisation | Cloison : lecture et écriture d'un lieu, d'une photo et d'une valeur de liste de l'autre entité, par l'API et le MCP | 403 (`cloison.test.js`, 21 tests) ; preuve d'échec ci-dessous |
| Autorisation | Parent ou type d'une autre entité à la création d'un lieu | 409 `LIEU_PARENT`, `VALEUR_INVALIDE` (test) |
| Autorisation | Écriture au rôle le plus bas : demandeur et administrateur sans rôle métier sur les lieux ; gestionnaire sur les listes | 403 (tests) |
| Autorisation | Entité dans le corps d'une création de lieu | 400, jamais lue (test) |
| Autorisation | Jeton `prepare_*` refusé à qui n'a pas le droit d'écrire | Conforme (test) |
| Injections | Aucune interpolation de valeur dans le SQL ; `COLUMNS` et `FROM` des nouveaux services sont des constantes | Conforme (tests statiques) |
| Injections | Chemin d'une photo : nom généré par le serveur, contrôlé par expression régulière et résolu sous `PHOTOS_DIR` avant toute lecture, écriture ou effacement | Conforme (revue du code) |
| Validation | Schéma `ajv` sur tout corps, requête et paramètre ; codes, natures, statuts et listes en liste fermée ; champ inconnu 400 | Conforme (tests) |
| Validation | Téléversement : exécutable renommé, type annoncé faux, SVG, fichier tronqué, dimensions de 9 000 pixels | 400 `FILE_TYPE` ou `FILE_INVALID` (tests) |
| Validation | Téléversement trop gros | 413 `PAYLOAD_TOO_LARGE` par l'API (test) ; 413 par nginx au-delà de 1 Mo (mesuré) |
| Validation | Métadonnées : EXIF, position GPS, appareil, commentaire du JPEG ; bloc texte du PNG | Absents du fichier écrit (tests) ; photo réelle de 3 000 × 2 000 px avec EXIF et GPS déposée par l'écran : fichier de 1 600 × 1 067 px sans EXIF (contrôle visuel) |
| Validation | Stockage hors racine web, lecture authentifiée, `nosniff`, `no-store` | Conforme (tests) |
| Données | Suppression réelle d'une photo, effacement de l'ancienne au remplacement, même d'un autre format | Conforme (tests : nombre de fichiers sur le disque) |
| Données | Journal d'audit des lieux, des valeurs et des photos, sans nom de fichier | Conforme (tests) |
| Données | Sauvegarde et restauration des photos | Jouées sur le compose (bac à sable) |
| API | CSRF sur le dépôt de photo | 403 `CSRF` sans en-tête (test) |
| API | Transitions côté serveur : désactivation d'un lieu qui contient des lieux actifs, réactivation sous un parent inactif, écriture sur un lieu désactivé | 409 (tests) |
| Dépendances | `npm audit --omit=dev` serveur | 0 vulnérabilité |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées, inchangées (E-09) ; aucune haute ni critique |
| Dépendances | `npm audit` complet de l'interface | 1 basse, 7 modérées, 12 hautes, toutes dans l'outillage de construction et de test, aucune dans `dist/` (E-18) |
| Dépendances | Aucune dépendance nouvelle ; `multer` écarté (E-16) | Conforme |
| Infrastructure | `id -u` dans `gmao-api` ; propriétaire du dossier des photos | `10001` ; `10001` |
| LLM et MCP | Parité des droits API et MCP sur les lieux et les listes ; effacement de photo en deux appels | Conforme (tests) |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des nouveaux tests

| Contrôle retiré | Suite | Résultat sans le contrôle |
| --- | --- | --- |
| Entité vérifiée au chargement d'un lieu (`services/lieux.js`, `load`) | `cloison.test.js` | 21 tests : 10 réussis, 11 échecs |
| Entité vérifiée au chargement d'une valeur (`services/listes-valeurs.js`, `load`) | `cloison.test.js` | 21 tests : 17 réussis, 4 échecs |
| Retrait des segments de métadonnées du JPEG (`images.js`) | `lieux.test.js` | 21 tests : 20 réussis, 1 échec (« photo : dépôt JPEG, métadonnées retirées sur le disque ») |
| Contrôle du type annoncé (`images.js`) | `lieux.test.js` | 21 tests : 20 réussis, 1 échec (« photo : contrôle du contenu et non de l'étiquette ») |

Chaque contrôle remis, les suites repassent à 0 échec (fichiers comparés par `diff`).

## 0.1.0 (15/10/2026)

Environnement : bac à sable de Claude, Node 22.22.0 pour les suites, Docker 29.8.2 pour les images (Node 20.19.5, nginx 1.27.5). Les images ont été construites avec un certificat d'autorité ajouté pour le proxy du bac à sable, dans un Dockerfile de test non livré ; les Dockerfile livrés sont ceux de l'archive.

| Famille | Contrôle | Résultat |
| --- | --- | --- |
| Secrets | Motifs de secrets et valeurs de repli dans `src/` (test statique) | Conforme |
| Secrets | Archive sans `.env` ni base (`tar tzf`) | Conforme |
| Secrets | `/.env`, `/.git/config`, `/backup.zip`, `/package.json` servis par nginx | Conforme : 404 ou page de l'interface, jamais le fichier (mesuré sur le compose) |
| Secrets | Erreur provoquée sans trace (`BAD_JSON`, 500 neutre) | Conforme (test) |
| Secrets | Base neuve sans compte ; démarrage refusé sans secret en production | Conforme (tests) |
| Secrets | CORS : aucun en-tête `Access-Control-Allow-Origin` | Conforme (aucun module CORS monté) |
| Secrets | Cookie `HttpOnly`, `SameSite=Strict`, `Secure` derrière HTTPS ; redirection HTTP vers HTTPS avec le port publié | Conforme (test ; 301 vers `https://…:18444` mesuré sur le compose) |
| Secrets | En-têtes sur `/` et `/api/version` | Conforme ; HSTS absent tant que le certificat est auto-signé |
| Authentification | Toute route hors liste écrite exige une session (énumération) | Conforme (test, 30 routes énumérées) |
| Authentification | Hachage `bcryptjs` 10 tours, autre format refusé | Conforme |
| Authentification | Seizième essai de connexion : 429 | Conforme (mesuré au contrôle visuel : 429 après 15 essais) |
| Authentification | Jeton inventé, expiré, rejoué après déconnexion : 401 | Conforme (tests) |
| Authentification | Réinitialisation par courriel | Non applicable : pas encore construite |
| Autorisation | IDOR et cloison d'entité : objet de l'autre entité refusé par l'API et le MCP | Conforme (`cloison.test.js`) ; preuve d'échec jointe ci-dessous |
| Autorisation | Écritures au rôle le plus bas : 403 | Conforme (tests entités, rôles, comptes) |
| Autorisation | Rôle modifiable dans la requête | Conforme : `role` refusé dans les schémas ordinaires ; rôles d'entité et rôle d'instance réservés à l'administrateur |
| Autorisation | Mass assignment : `additionalProperties: false`, champ inconnu 400 | Conforme (tests) |
| Autorisation | Dernier administrateur protégé | Conforme (test) |
| Injections | Aucune interpolation de valeur dans le SQL (test statique ; constantes `COLUMNS`, `FROM`, `PROFILE` vérifiées) | Conforme |
| Injections | `eval`, `new Function`, `child_process` dans `src/` | Conforme (test statique) |
| Injections | `dangerouslySetInnerHTML` | Conforme : absent |
| Validation | Schéma `ajv` sur tout corps, requête et paramètre d'URL | Conforme |
| Validation | Téléversement | Non applicable : pas de fichier en 0.1.0 |
| API | Limites de débit lecture et écriture, `trust proxy` | Conforme (en place) |
| API | Routes montées égales à la liste du contrat ; aucune route de test | Conforme ; la commande de démonstration n'est pas une route |
| API | Aucun hachage ni secret dans une réponse (`/me`, comptes, membres, rôles) | Conforme (test) |
| API | Transitions et règles côté serveur (rôle d'office, dernière entité, doublon de rôle) | Conforme (tests) |
| API | CSRF : écriture sans en-tête ou avec un faux : 403 | Conforme (test, changement d'entité compris) |
| Dépendances | `npm audit --omit=dev` serveur | 0 vulnérabilité |
| Dépendances | `npm audit --omit=dev` interface | 3 modérées (`react-router-dom` 6 : redirection ouverte par une URL commençant par `//`, GHSA-2j2x-hqr9-3h42) ; aucune haute ni critique. Correctif seulement en version 7, changement de génération interdit sans accord de Renaud. L'application ne construit aucune redirection à partir d'une donnée saisie. |
| Dépendances | Toutes les dépendances dans la section 4 du standard | Conforme : aucune dépendance nouvelle |
| Dépendances | `npm ci` dans le Dockerfile du serveur, verrou livré ; `npm ls` arrête la construction sur une installation incomplète | Conforme |
| Dépendances | Aucun script, style ni police chez un tiers | Conforme : Inter embarquée, aucune URL chargée par `dist/` |
| Données | Base non exposée | Conforme : `sql.js`, aucun port |
| Données | Journaux sans mot de passe ni jeton | Conforme : 0 occurrence dans `docker logs gmao-api` après installation, démonstration et connexions |
| Données | Sauvegarde | `backup.sh` joué dans le bac à sable ; tâche DSM à poser sur NIXUS |
| Infrastructure | `docker compose exec api id -u` | `10001` |
| Infrastructure | Seuls les ports de `web` publiés | Conforme |
| LLM et MCP | Droits identiques à l'API, deux appels pour désactiver ou retirer, jeton lié à la personne | Conforme (tests) |
| LLM et MCP | Aucun outil de SQL libre | Conforme |
| Facteurs humains | Revue du code par l'IT | À faire par Renaud ou l'IT avant la production |

Les trois contrôles qui ne restent jamais « non joués » (secrets commités, contrôle d'accès côté serveur, IDOR) ont été joués.

### Preuve d'échec des tests de cloison

Contrôle retiré dans `services/entites.js` (`if (!habilite) throw …`) : `cloison.test.js` passe de 6 réussites à 3 réussites et 3 échecs. Contrôle retiré dans `auth.js` (`setActiveEntite`) : `api.test.js` échoue sur « entité active : changement vers une entité où l'on a un rôle ; refus ailleurs ». Les deux contrôles remis, les suites repassent à 0 échec.

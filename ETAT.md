# État de la GMAO

Version de l'application : **0.11.0** · Mis à jour le 05/11/2026 · Archive de référence : `gmao-v0_11_0.tar.gz` (taille et empreinte dans la copie du projet)

Ce fichier fait foi pour l'avancement. Ses copies dans l'archive 0.11.0 (`ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `MANIFESTE.md`, `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md`) sont alignées sur les fichiers du projet à la livraison du 05/11/2026 (installation et recette de la 0.10.0 comprises ; l'installation et la recette de la 0.11.0 entreront dans les copies de l'archive 0.12.0), à deux différences près : seule la copie du projet donne la taille et l'empreinte de l'archive, qui ne peut pas contenir sa propre empreinte ; depuis la 0.7.2, les copies de l'archive portent des valeurs d'exemple à la place de l'adresse, des ports et des dossiers de NIXUS (`GITHUB.md`, section 6 ; DV-70). Depuis la 0.11.0, la conversion se fait par un script vérifié dans les deux sens sur les copies de l'archive 0.10.0.

## 1. Où en est-on

| Élément | État |
| --- | --- |
| Étape du planning | Étape 7 : versions 0.7.0 à 0.7.5, livrées, installées et recettées du 28 au 30/10/2026 ; étape 6 : version 0.8.0, recettée le 02/11/2026 ; étape 8 : version 0.9.0, recettée le 03/11/2026 ; étape 8 bis (DV-95, DV-96) : 0.9.1 recettée le 05/11/2026 (DV-103), 0.10.0 (connexion Microsoft compatible avec Portal) recettée le 05/11/2026 (DV-106) ; **version 0.11.0 (tickets et quatre remarques de la recette de la 0.10.0) livrée le 05/11/2026, à verser sur GitHub, installer et recetter** ; ensuite 0.12.0 et 0.12.1 (aide par écran), puis 0.13.0 (photos, DV-101), 0.14.0 (cycle de vie) |
| Vérification DV-09 de la séance | Au début de la séance du 05/11/2026 (conversation ouverte avec `REPRISE-0.10.0.md`) : archive `gmao-v0_10_0.tar.gz` conforme (2 403 249 octets, 385 entrées, SHA-256 `ab16627b…12dc0d`), version 0.10.0 dans les deux `package.json`, serveur 386/386, `npm audit --omit=dev` du serveur 0, interface 174/174 sur trois lancements, construction et accessibilité 0 erreur ; aucun test instable. Gabarit `gabarit-v3_1_3_0.tar.gz` joint après coup (234 517 octets, 126 entrées, version 1.3.0), avant tout code. Séances précédentes : 05/11/2026 matin (`gmao-v0_9_1.tar.gz`, 372/372, 164/164), 03/11/2026 |
| Décisions de la séance | DV-107 (file métier lue dans l'entité active ; une synergie future passe par un rôle dans les deux entités, sans code), DV-108 (lecture des tickets par Claude par le navigateur de la personne, option (a)). Séance précédente : DV-104 à DV-106 |
| Prochaine étape | Verser la 0.11.0 sur GitHub (section 5 de `GITHUB.md`), l'installer sur NIXUS et la recetter (dix contrôles, `NOTES_LIVRAISON_v0.11.0.md`), dont la lecture des tickets par Claude dans le navigateur de l'application Claude. Puis nouvelle conversation ouverte avec la phrase de `claude/REPRISE-0.11.0.md` : 0.12.0 et 0.12.1 (aide par écran ; photos des lieux déposées avant), 0.13.0 (photos, DV-101), 0.14.0 (cycle de vie). Contrôles sur téléphone en fin de projet (DV-80) |
| Points pour Renaud | Écarts de la 0.11.0 à prendre en compte dans le gabarit : E-40 (`oidc.js` garde le code `AADSTS`), E-41 (réglages des tickets dans le catalogue des paramètres au lieu de `settings.js`), E-43 (filtre du type en boutons, capture réduite et nettoyée, réponse après un transfert, FAQ locale reportée). Déjà ouverts : E-36 (jeton vérifié sans `jwks-rsa`), E-37 (`@playwright/test` du gabarit, 0.12.0), E-38 (copie du standard du gabarit), E-39 (infobulles, 0.12.0), E-29 (`dist/` dans l'archive), E-33 (`ci.yml` sur des actions dépréciées), E-34 (métadonnées des PDF), E-35 (couverture partielle de GES-01, GES-02, GES-04 et PRI-03), 0.7.2 sautée sur NIXUS. Passage en mode `sso` avant la production à décider (DV-98) ; secret client « GMAO NIXUS » valable jusqu'au 02/05/2027. La tuile de Portal ouvre `https://192.0.2.10:18443/` (adresse IP acceptée par Entra ID en acceptance). Intégration GitHub de l'organisation Claude (`GITHUB.md`, section 4.3) : dépôt pas encore relié au projet |
| Version 0.11.0 | Livrée le 05/11/2026 (étape 8 bis, DV-96) : tickets (standard, section 13.5), modules du gabarit 1.3.0 repris (service, routes, schémas, neuf outils MCP, formulaire « Signaler », écran Tickets, panneau du ticket, en-tête d'écran, dernière erreur de l'API, sept tests) et adaptés : `entite_id` sur le ticket, file métier traitée par le responsable et le gestionnaire de l'entité active, file IT par l'administrateur pour toutes les entités (DV-97, DV-107), affectation contrôlée, question sans entité refusée, transfert confirmé sans le contenu, réglages des files et des délais dans Paramètres, onglet « Tickets » (E-41), capture réduite et nettoyée, filtre du type en boutons (E-43) ; migration `010_tickets`. Remarques de la recette de la 0.10.0 (DV-106) : « colonne Valeur, jamais l'ID du secret » et refus d'un identifiant (`SECRET_IS_ID`) ; code `AADSTS` gardé au journal (E-40) ; « Enregistré le … par … » ; fenêtre « Nouveautés » qui se fermait au clic sur le sélecteur de langue (défaut confirmé, corrigé). Lecture des tickets par Claude par le navigateur (DV-108, `MCP.md`). Documentation NL et EN remise en ordre (E-42). Aucune dépendance nouvelle. Serveur 410/410, interface 181/181 ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Version 0.10.0 | Livrée le 05/11/2026 (étape 8 bis, DV-96) : connexion Microsoft compatible avec Portal (section 8.6), `oidc.js`, `settings.js`, `routes/sso.js` et `sso.test.js` du gabarit 1.3.0 repris (DV-99) ; migration `009_sso` ; réglages par `services/connexion.js` (DV-104) ; accès de secours (DV-105) ; onglet « Connexion Microsoft » ; outils MCP `get_auth_settings` et `update_auth_settings`. GitHub, le 05/11/2026 : commit `422aaf5` (45 fichiers, huit lignes `A`), fusion `9b34027`, étiquette `v0.10.0`, publication non modifiable avec l'archive (SHA-256 `ab16627b…`). NIXUS, le 05/11/2026 : sauvegarde `gmao-20261105-1124.db`, images reconstruites en 74,5 s, `[DB] Migration 009_sso appliquée`, `[APP] API 0.10.0`, deux conteneurs `healthy`. Réglage : inscription Entra « GMAO (écolage Thierry) » du 03/11/2026 réutilisée ; Paramètres › Connexion Microsoft en `sso_optional` ; premier refus dû à l'ID du secret saisi au lieu de sa valeur (`AADSTS7000215`), corrigé à l'écran. Recette du 05/11/2026 : dix contrôles sur dix conformes, dont les sept points de la section 8.6 ; quatre remarques mineures traitées en 0.11.0 (DV-106) |
| Version 0.9.1 | Livrée le 03/11/2026 (DV-94) : R1 (compteurs du tableau de bord rechargés après une qualification), R2 (état traduit dans le journal d'audit). GitHub #9, fusion `fc5bbe2`, étiquette `v0.9.1`. NIXUS, le 05/11/2026 : sauvegarde `gmao-20261105-0823.db`. Recette du 05/11/2026 : six contrôles sur six conformes (DV-103) |
| Version 0.9.0 | Livrée le 02/11/2026 (étape 8) : échéances et retard, tableau de bord, liste du service avec filtres, tris et vues enregistrées, qualification sur un écran ; migration `008_qualification`. GitHub #8, fusion `e85622e`. NIXUS, le 03/11/2026 : sauvegarde `gmao-20261103-0736.db`. Recette du 03/11/2026 : douze contrôles conformes ; R1 et R2 corrigés en 0.9.1 |
| Version 0.8.0 | Livrée le 30/10/2026 (étape 6) : `multer` 2.5.0, pièces jointes des demandes, réglages par entité (DV-83). GitHub #7, fusion `0040fc9`. NIXUS, le 30/10/2026 : migration `007_pieces_jointes`. Recette du 02/11/2026 : contrôle 7 corrigé en 0.9.0 (DV-86) |
| Versions 0.7.0 à 0.7.5 | Livrées du 28 au 29/10/2026 ; 0.7.2 jamais installée (E-30) ; 0.7.3 à 0.7.5 versées sur GitHub (#4 à #6) et installées ; recettes closes le 30/10/2026 sur la 0.7.5 (DV-80) |
| Versions 0.1.0 à 0.5.2 | Installées et recettées sur NIXUS du 15 au 27/10/2026 ; 0.2.1 abandonnée (DV-16) |
| Acceptance NIXUS | `https://192.0.2.10:18443` (HTTP 18080 redirigé), dossier `/volume1/docker/monapp` |
| Version installée sur NIXUS | 0.10.0, installée le 05/11/2026 ; `/api/version` rend `0.10.0` ; migration `009_sso` appliquée ; connexion Microsoft en `sso_optional` ; dernière sauvegarde : `gmao-20261105-1124.db` |
| Validation à l'écran de la 0.1.1 | **À confirmer** : capture de l'écran Utilisateurs et rôles attendue |
| Base de NIXUS | Entités AC et CPAS ; 21 comptes de démonstration (`@demo.invalid`) ; 31 lieux de démonstration ; 11 photos réelles ; `.env` avec `DEMO_ALLOWED=1` ; demandes de recette `AC-DI-2026-00001` à `AC-DI-2026-00007` et `CPAS-DI-2026-00001`, plus une demande de l'AC déposée par Renaud Ziegler le 03/11/2026 ; à l'AC : téléphone d'urgence 02 464 04 11, contact du DPO d'essai « Mr DPO », question « D'où vient l'eau ? » ; valeur « Essai » désactivée au CPAS ; `agent.ac` a pour lieu habituel Accueil ; `AC-DI-2026-00006` qualifiée P3 et `AC-DI-2026-00007` requalifiée P4 (recette 0.9.1) ; photos des lieux : 10 lieux actifs sur 24 photographiables ont leur photo ; connexion Microsoft en `sso_optional` (inscription « GMAO (écolage Thierry) ») ; le compte administrateur réel (premier administrateur) rattaché à Microsoft et en accès de secours ; compte « Test Recette SSO » désactivé ; un autre compte réel présent |
| Référentiel des demandes sur NIXUS | 35 catégories, 4 priorités, horaire de 7 jours, 5 congés par entité ; valeurs du cahier des charges en attendant l'atelier métier (D-11) |
| Sauvegarde | `backup.sh` copie la base (tickets et captures compris depuis la 0.11.0), les photos et les pièces jointes ; **tâche planifiée DSM pas encore créée** |
| Incident du 22/10/2026 | Container Manager trouvé arrêté sur NIXUS ; redémarré. Cause inconnue |
| Dépôt GitHub | `https://github.com/berchem-brussels/ecolage-gmao-thierry`, public, EUPL-1.2, créé le 29/10/2026 ; `v0.7.2` à `v0.10.0` publiées (fusion de la `v0.10.0` : `9b34027`), `tests` et CodeQL verts depuis la 0.7.3, publications non modifiables. Dependabot (trois demandes de fusion ouvertes, à ne pas fusionner). Protection de `main` depuis le 30/10/2026 (DV-78) |

## 2. Suites de tests de la 0.11.0

Décomptes recopiés de la sortie, bac à sable de Claude, Node 22.23.4, après `npm ci` (verrous inchangés hors numéro de version).

| Suite | Commande | Résultat |
| --- | --- | --- |
| Serveur | `cd backend && npm ci && npm test` | 410 tests, 410 réussis, 0 échec, 0 sauté (386 en 0.10.0 ; `tickets.test.js` : 14) |
| Interface | `cd frontend && npm ci && npm test` | 5 fichiers, 181 tests, 181 réussis, 0 échec, sur trois lancements consécutifs (174 en 0.10.0) |
| Typage et construction | `cd frontend && npm run build` (`tsc -b` puis `vite build`) | 0 erreur ; `dist/` reconstruit |
| Accessibilité statique | `cd frontend && npm run a11y` | 0 erreur |
| Travail `tests` de `ci.yml` | Rejoué à la main sous Node 20.20.2 sur un clone des seuls fichiers que Git verse | Serveur 410/410 ; `npm audit --omit=dev --audit-level=high` **sortie 0** ; interface 181/181, construction et accessibilité 0 erreur |
| Preuve d'échec | `docs/fr/SECURITE.md`, section 0.11.0 | Dix-neuf protections retirées une à une : au moins un échec chacune ; code de la 0.11.0 : tout réussi |
| Retour arrière | Base passée en 0.11.0 ouverte par le serveur 0.10.0, puis de nouveau par la 0.11.0 | Connexion, comptes et tickets corrects dans les deux sens |
| Dépendances | `npm audit --omit=dev` | Serveur 0 vulnérabilité ; interface 3 modérées (E-09). Aucune dépendance nouvelle |
| Fichiers versés | `git add -A` sur une copie de l'archive | 263 fichiers (254 pour la 0.10.0 : neuf lignes `A`) ; aucun `.env` (sauf `.env.example`), aucune base, aucun `node_modules` ni `dist/` ; aucune occurrence de l'adresse, des ports ni du dossier de NIXUS |
| Navigateur réel | Chromium, serveur réel sur une base jetable | Nouveautés, Connexion Microsoft, signalement avec capture, cloison AA et BB, traitement, suivi à 360 px, onglet Tickets, appel du MCP depuis la page |
| Migration | `010_tickets` | Essayée sur une base neuve et par les tests de migration (`categories`, `numerotation`, `parametres`) |
| Images Docker | Non reconstruites dans le bac à sable | Les deux images changent |

## 3. Exigences du cahier des charges touchées

| Exigence | État | Preuve |
| --- | --- | --- |
| ROL-01 rôle de demandeur d'office | Fait | `api.test.js` |
| ROL-02 rôles par entité, contrôle serveur | Fait pour les ressources existantes, demandes et tickets compris ; à étendre à chaque ressource métier | `api.test.js`, `cloison.test.js`, `demandes.test.js`, `qualification.test.js`, `tickets.test.js`, `mcp.test.js` |
| ROL-03 entité active, listes non mélangées | Fait ; file métier des tickets par entité active (DV-107) | `cloison.test.js`, `priorites.test.js`, `demandes.test.js`, `vues-demandes.test.js`, `tickets.test.js` |
| ROL-04 valideur par service | À faire, étape 11 (E-22) | |
| ROL-05 équipes, corps de métier | À faire, étape 15 | |
| ROL-06 dernier administrateur | Fait | `api.test.js` |
| ROL-07 rôles livrés dans `backend/config/` | Fait | `config/roles.json` |
| ADM-01 paramètres d'instance | Fait pour l'identité, la langue et l'affichage, les modules, la connexion Microsoft (0.10.0) et les tickets (0.11.0) ; le reste aux étapes prévues | `parametres.test.js`, `sso.test.js`, `tickets.test.js` |
| ADM-02 modules activables | Fait | `modules.test.js`, `pages.test.tsx` |
| ADM-03 paramètres métier par entité | Fait pour le contact, l'urgence, la réouverture, les catégories, les priorités et délais, le calendrier, la numérotation, les questions, le DPO et les mentions, les pièces jointes ; le reste aux étapes suivantes | `parametres-entite.test.js`, `numerotation.test.js`, `i18n.test.ts` |
| ADM-04 entité de plus sans modifier le code | Fait | `lieux.test.js`, `priorites.test.js`, `numerotation.test.js` |
| REF-01, REF-02, REF-08 | Fait (0.2.0) | `lieux.test.js`, `cloison.test.js` |
| REF-03 recherche d'un lieu | Fait | `recherche-lieux.test.js`, `demandes.test.tsx` |
| REF-04 lieu de travail habituel | Fait ; lieux récents (0.7.5) | `demandes.test.js`, `demandes.test.tsx` |
| REF-06 catégories en arbre | Fait ; corps de métier à l'étape 15 | `categories.test.js`, `demandes.test.tsx` |
| DEM-01 à DEM-09, DEM-11, DEM-12, DEM-16 | Fait (0.5.0 à 0.8.0) ; notifications à l'étape 13 ; photos de l'ouvrier à l'étape 19 | `demandes.test.js`, `formulaire.test.js`, `voisines.test.js`, `pieces.test.js`, `demandes.test.tsx` |
| NUM-01 à NUM-05 | Fait | `numerotation.test.js`, `demandes.test.js` |
| SUI-01 « Mes demandes » | Fait, sans « Mon service » (E-23) | `demandes.test.js`, `demandes.test.tsx` |
| SEC-02 lecture limitée aux siennes | Fait ; champs internes de la qualification et notes internes des tickets réservés | `demandes.test.js`, `qualification.test.js`, `tickets.test.js` |
| ERG-03 accueil adapté au rôle | Fait pour le demandeur et le service technique ; ouvrier à l'étape 18 | `demandes.test.tsx` |
| ERG-08 aucun jargon | Fait pour les écrans livrés | `demandes.test.tsx`, `i18n.test.ts`, `pages.test.tsx` |
| ERG-09 aucune perte de saisie | Fait pour le formulaire de demande et la qualification | `demandes.test.tsx`, `pages.test.tsx` |
| GES-01, GES-02, GES-04 | Fait en partie (0.9.0, 0.9.1) ; suite aux étapes 9, 15, 16, 21 et au lot L4 (E-35) | `qualification.test.js`, `vues-demandes.test.js`, `demandes.test.tsx` |
| PRI-01 priorité proposée par la catégorie | Fait (0.9.0) | `qualification.test.js` |
| PRI-02 délais par priorité et par entité | Fait | `priorites.test.js`, `calendrier.test.js` |
| PRI-03 échéance et retard | Fait en partie (0.9.0) ; suspension (étape 9), courriel (étape 13) (E-35) | `qualification.test.js` |
| LNG-01, LNG-02, LNG-09 FR et NL | Fait pour les écrans et les données de la version | `i18n.test.ts`, `pages.test.tsx` |
| LNG-03 texte libre dans sa langue | Fait | `demandes.test.js` |
| CYC-05 aucune suppression | Fait ; aucun ticket ni message ne se supprime | `demandes.test.js`, `tickets.test.js` |
| RGPD-01 photo réduite et sans métadonnées | Fait pour les photos des lieux et des demandes et, depuis la 0.11.0, pour la capture d'un ticket ; métadonnées des PDF gardées (E-34) | `lieux.test.js`, `tickets.test.js` |
| RGPD-02 suppression réelle | Fait pour les photos des lieux et les pièces jointes | `lieux.test.js`, `pieces.test.js` |
| SEC-01 cloison vérifiée par un test généré | Fait pour toutes les ressources à identifiant, tickets compris | `cloison.test.js` |
| SEC-03 contrôle des fichiers déposés | Fait (0.8.0) ; capture d'un ticket (0.11.0) | `fichiers.test.js`, `pieces.test.js`, `tickets.test.js` |
| TEC-03 connexion Microsoft | Fait en 0.10.0, recetté sur NIXUS le 05/11/2026 ; secret à la forme d'un identifiant refusé et code `AADSTS` au journal depuis la 0.11.0 | `sso.test.js`, `pages.test.tsx` |
| Connexion compatible avec Portal (standard, section 8.6) | Fait en 0.10.0, sept points recettés (DV-106) | `sso.test.js`, `pages.test.tsx` |
| Tickets (standard, section 13.5) | Fait en 0.11.0 : bouton « Signaler », contexte joint, référence annuelle, files par entité, priorité ITIL et délais en paramètre, transitions et motifs, fil avec notes internes, pilotage, API et MCP dont `list_tickets_to_handle` ; transformation d'une question en FAQ (0.12.0), export (étape 14) et courriel (étape 13) à venir | `tickets.test.js`, `cloison.test.js`, `mcp.test.js`, `pages.test.tsx` |
| TEC-05 acceptance NIXUS | Fait, ports 18443 et 18080 (E-14) | |
| TEC-06 `backup.sh` et tâche DSM | Script fait ; tâche DSM à créer | |
| TEC-07 commandes NIXUS une par une | Fait pour 0.1.0 à 0.11.0 | `NOTES_LIVRAISON_v0.11.0.md`, `APRES-DEPLOIEMENT.md` |
| Dépôt public et tests automatiques | Fait : `ci.yml`, `.gitignore`, aucune valeur de la section 6 ; `dist/` dans l'archive (E-29) ; actions dépréciées (E-33) | `ci.yml`, `portabilite.test.js`, `dependances.test.js` |
| ERG-01, ERG-05, ERG-06 identité, 360 px, accessibilité | Fait pour les écrans de la version | `pages.test.tsx`, `demandes.test.tsx`, `couleurs.test.tsx`, `a11y` |
| API-03 enveloppe, erreurs, OpenAPI | Fait pour les routes de la version | `api.test.js` |
| API-04 ordre des contrôles | Fait | `modules.test.js` |
| API-05 MCP en écriture | Fait pour toutes les routes de la version, tickets compris, sauf quatre routes de fichiers (E-17) ; lecture des tickets par Claude par le navigateur sur le réseau interne (DV-108) | `mcp.test.js`, `tickets.test.js`, `sso.test.js` |
| AID-04 aide par fonctionnalité | Fait pour la version (rubrique Tickets, questions 29 et 30) ; aide par écran en 0.12.0 et 0.12.1 | `HelpPage.tsx`, `i18n.test.ts`, `notes-version.test.js` |
| Journal d'audit (standard, section 17.3) | Champs changés seulement ; tickets sans texte, avec l'entité ; code `AADSTS` d'un refus de Microsoft | `journal-diff.test.js`, `journal-noms.test.js`, `tickets.test.js`, `sso.test.js` |
| RGPD-10 mentions d'information | Fait pour le formulaire de demande et l'aide (0.7.0) ; réservations (étape 23) et portail (étape 46) à venir | `formulaire.test.js`, `pages.test.tsx` |
| RGPD-12 trois questions RGPD | Fait à chaque version ; 0.11.0 : tickets (textes, capture, navigateur), support de l'application, destinataires internes | `NOTES_LIVRAISON_v0.11.0.md` |
| Toutes les autres exigences | À faire selon `PLANNING-GMAO.md` | |

## 4. Actions ouvertes

| Action | Qui | Bloque |
| --- | --- | --- |
| Verser la 0.11.0 sur GitHub (section 5 de `GITHUB.md`), publier l'archive, l'installer sur NIXUS et la recetter (dix contrôles des notes de livraison) | Thierry | 0.12.0 |
| Renouveler le secret client de l'inscription « GMAO (écolage Thierry) » avant le 02/05/2027 (colonne Valeur) | Thierry | Connexion Microsoft après le 02/05/2027 |
| Photos des lieux pour la présentation : 14 lieux actifs sans photo (AC-S1, AC-B1-L01, AC-B1-L03, AC-B1-L04, AC-B2-L01, AC-S2, AC-B3-L01, AC-B3-L02, CPAS-S1, CPAS-B1-L01, CPAS-B1-L02, CPAS-S2, CPAS-B2-L01, CPAS-B2-L02) et une photo erronée à remplacer (CPAS-B1-L03). Photos classées le 05/11/2026 (`GMAO-photos-classees.zip`, 13 fichiers) ; manquent AC-B2-L01 Atelier et CPAS-B1-L02 Bureau ; à confirmer : la salle à l'écran de projection est-elle la salle du Conseil du CPAS (CPAS-B1-L03) ? AC-S1 (cour pavée), CPAS-S1 (façade à mosaïque orange), droits de la photo de la classe (AC-B3-L01). Dépôt à l'écran : Patrimoine › fiche du lieu › « Ajouter une photo » ; jamais dans l'archive (DV-12) ; avant la 0.12.0 | Thierry | Présentation, captures de l'aide |
| Prendre en compte E-40, E-41 et E-43 dans le gabarit ; confirmer E-36 et E-37 ; corriger E-38 ; prendre acte d'E-39 | Renaud | Rien en écolage |
| Décider du passage en mode `sso` avant la production (DV-98) | Renaud et Thierry | Mise en production |
| Confirmer E-34 (métadonnées des PDF joints) avant l'utilisation réelle | Renaud | Mise en production |
| Relier le dépôt au projet Claude (`GITHUB.md`, section 4.3) quand Renaud aura activé l'intégration ; d'ici là, l'archive se joint à chaque conversation | Renaud, puis Thierry | Rien |
| Rediscuter E-29 (`dist/` dans l'archive) avant l'utilisation réelle (DV-79) | Renaud et Thierry | Mise en production |
| Régler le téléphone d'urgence et le contact du DPO de chaque entité | Responsables du service technique | Rien |
| Faire valider par le DPO les mentions d'information livrées et les adapter à l'écran | DPO, avec le responsable | Avant la production |
| Contrôles sur téléphone (iPhone, Samsung, néerlandais), dont le contrôle 9 de la 0.7.0 et la capture d'un ticket (DV-80, DV-102) | Thierry | Recette finale |
| Données de recette (`AC-DI-2026-00001` à `00007`, `CPAS-DI-2026-00001`, valeur « Essai », compte « Test Recette SSO », tickets de la recette de la 0.11.0) | Thierry | Rien |
| Désactiver la fermeture d'essai de la recette 0.4.1 à l'AC, si elle ne sert pas | Thierry | Rien |
| Porter au registre et à l'analyse d'impact : demandes d'intervention et leurs compléments (0.4.1 à 0.9.0, voir les versions) ; 0.10.0 : identifiant Microsoft (`oid`), Microsoft Entra ID destinataire de la demande de connexion ; 0.11.0 : tickets (nom du demandeur et de la personne qui traite, textes, messages, capture sans métadonnées, navigateur), finalité « support de l'application », destinataires internes (service technique de l'entité, administrateur) ; conservation à fixer (D-09) | DPO, formalisme mené en parallèle | Rien |
| Atelier catégories, priorités, délais et questions avec le service technique de chaque entité (D-11) | Métier, responsable | Rien (défauts en place) |
| Montrer en atelier : « Moi aussi » efface le brouillon et ses photos ; tableau de bord et qualification ; signalement et traitement d'un ticket | Thierry, avec le métier | Rien |
| Captures de 3P côté gestionnaire ; captures d'une « Werkopdracht » et d'une « Ontlening » | Thierry | Étapes 9, 16 et 25 |
| Confirmer la vue du demandeur de l'AC et le contact vide du CPAS (0.3.0) | Thierry | Rien |
| Chercher pourquoi Container Manager s'était arrêté sur NIXUS | Thierry ou l'IT | Rien |
| Envoyer une capture de l'écran Utilisateurs et rôles 0.1.1 | Thierry | Rien |
| Créer la tâche planifiée DSM de sauvegarde (`bash /volume1/docker/monapp/backup.sh`, root, 02:00) | Thierry ou l'IT | TEC-06 |
| Décider de la mise à jour de l'outillage de l'interface (E-18) et du passage à `react-router-dom` 7 (E-09) | Renaud | Rien |
| Prendre acte des catalogues fermés sans `POST` (E-19) | Renaud | Rien |
| Inscrire la GMAO (18443, 18080) au tableau 15.2 du standard | Renaud | Rien |
| Décisions ouvertes D-01 à D-13 et D-15 à D-17 | Voir le cahier des charges, section 32 | Voir `PLANNING-GMAO.md` |

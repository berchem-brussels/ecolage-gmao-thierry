# État de la GMAO

Version de l'application : **0.9.1** · Mis à jour le 03/11/2026 · Archive de référence : `gmao-v0_9_1.tar.gz` (taille et empreinte SHA-256 dans `ETAT.md` des fichiers du projet et dans le message de livraison)

Ce fichier fait foi pour l'avancement. Ses copies dans l'archive 0.9.1 (`ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `MANIFESTE.md`, `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md`) sont alignées sur les fichiers du projet à cette date, à deux différences près : seule la copie du projet donne la taille et l'empreinte de l'archive, qui ne peut pas contenir sa propre empreinte ; depuis la 0.7.2, les copies de l'archive portent des valeurs d'exemple à la place de l'adresse, des ports et des dossiers de NIXUS (`GITHUB.md`, section 6 ; DV-70).

## 1. Où en est-on

| Élément | État |
| --- | --- |
| Étape du planning | Étape 7 : versions 0.7.0 à 0.7.5, livrées, installées et recettées du 28 au 30/10/2026 ; étape 6 : version 0.8.0 (photos et pièces jointes des demandes) livrée le 30/10/2026, installée sur NIXUS le 30/10/2026, recettée le 02/11/2026 (contrôle 7 corrigé en 0.9.0, DV-86) ; étape 8 : version 0.9.0 (tableau de bord, liste et qualification du service technique, DV-86 à DV-93) livrée le 02/11/2026, versée sur GitHub et installée sur NIXUS le 03/11/2026, recettée le 03/11/2026 (douze contrôles sur douze conformes, deux défauts mineurs R1 et R2, DV-94) ; **étape 8 bis (DV-95) : version 0.9.1 (R1 et R2) livrée le 03/11/2026, à verser sur GitHub, à installer sur NIXUS et à recetter** ; ensuite 0.10.0 (connexion Microsoft compatible avec Portal), 0.11.0 (tickets), 0.12.0 et 0.12.1 (aide par écran), DV-96 |
| Vérification DV-09 de la séance | Au début de la séance du 03/11/2026 : archive `gmao-v0_9_0.tar.gz` conforme (2 365 485 octets, 376 entrées, SHA-256 `fcdd538f…f682d649`), version 0.9.0 dans les deux `package.json`, serveur 371/371, `npm audit --omit=dev` du serveur 0, interface 161/161 sur trois lancements, construction et accessibilité 0 erreur ; aucun test instable. Gabarit `gabarit-v3_1_3_0.tar.gz` lu : version 1.3.0 dans les deux `package.json`, standard v3.3 du 02/11/2026. Séances précédentes : 02/11/2026 (`gmao-v0_8_0.tar.gz`, 347/347, 149/149), 28 et 29/10/2026 |
| Décisions de la séance | Séance du 03/11/2026 (après-midi) : DV-96 (découpage de l'étape 8 bis en 0.9.1, 0.10.0, 0.11.0, 0.12.0 et 0.12.1, « go » de Thierry), DV-97 (files des tickets par entité), DV-98 (mode `sso_optional` sur NIXUS pendant l'écolage), DV-99 (modules du gabarit repris tels quels, écarts E-36 et E-37 pour Renaud), DV-100 (centre d'aide du gabarit à la place de la page Aide, contenu repris). Séance du 03/11/2026 (matin) : DV-94, DV-95. Séance du 02/11/2026 : DV-86 à DV-93 |
| Prochaine étape | Thierry : verser la 0.9.1 sur GitHub (section 5 de `GITHUB.md`), l'installer sur NIXUS, jouer les six contrôles de la liste (contrôles 3, 7 et 10 de la 0.9.0 compris). Ensuite 0.10.0 : connexion Microsoft compatible avec Portal (section 8.6, `SSO-COMPATIBLE-PORTAL.md`) depuis le gabarit 1.3.0 (`settings.js`, `oidc.js`, `routes/sso.js`, migration `009_sso`, page de connexion et ses trois exceptions, écran de réglage de la connexion, case « accès de secours » sur la fiche d'un utilisateur), « go » déjà donné (DV-96). Identifiants Entra à saisir dans Paramètres une fois la 0.10.0 installée, jamais dans Claude ; un compte à l'adresse réelle de Thierry à créer sur NIXUS seulement. Le centre d'administration Entra ne s'affiche que dans Chrome sur le poste de Thierry. Étape 9 (cycle de vie) en 0.13.0. Contrôles sur téléphone en fin de projet (DV-80) |
| Points pour Renaud | La tuile de Portal ouvre `https://192.0.2.10:18443/login` ; `SSO-COMPATIBLE-PORTAL.md` (section 8) demande l'adresse de l'application ou d'un écran : `https://192.0.2.10:18443/`. Certificat auto-signé de NIXUS : à confirmer pour la recette depuis Portal. Intégration GitHub de l'organisation Claude (`GITHUB.md`, section 4.3) : dépôt pas encore relié au projet ; l'archive se joint d'ici là. Nouveaux en 0.9.1 : E-36 (vérification du jeton Microsoft sans `jwks-rsa` dans le gabarit 1.3.0), E-37 (`@playwright/test` 1.56.1 dans le gabarit, ^1.61.1 au standard), E-38 (copie du standard dans le gabarit 1.3.0 avec les valeurs réelles de NIXUS). Fermés en 0.9.1 par le standard v3.3 : E-16, E-26, E-27, E-31, E-32. Toujours ouverts : E-29 (`dist/` dans l'archive, standard section 19), E-33 (`ci.yml` sur des actions dépréciées), E-34 (métadonnées des PDF joints gardées), E-35 (couverture partielle de GES-01, GES-02, GES-04 et PRI-03), 0.7.2 sautée sur NIXUS |
| Version 0.9.1 | Livrée le 03/11/2026 (étape 8 bis, DV-94) : R1, compteurs du tableau de bord de « Demandes de l'entité » rechargés après une qualification (`TableauBord` reçoit `rafraichir` de la page) ; R2, état d'une demande affiché par son libellé du service dans « Avant » et « Après » du journal d'audit (table `CODES` de `JournalPage.tsx`), journal enregistré inchangé ; trois tests de non-régression avec preuve d'échec ; note de version (service technique, administrateur) ; copie de `STANDARD.md` en v3.3 avec les valeurs d'exemple ; E-16, E-26, E-27, E-31, E-32 fermés, E-36 à E-38 relevés. Aucune migration, aucune dépendance nouvelle. GitHub et NIXUS : à faire |
| Version 0.9.0 | Livrée le 02/11/2026 (étape 8). GitHub, le 03/11/2026 : demande de fusion #8 (`tests` et CodeQL verts, quatre vérifications), commit `e5da5a9` (66 fichiers, dix lignes `A`), fusion `e85622e`, branche supprimée, étiquette `v0.9.0`, publication non modifiable avec l'archive (SHA-256 `fcdd538f…`, identique à la livraison). NIXUS, le 03/11/2026 : sauvegarde `gmao-20261103-0736.db` (photos et pièces jointes copiées), deux images reconstruites, `[DB] Migration 008_qualification appliquée`, `[APP] API 0.9.0 sur le port 3001`, `gmao-api` et `gmao-web` `healthy`. Recette du 03/11/2026 : contrôles 1 à 12 conformes (dashboard 7 à qualifier, 4 en retard ; vue « Éclairage » créée et supprimée ; `AC-DI-2026-00007` qualifiée P2 avec motif, 1 h 15, consigne, puis requalifiée ; vue du demandeur sans champs internes ; journal sans texte libre ; contrôle 7 de la 0.8.0 corrigé ; NL) ; défauts R1 et R2 (DV-94), corrigés en 0.9.1. Contenu : échéances de prise en charge et de fin enregistrées sur chaque demande ; échéance qui compte et retard ; tableau de bord ; liste du service avec filtres, recherche, tris et vues enregistrées (table `vues_demandes`) ; qualification sur un écran (`POST /api/demandes/:id/qualifier`, permission `demandes:qualifier`) ; contrôle 7 de la 0.8.0 corrigé ; sept outils MCP ; migration `008_qualification` |
| Version 0.8.0 | Livrée le 30/10/2026 (étape 6) : `multer` 2.5.0 dans un lecteur commun (`fichiers.js`) ; pièces jointes des demandes (table `pieces_jointes`, dossier `pieces`, cinq routes, trois outils MCP) ; réglages par entité (DV-83). GitHub : #7, fusion `0040fc9`, étiquette `v0.8.0`. NIXUS, le 30/10/2026 : migration `007_pieces_jointes`, sauvegarde `gmao-20261030-1831.db`. Recette du 02/11/2026 : contrôles 1 à 6 et 8 à 10 conformes ; contrôle 7 corrigé en 0.9.0 (DV-86) |
| Versions 0.7.0 à 0.7.5 | Livrées du 28 au 29/10/2026 ; 0.7.2 jamais installée (premier envoi sur GitHub, `tests` rouge, E-30) ; 0.7.3 à 0.7.5 versées sur GitHub (#4 à #6) et installées sur NIXUS ; recettes closes le 30/10/2026 sur la 0.7.5 (DV-80), contrôle 9 de la 0.7.0 (téléphone, NL) reporté en fin de projet |
| Versions 0.1.0 à 0.5.2 | Installées et recettées sur NIXUS du 15 au 27/10/2026 (détail dans `CHANGELOG.md` et les notes de livraison) ; 0.2.1 abandonnée (DV-16) ; dernière sauvegarde de cette période : `gmao-20261027-1509.db` |
| Acceptance NIXUS | `https://192.0.2.10:18443` (HTTP 18080 redirigé), dossier `/volume1/docker/monapp` |
| Version installée sur NIXUS | 0.9.0, installée le 03/11/2026 ; `/api/version` rend `0.9.0` ; migration `008_qualification` appliquée ; dernière sauvegarde : `gmao-20261103-0736.db` (photos et pièces jointes comprises) |
| Validation à l'écran de la 0.1.1 | **À confirmer** : capture de l'écran Utilisateurs et rôles attendue |
| Base de NIXUS | Entités AC et CPAS ; 21 comptes de démonstration (`@demo.invalid`) ; 31 lieux de démonstration ; valeur « Chaufferie » ajoutée à l'AC ; 11 photos réelles ; nom du pouvoir local « Commune de Berchem-Sainte-Agathe » ; `.env` avec `DEMO_ALLOWED=1` ; données de recette : demandes `AC-DI-2026-00001` à `AC-DI-2026-00007` et `CPAS-DI-2026-00001` ; à l'AC (recette 0.7.0) : téléphone d'urgence 02 464 04 11, contact du DPO d'essai « Mr DPO », question « D'où vient l'eau ? » (Plafond, Tuyau) ajoutée à Fuite d'eau ; valeur « Essai » ajoutée puis désactivée au CPAS ; `agent.ac` a pour lieu habituel Accueil (Maison communale (démo)) ; `AC-DI-2026-00006` (photo de l'église, PDF retiré) et `AC-DI-2026-00007` (en NL), recette de la 0.8.0 ; échéances calculées par la migration `008_qualification` ; recette de la 0.9.0 : `AC-DI-2026-00007` qualifiée P2 (motif, 1 h 15, consigne) par `responsable.ac`, les autres « À qualifier », dont cinq en retard le 03/11/2026 |
| Référentiel des demandes sur NIXUS | 35 catégories, 4 priorités, horaire de 7 jours, 5 congés par entité ; valeurs du cahier des charges en attendant l'atelier métier (D-11) ; trois questions livrées par entité |
| Sauvegarde | `backup.sh` copie la base, les photos et, depuis la 0.8.0, les pièces jointes ; **tâche planifiée DSM pas encore créée** |
| Incident du 22/10/2026 | Container Manager trouvé arrêté sur NIXUS ; redémarré. Cause inconnue |
| Dépôt GitHub | Créé le 29/10/2026, public, EUPL-1.2 : `https://github.com/berchem-brussels/ecolage-gmao-thierry`. `v0.7.2` (premier envoi, `tests` rouge, E-30), `v0.7.3` (#4), `v0.7.4` (#5), `v0.7.5` (#6), `v0.8.0` (#7), `v0.9.0` (#8, fusion `e85622e`, 03/11/2026), toutes avec `tests` et CodeQL verts depuis la 0.7.3 et publication non modifiable. Dependabot (trois demandes de fusion ouvertes, à ne pas fusionner), CodeQL et publications non modifiables activés par l'organisation. Protection de `main` depuis le 30/10/2026 : pull request obligatoire, travail `tests` exigé au vert, sans approbation (DV-78). Dépôt à relier au projet Claude (section 4.3) dès que Renaud aura activé l'intégration |

## 2. Suites de tests de la 0.9.1

Décomptes recopiés de la sortie, bac à sable de Claude, Node 22.23.4, après `npm ci` (verrous inchangés hors numéro de version).

| Suite | Commande | Résultat |
| --- | --- | --- |
| Serveur | `cd backend && npm ci && npm test` | 372 tests, 372 réussis, 0 échec, 0 sauté (371 en 0.9.0) |
| Interface | `cd frontend && npm ci && npm test` | 5 fichiers, 164 tests, 164 réussis, 0 échec, sur trois lancements consécutifs (161 en 0.9.0) |
| Typage et construction | `cd frontend && npm run build` (`tsc -b` puis `vite build`) | 0 erreur ; `dist/` reconstruit |
| Accessibilité statique | `cd frontend && npm run a11y` | 0 erreur |
| Travail `tests` de `ci.yml` | Rejoué à la main sous Node 20.20.2 sur un clone des seuls fichiers que Git verse | Serveur 372/372 ; `npm audit --omit=dev --audit-level=high` **sortie 0** ; interface 164/164, construction et accessibilité 0 erreur |
| Preuve d'échec | `docs/fr/SECURITE.md`, section 0.9.1 | Correction R1 retirée : 1 test échoue ; correction R2 retirée : 2 tests échouent ; code de la 0.9.1 : tout réussi |
| Dépendances | `npm audit --omit=dev` | Serveur 0 vulnérabilité ; interface 3 modérées (E-09). Audit complet de l'interface : outillage (E-18), inchangé |
| Fichiers versés | `git add -A` sur une copie de l'archive | 246 fichiers (245 pour la 0.9.0 comptés de la même façon : une ligne `A`, `NOTES_LIVRAISON_v0.9.1.md`) ; aucun `.env` (sauf `.env.example`), aucune base, aucun `node_modules` ni `dist/` ; aucune occurrence de l'adresse, des ports ni du dossier de NIXUS |
| Navigateur réel | Non joué pour ce correctif | Deux composants couverts par les tests d'écran FR et NL ; la recette sur NIXUS en tient lieu |
| Migration | Aucune | |
| Images Docker | Non reconstruites dans le bac à sable | L'image de l'interface change (`frontend/dist/`) ; celle du serveur pour le numéro de version et la note |

## 3. Exigences du cahier des charges touchées

| Exigence | État | Preuve |
| --- | --- | --- |
| ROL-01 rôle de demandeur d'office | Fait | `api.test.js` |
| ROL-02 rôles par entité, contrôle serveur | Fait pour les ressources existantes, demandes comprises (`demandes:creer` pour tous les rôles d'entité, `demandes:entite` et `demandes:qualifier` pour le gestionnaire et le responsable) ; à étendre à chaque ressource métier | `api.test.js`, `cloison.test.js`, `demandes.test.js`, `qualification.test.js`, `mcp.test.js` |
| ROL-03 entité active, listes non mélangées | Fait | `cloison.test.js`, `priorites.test.js`, `demandes.test.js`, `vues-demandes.test.js` |
| ROL-04 valideur par service | À faire, étape 11 ; la règle de validation par catégorie est enregistrée, non appliquée aux demandes (E-22) | |
| ROL-05 équipes, corps de métier | À faire, étape 15 | |
| ROL-06 dernier administrateur | Fait | `api.test.js` |
| ROL-07 rôles livrés dans `backend/config/` | Fait ; permissions `demandes:creer`, `demandes:entite` (0.5.0), `pieces:supprimer` (0.8.0), `demandes:qualifier` (0.9.0) | `config/roles.json` |
| ADM-01 paramètres d'instance | Fait pour l'identité, la langue et l'affichage par défaut, les modules ; connexion Microsoft en 0.10.0 ; le reste aux étapes prévues | `parametres.test.js` |
| ADM-02 modules activables | Fait ; module `demandes` du noyau disponible | `modules.test.js`, `pages.test.tsx` |
| ADM-03 paramètres métier par entité | Fait pour le contact, l'urgence, le délai de réouverture, les catégories, les priorités et délais, le calendrier, la numérotation, les questions des catégories, le DPO et les mentions d'information, les pièces jointes ; circuits de validation (étape 11), équipes (15), taux horaires, motifs, modèles, tarifs aux étapes suivantes | `parametres-entite.test.js`, `numerotation.test.js`, `i18n.test.ts` |
| ADM-04 entité de plus sans modifier le code | Fait ; une entité nouvelle a sa numérotation propre | `lieux.test.js`, `priorites.test.js`, `numerotation.test.js` |
| REF-01, REF-02, REF-08 | Fait (0.2.0) | `lieux.test.js`, `cloison.test.js` |
| REF-03 recherche d'un lieu | Fait | `recherche-lieux.test.js`, `demandes.test.tsx` |
| REF-04 lieu de travail habituel proposé d'office | Fait ; « Vos lieux récents » (0.7.5, DV-74) | `demandes.test.js`, `demandes.test.tsx` |
| REF-06 catégories en arbre | Fait ; corps de métier par défaut à l'étape 15 | `categories.test.js`, `demandes.test.tsx` |
| DEM-01 à DEM-09, DEM-11, DEM-12, DEM-16 | Fait (0.5.0 à 0.8.0) ; notifications et courriels à l'étape 13 ; photos de l'ouvrier à l'étape 19 ; même équipement à l'étape 27 | `demandes.test.js`, `formulaire.test.js`, `voisines.test.js`, `pieces.test.js`, `demandes.test.tsx` |
| NUM-01 à NUM-05 numérotation | Fait | `numerotation.test.js`, `demandes.test.js` |
| SUI-01 « Mes demandes » | Fait, sans le filtre « Mon service » (E-23) | `demandes.test.js`, `demandes.test.tsx` |
| SEC-02 lecture limitée aux siennes | Fait ; champs internes de la qualification réservés au service technique (0.9.0) | `demandes.test.js`, `voisines.test.js`, `formulaire.test.js`, `qualification.test.js` |
| ERG-03 accueil adapté au rôle | Fait pour le demandeur et le service technique ; journée de l'ouvrier à l'étape 18 | `demandes.test.tsx` |
| ERG-08 aucun jargon | Fait pour les écrans du demandeur et du service ; depuis la 0.9.1, aucun code d'état dans le détail du journal d'audit (R2) | `demandes.test.tsx`, `i18n.test.ts`, `pages.test.tsx` |
| ERG-09 aucune perte de saisie sur une erreur | Fait pour le formulaire de demande et la qualification | `demandes.test.tsx`, `pages.test.tsx` |
| GES-01 tableau de bord du gestionnaire | Fait en partie (0.9.0) ; compteurs rechargés après une qualification depuis la 0.9.1 (R1) ; « en attente depuis N jours », « à clôturer » (étape 9) et échéances préventives (lot L4) à venir (E-35) | `qualification.test.js`, `demandes.test.tsx` |
| GES-02 liste des fiches | Fait en partie (0.9.0) ; filtres équipe et ouvrier aux étapes 15 et 16 (E-35) | `qualification.test.js`, `vues-demandes.test.js`, `demandes.test.tsx` |
| GES-04 qualification sur un écran | Fait en partie (0.9.0) ; corps de métier (étape 15) et tâches (étape 21) à venir (E-35) | `qualification.test.js`, `demandes.test.tsx` |
| PRI-01 priorité proposée par la catégorie | Fait (0.9.0) | `qualification.test.js`, `demandes.test.tsx` |
| PRI-02 délais par priorité et par entité | Fait | `priorites.test.js`, `calendrier.test.js`, `demandes.test.js` |
| PRI-03 échéance et retard sur chaque fiche | Fait en partie (0.9.0) ; suspension pendant « En attente » (étape 9) et alerte par courriel (étape 13) à venir (E-35) | `qualification.test.js`, `demandes.test.tsx` |
| LNG-01, LNG-02, LNG-09 FR et NL | Fait pour les écrans et les données de la version | `i18n.test.ts`, `recherche-lieux.test.js`, `pages.test.tsx` |
| LNG-03 texte libre dans sa langue | Fait | `demandes.test.js` |
| CYC-05 aucune suppression | Fait : aucune route de suppression des demandes ; modification et annulation à l'étape 9 (E-21) | `demandes.test.js` |
| RGPD-01 photo réduite et sans métadonnées | Fait pour les photos des lieux et des demandes ; métadonnées des PDF gardées (E-34) | `lieux.test.js` |
| RGPD-02 suppression réelle | Fait pour les photos des lieux et les pièces jointes des demandes | `lieux.test.js`, `pieces.test.js` |
| SEC-01 cloison vérifiée par un test généré | Fait pour toutes les ressources à identifiant, qualification comprise | `cloison.test.js` |
| SEC-03 contrôle des fichiers déposés | Fait (0.8.0) | `lieux.test.js`, `fichiers.test.js`, `pieces.test.js` |
| TEC-03 connexion Microsoft | À faire en 0.10.0 (avancé de l'étape 44, DV-95) | |
| TEC-05 acceptance NIXUS | Fait, ports 18443 et 18080 (E-14) ; inscription au tableau 15.2 du standard à faire par Renaud | |
| TEC-06 `backup.sh` et tâche DSM | Script fait ; tâche DSM à créer | |
| TEC-07 commandes NIXUS une par une | Fait pour 0.1.0 à 0.9.1 | `NOTES_LIVRAISON_v0.9.1.md`, `APRES-DEPLOIEMENT.md` |
| Dépôt public et tests automatiques (standard, section 15.7 ; `GITHUB.md`) | Fait : `ci.yml`, `.gitignore`, aucune valeur de la section 6 ; travail `tests` au vert depuis la 0.7.3, rejoué sous Node 20 ; `dist/` dans l'archive (E-29) ; Dependabot et CodeQL de l'organisation ; actions dépréciées (E-33) ; chaque fichier de test du serveur joué | `ci.yml`, `portabilite.test.js`, `dependances.test.js` |
| ERG-01, ERG-05, ERG-06 identité, 360 px, accessibilité | Fait pour les écrans de la version | `pages.test.tsx`, `demandes.test.tsx`, `couleurs.test.tsx`, `a11y` |
| API-03 enveloppe, erreurs, OpenAPI | Fait pour les routes de la version | `api.test.js` |
| API-04 ordre des contrôles | Fait | `modules.test.js` |
| API-05 MCP en écriture | Fait pour toutes les routes de la version, sauf dépôt et lecture d'un fichier (E-17, quatre routes) | `mcp.test.js`, `qualification.test.js`, `vues-demandes.test.js` |
| AID-04 aide par fonctionnalité | Fait pour la version ; aide par écran du standard v3.3 en 0.12.0 et 0.12.1 | `HelpPage.tsx`, `i18n.test.ts`, `notes-version.test.js` |
| Journal d'audit (standard, section 17.3) | Champs changés seulement ; qualification sans texte libre ; lieu et catégorie nommés, depuis la 0.9.1 état traduit, à la lecture ; toutes les familles nommées dans le filtre | `journal-diff.test.js`, `journal-noms.test.js`, `qualification.test.js`, `pages.test.tsx` |
| RGPD-10 mentions d'information | Fait pour le formulaire de demande et l'aide (0.7.0), par entité (E-28) ; réservations (étape 23) et portail (étape 46) à venir | `formulaire.test.js`, `demandes.test.tsx`, `pages.test.tsx` |
| RGPD-12 trois questions RGPD | Fait à chaque version | `NOTES_LIVRAISON_v0.9.1.md` |
| Toutes les autres exigences | À faire selon `PLANNING-GMAO.md` | |

## 4. Actions ouvertes

| Action | Qui | Bloque |
| --- | --- | --- |
| Verser la 0.9.1 sur GitHub, l'installer sur NIXUS et jouer ses six contrôles (contrôles 3, 7 et 10 de la 0.9.0 compris) | Thierry | 0.10.0 |
| Saisir les identifiants Entra (locataire, application, secret) dans Paramètres après l'installation de la 0.10.0 ; créer sur NIXUS un compte administrateur à l'adresse réelle de Thierry | Thierry | Recette de la 0.10.0 |
| Confirmer E-36 et E-37 (modules du gabarit 1.3.0 repris tels quels) et corriger la copie du standard du gabarit (E-38) | Renaud | Rien en écolage |
| Confirmer E-34 (métadonnées des PDF joints gardées) avant l'utilisation réelle | Renaud | Mise en production |
| Relier le dépôt au projet Claude (`GITHUB.md`, section 4.3) quand Renaud aura activé l'intégration GitHub de l'organisation Claude ; d'ici là, l'archive se joint à chaque conversation | Renaud, puis Thierry | Rien : l'archive jointe suffit |
| Rediscuter E-29 (`dist/` dans l'archive ou construction sur le NAS) avant l'utilisation réelle (DV-79) | Renaud et Thierry | Mise en production |
| Régler le téléphone d'urgence et le contact du DPO de chaque entité (Réglages de l'entité) | Responsable du service technique de l'AC et du CPAS | Rien (renvoi au responsable tant que vide) |
| Faire valider par le DPO les mentions d'information livrées (base légale art. 6.1.e) et les adapter à l'écran si besoin | DPO, avec le responsable | Rien en acceptance ; avant la production |
| Contrôles sur téléphone (iPhone, Samsung, néerlandais), dont le contrôle 9 de la 0.7.0, regroupés en fin de projet (DV-80) | Thierry | Recette finale |
| Demandes de recette `AC-DI-2026-00001` à `AC-DI-2026-00007` et `CPAS-DI-2026-00001` et valeur « Essai » désactivée au CPAS : données de recette | Thierry | Rien |
| Désactiver la fermeture d'essai de la recette 0.4.1 à l'AC, si elle ne sert pas | Thierry | Rien |
| Porter au registre et à l'analyse d'impact : demandes d'intervention (demandeur, lieu, description), lieu de travail habituel, destinataires internes (gestionnaire et responsable de l'entité) ; nom de l'auteur d'une modification (0.4.1) ; depuis la 0.7.0 : bénéficiaire désigné, date et créneau, remarque du « Moi aussi », brouillon (30 jours), réponses aux questions ; depuis la 0.8.0 : photos et PDF joints (E-34 ; suppression réelle ; sauvegardes 30 jours) ; depuis la 0.9.0 : nom de la personne qui qualifie, consignes à l'ouvrier et motif d'un changement de priorité (internes au service technique), vues enregistrées (filtres seulement) ; 0.9.1 : rien de nouveau | DPO, formalisme mené en parallèle | Rien |
| Atelier catégories, priorités, délais et questions avec le service technique de chaque entité (D-11), à partir des 11 types et des 5 urgences relevés dans 3P (DV-38) ; ajuster ensuite à l'écran | Métier, responsable du service technique | Rien (défauts en place) |
| Montrer en atelier : « Moi aussi » efface le brouillon et ses photos (DECISIONS, section 4) ; tableau de bord et qualification de la 0.9.0, avec les colonnes et filtres à garder | Thierry, avec le métier | Rien |
| Captures de 3P côté gestionnaire (liste des fiches, fiche ouverte, qualification, affectation, clôture, bon de travail) ; captures d'une « Werkopdracht » et d'une « Ontlening » | Thierry | Utile avant les étapes 9 et 16 (et l'étape 25 pour les prêts) |
| Confirmer la vue du demandeur de l'AC (deux lignes de nouveautés, contact du service) et le contact vide du CPAS (0.3.0) | Thierry | Rien |
| Chercher pourquoi Container Manager s'était arrêté sur NIXUS | Thierry ou l'IT | Rien, mais toutes les applications du NAS en dépendent |
| Envoyer une capture de l'écran Utilisateurs et rôles 0.1.1 | Thierry | Rien |
| Créer la tâche planifiée DSM de sauvegarde (`bash /volume1/docker/monapp/backup.sh`, root, 02:00) | Thierry ou l'IT | TEC-06 |
| Décider de la mise à jour de l'outillage de l'interface (E-18) | Renaud | Rien tant que `dist/` n'est pas touché |
| Décider du passage à `react-router-dom` 7 (E-09) | Renaud | Rien tant qu'aucune vulnérabilité haute en production |
| Prendre acte des catalogues fermés sans `POST` (E-19) | Renaud | Rien |
| Inscrire la GMAO (18443, 18080) au tableau 15.2 du standard | Renaud | Rien |
| Décisions ouvertes D-01 à D-13 et D-15 à D-17 | Voir le cahier des charges, section 32 | Voir `PLANNING-GMAO.md` |

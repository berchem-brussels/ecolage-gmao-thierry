# État de la GMAO

Version de l'application : **0.9.0** · Mis à jour le 02/11/2026 · Archive de référence : `gmao-v0_9_0.tar.gz` (taille et empreinte SHA-256 dans `ETAT.md` des fichiers du projet et dans le message de livraison)

Ce fichier fait foi pour l'avancement. Ses copies dans l'archive 0.9.0 (`ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `MANIFESTE.md`, `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md`) sont alignées sur les fichiers du projet à cette date, à deux différences près : seule la copie du projet donne la taille et l'empreinte de l'archive, qui ne peut pas contenir sa propre empreinte ; depuis la 0.7.2, les copies de l'archive portent des valeurs d'exemple à la place de l'adresse, des ports et des dossiers de NIXUS (`GITHUB.md`, section 6 ; DV-70).

## 1. Où en est-on

| Élément | État |
| --- | --- |
| Étape du planning | Étape 7 : versions 0.7.0 à 0.7.5, livrées, installées et recettées du 28 au 30/10/2026 ; étape 6 : version 0.8.0 (photos et pièces jointes des demandes) livrée le 30/10/2026, installée sur NIXUS le 30/10/2026, recettée le 02/11/2026 (neuf contrôles sur dix conformes, contrôle 7 corrigé en 0.9.0, DV-86) ; **étape 8 : version 0.9.0 (tableau de bord, liste et qualification du service technique, DV-86 à DV-93) livrée le 02/11/2026, à verser sur GitHub et à installer sur NIXUS** |
| Vérification DV-09 de la séance | Au début de la séance du 02/11/2026 : archive `gmao-v0_8_0.tar.gz` conforme (2 298 942 octets, 367 entrées, SHA-256 `d3af99af…c74c61`), version 0.8.0 dans les deux `package.json`, serveur 347/347, `npm audit --omit=dev` du serveur 0, interface 149/149 sur trois lancements, construction et accessibilité 0 erreur ; aucun test instable. Séances précédentes : 28/10/2026 (`gmao-v0_7_0-travail-p4.tar.gz`, 266/266, 111/111), 29/10/2026 (`gmao-v0_7_1.tar.gz`, 289/289, 127/127 ; `gmao-v0_7_2.tar.gz`, 290/290, 127/127 ; `gmao-v0_7_3.tar.gz`, 293/293, 127/127) |
| Décisions de la séance | Séance du 02/11/2026 : DV-86 à DV-93 (`DECISIONS.md`) : contrôle 7 de la 0.8.0 corrigé dans la 0.9.0 (DV-86) ; 0.9.0 = étape 8 seule, périmètre proposé et « go » de Thierry (DV-87) ; échéances enregistrées (DV-88) ; échéance qui compte et retard (DV-89) ; qualification (DV-90) ; priorité proposée et motif (DV-91) ; tableau de bord (DV-92) ; vues enregistrées (DV-93). Séance du 30/10/2026 : DV-77 à DV-85 ; séance du 29/10/2026 : DV-69 à DV-76 |
| Prochaine étape | Verser la 0.9.0 sur GitHub par la section 5 de `GITHUB.md`, l'installer sur NIXUS (migration `008_qualification`), étape par étape avec un « go », puis dérouler les douze contrôles à l'écran de ses notes de livraison. Ensuite, étape 9 (cycle de vie), après le « go ». Contrôles sur téléphone en fin de projet (DV-80) |
| Points pour Renaud | Intégration GitHub de l'organisation Claude (`GITHUB.md`, section 4.3) : Renaud l'active (réponse du 29/10/2026), pas le jour même ; l'archive se joint d'ici là. Pour le prochain courriel : E-31 (pratique de la 0.7.3 à reprendre dans STANDARD.md, section 4.4, pour le travail réel), E-32 (Dependabot et CodeQL activés d'office par l'organisation), E-33 (`ci.yml` de `GITHUB.md` sur des actions dépréciées, Node 20), 0.7.2 sautée sur NIXUS, protection de `main`. E-29 : `dist/` dans l'archive (DV-01) contre la section 8 de `GITHUB.md`, à rediscuter avant l'utilisation réelle. STANDARD.md à mettre à jour par Renaud : sections 4.2 et 10.2 (`multer` 2.x, E-16, mis en œuvre en 0.8.0), rouge d'erreur (E-26). E-34 (métadonnées des PDF joints gardées), proposé « accepté » avant l'utilisation réelle. Nouveau en 0.9.0 : E-35 (couverture partielle de GES-01, GES-02, GES-04 et PRI-03, complétée aux étapes suivantes), pour information |
| Version 0.9.0 | Livrée le 02/11/2026 (étape 8) : échéances de prise en charge et de fin enregistrées sur chaque demande (au dépôt, à chaque qualification, par la migration et au démarrage pour les demandes qui n'en ont pas) ; échéance qui compte et retard ; tableau de bord (à qualifier, en retard, P1 et P2 ouvertes, échéance dans les deux jours ouvrés) ; liste du service avec filtres, recherche, tris et vues enregistrées (table `vues_demandes`) ; qualification sur un écran (`POST /api/demandes/:id/qualifier`, permission `demandes:qualifier`) avec priorité confirmée ou changée avec un motif, consignes à l'ouvrier, durée estimée, date convenue ; contrôle 7 de la 0.8.0 corrigé (groupe `pieces` dans Réglages de l'entité, familles du journal nommées) ; sept outils MCP ; migration `008_qualification` |
| Version 0.8.0 | Livrée le 30/10/2026 (étape 6) : `multer` 2.5.0 dans un lecteur commun (`fichiers.js`), photo d'un lieu comprise ; pièces jointes des demandes (table `pieces_jointes`, dossier `pieces`, cinq routes, trois outils MCP), gardées avec le brouillon, rattachées à l'envoi, lues par le demandeur, le bénéficiaire et le service technique, supprimées pour de bon selon DV-84 ; réglages par entité (DV-83) ; bloc « Photos et documents » du formulaire, ligne « Pièces jointes » de la fiche ; `nginx.conf` 11 Mo sur la route de dépôt, `backup.sh` avec les pièces. GitHub : demande de fusion #7 (`tests` et CodeQL verts), commit `b51cda5`, fusion `0040fc9`, étiquette `v0.8.0`, publication non modifiable avec l'archive (SHA-256 `d3af99af…`, identique à la livraison). NIXUS, le 30/10/2026 : sauvegarde `gmao-20261030-1831.db` (photos comprises), deux images reconstruites, `[DB] Migration 007_pieces_jointes appliquée`, `[APP] API 0.8.0`, `/api/version` 0.8.0, `gmao-api` `healthy`. Recette du 02/11/2026 : contrôles 1 à 6 et 8 à 10 conformes (demandes de recette `AC-DI-2026-00006` et `AC-DI-2026-00007`, sauvegarde `gmao-20261102-1201.db` avec « pièces jointes copiées ») ; contrôle 7 non conforme (groupe « Pièces jointes des demandes » absent de Réglages de l'entité, libellé de famille `piece` absent du filtre du journal) : corrigé en 0.9.0 (DV-86), à revérifier par le contrôle 11 de la 0.9.0 |
| Version 0.7.5 | Livrée le 29/10/2026 : « Vos lieux récents » en tête du choix d'un lieu (`lieux_recents` du profil et de `get_profile`, cinq au plus, entité active, lieux actifs, sans le lieu proposé) ; bandeau « Identifiants incorrects » effacé quand l'adresse change ou qu'un essai est arrêté par le formulaire ; journal d'audit avec « Oui » et « Non », champs vides masqués sauf « Avant » et « Après » (« aucun ») ; aucune migration. GitHub : demande de fusion #6 au vert (`tests`, CodeQL), fusionnée (commit `10273a1`), étiquette `v0.7.5`, publication non modifiable avec l'archive (SHA-256 identique à la livraison). Installée sur NIXUS le 29/10/2026 : sauvegarde `gmao-20261029-1511.db` (photos comprises), deux images reconstruites, `/api/version` 0.7.5. Recette du 29/10/2026 par Thierry : cinq contrôles sur cinq conformes |
| Version 0.7.4 | Livrée le 29/10/2026 : détail du journal d'audit avec le code et le nom du lieu et de la catégorie, l'identifiant entre parenthèses ; noms trouvés à la lecture (`noms` de l'API et du MCP), journal enregistré inchangé ; bénéficiaire laissé en identifiant (DV-73) ; aucune migration. GitHub : demande de fusion #5, commit `e6f6a01`, étiquette `v0.7.4`, publication non modifiable. Installée sur NIXUS le 29/10/2026 : sauvegarde `gmao-20261029-1311.db`, `/api/version` 0.7.4. Recette terminée le 29/10/2026 (contrôles 1 à 5 conformes) |
| Version 0.7.3 | Livrée le 29/10/2026 ; GitHub : demande de fusion #4 au vert (`tests`, CodeQL), fusionnée (commit `6323a9c`), étiquette `v0.7.3`, publication non modifiable avec l'archive (SHA-256 `44b472fd…`). Installée sur NIXUS le 29/10/2026 : sauvegarde `gmao-20261029-1100.db`, image du serveur reconstruite, `/api/version` 0.7.3. Contrôles à l'écran conformes |
| Version 0.7.2 | Livrée le 29/10/2026 : `ci.yml`, `.gitignore`, valeurs d'exemple, aucune migration. Premier envoi sur GitHub le 29/10/2026 (dépôt créé public, 220 fichiers, commit `c51bd0e`, étiquette `v0.7.2`) ; travail `tests` rouge à l'étape Serveur, comme prévu (E-30) ; jamais installée sur NIXUS, la 0.7.3 l'a remplacée |
| Version 0.7.1 | Installée sur NIXUS le 28/10/2026 : sauvegarde `gmao-20261028-1541.db`, `[APP] API 0.7.1`, aucune migration. Recette close le 30/10/2026 sur la 0.7.5 : contrôles 2 et 3 conformes (DV-80) |
| Version 0.7.0 | Installée sur NIXUS le 28/10/2026 : sauvegarde `gmao-20261028-1322.db`, `[DB] Migration 006_demandes_formulaire appliquée`. Recette close le 30/10/2026 sur la 0.7.5 (DV-80) : contrôles 1 à 8 conformes ; 9 (téléphone, NL) reporté en fin de projet |
| Version 0.5.2 | Installée sur NIXUS le 27/10/2026 : sauvegarde `gmao-20261027-1509.db`, aucune migration. Recettée le 27/10/2026 : six contrôles sur six conformes ; contrôle 7 (Samsung, facultatif) annulé ; remarque sur le bandeau « Identifiants incorrects » traitée en 0.7.5 (DV-53) |
| Version 0.5.1 | Installée sur NIXUS le 27/10/2026 : sauvegarde `gmao-20261027-0832.db`, aucune migration. Recettée le 27/10/2026 : sept contrôles sur huit conformes, contrôle 5 partiel ; trois défauts corrigés en 0.5.2 |
| Version 0.5.0 | Installée sur NIXUS le 26/10/2026 ; `[DB] Migration 005_demandes appliquée` ; sauvegarde avant mise à jour : `gmao-20261026-0848.db` (photos comprises). Recettée le 26/10/2026 : conformes 1 à 4 et 6 à 10 ; 5 reporté à la 0.5.1 |
| Version 0.4.1 | Installée sur NIXUS le 24/10/2026, recettée le 24/10/2026 : neuf contrôles conformes ; aucune migration |
| Version 0.4.0 | Installée sur NIXUS le 22/10/2026, recettée le 23/10/2026 : onze contrôles conformes ; migration `004_referentiel_demandes` ; sauvegarde avant mise à jour : `gmao-20261022-1555.db` |
| Version 0.3.1 | Installée et recettée sur NIXUS le 22/10/2026 ; sauvegarde avant mise à jour : `gmao-20261022-1403.db` |
| Version 0.2.1 | Abandonnée le 22/10/2026 (DV-16) |
| Acceptance NIXUS | `https://192.0.2.10:18443` (HTTP 18080 redirigé), dossier `/volume1/docker/monapp` |
| Version installée sur NIXUS | 0.8.0, installée le 30/10/2026 ; `/api/version` rend `0.8.0` ; migration `007_pieces_jointes` appliquée ; dernière sauvegarde : `gmao-20261102-1201.db` (photos et pièces jointes comprises) |
| Recette de la 0.3.0 et de la 0.3.1 | Faites le 22/10/2026 par Thierry ; vue du demandeur de l'AC et contact vide du CPAS (0.3.0) à confirmer |
| Validation à l'écran de la 0.1.1 | **À confirmer** : capture de l'écran Utilisateurs et rôles attendue |
| Base de NIXUS | Entités AC et CPAS ; 21 comptes de démonstration (`@demo.invalid`) ; 31 lieux de démonstration ; valeur « Chaufferie » ajoutée à l'AC ; 11 photos réelles ; nom du pouvoir local « Commune de Berchem-Sainte-Agathe » ; `.env` avec `DEMO_ALLOWED=1` ; libellé « Mobilier » du CPAS remis le 24/10/2026 ; une fermeture d'essai ajoutée à l'AC à la recette de la 0.4.1 ; données de recette : demandes `AC-DI-2026-00001` à `AC-DI-2026-00007` et `CPAS-DI-2026-00001` ; à l'AC (recette 0.7.0) : téléphone d'urgence 02 464 04 11, contact du DPO d'essai « Mr DPO », question « D'où vient l'eau ? » (Plafond, Tuyau) ajoutée à Fuite d'eau ; valeur « Essai » ajoutée puis désactivée au CPAS ; `agent.ac` a pour lieu habituel Accueil (Maison communale (démo)) ; `AC-DI-2026-00006` (photo de l'église, PDF retiré) et `AC-DI-2026-00007` (en NL), recette de la 0.8.0. Toutes ces demandes recevront leurs échéances à la migration `008_qualification` |
| Référentiel des demandes sur NIXUS | 35 catégories, 4 priorités, horaire de 7 jours, 5 congés par entité ; valeurs du cahier des charges en attendant l'atelier métier (D-11) ; trois questions livrées par entité |
| Sauvegarde | `backup.sh` copie la base, les photos et, depuis la 0.8.0, les pièces jointes ; **tâche planifiée DSM pas encore créée** |
| Incident du 22/10/2026 | Container Manager trouvé arrêté sur NIXUS ; redémarré. Cause inconnue |
| Dépôt GitHub | Créé le 29/10/2026, public, EUPL-1.2 : `https://github.com/berchem-brussels/ecolage-gmao-thierry`. `v0.7.2` (premier envoi, `tests` rouge, E-30), `v0.7.3` (#4), `v0.7.4` (#5, commit `e6f6a01`), `v0.7.5` (#6, commit `10273a1`), `v0.8.0` (#7, commit `0040fc9`, 30/10/2026), toutes avec `tests` et CodeQL verts depuis la 0.7.3 et publication non modifiable. L'organisation active d'office Dependabot (trois demandes de fusion ouvertes, à ne pas fusionner, E-32), CodeQL et les publications non modifiables. Protection de `main` activée le 30/10/2026 : pull request obligatoire, travail `tests` exigé au vert, sans approbation (DV-78). Dépôt à relier au projet Claude (section 4.3) dès que Renaud aura activé l'intégration |

## 2. Suites de tests de la 0.9.0

Décomptes recopiés de la sortie, bac à sable de Claude, Node 22.23.4, après `npm ci` (verrous inchangés hors numéro de version).

| Suite | Commande | Résultat |
| --- | --- | --- |
| Serveur | `cd backend && npm ci && npm test` | 371 tests, 371 réussis, 0 échec, 0 sauté (347 en 0.8.0) |
| Interface | `cd frontend && npm ci && npm test` | 5 fichiers, 161 tests, 161 réussis, 0 échec, sur trois lancements consécutifs (149 en 0.8.0) |
| Typage et construction | `cd frontend && npm run build` (`tsc -b` puis `vite build`) | 0 erreur ; `dist/` reconstruit |
| Accessibilité statique | `cd frontend && npm run a11y` | 0 erreur |
| Travail `tests` de `ci.yml` | Rejoué à la main sous Node 20.20.2 sur un clone des seuls fichiers que Git verse | Serveur 371/371 ; `npm audit --omit=dev --audit-level=high` **sortie 0** ; interface 161/161, construction et accessibilité 0 erreur |
| Preuve d'échec | `docs/fr/SECURITE.md`, section 0.9.0 | Chaque contrôle retiré à tour de rôle (droit de qualifier, cloison, motif, état, champs internes, vue d'un collègue, cloison des vues, plafond des vues, valeurs de filtre, groupe `pieces`, famille `piece`) : au moins un test échoue ; code de la 0.9.0 : tout réussi |
| Dépendances | `npm audit --omit=dev` | Serveur 0 vulnérabilité ; interface 3 modérées (E-09). Audit complet de l'interface : outillage (E-18), inchangé |
| Fichiers versés | `git add -A` sur une copie de l'archive | 243 fichiers (235 en 0.8.0 : dix nouveaux sans compter les notes de livraison, voir `MANIFESTE.md`) ; aucun `.env` (sauf `.env.example`), aucune base, aucun `node_modules` ni `dist/` ; aucune occurrence de l'adresse, des ports ni du dossier de NIXUS |
| Navigateur réel | Chromium, 1280, 768, 390 et 360 px, FR et NL, sur une base créée par la 0.8.0 puis migrée | Tableau de bord, liste filtrée et triée, fiche, qualification envoyée, fiche du demandeur sans consignes ; aucune page plus large que l'écran ; aucune erreur dans la console |
| Migration | `008_qualification` sur une base 0.8.0 avec trois demandes | `[DB] Migration 008_qualification appliquée` puis `[APP] API 0.9.0` ; échéances calculées pour les trois demandes ; la 0.8.0 redémarre sur la base migrée et y dépose une demande ; à la remontée, `[DB] Échéances calculées pour 1 demande(s)` |
| Images Docker | Non reconstruites dans le bac à sable | Les deux images changent (code du serveur, `frontend/dist/`) |

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
| ADM-01 paramètres d'instance | Fait pour l'identité, la langue et l'affichage par défaut, les modules ; le reste aux étapes prévues | `parametres.test.js` |
| ADM-02 modules activables | Fait ; module `demandes` du noyau disponible | `modules.test.js`, `pages.test.tsx` |
| ADM-03 paramètres métier par entité | Fait pour le contact, l'urgence, le délai de réouverture, les catégories, les priorités et délais, le calendrier, la numérotation (0.5.0), les questions des catégories, le DPO et les mentions d'information (0.7.0), les pièces jointes (0.8.0, groupe affiché depuis la 0.9.0) ; circuits de validation (étape 11), équipes (15), taux horaires, motifs, modèles, tarifs aux étapes suivantes | `parametres-entite.test.js`, `numerotation.test.js`, `i18n.test.ts` |
| ADM-04 entité de plus sans modifier le code | Fait ; une entité nouvelle a sa numérotation propre | `lieux.test.js`, `priorites.test.js`, `numerotation.test.js` |
| REF-01, REF-02, REF-08 | Fait (0.2.0) | `lieux.test.js`, `cloison.test.js` |
| REF-03 recherche d'un lieu | Fait : nom FR ou NL, code, adresse, commune, type, noms des lieux parents, sans accents ; liste des bâtiments refermable (0.5.1) | `recherche-lieux.test.js`, `demandes.test.tsx` |
| REF-04 lieu de travail habituel proposé d'office | Fait : choisi par l'agent ou par l'administrateur (API et MCP, E-25), sinon lieu de la dernière demande ; « Vos lieux récents » (0.7.5, DV-74) | `demandes.test.js`, `demandes.test.tsx` |
| REF-06 catégories en arbre | Fait ; tuiles du formulaire (0.5.0) ; questions par catégorie (0.7.0) ; corps de métier par défaut à l'étape 15 | `categories.test.js`, `demandes.test.tsx` |
| DEM-01 bouton « Nouvelle demande » | Fait | `demandes.test.tsx`, contrôle visuel |
| DEM-02 formulaire en trois étapes sur un écran | Fait ; compléments de la 0.7.0 ; photos et documents (0.8.0) | `demandes.test.js`, `demandes.test.tsx` |
| DEM-03 choix en boutons | Fait | `demandes.test.tsx`, `a11y` |
| DEM-04 demandes ouvertes du même lieu et « Moi aussi » | Fait (0.7.0) ; notifications à l'étape 13 ; même équipement à l'étape 27 | `voisines.test.js`, `cloison.test.js`, `demandes.test.tsx` |
| DEM-05 questions propres à la catégorie | Fait (0.7.0) | `formulaire.test.js`, `cloison.test.js`, `demandes.test.tsx`, `pages.test.tsx` |
| DEM-06 signalement d'urgence | Fait (0.7.0) : P1 ; depuis la 0.9.0, P1 proposée au service technique, qui peut la baisser avec un motif ; alerte de la garde aux étapes 13 et 17 | `formulaire.test.js`, `qualification.test.js` |
| DEM-07 demande pour un autre | Fait (0.7.0) ; notifications à l'étape 13 | `formulaire.test.js`, `demandes.test.tsx` |
| DEM-08 date souhaitée et créneau | Fait (0.7.0) | `formulaire.test.js`, `demandes.test.tsx` |
| DEM-09 photos et pièces jointes | Fait (0.8.0) ; photos de l'ouvrier à l'étape 19 (visibilité par le demandeur réglée à la qualification depuis la 0.9.0) | `pieces.test.js`, `fichiers.test.js`, `demandes.test.tsx` |
| DEM-11 brouillon sur le serveur | Fait (0.7.0), hors journal d'audit (E-27, accepté) | `formulaire.test.js`, `demandes.test.tsx` |
| DEM-12 accusé de réception | Fait à l'écran ; courriel à l'étape 13 | `demandes.test.tsx`, contrôle visuel |
| DEM-16 données minimales et consigne | Fait (0.7.0, 0.8.0) | `demandes.test.tsx` |
| NUM-01 à NUM-05 numérotation | Fait | `numerotation.test.js`, `demandes.test.js` |
| SUI-01 « Mes demandes » | Fait, sans le filtre « Mon service » (E-23) | `demandes.test.js`, `demandes.test.tsx` |
| SEC-02 lecture limitée aux siennes | Fait pour le demandeur, le bénéficiaire et qui suit ; champs internes de la qualification réservés au service technique (0.9.0) | `demandes.test.js`, `voisines.test.js`, `formulaire.test.js`, `qualification.test.js` |
| ERG-03 accueil adapté au rôle | Fait pour le demandeur et le service technique (tableau de bord depuis la 0.9.0) ; journée de l'ouvrier à l'étape 18 | `demandes.test.tsx` |
| ERG-08 aucun jargon | Fait pour les écrans du demandeur et du service (libellés d'état du service, « En retard » en mots) | `demandes.test.tsx`, `i18n.test.ts`, `pages.test.tsx` |
| ERG-09 aucune perte de saisie sur une erreur | Fait pour le formulaire de demande et la qualification (0.9.0) | `demandes.test.tsx`, `pages.test.tsx` |
| GES-01 tableau de bord du gestionnaire | Fait en partie (0.9.0) : à qualifier, en retard, P1 et P2 ouvertes, échéance dans les deux jours ouvrés, chaque compteur ouvre la liste filtrée ; « en attente depuis N jours », « à clôturer » (étape 9) et échéances préventives (lot L4) à venir (E-35) | `qualification.test.js`, `demandes.test.tsx` |
| GES-02 liste des fiches | Fait en partie (0.9.0) : tableau Ant Design, filtres état, priorité, catégorie, bâtiment, échéance, source, danger, tri, recherche, filtres dans l'adresse, vues enregistrées par utilisateur ; filtres équipe et ouvrier aux étapes 15 et 16 (E-35) | `qualification.test.js`, `vues-demandes.test.js`, `demandes.test.tsx` |
| GES-04 qualification sur un écran | Fait en partie (0.9.0) : catégorie, priorité, lieu précisé, durée estimée, consignes à l'ouvrier, visibilité des photos pour le demandeur ; corps de métier (étape 15) et tâches (étape 21) à venir (E-35) | `qualification.test.js`, `demandes.test.tsx` |
| PRI-01 priorité proposée par la catégorie | Fait (0.9.0) : proposée par la catégorie ou P1 en cas de danger, confirmée ou changée par le gestionnaire avec un motif | `qualification.test.js`, `demandes.test.tsx` |
| PRI-02 délais par priorité et par entité | Fait ; délai annoncé sur chaque demande, lu sur la fiche depuis la 0.9.0 | `priorites.test.js`, `calendrier.test.js`, `demandes.test.js` |
| PRI-03 échéance et retard sur chaque fiche | Fait en partie (0.9.0) : échéances enregistrées et affichées, retard en couleur et en mots, compteur du tableau de bord ; suspension pendant « En attente » (étape 9) et alerte par courriel (étape 13) à venir (E-35) | `qualification.test.js`, `demandes.test.tsx` |
| LNG-01, LNG-02, LNG-09 FR et NL | Fait pour les écrans et les données de la version | `i18n.test.ts`, `recherche-lieux.test.js`, `pages.test.tsx` |
| LNG-03 texte libre dans sa langue | Fait | `demandes.test.js` |
| CYC-05 aucune suppression | Fait : aucune route de suppression des demandes ; modification et annulation à l'étape 9 (E-21) | `demandes.test.js` |
| RGPD-01 photo réduite et sans métadonnées | Fait pour les photos des lieux et des demandes ; métadonnées des PDF gardées (E-34) | `lieux.test.js` |
| RGPD-02 suppression réelle | Fait pour les photos des lieux et les pièces jointes des demandes | `lieux.test.js`, `pieces.test.js` |
| SEC-01 cloison vérifiée par un test généré | Fait pour toutes les ressources à identifiant, qualification comprise (0.9.0) | `cloison.test.js` |
| SEC-03 contrôle des fichiers déposés | Fait (0.8.0) | `lieux.test.js`, `fichiers.test.js`, `pieces.test.js` |
| TEC-05 acceptance NIXUS | Fait, ports 18443 et 18080 (E-14) ; inscription au tableau 15.2 du standard à faire par Renaud | |
| TEC-06 `backup.sh` et tâche DSM | Script fait ; tâche DSM à créer | |
| TEC-07 commandes NIXUS une par une | Fait pour 0.1.0 à 0.9.0 | `NOTES_LIVRAISON_v0.9.0.md`, `APRES-DEPLOIEMENT.md` |
| Dépôt public et tests automatiques (standard, section 15.7 ; `GITHUB.md`) | Fait : `ci.yml`, `.gitignore`, aucune valeur de la section 6 ; travail `tests` au vert depuis la 0.7.3, rejoué sous Node 20 ; `dist/` dans l'archive (E-29) ; Dependabot et CodeQL de l'organisation (E-32) ; actions dépréciées (E-33) ; depuis la 0.9.0, un test vérifie que chaque fichier de test du serveur est joué | `ci.yml`, `portabilite.test.js`, `dependances.test.js` |
| ERG-01, ERG-05, ERG-06 identité, 360 px, accessibilité | Fait pour les écrans de la version ; filtres de la liste du service repliés sur téléphone ; aucune page plus large que l'écran à 360, 768 et 1280 px | `pages.test.tsx`, `demandes.test.tsx`, `couleurs.test.tsx`, contrôle visuel, `a11y` |
| API-03 enveloppe, erreurs, OpenAPI | Fait pour les routes de la version | `api.test.js` |
| API-04 ordre des contrôles | Fait | `modules.test.js` |
| API-05 MCP en écriture | Fait pour toutes les routes de la version, sauf dépôt et lecture d'un fichier (E-17, quatre routes) ; 0.9.0 : `get_tableau_bord`, `qualifier_demande`, cinq outils des vues | `mcp.test.js`, `qualification.test.js`, `vues-demandes.test.js` |
| AID-04 aide par fonctionnalité | Fait pour la version : rubriques Demandes de l'entité et Délais des demandes complétées, FAQ 27 et 28, deux intentions, note de version, fiche fonctionnelle `service-technique.md` | `HelpPage.tsx`, `i18n.test.ts`, `notes-version.test.js` |
| Journal d'audit (standard, section 17.3) | Champs changés seulement ; qualification sans texte libre (motif et consignes notés 1 ou 0), lieu et catégorie nommés à la lecture ; vues enregistrées ; toutes les familles nommées dans le filtre (0.9.0) | `journal-diff.test.js`, `journal-noms.test.js`, `qualification.test.js`, `i18n.test.ts` |
| RGPD-10 mentions d'information | Fait pour le formulaire de demande et l'aide (0.7.0), par entité (E-28) ; réservations (étape 23) et portail (étape 46) à venir | `formulaire.test.js`, `demandes.test.tsx`, `pages.test.tsx` |
| RGPD-12 trois questions RGPD | Fait à chaque version | `NOTES_LIVRAISON_v0.9.0.md` |
| Toutes les autres exigences | À faire selon `PLANNING-GMAO.md` | |

## 4. Actions ouvertes

| Action | Qui | Bloque |
| --- | --- | --- |
| Verser la 0.9.0 sur GitHub (section 5 de `GITHUB.md`), l'installer sur NIXUS et dérouler les douze contrôles à l'écran de ses notes de livraison (dont le contrôle 11 : groupe « Pièces jointes des demandes ») | Thierry, avec Claude | Étape suivante |
| Confirmer E-34 (métadonnées des PDF joints gardées) avant l'utilisation réelle | Renaud | Mise en production |
| Relier le dépôt au projet Claude (`GITHUB.md`, section 4.3) quand Renaud aura activé l'intégration GitHub de l'organisation Claude ; d'ici là, l'archive se joint à chaque conversation | Renaud, puis Thierry | Rien : l'archive jointe suffit |
| Adapter si nécessaire STANDARD.md (section 4.4) d'après E-31 | Renaud, quand on travaillera pour du vrai | Rien en écolage |
| Rediscuter E-29 (`dist/` dans l'archive ou construction sur le NAS) avant l'utilisation réelle (DV-79) | Renaud et Thierry | Mise en production |
| Régler le téléphone d'urgence et le contact du DPO de chaque entité (Réglages de l'entité) | Responsable du service technique de l'AC et du CPAS | Rien (renvoi au responsable tant que vide) |
| Faire valider par le DPO les mentions d'information livrées (base légale art. 6.1.e) et les adapter à l'écran si besoin | DPO, avec le responsable | Rien en acceptance ; avant la production |
| Mettre à jour STANDARD.md : `multer` 2.x (sections 4.2 et 10.2, E-16), rouge d'erreur (E-26) | Renaud | Rien |
| Contrôles sur téléphone (iPhone, Samsung, néerlandais), dont le contrôle 9 de la 0.7.0, regroupés en fin de projet (DV-80) | Thierry | Recette finale |
| Demandes de recette `AC-DI-2026-00001` à `AC-DI-2026-00007` et `CPAS-DI-2026-00001` et valeur « Essai » désactivée au CPAS : données de recette | Thierry | Rien |
| Désactiver la fermeture d'essai de la recette 0.4.1 à l'AC, si elle ne sert pas | Thierry | Rien |
| Porter au registre et à l'analyse d'impact : demandes d'intervention (demandeur, lieu, description), lieu de travail habituel, destinataires internes (gestionnaire et responsable de l'entité) ; nom de l'auteur d'une modification (0.4.1) ; depuis la 0.7.0 : bénéficiaire désigné, date et créneau, remarque du « Moi aussi », brouillon (30 jours), réponses aux questions ; depuis la 0.8.0 : photos et PDF joints (E-34 ; suppression réelle ; sauvegardes 30 jours) ; depuis la 0.9.0 : nom de la personne qui qualifie, consignes à l'ouvrier et motif d'un changement de priorité (internes au service technique), vues enregistrées (filtres seulement) | DPO, formalisme mené en parallèle | Rien |
| Atelier catégories, priorités, délais et questions avec le service technique de chaque entité (D-11), à partir des 11 types et des 5 urgences relevés dans 3P (DV-38) ; ajuster ensuite à l'écran | Métier, responsable du service technique | Rien (défauts en place) |
| Montrer en atelier : « Moi aussi » efface le brouillon et ses photos (DECISIONS, section 4) ; tableau de bord et qualification de la 0.9.0, avec les colonnes et filtres à garder | Thierry, avec le métier | Rien |
| Captures de 3P côté gestionnaire (liste des fiches, fiche ouverte, qualification, affectation, clôture, bon de travail) ; captures d'une « Werkopdracht » et d'une « Ontlening » | Thierry | Utile avant les étapes 9 et 16 (et l'étape 25 pour les prêts) |
| Confirmer la vue du demandeur de l'AC (deux lignes de nouveautés, contact du service) et le contact vide du CPAS (0.3.0) | Thierry | Rien |
| Chercher pourquoi Container Manager s'était arrêté sur NIXUS | Thierry ou l'IT | Rien, mais toutes les applications du NAS en dépendent |
| Envoyer une capture de l'écran Utilisateurs et rôles 0.1.1 | Thierry | Rien |
| Créer la tâche planifiée DSM de sauvegarde (`bash /volume1/docker/monapp/backup.sh`, root, 02:00) | Thierry ou l'IT | TEC-06 |
| Décider de la mise à jour de l'outillage de l'interface (E-18) | Renaud | Rien tant que `dist/` n'est pas touché |
| Décider du passage à `react-router-dom` 7 (E-09) | Renaud | Rien tant qu'aucune vulnérabilité haute en production |
| Prendre acte des catalogues fermés sans `POST` (E-19), étendu en 0.4.0 aux priorités, à l'horaire et aux jours fériés | Renaud | Rien |
| Inscrire la GMAO (18443, 18080) au tableau 15.2 du standard | Renaud | Rien |
| Mettre à jour la section 2.4 du standard (gabarit 1.1.0) | Renaud | Rien |
| Décisions ouvertes D-01 à D-13 et D-15 à D-17 | Voir le cahier des charges, section 32 | Voir `PLANNING-GMAO.md` |

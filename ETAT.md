# État de la GMAO

Version de l'application : **0.7.4** · Mis à jour le 29/10/2026 · Archive de référence : `gmao-v0_7_4.tar.gz` (taille et empreinte SHA-256 dans `ETAT.md` des fichiers du projet et dans le message de livraison)

Ce fichier fait foi pour l'avancement. Ses copies dans l'archive 0.7.4 (`ETAT.md`, `ECARTS-CDC.md`, `CHANGELOG.md`, `MANIFESTE.md`, `docs/fr/APRES-DEPLOIEMENT.md`, `docs/fr/MCP.md`) sont alignées sur les fichiers du projet à cette date, à deux différences près : seule la copie du projet donne la taille et l'empreinte de l'archive, qui ne peut pas contenir sa propre empreinte ; depuis la 0.7.2, les copies de l'archive portent des valeurs d'exemple à la place de l'adresse, des ports et des dossiers de NIXUS (`GITHUB.md`, section 6 ; DV-70).

## 1. Où en est-on

| Élément | État |
| --- | --- |
| Étape du planning | Étape 7 : version 0.7.0 livrée, installée et en recette le 28/10/2026 ; version 0.7.1, correctif de la recette (DV-04, DV-68) ; version 0.7.2 (dépôt public, DV-69), premier envoi sur GitHub le 29/10/2026 ; version 0.7.3 (verrou du serveur, DV-72) fusionnée sur GitHub, publiée et installée sur NIXUS le 29/10/2026 ; **version 0.7.4 (noms du lieu et de la catégorie dans le détail du journal d'audit, DV-50, DV-73) livrée le 29/10/2026, à verser sur GitHub (section 5, troisième envoi) et à installer sur NIXUS ; recette à reprendre ensuite** |
| Vérification DV-09 de la séance | Au début de la séance du 28/10/2026 : archive de travail `gmao-v0_7_0-travail-p4.tar.gz` conforme, serveur 266/266, interface 111/111 sur trois lancements. Au début de la séance du 29/10/2026 : archive `gmao-v0_7_1.tar.gz` conforme (2 217 438 octets, 346 entrées, SHA-256 `fcd49592…cdeda7`), serveur 289/289, interface 127/127 sur trois lancements, construction et accessibilité 0 erreur. Avant la 0.7.3, le 29/10/2026 : archive `gmao-v0_7_2.tar.gz` conforme (2 225 863 octets, 350 entrées, SHA-256 `6f947ca8…a05fd8`), serveur 290/290, interface 127/127 sur trois lancements. Avant la 0.7.4, le 29/10/2026 : archive `gmao-v0_7_3.tar.gz` conforme (2 230 587 octets, 352 entrées, SHA-256 `44b472fd…823bc`), serveur 293/293, `npm audit --omit=dev` du serveur 0, interface 127/127 sur trois lancements, construction et accessibilité 0 erreur ; aucun test instable |
| Décisions de la séance | DV-69 à DV-73 (`DECISIONS.md`) : version 0.7.2 pour le dépôt public ; valeurs d'exemple dans l'archive, valeurs réelles dans les fichiers du projet ; test de portabilité élargi et note de version réservée à l'administrateur ; mise à jour ciblée du verrou du serveur acceptée par Renaud (0.7.3) ; noms du journal d'audit trouvés à la lecture, bénéficiaire laissé en identifiant (0.7.4) |
| Prochaine étape | Verser la 0.7.4 sur GitHub par la section 5 de `GITHUB.md` (troisième envoi) et l'installer sur NIXUS ; contrôles à l'écran des notes de livraison 0.7.4. Ensuite 0.7.5 : bandeau « Identifiants incorrects » effacé dès que l'adresse change ou qu'un essai est bloqué par le contrôle du format (DV-53), cycle complet de la section 5. Puis courriel à Renaud (E-31, E-32, E-33, 0.7.2 sautée sur NIXUS, trois envois faits donc protection de `main` à activer) ; recette sur la version installée : contrôles 2 et 3 de la 0.7.1, puis 5 à 9 de la 0.7.0. Ensuite étape 6, version 0.6.0 : photos et pièces jointes avec `multer` 2.x (E-16 décidé), après le « go » ; question à poser à son début : passer aussi les photos des lieux sur `multer` ? |
| Points pour Renaud | Courriel envoyé par Thierry le 29/10/2026 pour activer l'intégration GitHub de l'organisation Claude (`GITHUB.md`, section 4.3) ; réponse attendue. Pour le prochain courriel : E-31 (pratique de la 0.7.3 à reprendre dans STANDARD.md, section 4.4, pour le travail réel), E-32 (Dependabot et CodeQL activés d'office par l'organisation, trois demandes de fusion de Dependabot ouvertes sur l'outillage de l'interface), E-33 (`ci.yml` de `GITHUB.md` sur des actions dépréciées, Node 20), 0.7.2 sautée sur NIXUS, protection de `main`. E-24 et E-30 corrigés en 0.7.3 sur son accord du 29/10/2026, donné pour l'écolage. E-29 : `dist/` dans l'archive (DV-01) contre la section 8 de `GITHUB.md`. E-27 : brouillons hors journal d'audit, à soumettre. STANDARD.md à mettre à jour par Renaud : sections 4.2 et 10.2 (`multer` 2.x, E-16), rouge d'erreur (E-26) |
| Recette de la 0.7.0 | Commencée le 28/10/2026 par Thierry : contrôles 1 à 4 conformes (note de version, réglages, questions, formulaire) ; contrôle 5 (brouillon) : défaut, aucun brouillon enregistré avec le lieu proposé d'office ; défaut de rédaction de la mention (« Administration communale traite… »). Deux défauts corrigés en 0.7.1 ; contrôles 5 à 9 à faire sur la version installée |
| Version 0.7.4 | Livrée le 29/10/2026 : détail du journal d'audit avec le code et le nom du lieu et de la catégorie, l'identifiant entre parenthèses (demande déposée, lieu habituel, rattachement d'un lieu ou d'une catégorie déplacé) ; « fiche introuvable » si la fiche n'existe plus ; noms trouvés à la lecture (`noms` de l'API et du MCP), journal enregistré inchangé ; bénéficiaire laissé en identifiant (DV-73) ; « Avant » et « Après » champ par champ ; aucune migration. GitHub et NIXUS : à faire |
| Version 0.7.3 | Livrée le 29/10/2026 ; GitHub : demande de fusion #4 au vert (`tests`, CodeQL), fusionnée (commit `6323a9c`), étiquette `v0.7.3`, publication non modifiable avec l'archive (SHA-256 `44b472fd…`, identique à la livraison). Installée sur NIXUS le 29/10/2026 : sauvegarde `gmao-20261029-1100.db` (photos comprises), image du serveur reconstruite, `[APP] API 0.7.3`, aucune migration, `/api/version` 0.7.3, `gmao-api` `Healthy`. Contrôles à l'écran conformes : `v0.7.3` en bas du menu ; `agent.ac` voit la seule note de la 0.7.1 (non lue, aucune ligne pour lui en 0.7.2 et 0.7.3) ; l'administrateur voit les notes 0.7.3, 0.7.2, 0.7.1 et 0.7.0 ; demande `AC-DI-2026-00004` déposée par `agent.ac` |
| Version 0.7.2 | Livrée le 29/10/2026 : `ci.yml`, `.gitignore`, valeurs d'exemple, aucune migration. Premier envoi sur GitHub le 29/10/2026 (dépôt créé public, 220 fichiers, commit `c51bd0e`, étiquette `v0.7.2`) ; travail `tests` rouge à l'étape Serveur, comme prévu (E-30) ; jamais installée sur NIXUS, la 0.7.3 l'a remplacée |
| Version 0.7.1 | Installée sur NIXUS le 28/10/2026 : sauvegarde `gmao-20261028-1541.db`, `[APP] API 0.7.1`, aucune migration, `/api/version` 0.7.1, `gmao-api` et `gmao-web` `healthy`. Recette à faire (sur la version installée, mêmes fonctions) |
| Version 0.7.0 | Installée sur NIXUS le 28/10/2026 : sauvegarde `gmao-20261028-1322.db`, `[DB] Migration 006_demandes_formulaire appliquée`, `[APP] API 0.7.0`, `/api/version` 0.7.0, `gmao-api` et `gmao-web` `healthy`. Recette partielle (contrôles 1 à 4 conformes), deux défauts corrigés en 0.7.1 |
| Version 0.5.2 | Installée sur NIXUS le 27/10/2026 : sauvegarde `gmao-20261027-1509.db`, `[APP] API 0.5.2`, aucune migration, `/api/version` 0.5.2, `gmao-api` et `gmao-web` `healthy`. Recettée le 27/10/2026 par Thierry : six contrôles sur six conformes ; contrôle 7 (Samsung, facultatif) annulé faute de téléphone Samsung ; remarque sur le bandeau « Identifiants incorrects » gardée pour plus tard (DV-53) |
| Version 0.5.1 | Installée sur NIXUS le 27/10/2026 : sauvegarde `gmao-20261027-0832.db`, `[APP] API 0.5.1`, aucune migration. Recettée le 27/10/2026 : sept contrôles sur huit conformes, contrôle 5 partiel ; trois défauts corrigés en 0.5.2 |
| Version 0.5.0 | Installée sur NIXUS le 26/10/2026 ; `[DB] Migration 005_demandes appliquée` ; sauvegarde avant mise à jour : `gmao-20261026-0848.db` (photos comprises). Recettée le 26/10/2026 : conformes 1 à 4 et 6 à 10 ; 5 reporté à la 0.5.1 |
| Version 0.4.1 | Installée sur NIXUS le 24/10/2026, recettée le 24/10/2026 : neuf contrôles conformes ; aucune migration |
| Version 0.4.0 | Installée sur NIXUS le 22/10/2026, recettée le 23/10/2026 : onze contrôles conformes ; migration `004_referentiel_demandes` ; sauvegarde avant mise à jour : `gmao-20261022-1555.db` |
| Version 0.3.1 | Installée et recettée sur NIXUS le 22/10/2026 ; sauvegarde avant mise à jour : `gmao-20261022-1403.db` |
| Version 0.2.1 | Abandonnée le 22/10/2026 (DV-16) |
| Acceptance NIXUS | `https://192.0.2.10:18443` (HTTP 18080 redirigé), dossier `/volume1/docker/monapp` |
| Version installée sur NIXUS | 0.7.3, installée le 29/10/2026 ; `[APP] API 0.7.3`, aucune migration ; `/api/version` rend `0.7.3` ; `gmao-api` `Healthy`, `gmao-web` démarré ; sauvegarde avant mise à jour : `gmao-20261029-1100.db` (photos comprises) |
| Recette de la 0.3.0 et de la 0.3.1 | Faites le 22/10/2026 par Thierry ; vue du demandeur de l'AC et contact vide du CPAS (0.3.0) à confirmer |
| Validation à l'écran de la 0.1.1 | **À confirmer** : capture de l'écran Utilisateurs et rôles attendue |
| Base de NIXUS | Entités AC et CPAS ; 21 comptes de démonstration (`@demo.invalid`) ; 31 lieux de démonstration ; valeur « Chaufferie » ajoutée à l'AC ; 11 photos réelles ; nom du pouvoir local « Commune de Berchem-Sainte-Agathe » ; `.env` avec `DEMO_ALLOWED=1` ; libellé « Mobilier » du CPAS remis le 24/10/2026 ; une fermeture d'essai ajoutée à l'AC à la recette de la 0.4.1 ; données de recette : demandes `AC-DI-2026-00001`, `CPAS-DI-2026-00001` (0.5.0), `AC-DI-2026-00002` (iPhone, 0.5.1) et `AC-DI-2026-00003` (iPhone, 0.5.2) ; à l'AC (recette 0.7.0) : téléphone d'urgence 02 464 04 11, contact du DPO d'essai « Mr DPO », question « D'où vient l'eau ? » (Plafond, Tuyau) ajoutée à Fuite d'eau, valeur « Essai » ajoutée puis désactivée au CPAS (motif « recette 0.5.0 ») ; `AC-DI-2026-00004` (`agent.ac`, contrôle de la 0.7.3, 29/10/2026) ; `agent.ac` a pour lieu habituel Accueil (Maison communale (démo)) |
| Référentiel des demandes sur NIXUS | 35 catégories, 4 priorités, horaire de 7 jours, 5 congés par entité ; valeurs du cahier des charges en attendant l'atelier métier (D-11) ; trois questions livrées par entité au premier démarrage de la 0.7.0 |
| Sauvegarde | `backup.sh` copie la base et les photos ; **tâche planifiée DSM pas encore créée** |
| Incident du 22/10/2026 | Container Manager trouvé arrêté sur NIXUS ; redémarré. Cause inconnue |
| Dépôt GitHub | Créé le 29/10/2026, public, EUPL-1.2 : `https://github.com/berchem-brussels/ecolage-gmao-thierry`. `v0.7.2` (premier envoi, travail `tests` rouge, E-30) puis `v0.7.3` (demande de fusion #4, `tests` et CodeQL verts, publication non modifiable) ; `v0.7.4` à verser (section 5, troisième envoi). L'organisation active d'office Dependabot (trois demandes de fusion ouvertes, à ne pas fusionner, E-32), CodeQL et les publications non modifiables. Protection de `main` à activer par l'administrateur. Dépôt à relier au projet Claude (section 4.3) : intégration demandée à Renaud le 29/10/2026 |

## 2. Suites de tests de la 0.7.4

Décomptes recopiés de la sortie, bac à sable de Claude, Node 22.23.4, après `npm ci` (verrous inchangés hors numéro de version).

| Suite | Commande | Résultat |
| --- | --- | --- |
| Serveur | `cd backend && npm ci && npm test` | 300 tests, 300 réussis, 0 échec, 0 sauté (293 en 0.7.3) |
| Interface | `cd frontend && npm ci && npm test` | 4 fichiers, 129 tests, 129 réussis, 0 échec, sur trois lancements consécutifs (127 en 0.7.3) |
| Typage et construction | `cd frontend && npm run build` (`tsc -b` puis `vite build`) | 0 erreur ; `dist/` reconstruit |
| Accessibilité statique | `cd frontend && npm run a11y` | 0 erreur |
| Travail `tests` de `ci.yml` | Rejoué à la main sous Node 20.20.2 sur les seuls fichiers que Git verse | Serveur 300/300 ; `npm audit --omit=dev --audit-level=high` **sortie 0** ; interface 129/129, construction et accessibilité 0 erreur |
| Preuve d'échec | `docs/fr/SECURITE.md`, section 0.7.4 | Service du journal de la 0.7.3 remis : `journal-noms.test.js` 5 échecs sur 6 ; écran du journal de la 0.7.3 remis : les deux tests nouveaux de `pages.test.tsx` échouent ; code de la 0.7.4 : tout réussi |
| Dépendances | `npm audit --omit=dev` | Serveur 0 vulnérabilité ; interface 3 modérées (E-09). Audit complet de l'interface : outillage (E-18), inchangé |
| Fichiers versés | `git add -A` sur une copie de l'archive | 224 fichiers (222 pour la 0.7.3 par la même commande : `journal-noms.test.js` et `NOTES_LIVRAISON_v0.7.4.md` en plus) ; aucun `.env` (sauf `.env.example`), aucune base, aucun `node_modules` ni `dist/` ; aucune occurrence de l'adresse, des ports ni du dossier de NIXUS |
| Migration | Aucune en 0.7.4 | `[APP] API 0.7.4` seul attendu |
| Images Docker | Non reconstruites dans le bac à sable | Les deux images changent (code du serveur, `frontend/dist/`) |

## 3. Exigences du cahier des charges touchées

| Exigence | État | Preuve |
| --- | --- | --- |
| ROL-01 rôle de demandeur d'office | Fait | `api.test.js` |
| ROL-02 rôles par entité, contrôle serveur | Fait pour les ressources existantes, demandes comprises (`demandes:creer` pour tous les rôles d'entité, `demandes:entite` pour le gestionnaire et le responsable) ; à étendre à chaque ressource métier | `api.test.js`, `cloison.test.js`, `demandes.test.js`, `mcp.test.js` et suites des versions précédentes |
| ROL-03 entité active, listes non mélangées | Fait | `cloison.test.js`, `priorites.test.js`, `demandes.test.js` |
| ROL-04 valideur par service | À faire, étape 11 ; la règle de validation par catégorie est enregistrée, non appliquée aux demandes (E-22) | |
| ROL-05 équipes, corps de métier | À faire, étape 15 | |
| ROL-06 dernier administrateur | Fait | `api.test.js` |
| ROL-07 rôles livrés dans `backend/config/` | Fait ; permissions `demandes:creer`, `demandes:entite` (0.5.0) | `config/roles.json` |
| ADM-01 paramètres d'instance | Fait pour l'identité, la langue et l'affichage par défaut, les modules ; le reste aux étapes prévues | `parametres.test.js` |
| ADM-02 modules activables | Fait ; module `demandes` du noyau disponible | `modules.test.js`, `pages.test.tsx` |
| ADM-03 paramètres métier par entité | Fait pour le contact, l'urgence, le délai de réouverture, les catégories, les priorités et délais, le calendrier, la numérotation (0.5.0), les questions des catégories, le DPO et les mentions d'information (0.7.0) ; circuits de validation (étape 11), équipes (15), taux horaires, motifs, modèles, tarifs aux étapes suivantes | `parametres-entite.test.js`, `numerotation.test.js` et suites de la 0.4.x |
| ADM-04 entité de plus sans modifier le code | Fait ; une entité nouvelle a sa numérotation propre | `lieux.test.js`, `priorites.test.js`, `numerotation.test.js` |
| REF-01, REF-02, REF-08 | Fait (0.2.0) | `lieux.test.js`, `cloison.test.js` |
| REF-03 recherche d'un lieu | Fait : nom FR ou NL, code, adresse, commune, type, noms des lieux parents, sans accents ; « nom d'usage » couvert par les noms FR et NL ; liste des bâtiments refermable (0.5.1) | `recherche-lieux.test.js`, `demandes.test.tsx` |
| REF-04 lieu de travail habituel proposé d'office | Fait : choisi par l'agent ou par l'administrateur (API et MCP, E-25), sinon lieu de la dernière demande | `demandes.test.js`, `demandes.test.tsx` |
| REF-06 catégories en arbre | Fait ; tuiles du formulaire de demande (0.5.0) ; questions par catégorie (0.7.0) ; corps de métier par défaut à l'étape 15 | `categories.test.js`, `demandes.test.tsx` |
| DEM-01 bouton « Nouvelle demande » | Fait : accueil, menu, en-tête de chaque écran ; plus de doublon dans « Mes demandes » (0.5.1) | `demandes.test.tsx`, contrôle visuel |
| DEM-02 formulaire en trois étapes sur un écran | Fait pour Où, Quoi, Description (10 caractères) ; description faite d'espaces signalée sous le champ (0.5.1) ; compléments de la 0.7.0 ; Photo à l'étape 6 | `demandes.test.js`, `demandes.test.tsx` |
| DEM-03 choix en boutons | Fait : tuiles, résultats de recherche en boutons, arbre, réponses aux questions (0.7.0) | `demandes.test.tsx`, `a11y` |
| DEM-04 demandes ouvertes du même lieu et « Moi aussi » | Fait (0.7.0) : même bâtiment, sans nom ni numéro, « Moi aussi » avec remarque pour le service technique ; notifications à l'étape 13 ; même équipement à l'étape 27 | `voisines.test.js`, `cloison.test.js`, `demandes.test.tsx` |
| DEM-05 questions propres à la catégorie | Fait (0.7.0) : oui ou non, ou choix de 2 à 6 réponses, FR et NL, facultatives sauf réglage, contrôle serveur, réponses sur la fiche | `formulaire.test.js`, `cloison.test.js`, `demandes.test.tsx`, `pages.test.tsx` |
| DEM-06 signalement d'urgence | Fait (0.7.0) : case en tête, numéro de l'entité, P1, sans heure pour le demandeur ; alerte de la garde aux étapes 13 et 17 | `formulaire.test.js`, `demandes.test.tsx` |
| DEM-07 demande pour un autre | Fait (0.7.0) : collègue de l'entité (qui lit la demande) ou texte libre ; notifications à l'étape 13 | `formulaire.test.js`, `demandes.test.tsx` |
| DEM-08 date souhaitée et créneau | Fait (0.7.0) | `formulaire.test.js`, `demandes.test.tsx` |
| DEM-11 brouillon sur le serveur | Fait (0.7.0), hors journal d'audit (E-27) ; enregistrement avec le lieu proposé d'office corrigé en 0.7.1 | `formulaire.test.js`, `demandes.test.tsx` |
| DEM-16 données minimales et consigne | Fait pour le formulaire (0.7.0 : rien de demandé au-delà du nom, du service et du téléphone ; aide de la description) ; consigne photo à l'étape 6 | `demandes.test.tsx` |
| DEM-12 accusé de réception | Fait à l'écran (numéro, délai indicatif, liens de suite espacés sur téléphone, 0.5.2) ; courriel à l'étape 13 | `demandes.test.tsx`, contrôle visuel |
| NUM-01 à NUM-05 numérotation | Fait : séquences par entité et type, format réglable, remise annuelle ou continue, attribution dans la transaction, unicité en base, sans trou, jamais réutilisé | `numerotation.test.js`, `demandes.test.js` |
| SUI-01 « Mes demandes » | Fait, sans le filtre « Mon service » (E-23) | `demandes.test.js`, `demandes.test.tsx` |
| SEC-02 lecture limitée aux siennes | Fait pour le demandeur, le bénéficiaire et la personne qui suit par « Moi aussi », sans le nom du demandeur pour cette dernière (0.7.0) ; abonnement à l'étape 10 | `demandes.test.js`, `voisines.test.js`, `formulaire.test.js` |
| ERG-03 accueil adapté au rôle | Fait pour le demandeur et le service technique (nombre à qualifier) ; tableau de bord à l'étape 8, journée de l'ouvrier à l'étape 18 | `demandes.test.tsx` |
| ERG-08 aucun jargon | Fait pour les écrans du demandeur (états en clair ; le numéro garde son code) ; « Ce champ est obligatoire » au lieu de « Données invalides » (0.5.1) ; « Adresse e-mail non valide » au lieu du message d'Ant Design sur le « type email » (0.5.2) ; détail du journal d'audit sans `lieu_id` ni `categorie_id` (0.7.4) | `demandes.test.tsx`, `i18n.test.ts`, `pages.test.tsx` |
| ERG-09 aucune perte de saisie sur une erreur | Fait pour le formulaire de demande ; champs obligatoires signalés avant l'envoi dans tous les formulaires (0.5.1) ; un seul message à la fois sous une adresse e-mail (0.5.2) | `demandes.test.tsx`, `pages.test.tsx` |
| PRI-01 priorité proposée par la catégorie | Partiel : la catégorie propose la priorité, notée sur la demande ; case danger en P1 (0.7.0) ; confirmation par le gestionnaire (étape 8) | `demandes.test.js`, `formulaire.test.js` |
| PRI-02 délais par priorité et par entité | Fait ; délai annoncé sur chaque demande | `priorites.test.js`, `calendrier.test.js`, `demandes.test.js` |
| PRI-03 échéance et retard sur chaque fiche | À faire, étape 8 | |
| LNG-01, LNG-02, LNG-09 FR et NL, recherche dans les deux langues | Fait pour les écrans et les données de la version ; noms du journal dans la langue de l'écran (0.7.4) | `i18n.test.ts`, `recherche-lieux.test.js`, `pages.test.tsx` |
| LNG-03 texte libre dans sa langue | Fait : langue de saisie notée sur la demande et indiquée à l'écran | `demandes.test.js` |
| CYC-05 aucune suppression | Fait : aucune route de suppression des demandes ; modification et annulation à l'étape 9 (E-21) | `demandes.test.js` |
| RGPD-01 photo réduite et sans métadonnées | Fait pour les photos des lieux | `lieux.test.js` |
| SEC-01 cloison vérifiée par un test généré | Fait pour toutes les ressources à identifiant, demandes et questions des catégories comprises (0.7.0) | `cloison.test.js` |
| SEC-03 contrôle des fichiers déposés | Fait pour les photos | `lieux.test.js` |
| TEC-05 acceptance NIXUS | Fait, ports 18443 et 18080 (E-14) ; inscription au tableau 15.2 du standard à faire par Renaud | |
| TEC-06 `backup.sh` et tâche DSM | Script fait ; tâche DSM à créer | |
| TEC-07 commandes NIXUS une par une | Fait pour 0.1.0 à 0.7.4 | `NOTES_LIVRAISON_v0.7.4.md`, `APRES-DEPLOIEMENT.md` |
| Dépôt public et tests automatiques (standard, section 15.7 ; `GITHUB.md`) | Fait : `ci.yml` de la section 7, `.gitignore`, aucune valeur de la section 6 ; travail `tests` au vert depuis la 0.7.3 (E-30 corrigé), rejoué sous Node 20 pour la 0.7.4 ; `dist/` dans l'archive (E-29) ; Dependabot et CodeQL de l'organisation (E-32) ; actions dépréciées (E-33) | `ci.yml`, `portabilite.test.js`, `dependances.test.js`, recherche sur les fichiers versés |
| ERG-01, ERG-05, ERG-06 identité, 360 px, accessibilité | Fait pour les écrans de la version ; erreurs reliées au champ (`aria-invalid`, `aria-describedby`) ; champs en 16 px sur petit écran sans bloquer le zoom (WCAG 1.4.4, 0.5.2) ; rouge d'erreur à 4,5:1 au moins en clair et en sombre (0.7.0, E-26 corrigé) | `pages.test.tsx`, `demandes.test.tsx`, `couleurs.test.tsx`, contrôle visuel, `a11y` |
| API-03 enveloppe, erreurs, OpenAPI | Fait pour les routes de la version | `api.test.js` |
| API-04 ordre des contrôles | Fait | `modules.test.js` |
| API-05 MCP en écriture | Fait pour toutes les routes de la version, sauf dépôt et lecture du fichier de photo (E-17) ; `list_audit` et `get_audit` rendent `noms` comme l'API (0.7.4) | `mcp.test.js`, `journal-noms.test.js` |
| AID-04 aide par fonctionnalité | Fait pour la version : rubriques (Nouvelle demande, Catégories et délais, Réglages de l'entité, Protection de vos données, Journal d'audit complétée en 0.7.4), FAQ (questions 20 à 24), intentions, note de version (0.7.2, 0.7.3 et 0.7.4 : une ligne pour l'administrateur) | `HelpPage.tsx`, `i18n.test.ts`, `notes-version.test.js` |
| Journal d'audit (standard, section 17.3) | Champs changés seulement (0.4.1) ; dépôt d'une demande sans la description, sans texte libre ni réponses (nombre seulement, 0.7.0) ; « Moi aussi » ; questions des catégories ; lieu habituel ; nettoyage de la migration ; brouillons hors journal (E-27) ; le détail nomme le lieu et la catégorie (code, nom, identifiant), noms trouvés à la lecture, journal enregistré inchangé (0.7.4, DV-50 fait) | `journal-diff.test.js`, `journal-noms.test.js`, `demandes.test.js`, `numerotation.test.js`, `pages.test.tsx` |
| RGPD-10 mentions d'information | Fait pour le formulaire de demande et l'aide (0.7.0), par entité (E-28) ; réservations (étape 23) et portail (étape 46) à venir | `formulaire.test.js`, `demandes.test.tsx`, `pages.test.tsx` |
| RGPD-12 trois questions RGPD | Fait à chaque version | `NOTES_LIVRAISON_v0.7.4.md` |
| Toutes les autres exigences | À faire selon `PLANNING-GMAO.md` | |

## 4. Actions ouvertes

| Action | Qui | Bloque |
| --- | --- | --- |
| Verser la 0.7.4 sur GitHub par la section 5 de `GITHUB.md` (branche `version/v0.7.4`, demande de fusion au vert, étiquette, publication avec l'archive), puis l'installer sur NIXUS et dérouler les contrôles à l'écran de ses notes de livraison | Thierry | 0.7.5 |
| Relier le dépôt au projet Claude (`GITHUB.md`, section 4.3) : le 29/10/2026, l'option « Ajouter depuis GitHub » n'apparaît pas dans le projet ; courriel envoyé à Renaud le 29/10/2026 pour activer l'intégration GitHub de l'organisation Claude ; réponse attendue. D'ici là, l'archive se joint à chaque conversation, comme avant | Renaud ou l'administrateur de l'organisation Claude, puis Thierry | Rien : l'archive jointe suffit |
| Courriel suivant à Renaud : E-31, E-32, E-33, 0.7.2 sautée sur NIXUS, protection de `main` (trois envois faits avec la 0.7.4) | Thierry | Rien |
| Décider des trois demandes de fusion de Dependabot (#1 `undici`, #2 `vitest`, #3 `vite`, outillage de l'interface) et de la configuration de Dependabot pour les dépôts d'écolage (E-32) ; ne pas les fusionner d'ici là | Renaud, ou l'administrateur de l'organisation | Rien ; leur travail `tests` est rouge |
| Mettre à jour `ci.yml` de la section 7 de `GITHUB.md` : `actions/checkout` et `actions/setup-node` en version qui vise Node 24 (E-33) | Renaud | Rien aujourd'hui ; avertissement à chaque exécution |
| Activer la protection de `main` avec le travail `tests` exigé au vert | Administrateur de l'organisation `berchem-brussels` | Rien ; sans elle, `main` n'est pas protégée |
| Dérouler sur la version installée les contrôles 2 et 3 de la 0.7.1, puis les contrôles 5 à 9 de la 0.7.0 | Thierry | Étape 6 |
| Adapter si nécessaire STANDARD.md (section 4.4) d'après E-31 : mise à jour ciblée d'une dépendance pour un avis de sécurité, accord, délai, cas sans correctif | Renaud, quand on travaillera pour du vrai | Rien en écolage |
| Trancher E-29 : `dist/` dans l'archive (DV-01) ou construction de l'interface dans l'image | Renaud | Rien |
| Régler le téléphone d'urgence et le contact du DPO de chaque entité (Réglages de l'entité) | Responsable du service technique de l'AC et du CPAS | Rien (renvoi au responsable tant que vide) |
| Faire valider par le DPO les mentions d'information livrées (base légale art. 6.1.e) et les adapter à l'écran si besoin | DPO, avec le responsable | Rien en acceptance ; avant la production |
| Décider des brouillons hors journal d'audit (E-27) | Renaud | Rien |
| Mettre à jour STANDARD.md : `multer` 2.x (sections 4.2 et 10.2, E-16), rouge d'erreur (E-26) | Renaud | Rien |
| Vérifier le parcours de demande sur un Samsung (Chrome), en néerlandais | Thierry, avec un agent qui en a un | Rien |
| Effacer le bandeau « Identifiants incorrects » de l'écran de connexion dès que l'adresse est modifiée ou qu'un nouvel essai est bloqué par le contrôle du format (DV-53) | Claude, version 0.7.5 proposée | Rien |
| Demandes `AC-DI-2026-00001` à `AC-DI-2026-00004` et `CPAS-DI-2026-00001` et valeur « Essai » désactivée au CPAS : données de recette | Thierry | Rien |
| Vérifier le simulateur, la FAQ et le formulaire de demande sur un téléphone Samsung (Chrome) | Thierry, avec un agent qui en a un | Rien |
| Désactiver la fermeture d'essai de la recette 0.4.1 à l'AC, si elle ne sert pas | Thierry | Rien |
| Porter au registre et à l'analyse d'impact : demandes d'intervention (demandeur, lieu, description), lieu de travail habituel, destinataires internes (gestionnaire et responsable de l'entité) ; nom de l'auteur d'une modification (0.4.1) ; depuis la 0.7.0 : bénéficiaire désigné (destinataire nouveau), date et créneau, remarque du « Moi aussi », brouillon (30 jours), réponses aux questions | DPO, formalisme mené en parallèle | Rien |
| Atelier catégories, priorités, délais et questions avec le service technique de chaque entité (D-11), à partir des 11 types et des 5 urgences relevés dans 3P (DV-38) ; ajuster ensuite à l'écran | Métier, responsable du service technique | Rien (défauts en place) |
| Captures de 3P côté gestionnaire (liste des fiches, fiche ouverte, qualification, affectation, clôture, bon de travail) ; captures de l'intérieur d'une « Werkopdracht » et d'une « Ontlening » | Thierry | Utile avant l'étape 8 (et l'étape 25 pour les prêts) |
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

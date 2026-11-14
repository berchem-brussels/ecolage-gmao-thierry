# Journal des versions

Version de l'application : **0.16.0** · Mis à jour le 10/11/2026

## 0.16.0 (10/11/2026)

Étapes 11 et 12 regroupées (DV-121) : validation par le chef de service, services et valideurs, création par le gestionnaire, regroupement, découpage, vue en colonnes par état (DEM-15, ROL-04, GES-03, GES-05, GES-06 ; DV-128 à DV-132 ; fin de E-22), avec les remarques R1 et R2 de la recette de la 0.15.0 (DV-127). Migration `014_validation`. Aucune dépendance nouvelle ; permissions nouvelles `demandes:valider` (rôle « Valideur ») et `services:gerer` (administrateur).

- R1 : `audit.detail.interne` dit « Note interne » / « Interne nota » comme les écrans.
- R2 : un message prend la langue de l'écran ; un modèle inséré donne la langue de la demande ; le service voit et corrige « Langue du message » (`FilMessages.tsx`, `services/messages.js`, MCP).
- Services (`services`, `services/services.js`, `/api/services`, écran « Services et valideurs ») : code unique dans l'entité, noms FR et NL, chef (`valideur_id`) et suppléant pour une période, avec le rôle « Valideur » dans l'entité (`VALIDEUR_SANS_ROLE`, `SUPPLEANT_PERIODE`, `SUPPLEANT_EGAL_VALIDEUR`, `SERVICE_CODE_EXISTE`) ; désactivation avec motif ; `users.service_id` réglé dans Utilisateurs et rôles (`SERVICE_AUTRE_ENTITE`, `SERVICE_INCONNU`).
- Circuit au dépôt : catégorie « à valider » → « En validation » chez le chef du service du demandeur (`demandes.service_id`) ; sans service ni chef actif, ou demandeur chef de son service : « À qualifier », journal `validation` `sans_valideur` ou `auteur_valideur`. Passages du valideur (`en_validation` → `a_qualifier`, → `refusee_validation` avec motif), délais recalculés depuis la validation ; « En validation » hors retard ; annulation par le demandeur. « Demandes à valider (n) » au menu et à l'accueil, écran `/a-valider` ; `GET /api/demandes/a-valider`.
- Encodage par le service (`POST /api/demandes` avec `demandeur_id` et `canal`, `ENCODAGE_INCOMPLET`, `DEMANDEUR_HORS_ENTITE`) : écran `/demandes/encoder`, bloc « Demande reçue » ; fiche « Reçue par … », encodée par … (service).
- Regroupement (`services/fusion.js`, `POST /api/demandes/:id/fusionner`, `demandes.fusionnee_dans`) : quatre passages vers `fusionnee` (`via` `fusionner`), route des passages fermée (`TRANSITION_PAR_ROUTE`) ; personnes qui suivent, demandeur et bénéficiaire reportés sur la principale (`FUSION_ELLE_MEME`, `FUSION_PRINCIPALE_FERMEE`) ; « Demandes regroupées ici ».
- Découpage (`services/decoupage.js`, `POST /api/demandes/:id/decouper`, `demandes.issue_de`) : une à cinq demandes nouvelles, tout ou rien, numéros sans trou, délais depuis la réception de l'origine (`DECOUPAGE_ETAT`) ; « Demandes issues de celle-ci ».
- Colonnes par état (`VueColonnes.tsx`, `?affichage=colonnes`) : six colonnes, glisser-déposer natif sur grand écran, « Déplacer » partout, seuls les états permis ; la fiche s'ouvre sur le passage, rien sans confirmation ; une colonne à la fois sur téléphone.
- Catalogue des passages : champ `depuis` ; 33 passages livrés.
- Journal d'audit : `service.*`, `demande.fusion`, `demande.decoupage`, `validation` et `encodee_par` au dépôt ; service, personnes et demandes nommés à l'affichage ; jamais de texte libre.
- MCP : huit outils (`list_demandes_a_valider`, `list_services`, `get_service`, `create_service`, `update_service`, `deactivate_service`, `fusionner_demande` et `decouper_demande` en deux appels) ; `create_demande`, `get_demande`, `update_user`, `list_users` enrichis.
- Données de démonstration : un service « <ENTITÉ>-DEMO » par entité (chef `valideur.<entité>`, membre `agent.<entité>`).
- Téléphones : boutons d'action qui passent à la ligne (« Samenvoegen… » débordait de 3 px à 320 px NL) ; `mobile:check` couvre l'encodage, les colonnes, « Déplacer », le regroupement et le découpage, avec deux comptes facultatifs (chef de service, administrateur) et une connexion par compte (41 écrans).
- Aide : fiches « Demandes à valider », « Services et valideurs », « Encoder une demande reçue » ; procédures colonnes, regrouper, découper, encoder ; trois questions dans Mes demandes ; sept captures nouvelles par langue (30), dont deux avec le compte du chef de service (`HELP_USER_VALIDEUR`) ; six intentions de l'assistant ; texte du circuit de validation à jour dans Catégories et délais ; note de version (deux lignes pour tous, une pour le chef de service, une pour le service technique, une pour l'administrateur).
- `recette.sh`, contrôle 5 : migration `014_validation`, table des services, passages du valideur.
- Tests : serveur 541 (513 en 0.15.0 ; `validation.test.js` : 13, `encodage.test.js` : 5, `fusion.test.js` : 3, `decoupage.test.js` : 3), interface 314 (281) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md` (un trou trouvé et comblé à la livraison : valideur d'un autre service).

## 0.15.0 (09/11/2026)

Étape 10 : fil de messages, notes internes avec mention, modèles de réponse, abonnement (SUI-04, SUI-09, GES-08, GES-09, SEC-02 ; DV-123 à DV-126), avec les remarques R1 à R3 de la recette de la 0.14.0 (DV-122). Migration `013_messages`. Aucune dépendance nouvelle, aucune permission nouvelle.

- R1 : au retour sur l'onglet (`focus`, `visibilitychange`), `AuthContext` relit le profil ; une autre personne connectée entre-temps ramène à l'accueil, une session finie à la connexion (`session.test.tsx`).
- R2 : explication du délai de réouverture et « ? » du texte GRC sans numéro d'étape ; aucun « étape N » ni « stap N » dans les réglages, les fiches d'aide, les « ? », les textes et l'assistant (tests).
- R3 : plus de délai annoncé sur une demande fermée (fiche, carte sur téléphone, « Sans objet » dans le tableau) ; formulaire de réouverture : « Après le {date}, faites une nouvelle demande. ».
- Nombre de passages du cycle de vie (26) corrigé dans les notes de la 0.14.0 et la documentation ; `cycle.test.js` compare les nombres cités au catalogue.
- Fil de messages (`demande_messages`, `services/messages.js`) : lu par le demandeur, le bénéficiaire et le service (`demandes:entite`), écrit par le demandeur, le bénéficiaire et `demandes:traiter`, sur une demande ouverte seulement (`DEMANDE_FERMEE`) ; texte de 4 000 caractères au plus, ou photos et PDF seuls ; nom des agents caché au demandeur ; qui suit seulement ne lit pas le fil ; aucun message modifié ni effacé.
- Pièces d'un message (`pieces_jointes.message_id`, `attente_message`) : déposées avant l'envoi, lues par leur auteur seul jusqu'à l'envoi, rattachées au message, plafond par message (`PIECES_PLAFOND_MESSAGE`), purge après 30 jours si jamais envoyées ; route de dépôt hors MCP (E-17, six routes).
- Non lu (`demande_messages_lus`) : repère « Nouveaux messages », étiquette « n nouveaux messages » dans « Mes demandes », la liste du service et l'accueil (« n demandes ont un nouveau message ») ; filtre `messages=non_lus` ; compteur « Messages à lire ».
- Notes internes avec mention (`demande_mentions`) : « Note interne au service », jamais rendue au demandeur ni à son MCP ; « Prévenir un collègue » (1 à 10 collègues du service, `MENTION_INTERNE`, `MENTION_INVALIDE`) ; « Vous êtes mentionné », compteur « Notes où vous êtes mentionné » et filtre `mentions=a_voir`.
- Modèles de réponse (`modeles_reponse`, `config/modeles-reponse.json`, `/api/modeles-reponse`) : onglet « Modèles de réponse » de Catégories et délais, écrit par le responsable, lu par le gestionnaire ; titre et texte FR et NL ; variables `{numero}`, `{lieu}`, `{etat}`, `{prenom}` (`MODELE_VARIABLE` sinon) ; quatre modèles livrés par entité ; « Insérer un modèle » dans la langue de la demande.
- Abonnement (`demande_suiveurs.source`) : « Suivre cette demande » sans remarque (`REMARQUE_ABONNEMENT`), « Ne plus suivre » avec confirmation, remarque d'un « Moi aussi » effacée (`PAS_SUIVIE` sinon) ; source dans la liste des personnes qui suivent.
- Journal d'audit : `demande.message` (numéro, message, `interne`, longueur, pièces, mentions), `demande.suivre` avec la source, `demande.ne_plus_suivre`, `modele_reponse.*` ; jamais de texte libre.
- MCP : onze outils (`list_messages_demande`, `add_message_demande`, `mark_messages_lus`, `list_mentionnables_demande`, `list_pieces_message`, `list_modeles_reponse`, `get_modele_reponse`, `create_modele_reponse`, `update_modele_reponse`, `deactivate_modele_reponse` et `ne_plus_suivre_demande` en deux appels).
- Téléphones : étiquettes d'une bulle qui passent à la ligne (une mention longue débordait de 3 px à 360 px) ; `mobile:check` ouvre le fil le plus garni, mesure aussi le volet en « Note interne » et signale un contenu plus large que sa bulle (28 écrans).
- Aide : fiches Mes demandes, Demandes de l'entité et Catégories et délais complétées ; trois captures nouvelles par langue (23) ; quatre intentions de l'assistant ; note de version (deux lignes pour tous, une pour qui traite les demandes, une pour le responsable).
- `recette.sh`, contrôle 5 : migration `013_messages`, tables du fil, modèles livrés dans chaque entité.
- Tests : serveur 513 (473 en 0.14.0 ; `messages.test.js` : 19, `modeles-reponse.test.js` : 4), interface 281 (262) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md`.

## 0.14.0 (08/11/2026)

Étape 9 : cycle de vie des demandes (CYC-01, CYC-02, CYC-04, CYC-05, SUI-02, SUI-05, SUI-06, CLO-01, GES-01, PRI-03 ; DV-117 à DV-120). Migration `012_cycle_de_vie`. Aucune dépendance nouvelle.

- `recette.sh` (DV-117) : mot de passe de démonstration saisi de façon visible (`read -r -p`), ligne effacée à Entrée, « Mot de passe reçu : N caractère(s) » ; un refus du contrôle 7 dit « mot de passe refusé, vérifiez la saisie (N caractère(s) reçu(s)) », « trop d'essais », « connexion par mot de passe fermée » ou « adresse ou mot de passe mal formé » au lieu d'un code HTTP ; le contrôle 5 lit `012_cycle_de_vie`.
- Passages d'un état à l'autre en données (`backend/config/cycle-de-vie.json` : 15 états, 26 passages ; table `demande_transitions`) ; tout passage absent est refusé ; un passage désactivé n'est jamais réactivé. Permission nouvelle `demandes:traiter` (gestionnaire, responsable). Le gestionnaire démarre, met en attente avec un motif, reprend, termine, clôture avec la cause de la panne et un compte rendu interne, refuse avec un motif, annule ; « Planifiée » et « Confiée à un prestataire » restent fermés (DV-118) ; la qualification reste la seule voie vers « Qualifiée ».
- Historique de chaque passage (`demande_historique` : auteur, canal, motif, commentaire public ou interne), rempli par la migration pour les demandes déjà en base ; volet de la fiche du service avec ses boutons d'action, son formulaire et l'historique.
- Suspension du délai (DV-119) : une attente pour un motif coché dans Réglages de l'entité (par défaut « Réponse du demandeur attendue », « Accès impossible ») suspend le délai, dit « Délai suspendu » ; à la sortie, l'échéance de fin est repoussée du temps suspendu (ouvrable, calendaire pour P1).
- Tableau de bord : six compteurs, dont « En attente depuis plus de N jours ouvrés » (réglage `demandes.attente_jours`, 5) et « À clôturer (travaux terminés) » ; une demande rouverte compte dans « À qualifier » ; filtre « Durée de l'attente » de la liste du service.
- Demandeur et bénéficiaire (E-21 fermé) : ligne du temps sur la fiche ; « Compléter ma demande » (texte sous la description, photos ajoutées) tant qu'elle est ouverte ; « Annuler ma demande » avec un motif tant qu'elle n'a jamais été « En cours » ; avis en cinq niveaux à la clôture, un par clôture ; « Rouvrir ma demande » dans le délai de l'entité, délais recomptés depuis la réouverture.
- Libellés des états par entité (CYC-04, `demande_etats`) : onglet « États des demandes » de Catégories et délais, texte du demandeur et de la GRC en FR et NL, retour aux libellés livrés.
- Listes de valeurs nouvelles : motifs d'attente (5), motifs de refus (4), causes de panne (7) ; écran Listes de valeurs en boutons qui passent à la ligne. Réglage de type nouveau `codes_liste` (cases parmi les valeurs d'une liste).
- Journal d'audit : `demande.transition` (états avant et après, motif nommé, `commentaire_donne`, `compte_rendu_donne`, `suspendu`, échéance avant et après), `demande.complement`, `demande.avis`, `etat_demande.update`, sans texte libre.
- MCP : huit outils (`get_historique_demande`, `change_etat_demande` et `cancel_demande` en deux appels, `complete_demande`, `give_avis_demande`, `list_etats_demande`, `list_transitions_demande`, `update_etat_demande`) ; photo ajoutée à une demande envoyée hors MCP (E-17, cinq routes).
- Téléphones : étiquette d'état qui passe à la ligne dans les volets (elle débordait de 103 px à 320 px depuis la 0.13.0) ; `mobile:check` ouvre les volets et signale un volet trop large (26 écrans).
- Aide : fiches Mes demandes, Demandes de l'entité, Catégories et délais, Réglages de l'entité, Listes de valeurs, avec leurs questions ; six captures refaites ou nouvelles par langue ; deux intentions de l'assistant ; note de version (deux lignes pour tous, une pour qui traite les demandes, une pour le tableau de bord, une pour le responsable).
- Tests : serveur 473 (437 en 0.13.0 ; `cycle.test.js` : 19, `suspension.test.js` : 7, `recette.test.js` : 2), interface 262 (238) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md`.

## 0.13.0 (08/11/2026)

Étape 8 ter (DV-101) : photo de l'endroit sur la fiche d'une demande et filtre « Sans photo » dans Patrimoine ; défauts D1 à D10 du contrôle complet de la 0.12.0 (DV-113, DV-114) et remarques M1 à M5 de sa recette (DV-112). Aucune migration, aucune dépendance nouvelle.

- Téléphones (D1) : sous 768 px, la langue passe dans le menu de la personne (« Nederlands » ou « Français », attribut `lang`), comme le niveau de détail et le thème ; marges de l'en-tête resserrées ; l'en-tête tient dans 320, 360, 375, 390 et 412 px, en FR et en NL (il dépassait de 68 px à 320 px et de 28 à 30 px à 360 px). Contrôle `npm run mobile:check` (`frontend/mobile-check/verifier-mobile.mjs`) : chaque écran du menu en FR et en NL à quatre largeurs (iPhone SE, Android 360 px, iPhone 13, Pixel 7) ; débordement, texte hors de l'écran, champ sous 16 px, erreurs de la console et appels refusés.
- Aide : un lien « Voir aussi » ouvre la fiche liée (D4, clé du `Collapse` liée à `?fiche=`) ; impression du mode d'emploi lancée quand les captures (chargées d'emblée à l'impression), la FAQ et les notes sont prêtes, huit secondes au plus (M1 : l'impression partait avec 3 captures sur 18) ; « Ajouter à la FAQ » préremplit la dernière réponse publique du service, sans le motif de résolution (M2) ; l'onglet Questions fréquentes montre aussi les questions rattachées à un écran, avec « Écran : … » (M3) ; « Entité AC seulement », « Commune aux deux entités », « Cette entité (AC) » (M4).
- Journal d'audit sans code brut (D2, D3, D9, M5) : libellés FR et NL de tout champ que le serveur peut écrire (test d'inventaire), codes traduits par famille d'actions (nature et statut d'un lieu, niveau et pictogramme d'une catégorie, unité et couleur d'une priorité, jour de l'horaire, type d'un fichier, langue, thème, liste, module), rôles par leur libellé, écran d'une question de la FAQ par le titre de sa fiche, dates au format de la langue (« 8 mai »), colonne Objet traduite en mode Complet ; le serveur nomme un réglage (`noms.cle`, catalogues de l'instance et de l'entité) et le type d'un lieu à la lecture.
- Tickets (D8, décision de Thierry du 08/11/2026) : un changement d'état note `motif_donne` (0 ou 1) au journal au lieu du texte du motif, qui reste dans le fil du ticket (écart au gabarit E-46).
- Textes et accessibilité : délais au singulier (« 1 heure calendaire », « 1 jour ouvrable », « 1 demande », « 1 fichier non ajouté », D5) ; explication du téléphone d'urgence à jour (D6) ; motif du retrait d'un rôle demandé sous le champ, avec le focus (D7) ; texte discret (`colorTextDescription`) à 4,5:1 au moins en clair (#666666) et en sombre (#a6a6a6), numéro de version du menu plus lisible (D10).
- Photo de l'endroit (DV-101) : `photo_lieu` de `GET /api/demandes/:id` et de `get_demande`, au seul service technique (photo du lieu, sinon du plus proche lieu au-dessus, `du_lieu`) ; `PhotoLieu.tsx` sous « Où ? » de la fiche du service et en tête de la qualification, agrandie au toucher.
- Filtre « Sans photo (n) » dans Patrimoine (`?photo=sans`) ; `has_photo` (0 ou 1) de `GET /api/lieux` et de `list_lieux`.
- Aide : fiches Accueil (langue sur téléphone), Demandes de l'entité (photo de l'endroit), Patrimoine (lieux sans photo) ; capture de Patrimoine refaite (FR et NL) ; note de version (deux lignes pour tous, une pour le service technique, une pour l'administrateur).
- Tests : serveur 437 (427 en 0.12.0 ; `photo-lieu-demande.test.js` : 5), interface 238 (217) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md`.

## 0.12.0 (06/11/2026)

Aide par écran et FAQ locale (standard v3.3, section 13.1 ; DV-100), regroupant les anciennes 0.12.0 et 0.12.1 (DV-110) ; six remarques de la recette de la 0.11.0 (DV-109) ; contrôles automatiques après installation (DV-110). Migration `011_faq`. Dépendance de développement `@playwright/test` ^1.56.1 (E-37), absente des images.

- Remarques de la recette de la 0.11.0 : R1 « (valeur par défaut) » en texte discret, plus en étiquette qui ressemblait à un bouton ; R2 un réglage refusé nomme le réglage et la valeur fautive, en FR et en NL, sous le champ, par l'écran comme par l'assistant ; R3 codes de rôle des files acceptés en majuscules ou en minuscules, dit dans l'explication ; R4 plus de clé ni de code brut dans le détail du journal (champs de la connexion Microsoft, champs modifiés d'un ticket, type, mode, méthode, motif d'un refus de Microsoft, secret « masqué ») ; R5 procédure de lecture des tickets par Claude passée par Claude in Chrome (`MCP.md`) ; R6 compteurs des tickets demandés seulement à qui traite une file (`files_tickets` dans le profil).
- FAQ locale en base (migration `011_faq`, repris du gabarit et adapté, E-44) : entrées communes (administrateur) ou d'une entité (gestionnaire et responsable, permission `faq:gerer`), cloison entre entités, recherche, retrait avec motif et rétablissement, journal avec l'entité ; question métier résolue ou close transformée en entrée de son entité (`POST /api/tickets/:id/faq`, « Ajouter à la FAQ ») ; six outils MCP.
- Aide par écran (repris du gabarit et adapté, E-45) : bouton « Aide » dans l'en-tête de chaque écran (panneau avec la fiche de l'écran et ses questions) ; seize fiches FR et NL (demandeur, service technique, administration, aide) qui remplacent les rubriques d'avant ; centre `/help` avec ses onglets, recherche sans accents, impression complète ; « ? » à côté de chaque champ (`hints.ts`, fin d'E-39) ; « Signaler » nomme l'écran par le titre de sa fiche ; en-tête tenu dans 360 px (thème dans le menu de la personne sur téléphone).
- Captures de l'aide : 18 par langue, produites par `npm run help:capture` sur une base de démonstration, servies sous `/aide-captures` (sous `/help`, nginx aurait servi le dossier au lieu de l'écran) ; trois défauts du script du gabarit corrigés (E-37).
- `recette.sh` et `backend/src/recette-api.js` : neuf contrôles après installation, en lecture seule, mot de passe de démonstration tapé sans affichage.
- Aide et note de version : fiche fonctionnelle `docs/fonctionnel/aide.md` ; note (deux lignes pour tous, une pour le service technique, deux pour l'administrateur).
- Tests : serveur 427 (410 en 0.11.0 ; `faq.test.js` : 7), interface 217 et un contrôle des captures (181) ; contrôles bloquants de l'aide dans `help.test.ts` ; preuves d'échec dans `docs/fr/SECURITE.md`.

## 0.11.0 (05/11/2026)

Tickets (standard v3.3, section 13.5 ; DV-96, DV-97, DV-107, DV-108), modules du gabarit 1.3.0 repris et adaptés aux rôles par entité ; quatre remarques de la recette de la 0.10.0 (DV-106). Migration `010_tickets`. Aucune dépendance nouvelle.

- Repris du gabarit : `services/tickets.js`, `routes/tickets.js`, quatre schémas, neuf outils MCP (dont `list_tickets_to_handle` et `change_ticket_status` en deux appels), `ReportTicketModal.tsx`, `TicketsPage.tsx`, `TicketDrawer.tsx`, `PageHeader.tsx` (sans le bouton d'aide, 0.12.0), dernière erreur de l'API dans `api.ts`, sept tests des tickets.
- Adaptés : `entite_id` sur le ticket ; file métier traitée par le responsable et le gestionnaire de l'entité active, file IT par l'administrateur pour toutes les entités ; affectation contrôlée (`ASSIGNEE_INVALIDE`) ; question sans entité active refusée (`NO_ENTITE`) ; transfert vers une file non traitée confirmé sans le contenu ; réglages des files et des délais dans les paramètres de l'instance (onglet « Tickets », formats contrôlés, jamais servis sans session) ; capture réduite dans le navigateur et nettoyée par `cleanPhoto` ; écran nommé par son libellé du menu ; filtre du type en boutons ; dates à l'heure locale ; contexte technique en mode Complet.
- Interface : bouton « Signaler » dans l'en-tête de chaque écran, écran Tickets (menu Aide), onglet Tickets de Paramètres ; textes FR et NL ; familles et actions du journal nommées.
- Recette de la 0.10.0 (DV-106) : « Secret client » dit « copiez la colonne Valeur, jamais l'ID du secret » et refuse une valeur à la forme d'un identifiant (écran, API, MCP, `SECRET_IS_ID`) ; code d'erreur de Microsoft (`AADSTS…`) gardé au journal avec `OIDC_EXCHANGE` (E-40) ; « Enregistré le … à … par … » sur l'onglet Connexion Microsoft, lu dans le journal d'audit ; fenêtre « Nouveautés » : un clic sur le sélecteur de langue tombait sur le fond de la fenêtre, qui se fermait en marquant les notes lues sans changer la langue (cause racine) ; elle ne se ferme plus par un clic à côté et porte ses boutons FR et NL.
- Lecture des tickets par Claude sur le réseau interne, par le navigateur de la personne et sa session (DV-108) : procédure dans `docs/fr/MCP.md`.
- Aide : rubrique Tickets, questions 29 et 30, réponse de l'assistant ; fiche fonctionnelle `docs/fonctionnel/tickets.md` ; note de version (deux lignes pour tous, une pour le service technique, deux pour l'administrateur).
- Documentation : titres et lignes de version des documents NL et EN, `ARCHITECTURE.md` et `EXPLOITATION.md` mis à jour depuis la 0.9.0, ligne de version des `README` (E-42).
- Tests : serveur 410 (386 en 0.10.0 ; `tickets.test.js` : 14, dont 7 du gabarit), interface 181 (174) ; preuves d'échec dans `docs/fr/SECURITE.md`.

## 0.10.0 (05/11/2026)

Connexion Microsoft compatible avec Portal (standard v3.3, section 8.6 ; `SSO-COMPATIBLE-PORTAL.md` 1.0 ; TEC-03 avancé, DV-95, DV-96), modules du gabarit 1.3.0 repris sans réécriture (DV-99). Migration `009_sso`. Aucune dépendance nouvelle.

- Repris tels quels du gabarit : `oidc.js` (PKCE S256, aucun `prompt` ni `max_age`, jeton vérifié en RS256 contre la clé publiée par Microsoft, émetteur, audience, expiration, `nonce`, règle `safeNext`), `settings.js` (réglages en base, secret chiffré), `routes/sso.js` (`/api/auth/config`, `/api/auth/sso/start`, `/api/auth/callback`, `/api/settings/auth`) et `tests/sso.test.js`.
- Adaptés : migration `009_sso` (partie connexion de la migration du gabarit : `users.oid`, `users.is_admin_local`, table `auth_pending` ; accès de secours au premier administrateur réel) ; `appendCookie` dans `auth.js` (le cookie de session ne remplace plus l'effacement du cookie d'état) ; réglages de connexion dans `services/connexion.js`, partagé avec le MCP (DV-104) ; mot de passe refusé en mode `sso` hors accès de secours ; dernier accès de secours protégé en mode `sso`.
- Interface : page de connexion avec « Se connecter avec Microsoft », départ automatique en mode `sso` sauf `?deconnecte=1`, `?erreur=…` et `?local=1` ; écran demandé gardé (`/login?next=…`) ; « Se déconnecter » mène à « Vous êtes déconnecté » ; onglet « Connexion Microsoft » dans Paramètres ; case « Accès de secours par mot de passe » et étiquettes « Microsoft », « Accès de secours » dans Utilisateurs ; textes FR et NL ; trois actions et deux familles du journal nommées.
- MCP : `get_auth_settings`, `update_auth_settings` (deux appels) ; `update_user` prend `is_admin_local`.
- Note de version : deux lignes pour l'administrateur.
- Tests : serveur 386 (372 en 0.9.1 ; 13 de `sso.test.js` dont 6 du gabarit et une migration sur une base 0.9.1, 1 pour la note de version), interface 174 (164) ; preuves d'échec dans `docs/fr/SECURITE.md`.

## 0.9.1 (03/11/2026)

Correctif des deux défauts mineurs de la recette de la 0.9.0 (DV-94), première version de l'étape 8 bis (DV-95). Aucune migration, aucune dépendance nouvelle.

- R1 : sur « Demandes de l'entité », les compteurs du tableau de bord se rechargent après une qualification. Cause racine : `TableauBord` ne chargeait les compteurs qu'à son affichage et au changement d'entité ; la page rechargeait la liste sans le prévenir. La page lui passe désormais un compteur `rafraichir`, augmenté après chaque qualification ; les nombres restent affichés pendant le rechargement.
- R2 : dans le détail du journal d'audit, l'état d'une demande (« Avant », « Après ») s'affiche par son libellé du service technique (« À qualifier », « Qualifiée ») dans la langue de l'écran. Cause racine : `JournalPage` traduisait les cases à cocher et les noms trouvés par le serveur, mais rendait tout autre texte brut. Une table fixe (`CODES`) relie le champ `etat` aux libellés `demande.etat_service.*` ; un code sans libellé reste affiché tel quel. Le journal enregistré ne change pas.
- Tests de non-régression : un pour R1, deux pour R2 (FR et NL, avec un code inconnu), qui échouent sans la correction ; note de version 0.9.1 (une ligne pour le service technique, une pour l'administrateur) et son test.
- Copie de `STANDARD.md` passée en v3.3 (valeurs d'exemple à la place de celles de NIXUS) ; écarts E-16, E-26, E-27, E-31 et E-32 fermés ou constatés alignés au standard v3.3 ; écarts E-36 à E-38 relevés sur le gabarit 1.3.0.
- Tests : serveur 372 (371 en 0.9.0), interface 164 (161).

## 0.9.0 (02/11/2026)

Étape 8 : tableau de bord, liste et qualification du service technique (GES-01, GES-02, GES-04, PRI-01, PRI-03 ; DV-87 à DV-93), avec la correction du contrôle 7 de la recette de la 0.8.0 (DV-86). Migration `008_qualification`.

- Échéances enregistrées sur chaque demande (prise en charge et fin), calculées au dépôt depuis la réception, recalculées à chaque qualification ; la migration les calcule pour les demandes déjà en base, et le démarrage complète celles qui n'en ont pas. Échéance qui compte : la prise en charge tant que la demande est « À qualifier », puis la fin ; « En retard » quand elle est passée.
- Tableau de bord du service technique, à l'accueil et en tête de « Demandes de l'entité » : à qualifier, en retard, P1 et P2 ouvertes, échéance dans les deux jours ouvrés ; chaque compteur ouvre la liste filtrée (`GET /api/demandes/tableau-bord`).
- « Demandes de l'entité » devient la liste du service : filtres (en cours, échéance, états, priorités, catégorie avec son domaine, site ou bâtiment avec ses locaux, source, danger), recherche sur le demandeur aussi, tri par numéro, priorité, échéance et dépôt, filtres dans l'adresse de la page, repliés sur téléphone ; états avec les libellés du service (« À qualifier », « Qualifiée »…).
- Vues enregistrées par personne et par entité (`/api/vues-demandes`, table `vues_demandes`, vingt au plus).
- Qualification sur un écran (`POST /api/demandes/:id/qualifier`, permission nouvelle `demandes:qualifier` du gestionnaire et du responsable) : catégorie, lieu, priorité confirmée ou changée avec un motif, durée estimée, date convenue pour une priorité sans délai de fin, consignes à l'ouvrier, photos du service visibles ou non par le demandeur. « À qualifier » devient « Qualifiée ». Consignes et motif jamais rendus au demandeur ; journal `demande.qualifier` sans texte libre, lieu et catégorie nommés à la lecture.
- Fiche du service : priorité et motif, échéances, durée, consignes, qualifiée le … par ….
- Contrôle 7 de la 0.8.0 : le groupe « Pièces jointes des demandes » apparaît dans Réglages de l'entité ; toutes les familles du journal d'audit ont leur nom (pièces jointes, demandes, catégories, priorités et délais, horaire, congés et fermetures, système, vues). Tests : chaque groupe du catalogue est affiché, chaque famille a son libellé.
- MCP : `get_tableau_bord`, `qualifier_demande`, cinq outils des vues ; `list_demandes` prend les filtres du service.
- Test nouveau : chaque fichier de test du serveur est joué par `npm test`.
- Aide : rubriques Demandes de l'entité et Délais des demandes, questions 27 et 28, deux réponses de l'assistant ; fiche fonctionnelle `docs/fonctionnel/service-technique.md` ; note de version (une ligne pour tous, deux pour le service technique, une pour le responsable).
- Tests : serveur 371 (347 en 0.8.0), interface 161 (149).

## 0.8.0 (30/10/2026)

Étape 6 : photos et pièces jointes des demandes (DEM-09, DEM-16, RGPD-01, RGPD-02 ; DV-82 à DV-85). Migration `007_pieces_jointes`.

- Socle des fichiers : `multer` 2.5.0 (E-16, décidé par Renaud le 28/10/2026) dans un lecteur commun (`backend/src/fichiers.js`) : formulaire multipart, un fichier au champ `fichier`, en mémoire, plafonné ; type sur les premiers octets ; photos nettoyées par `images.js` ; PDF tronqué ou à contenu actif refusé. La photo d'un lieu passe sur ce lecteur ; droits contrôlés avant la lecture du fichier. Contrat OpenAPI en `multipart/form-data`.
- Pièces jointes : table `pieces_jointes`, dossier `pieces`, routes `GET` et `POST /api/demandes/brouillon/pieces`, `GET /api/pieces/:id`, `GET /api/pieces/:id/fichier` (toujours en pièce jointe), `DELETE /api/pieces/:id` (suppression réelle). Ajout au brouillon (DV-85), rattachement à l'envoi, effacement avec le brouillon et après 30 jours. Lecture par le demandeur, le bénéficiaire et le service technique, pas par qui suit seulement. Suppression selon DV-84 (permission nouvelle `pieces:supprimer`). Journal `piece.add`, `piece.delete`, `piece.purge`, sans nom de fichier.
- Réglages de l'entité, groupe « Pièces jointes des demandes » : 5 pièces, 10 Mo, photos et PDF (DV-83).
- Formulaire : bloc « Photos et documents » (réduction des photos dans le navigateur, envoi un à un, consigne DV-66, compteur, « Retirer ») ; pièces dans le brouillon et l'invite de reprise ; nombre de pièces après l'envoi.
- Fiche d'une demande : ligne « Pièces jointes », vignettes, téléchargement des PDF, « Retirer » selon `peut_retirer`.
- MCP : `list_pieces_brouillon`, `get_piece`, `delete_piece` ; dépôt et téléchargement hors MCP (E-17, quatre routes).
- Exploitation : `nginx.conf` 11 Mo sur la seule route de dépôt des pièces ; `backup.sh` copie le dossier `pieces`.
- Aide : rubriques Nouvelle demande et Réglages de l'entité, questions 25 et 26 de la FAQ, réponse de l'assistant ; note de version (une ligne pour tous, une pour le responsable).
- Tests : serveur 347 (309 en 0.7.5), interface 149 (132).

## 0.7.5 (29/10/2026)

Améliorations de la recette de la 0.7.4, regroupées en une version (DV-76), sans migration.

- « Vos lieux récents » : en tête du choix d'un lieu (« Où ? » de « Nouvelle demande » et « Mon lieu de travail »), les derniers lieux distincts des demandes de la personne dans l'entité active, en boutons, cinq au plus, sans le lieu déjà choisi ; masqués pendant une recherche. Tirés des demandes déjà en base : rien de nouveau n'est enregistré (DV-74). Le profil (`GET /api/auth/me`, `get_profile`) rend `lieux_recents`.
- Connexion : le bandeau « Identifiants incorrects » s'efface dès que l'adresse change, et quand un nouvel essai est arrêté par le contrôle du formulaire (DV-53).
- Journal d'audit : une case à cocher s'affiche « Oui » ou « Non » au lieu de 1 ou 0 ; un champ vide n'est plus montré, sauf « Avant » et « Après », où le vide se dit « aucun ».
- Aide : rubriques Nouvelle demande et Journal d'audit complétées ; note de version (deux lignes pour tous, une pour l'administrateur).
- Tests : serveur 309 (300 en 0.7.4), interface 132 (129).

## 0.7.4 (29/10/2026)

Journal d'audit plus lisible (DV-50, DV-73), sans migration.

- Dans le détail d'une ligne du journal, un lieu ou une catégorie désigné par son identifiant s'affiche par son code et son nom, dans la langue de l'écran, l'identifiant entre parenthèses : lieu et catégorie d'une demande déposée, lieu de travail habituel (choisi par l'agent ou réglé par l'administrateur), lieu ou domaine de rattachement d'un lieu ou d'une catégorie déplacé. « fiche introuvable » si la fiche n'existe plus. Le bénéficiaire d'une demande reste un identifiant.
- Les noms sont lus à l'affichage (champ `noms` de `GET /api/audit` et `GET /api/audit/:id`, et des outils MCP `list_audit` et `get_audit`) ; le journal enregistré ne change pas, les lignes anciennes en profitent aussi. Toujours réservé à l'administrateur.
- Une valeur composée du détail (« Avant », « Après ») s'affiche champ par champ, avec ses libellés, au lieu du texte JSON ; libellés FR et NL des champs des demandes (numéro, priorité, danger, date souhaitée…).
- Aide : rubrique Journal d'audit complétée ; note de version d'une ligne pour l'administrateur.
- Tests : serveur 300 (293 en 0.7.3), interface 129 (127).

## 0.7.3 (29/10/2026)

Correctif de sécurité des dépendances du serveur, sans changement fonctionnel, sur accord de Renaud du 29/10/2026, donné pour l'écolage (E-24, E-30, DV-72) ; pratique documentée en E-31 pour adapter si nécessaire le standard.

- Verrou du serveur (`backend/package-lock.json`) mis à jour paquet par paquet, dans la même génération, sans changer `package.json` : `body-parser` 1.20.8 → 1.20.9 (haute, GHSA-27r3-jxmh-p828), `fast-uri` 3.1.8 → 3.1.9 (modérée, quatre avis), `qs` 6.16.0 → 6.16.2 (modérée, GHSA-6pq8-jhm2-2vcw). Commande : `npm update body-parser qs fast-uri --no-save` ; jamais `npm audit fix`. Aucun autre paquet du verrou ne change.
- `npm audit --omit=dev` du serveur : 0 vulnérabilité (1 haute et 2 modérées en 0.7.2). L'étape d'audit du travail `tests` de GitHub passe (E-30 corrigé).
- Test nouveau `dependances.test.js` : le verrou ne redescend jamais sous les versions corrigées ; Express reste en version 4.
- Note de version : une ligne pour l'administrateur seulement.
- Tests : serveur 293 (290 en 0.7.2), interface 127 (127).

## 0.7.2 (29/10/2026)

Version sans changement fonctionnel : le code est prêt pour le dépôt public GitHub `berchem-brussels/ecolage-gmao-thierry` (EUPL-1.2, `GITHUB.md`).

- `.github/workflows/ci.yml` ajouté, conforme à la section 7 de `GITHUB.md` : travail `tests` sous Node 20 (serveur : `npm ci`, `npm test`, `npm audit --omit=dev --audit-level=high` ; interface : `npm ci`, `npm test`, `npm run build`, `npm run a11y`). L'étape d'audit échoue tant que E-24 n'est pas tranché (E-30).
- `.gitignore` complété : `.env.*` sauf `.env.example`, fichiers de base SQLite, sauvegardes, certificats et clés, journaux, fichiers du poste.
- Adresse, ports et dossiers de NIXUS remplacés dans tous les fichiers de l'archive par des valeurs d'exemple (`192.0.2.10`, 18443, 18080, `/volume1/docker/monapp`, compte `admin`) ; la copie de `STANDARD.md` le dit en tête. Les fichiers du projet et les messages de livraison gardent les valeurs réelles (DV-70).
- Test de portabilité élargi à toute adresse IPv4 privée dans le code ; adresse professionnelle d'un test d'écran remplacée par une adresse d'exemple.
- Note de version : une ligne pour l'administrateur seulement ; rien ne s'ouvre pour les autres comptes.
- Tests : serveur 290 (289 en 0.7.1), interface 127 (127). Parcours du travail `tests` rejoué sous Node 20.20.2 sur les seuls fichiers versés par Git.

## 0.7.1 (28/10/2026)

Correctif de la recette de la 0.7.0 du 28/10/2026 (DV-04), avant la suite de la recette.

- Brouillon : il ne s'enregistrait pas quand le lieu proposé d'office (lieu de travail habituel ou lieu de la dernière demande) était gardé. Le profil rend ce lieu avec sa nature, champ que le schéma du brouillon refusait (400) ; l'écran n'en disait rien. Le formulaire n'envoie plus que les champs connus du lieu, et le schéma accepte la nature. « Brouillon enregistré à … » s'affiche de nouveau sous le bouton d'envoi.
- Mention complète livrée (« En savoir plus », rubrique « Protection de vos données ») : elle commence par « Responsable du traitement : » suivi du nom de l'entité (« Verwerkingsverantwoordelijke: »), au lieu de « Administration communale traite… » sans article ; les durées sont « fixées par le responsable du traitement ». Un texte modifié par un responsable ne change pas.
- Note de version : une ligne pour tous, une pour le responsable.
- Tests : serveur 289 (287 en 0.7.0), interface 127 (127, un test renforcé).

## 0.7.0 (28/10/2026)

Étape 7 du planning (lot L1), faite avant l'étape 6 (DV-54). Formulaire de demande complet.

- Avant l'envoi, les demandes déjà ouvertes dans le même bâtiment (le bâtiment du lieu choisi et tous ses locaux) : catégorie, lieu, état, date, début de la description, sans nom ni numéro ; cinq au plus, puis « Voir les autres ». « Moi aussi » associe la personne à l'une d'elles au lieu d'en créer une nouvelle ; elle la suit dans « Mes demandes », et son texte part comme remarque lue par le seul service technique.
- Case « Danger pour les personnes ou les biens » en tête du formulaire : numéro à appeler (téléphone d'urgence de l'entité, sinon celui du service), demande en P1, « traitée en priorité absolue » sans heure promise au demandeur.
- « Pour quelqu'un d'autre ? » : un collègue de l'entité, qui lit la demande (« Faite pour vous »), ou un service ou une personne sans compte. « Une date ou un moment à respecter ? » : date souhaitée et créneau.
- Brouillon gardé sur le serveur pendant 30 jours : « Reprendre » ou « Recommencer à zéro ».
- Questions propres à la catégorie, en boutons, réglées par le responsable dans Catégories et délais (« Oui ou non » ou un choix parmi 2 à 6 réponses, FR et NL, facultatives sauf « Obligatoire ») ; trois questions livrées (plomberie, prises, chauffage). Réponses sur la fiche, pour le demandeur et le service technique.
- Mentions d'information RGPD FR et NL sous le formulaire, « En savoir plus », et rubrique « Protection de vos données » de l'aide ; contact du DPO et textes réglés par entité dans Réglages de l'entité. L'aide de la description rappelle de ne citer personne.
- Rouge des messages d'erreur à 4,5:1 au moins en clair et en sombre (E-26).
- Migration `006_demandes_formulaire` (tables et colonnes ajoutées seulement). Onze routes et leurs outils MCP ; `create_demande` et `get_profile` enrichis.
- Aide : rubriques Nouvelle demande, Catégories et délais, Réglages de l'entité, Protection de vos données ; questions 20 à 24 ; quatre réponses de l'assistant ; note de version (trois lignes pour tous, une pour le service technique, une pour le responsable).
- Tests : serveur 287 (238 en 0.5.2), interface 127 (95).

## 0.5.2 (27/10/2026)

Correctif de la recette du 27/10/2026 (DV-04), avant l'étape 6.

- Après l'envoi d'une demande, sur téléphone, « Mes demandes » et « Faire une autre demande » ne sont plus collés quand ils passent l'un sous l'autre : 12 px d'écart.
- Sur petit écran (jusqu'à 768 px de large), le texte saisi dans les champs est en 16 px : l'iPhone n'agrandit plus la page au toucher d'un champ. Le zoom à deux doigts reste permis.
- Adresse e-mail : vide ou faite d'espaces, un seul message, « Ce champ est obligatoire » ; mal formée, « Adresse e-mail non valide » (« Ongeldig e-mailadres ») au lieu du message d'Ant Design sur le « type email ». Dans Utilisateurs et rôles, l'assistant d'installation, la connexion et le contact des réglages de l'entité.
- Note de version pour tous (deux lignes).
- Tests : interface 95 (89 en 0.5.1), serveur 238 (237).

## 0.5.1 (26/10/2026)

Correctif de la recette du 26/10/2026 (DV-04), avant l'étape 6.

- Liste des bâtiments : dans « Changer de lieu », « Parcourir la liste des bâtiments » ouvre et referme la liste ; la liste a un bouton « Masquer la liste » ; « Annuler » apparaît dès qu'une recherche ou la liste est ouverte, même sans lieu choisi. Une entité sans lieu actif affiche un message au lieu d'une liste vide.
- « Mes demandes » n'a plus son propre bouton « Nouvelle demande » : restent celui du haut de l'écran et celui du menu.
- Champs obligatoires : un champ vide ou fait seulement d'espaces affiche « Ce champ est obligatoire » (« Dit veld is verplicht ») sous le champ, avant l'envoi, dans tous les formulaires (lieux, valeurs de liste, catégories, priorités, calendrier, réglages, paramètres, utilisateurs, entités, installation, mot de passe, simulateur), sous les motifs de désactivation et sous la description d'une demande. Le message général « Données invalides » n'apparaît plus dans ces cas ; le serveur refuse toujours ces valeurs. Les mots de passe gardent leurs espaces.
- Aide : la rubrique Nouvelle demande cite « Masquer la liste » ; note de version pour tous.
- Tests : interface 89 (81 en 0.5.0), serveur 237 (236).

## 0.5.0 (26/10/2026)

Étape 5 du planning (lot L1).

- Nouvelle demande au service technique, pour toute personne qui a un rôle dans l'entité : « Nouvelle demande » sur l'accueil, dans le menu et en haut de chaque écran. Un seul écran en trois blocs : Où (lieu proposé d'office, recherche ou liste des bâtiments), Quoi (tuiles des catégories, domaine puis nature), Description (10 caractères au moins). Après l'envoi : numéro, lieu et délai indicatif.
- Numéro par entité, le même en FR et en NL : `AC-DI-2026-00001`, `CPAS-DI-2026-00001`. Code des demandes et remise à un chaque année ou numérotation continue réglés par le responsable dans Réglages de l'entité. Sans trou ni doublon, jamais redonné.
- « Mes demandes » : les demandes de la personne, en cours en premier, état en clair et en couleur, délai annoncé, filtre et recherche, fiche au clic. « Demandes de l'entité » pour le gestionnaire technique et le responsable, en lecture, avec le nom du demandeur.
- Accueil selon le rôle : gros boutons « Nouvelle demande » et « Mes demandes », demandes en cours ; nombre de demandes à qualifier pour le service technique.
- « Mon lieu de travail » dans le menu de l'utilisateur : le lieu proposé d'office dans les demandes ; sans choix, le lieu de la dernière demande.
- Recherche d'un lieu sans accents, en FR et en NL, par le nom, le code, l'adresse, la commune, le type ou le nom du bâtiment ; chaque lieu trouvé montre son chemin.
- Les espaces en trop au début et à la fin d'un texte saisi sont retirés, sauf dans les mots de passe ; un champ obligatoire fait seulement d'espaces est refusé. La mise à jour corrige une fois les libellés déjà enregistrés (défaut « Mobilier » de la recette du 24/10/2026).
- Aide : quatre rubriques, questions 16 à 19, réponses de l'assistant ; note de version.
- Outils MCP `create_demande`, `list_demandes`, `get_demande`, `set_lieu_habituel`.

## 0.4.1 (23/10/2026)

Correctif de la recette du 23/10/2026 (DV-04), avant l'étape 5.

- Simulateur : la date de l'échéance et son délai s'affichent l'un sous l'autre ; on lisait « 08:522 jours ouvrables ». Sur téléphone (moins de 576 px), les libellés du résultat passent au-dessus des valeurs. Vérifié à 1280 et 360 px, aux gabarits iPhone 13 et Galaxy S9+, en FR et en NL.
- Journal d'audit : la modification d'une catégorie, d'un congé, d'une fermeture, d'un lieu, d'une valeur de liste ou d'une entité ne note plus que les champs changés, avec l'ancienne et la nouvelle valeur, et de quoi reconnaître la fiche ; un enregistrement sans changement n'ajoute aucune ligne.
- Mention « Modifié le JJ/MM/AAAA à HH:MM par <nom> » sur chaque catégorie, priorité, jour de l'horaire, congé et fermeture ; « Créé le … » pour une fiche ajoutée et jamais modifiée ; « Valeur livrée, rétablie le … » après un retour aux valeurs livrées ; « Valeur livrée » sinon. Heure de Bruxelles ; nom rendu aux seules personnes de l'entité. Les identifiants internes des auteurs ne sont plus rendus par l'API.
- Aide : rubriques Catégories et délais et Journal d'audit complétées, question 15 de la FAQ, réponse de l'assistant sur « qui a modifié » ; note de version pour le responsable et l'administrateur.
- Tests : un test d'écran instable (limite de 5 secondes dépassée sur une machine lente) reçoit la limite de 30 secondes de ses voisins (écart E-20).

## 0.4.0 (22/10/2026)

- Nouvel écran Catégories et délais du responsable du service technique, dans Réglages du service, propre à chaque entité.
- Catégories des demandes en arbre : un domaine, puis ses natures, en FR et en NL, avec un pictogramme, une priorité proposée, un circuit (envoi direct ou validation du chef de service) et un délai propre facultatif ; une nature reprend les valeurs de son domaine. 8 domaines et 27 natures livrés pour l'AC et le CPAS. Aperçu des tuiles telles que les demandeurs les verront.
- Priorités P1 à P4 et leurs délais de prise en charge et de fin : P1 en heures calendaires (1 h, 4 h), P2 à P4 en jours ouvrables (1 et 2, 2 et 10, 5 et date convenue). Libellés, couleur, décompte et délais réglables, retour aux valeurs livrées.
- Calendrier des jours ouvrables par entité : horaire des ouvriers jour par jour (AC du lundi au jeudi 07:45-16:15 et le vendredi jusqu'à 12:00 ; CPAS du lundi au vendredi 08:00-16:30), dix jours fériés légaux calculés chaque année, congés de l'entité (8 mai, 27 septembre, 2 novembre, 15 novembre, 26 décembre), fermetures par période.
- Simulateur : une priorité ou une catégorie et un moment de réception donnent la prise en charge et la fin, à l'heure de Bruxelles.
- Aide : rubrique « Délais des demandes » pour tous, rubrique du responsable, trois questions de FAQ, réponses de l'assistant sur les délais, les jours fériés et les catégories ; note de version.
- Outils MCP des catégories, des priorités, de l'horaire, des congés et fermetures, des jours fériés et du simulateur.

## 0.3.1 (22/10/2026)

- La question de l'aide sur l'appareil photo qui reste noir couvre aussi les téléphones Android, Samsung compris, avec le réglage de Chrome (Paramètres, Applications, Chrome, Autorisations, Appareil photo) et celui du site ; l'iPhone reste expliqué. L'assistant y mène aussi pour « Android », « Samsung » et « galerie ».

## 0.3.0 (22/10/2026)

- Écran Paramètres de l'administrateur : nom de l'application et du pouvoir local en FR et en NL, contact du support, langue et niveau de détail par défaut. Chaque réglage s'explique, s'applique sans redémarrage, s'inscrit au journal et revient à sa valeur livrée sur demande. Le nom du pouvoir local se corrige ici.
- Modules activables pour toute l'instance, dans l'onglet Modules : le noyau reste actif, Patrimoine se règle, les modules à venir sont annoncés avec leur étape. Patrimoine éteint ferme la gestion des lieux et leurs photos, par l'écran comme par l'assistant, et laisse leur lecture ouverte ; l'écran quitte le menu, l'aide et l'assistant.
- Écran Réglages de l'entité du responsable du service technique : contact du service, téléphone d'urgence et délai de réouverture, propres à chaque entité. Le contact s'affiche dans Aide, Contact.
- Écran Journal d'audit de l'administrateur : qui a fait quoi, quand, dans quelle entité et par quel canal, avec filtres et détail ; l'entité est notée sur chaque action d'une entité.
- Note de version à la première connexion après une mise à jour, adaptée au rôle, et onglet Nouveautés dans l'aide. Un compte nouveau ne voit pas la note en cours.
- Assistant d'installation : langue par défaut et modules choisis dès l'installation.
- Aide : rubriques des écrans nouveaux, questions de FAQ nouvelles dont celle sur l'appareil photo de l'iPhone, réponses de l'assistant.
- Liens de l'écran clair à la couleur de l'institution, plus lisibles que le bleu d'origine.

## 0.2.0 (21/10/2026)

- Écran Patrimoine : arbre des sites, bâtiments, niveaux et locaux de l'entité active, recherche par code, nom ou adresse, fiche du lieu avec son chemin, son type, son statut, son adresse et sa surface. Le lieu choisi est dans l'adresse de la page.
- Création, modification, déplacement et désactivation des lieux par le gestionnaire technique et le responsable, selon les sept règles validées le 21/10/2026 : un bâtiment peut exister sans niveau, un lieu extérieur se range sous un site ou un bâtiment, le code est unique dans l'entité, un lieu qui contient des lieux actifs ne se désactive pas, un bâtiment reprend l'adresse de son site, une photo par lieu, un type exigé pour un local.
- Photo d'un lieu : réduite à 1 600 pixels et débarrassée de ses métadonnées dans le navigateur, contrôlée et nettoyée une seconde fois par le serveur, effacée réellement quand elle est remplacée ou supprimée. Elle est comprise dans la sauvegarde.
- Écran Listes de valeurs du responsable du service technique, avec la première liste : les types de lieux, en FR et en NL, avec ordre et activation. Dix types livrés pour chaque entité.
- Outils MCP des lieux et des listes de valeurs, dont l'effacement d'une photo en deux appels.
- Commande de démonstration : deux sites fictifs par entité, avec bâtiments, niveaux et locaux, sans photo ; une relance garde les lieux déjà présents et les photos déposées.
- Aide, FAQ, assistant et note d'accueil mis à jour en FR et en NL.

## 0.1.1 (15/10/2026)

- Écran Utilisateurs et rôles : les colonnes de droite étaient coupées et ne s'atteignaient qu'en faisant défiler le tableau. Le nom et l'adresse forment maintenant une seule colonne « Personne », la colonne Actions reste fixée à droite, la colonne Actif n'apparaît qu'en mode Complet, et sous 768 px tout s'empile dans une seule colonne.
- L'accès à l'administration se règle dans le panneau Rôles avec les rôles par entité ; la liste montre une étiquette « Administrateur ».
- En mode Simple, la liste ne montre que les comptes actifs.
- Port HTTPS de l'acceptance sur NIXUS : 18443 (le 18444 est pris par la GRC).
- Installée sur NIXUS le 15/10/2026.

## 0.1.0 (15/10/2026)

- Première version de la GMAO, tirée du gabarit v3 1.1.0 (standard v3.2). Ressource d'exemple `items` retirée.
- Entités en données (table `entites`), écran Entités, assistant d'installation qui demande le nom du pouvoir local et la première entité.
- Rôles par entité (table `user_roles`), catalogue des onze rôles dans `backend/config/roles.json`, rôle de demandeur d'office, écran Utilisateurs et rôles.
- Entité active sur la session, sélecteur en boutons dans l'en-tête, contrôle côté serveur et test de cloison entre entités.
- Accueil : entité active, rôles, personnes de l'entité pour les rôles habilités.
- Outils MCP des nouvelles ressources, dont le changement d'entité active.
- Commande de comptes de démonstration fictifs, autorisée par `DEMO_ALLOWED=1`.
- Déploiement : services `api` et `web`, interface livrée construite (`dist/`), utilisateur 10001 dans l'image du serveur, arrêt de la construction si `npm ci` laisse une installation incomplète.
- Installée sur NIXUS le 15/10/2026 (ports 18443 et 18080), entités AC et CPAS créées, comptes de démonstration créés.

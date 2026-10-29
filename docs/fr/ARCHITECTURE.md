# Architecture

Version 0.7.1 · Le français fait foi.

## Services

| Service | Conteneur | Contenu | Port |
| --- | --- | --- | --- |
| `api` | `${APP_NAME}-api` | Express 4 : routes `/api/*`, validation `ajv`, session, droits, journal d'audit, serveur MCP dans le processus (`POST /api/mcp`) | 3001 en `expose`, jamais publié |
| `web` | `${APP_NAME}-web` | nginx 1.27.5 : redirection HTTP vers HTTPS, interface construite (`dist/`), relais `/api/` vers `api:3001`, en-têtes de sécurité | `HTTPS_PORT` et `HTTP_PORT` du `.env` |

Base `sql.js` dans le volume `db-data` (`/app/data/app.db`), écrite par le seul processus `api`. Photos des lieux dans le même volume (`/app/data/photos`, variable `PHOTOS_DIR`), hors de la racine web, lues par une route authentifiée. Certificat dans le volume `ssl-certs`. PostgreSQL 16 arrive au lot L7 (standard, section 5).

## Tables (migrations `001_noyau` à `006_demandes_formulaire`)

| Table | Rôle | Points clés |
| --- | --- | --- |
| `entites` | Entités juridiques de l'instance (AC, CPAS ou autres) | `code` unique de 2 à 10 caractères, `nom_fr`, `nom_nl`, `is_active`, `motif_desactivation` |
| `users` | Comptes | `user_role` (`agent` ou `admin`, rôle d'instance), `entite_id` (entité de rattachement), `is_demo`, préférences, `version_vue` (dernière note de version lue, 0.3.0), `lieu_habituel_id` (lieu de travail habituel, 0.5.0) |
| `user_roles` | Rôles métier par entité | `role` limité par `CHECK` au catalogue de `config/roles.json` ; index unique partiel sur (personne, entité, rôle) actifs ; retrait logique avec `motif_retrait` |
| `sessions` | Sessions | Empreinte du jeton seulement, jeton anti-CSRF, `entite_id` = entité active |
| `audit_log` | Journal d'audit | Action, objet, canal (`api`, `mcp`, `cli`), détails sans secret ; `entite_id` (0.3.0) pour les actions d'une entité, vide pour les actions d'instance |
| `app_settings` | Paramètres de l'instance et état des modules | Surchargent `config/instance.defaut.json` ; clé `module.<code>` ('1' ou '0') pour un module ; valeur vide = retour à la valeur livrée, la ligne garde l'auteur et la date |
| `parametres_entite` | Paramètres métier par entité (0.3.0) | (`entite_id`, `cle`) unique ; `valeur` vide = valeur livrée de `config/parametres-entite.json` ; groupe `rgpd` (0.7.0) : contact du DPO et mentions d'information FR et NL, type `texte_long` à variables `{entite}` et `{dpo}` |
| `listes_valeurs` | Listes de valeurs par entité (0.2.0) ; première liste `type_lieu` | (`entite_id`, `liste`, `code`) unique ; `libelle_fr`, `libelle_nl` obligatoires ; `ordre`, `is_active`, `motif_desactivation`. Les listes admises viennent de `config/listes-valeurs.json`, sans contrainte `CHECK` |
| `lieux` | Arbre du patrimoine par entité (0.2.0) | `nature` (`site`, `batiment`, `niveau`, `local`), `parent_id`, (`entite_id`, `code`) unique, `nom_fr`, `nom_nl`, `type_id` vers `listes_valeurs`, adresse, `surface_m2`, `statut` (`en_service`, `hors_service`, `cede`), photo (`photo_fichier` interne, `photo_type`, `photo_octets`, `photo_at`), `is_active`, `motif_desactivation`, `is_demo` |
| `categories` | Catégories d'intervention en arbre par entité (0.4.0) | `parent_id` vide pour un domaine ; (`entite_id`, `code`) unique ; `libelle_fr`, `libelle_nl`, `icone` (catalogue de `config/categories.json`), `priorite_defaut` (`P1` à `P4`), `validation` (0, 1), `delai_fin_jours` (1 à 365) : vides sur une nature qui reprend ceux du domaine ; `ordre`, `is_active`, `motif_desactivation` |
| `priorites` | Priorités P1 à P4 par entité (0.4.0) | (`entite_id`, `code`) unique ; libellés et descriptions FR et NL, `couleur`, `unite` (`heures_calendaires`, `heures_ouvrables`, `jours_ouvrables`), `prise_en_charge`, `fin` (vide : date convenue, sinon au moins la prise en charge) |
| `horaires` | Horaire pour les délais, sept jours par entité (0.4.0) | (`entite_id`, `jour`) unique, `jour` 1 (lundi) à 7 ; `debut`, `fin` en `HH:MM`, tous deux vides pour un jour non ouvré, sinon `debut < fin` |
| `sequences` | Compteurs des numéros (0.5.0) | (`entite_id`, `type`, `annee`) unique ; `type` `demande` ; `annee` 0 pour le compteur continu ; `dernier` = plus grand rang attribué |
| `demandes` | Demandes d'intervention (0.5.0) | `numero` unique (`AC-DI-2026-00001`), (`entite_id`, `annee`, `sequence`) unique ; `lieu_id`, `categorie_id`, `description` (10 à 5 000 caractères), `langue`, `etat` (liste complète du cahier des charges, section 8.1 ; `a_qualifier` à la création en 0.5.0), `priorite` proposée par la catégorie, `canal`, `demandeur_id`, `is_demo` ; aucune suppression (CYC-05) ; depuis la 0.7.0 `danger` (0, 1), `beneficiaire_id` (collègue) ou `beneficiaire_texte` (200 caractères), `date_souhaitee` (`AAAA-MM-JJ`), `creneau` (200 caractères) |
| `demande_suiveurs` | Personnes qui suivent une demande d'un autre, « Moi aussi » (0.7.0) | (`demande_id`, `user_id`) unique ; `remarque` (1 à 5 000 caractères, lue par le seul service technique), `canal` |
| `brouillons` | Brouillon du formulaire de demande (0.7.0) | (`user_id`, `entite_id`) unique ; `contenu` JSON (2 à 20 000 caractères) tel que l'écran l'affiche ; effacé à l'envoi, par « Recommencer à zéro » ou après 30 jours ; hors journal d'audit (écart E-27) |
| `questions_categorie` | Questions propres à un domaine ou une nature (0.7.0) | `entite_id`, `categorie_id` ; `question_fr`, `question_nl` (1 à 200 caractères) ; `type` (`oui_non`, `choix`) ; `reponses_json` (2 à 6 réponses FR et NL pour un choix, vide pour oui ou non) ; `obligatoire`, `ordre`, `is_active`, `motif_desactivation`, traces `created_*` et `updated_*` |
| `demande_reponses` | Réponses d'une demande aux questions (0.7.0) | (`demande_id`, `question_id`) unique ; `valeur` (`oui`, `non`, `1` à `6`) ; copie de `question_fr`, `question_nl`, `reponse_fr`, `reponse_nl` au dépôt ; `ordre` |
| `jours_non_ouvres` | Congés et fermetures par entité (0.4.0) | `nature` `conge` (`mois_jour` `MM-JJ`, chaque année) ou `fermeture` (`date_debut`, `date_fin`) ; libellés FR et NL ; `is_active`, `motif_desactivation`. Les jours fériés légaux sont calculés, sans table |
| `schema_migrations` | Journal des migrations | |

## Rôles

| Code | Portée | Libellé FR | Libellé NL |
| --- | --- | --- | --- |
| `agent` | entité, d'office | Demandeur | Aanvrager |
| `valideur` | entité | Valideur | Goedkeurder |
| `ouvrier` | entité | Ouvrier | Arbeider |
| `chef_equipe` | entité | Chef d'équipe | Ploegbaas |
| `gestionnaire` | entité | Gestionnaire technique | Technisch beheerder |
| `responsable` | entité | Responsable du service technique | Verantwoordelijke technische dienst |
| `gestionnaire_reservations` | entité | Gestionnaire des réservations | Beheerder reservaties |
| `magasinier` | entité | Magasinier | Magazijnier |
| `gestionnaire_flotte` | entité | Gestionnaire de flotte | Wagenparkbeheerder |
| `lecteur` | entité | Lecteur | Lezer |
| `admin` | instance | Administrateur | Beheerder |

Le catalogue (`backend/config/roles.json`) porte aussi les descriptions FR et NL et les permissions, pour l'application Droits. Un test vérifie que la contrainte `CHECK` de `user_roles` et le catalogue disent la même chose.

Permissions : `lieux:lire` et `listes:lire` pour tous les rôles d'entité ; `lieux:gerer` pour `gestionnaire` et `responsable` ; `listes:gerer` et `parametres:gerer` (0.3.0) pour `responsable`. Le serveur lit ces permissions dans le catalogue (`rolesWith`), l'interface aussi pour son menu (`hasPermission`) : aucun code de rôle n'est écrit dans les services des lieux.

## Entité active et cloison

1. À la connexion, la session prend l'entité de rattachement si la personne y a un rôle, sinon la première entité où elle en a un.
2. `authMiddleware` charge les rôles de la personne dans l'entité active : `req.user.entiteId` et `req.user.roles`.
3. `PUT /api/auth/entite` change l'entité active, seulement vers une entité où la personne a un rôle actif.
4. Toute donnée d'entité se contrôle dans la fonction de service sur `req.user.entiteId` ; un objet d'une autre entité répond 403, même si la personne a un rôle dans cette autre entité.
5. `tests/cloison.test.js` tient la liste des ressources cloisonnées et vérifie qu'aucune route à identifiant d'entité n'y échappe.

L'administrateur d'instance ne reçoit aucun rôle métier d'office.

## Référentiel des lieux (0.2.0)

Règles validées le 21/10/2026, appliquées dans `services/lieux.js` :

| N° | Règle | Erreur |
| --- | --- | --- |
| 1 | Un bâtiment se range sous un site, un niveau sous un bâtiment ; un bâtiment peut exister sans niveau | `LIEU_PARENT` (409) |
| 2 | Un local se range sous un niveau, un bâtiment ou un site (lieu extérieur) ; jamais sous un local | `LIEU_PARENT` |
| 3 | Code court unique dans l'entité ; le même code peut exister dans une autre entité | `LIEU_CODE_DUPLICATE` |
| 4 | Un lieu qui a des lieux actifs en dessous ne se désactive pas ; un lieu ne se réactive que sous un parent actif | `LIEU_ENFANTS`, `PARENT_INACTIF` |
| 5 | Un bâtiment créé sans adresse reprend celle de son site | |
| 6 | Une photo par lieu ; la nouvelle efface réellement l'ancienne | |
| 7 | Type tiré de la liste `type_lieu` de l'entité, actif ; exigé pour un local ; un type désactivé reste sur les lieux qui le portent | `TYPE_REQUIS`, `VALEUR_INVALIDE` |

La nature d'un lieu ne change pas après la création. Le parent et le type se contrôlent dans l'entité active : un parent ou un type d'une autre entité est refusé.

Photo : `POST /api/lieux/:id/photo` reçoit le fichier en corps binaire (`image/jpeg` ou `image/png`, 1 Mo au plus) par `express.raw`. `images.js` reconnaît le type sur les premiers octets, refuse un type annoncé faux, parcourt la structure, plafonne les dimensions à 4 096 pixels et retire les métadonnées (segments APP1 à APP15 et commentaires du JPEG, blocs `tEXt`, `zTXt`, `iTXt`, `eXIf`, `tIME` du PNG). Le nom du fichier est généré par le serveur (32 caractères hexadécimaux), écrit par un fichier temporaire puis renommé ; il ne sort jamais dans une réponse ni dans le journal. Le navigateur réduit d'abord la photo à 1 600 pixels et la réencode en JPEG (`frontend/src/photo.ts`), ce qui retire déjà les métadonnées.

## Routes

| Route | Droit | Service |
| --- | --- | --- |
| `GET /api/health`, `GET /api/version`, `GET /api/settings/public`, `POST /api/install`, `POST /api/auth/login` | libres | `routes/public.js`, `routes/auth.js` |
| `GET /api/auth/me`, `PUT /api/auth/entite`, `PUT /api/auth/preferences`, `PUT /api/auth/password`, `POST /api/auth/logout` | session | `services/session.js` |
| `GET /api/entites`, `GET /api/entites/:id` | session | `services/entites.js` |
| `POST /api/entites`, `PUT /api/entites/:id`, `DELETE /api/entites/:id` (désactivation avec motif) | `admin` | `services/entites.js` |
| `GET /api/entites/:id/membres` | `admin`, ou rôle portant `entites:membres` dans l'entité active demandée | `services/entites.js` |
| `GET /api/roles`, `GET /api/roles/:code` | session | `routes/roles.js` |
| `/api/roles-utilisateurs` (cinq routes, `DELETE` = retrait avec motif) | `admin` | `services/roles-utilisateurs.js` |
| `/api/users` (cinq routes, `DELETE` = désactivation) | `admin` ; lecture de sa propre fiche | `services/users.js` |
| `GET /api/listes-valeurs`, `GET /api/listes-valeurs/:id` | rôle dans l'entité active | `services/listes-valeurs.js` |
| `POST /api/listes-valeurs`, `PUT /api/listes-valeurs/:id`, `DELETE /api/listes-valeurs/:id` (désactivation avec motif) | permission de gestion de la liste (`listes:gerer`) | `services/listes-valeurs.js` |
| `GET /api/lieux`, `GET /api/lieux/arbre`, `GET /api/lieux/:id`, `GET /api/lieux/:id/photo` | rôle dans l'entité active | `services/lieux.js` |
| `POST /api/lieux`, `PUT /api/lieux/:id`, `DELETE /api/lieux/:id` (désactivation avec motif), `POST /api/lieux/:id/photo`, `DELETE /api/lieux/:id/photo` (effacement réel) | `lieux:gerer` | `services/lieux.js` |
| `GET /api/parametres`, `GET /api/parametres/:cle`, `PUT /api/parametres/:cle`, `DELETE /api/parametres/:cle` (retour à la valeur livrée) | `admin` | `services/parametres.js` |
| `GET /api/modules`, `GET /api/modules/:code` | session | `services/modules.js` |
| `PUT /api/modules/:code` | `admin` | `services/modules.js` |
| `GET /api/parametres-entite`, `GET /api/parametres-entite/:cle` | rôle dans l'entité active | `services/parametres-entite.js` |
| `PUT /api/parametres-entite/:cle`, `DELETE /api/parametres-entite/:cle` (retour à la valeur livrée) | `parametres:gerer` | `services/parametres-entite.js` |
| `GET /api/audit`, `GET /api/audit/:id` | `admin` | `services/journal.js` |
| `GET /api/notes-version`, `GET /api/notes-version/:version`, `PUT /api/auth/nouveautes` | session | `services/notes-version.js` |
| `GET /api/categories`, `GET /api/categories/arbre`, `GET /api/categories/:id` | rôle dans l'entité active | `services/categories.js` |
| `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id` (désactivation avec motif) | `categories:gerer` | `services/categories.js` |
| `GET /api/priorites`, `GET /api/priorites/:code` | rôle dans l'entité active | `services/priorites.js` |
| `PUT /api/priorites/:code`, `DELETE /api/priorites/:code` (retour aux valeurs livrées) | `delais:gerer` | `services/priorites.js` |
| `GET /api/horaires`, `GET /api/horaires/:jour` | rôle dans l'entité active | `services/calendrier.js` |
| `PUT /api/horaires/:jour`, `DELETE /api/horaires/:jour` (retour à l'horaire livré) | `delais:gerer` | `services/calendrier.js` |
| `GET /api/jours-non-ouvres`, `GET /api/jours-non-ouvres/:id` | rôle dans l'entité active | `services/calendrier.js` |
| `POST /api/jours-non-ouvres`, `PUT /api/jours-non-ouvres/:id`, `DELETE /api/jours-non-ouvres/:id` (désactivation avec motif) | `delais:gerer` | `services/calendrier.js` |
| `GET /api/jours-feries` | rôle dans l'entité active | `services/calendrier.js` |
| `GET /api/echeances/simulation` | rôle dans l'entité active | `services/echeances.js` |
| `POST /api/mcp` | session ou jeton porteur | `mcp.js` |
| `GET /api/openapi.json` | session | `openapi.js` |

## Paramètres

| Clé | Défaut | Où |
| --- | --- | --- |
| `app.name_fr`, `app.name_nl` | Gestion technique, Technisch beheer | `config/instance.defaut.json` |
| `app.organisation_fr`, `app.organisation_nl` | Pouvoir local, Lokaal bestuur ; saisis à l'installation | `app_settings` |
| `app.support_contact` | Service IT | `config/instance.defaut.json` |
| `app.default_lang` | `fr` ; choisi à l'installation depuis la 0.3.0 | `config/instance.defaut.json` |
| `app.default_ui_mode` | `simple` | `config/instance.defaut.json` |
| Catalogue des paramètres d'instance (libellés, descriptions, validation) | Sept clés `app.*` | `config/parametres-instance.json` |
| Modules | Voir ci-dessous | `config/modules.json` |
| Paramètres par entité | Contact du service technique vide, téléphone d'urgence vide, délai de réouverture 7 jours | `config/parametres-entite.json` |
| Notes de version | Une note par version, lignes par public | `config/notes-version.json` |
| `theme.*` | Couleurs de l'institution | `config/instance.defaut.json` |
| `DEMO_ALLOWED` | `0` | `.env`, autorise la commande de démonstration |
| Listes de valeurs et valeurs livrées | Dix types de lieux | `config/listes-valeurs.json` ; créées pour chaque entité active au démarrage et à la création d'une entité, jamais recréées une fois désactivées |
| `PHOTOS_DIR` | `photos` à côté de la base | Environnement du conteneur `api` |

## Commande de démonstration

`node src/demo.js` crée pour chaque entité active un compte fictif par rôle d'entité, plus un compte `multi-entites` gestionnaire dans toutes les entités. Adresses en `@demo.invalid`, `is_demo = 1`, mot de passe commun généré et affiché une seule fois. Depuis la 0.2.0, elle crée aussi deux sites fictifs par entité (modèle « administration » pour la première entité dans l'ordre des codes, « action sociale » pour la deuxième), soit 17 et 14 lieux, codes préfixés du code de l'entité, `is_demo = 1`, adresse fictive, sans photo. Un lieu dont le code existe est gardé tel quel. `--retirer` désactive ces comptes et ces lieux ; une relance réactive les lieux retirés par `--retirer`. Refusée sans `DEMO_ALLOWED=1`. Avec `sql.js`, le service `api` est arrêté pendant la commande.

## Paramètres, modules, journal et notes de version (0.3.0)

### Paramètres de l'instance (ADM-01)

Le catalogue `config/parametres-instance.json` dit quelles clés se règlent, avec leur libellé, leur description en FR et en NL, leur type (`texte`, `choix`), leur longueur et leurs choix. Le défaut livré est dans `config/instance.defaut.json`. `services/parametres.js` contrôle la valeur selon le catalogue, l'écrit dans `app_settings` et inscrit au journal l'ancienne et la nouvelle valeur. La page de connexion ne reçoit que les paramètres marqués publics. La langue et le niveau de détail par défaut s'appliquent aux comptes créés ensuite. Le catalogue est fermé : ni `POST` ni suppression d'une clé (écart E-19) ; `DELETE` rend la valeur livrée.

### Modules (ADM-02)

`config/modules.json` déclare onze modules : `demandes` (noyau, toujours actif), `patrimoine` (disponible), neuf modules à venir avec l'étape du planning, dont `portail_public` livré éteint. L'état vaut pour toute l'instance (décision du 22/10/2026). `src/modules.js` lit l'état (`estActif`) et refuse une opération d'un module éteint (`assertActif`, 403 `MODULE_DISABLED`). Le contrôle se place dans la fonction de service juste après le contrôle du rôle (ordre API-04), donc il vaut pour l'API comme pour le MCP. Les outils MCP d'un module éteint sont aussi retirés de `tools/list`.

Patrimoine éteint (décision du 22/10/2026) : création, modification, désactivation des lieux et photos refusées ; lecture de la liste, de l'arbre et des fiches ouverte, parce que les demandes en auront besoin ; écran Listes de valeurs ouvert. L'interface retire l'entrée du menu, la rubrique d'aide, les questions de FAQ et les intentions de l'assistant liées (`frontend/src/moduleMap.ts`), et l'adresse `/patrimoine` renvoie à l'accueil.

### Paramètres métier par entité (ADM-03)

`config/parametres-entite.json` déclare six clés en trois groupes : contact du service technique (`contact.nom_fr`, `contact.nom_nl`, `contact.telephone`, `contact.courriel`), urgence (`urgence.telephone`, utilisé à l'étape 7), demandes (`demandes.delai_reouverture_jours`, 0 à 90, défaut 7, utilisé à l'étape 9). Types contrôlés : `texte`, `telephone`, `courriel`, `entier`. Lecture par toute personne de l'entité active, écriture par la permission `parametres:gerer`. La fonction `valeur(entiteId, cle)` sert aux étapes suivantes.

### Journal d'audit lisible

`logAudit` prend en septième argument l'entité concernée. Les lieux, les listes de valeurs, les rôles, les entités, le changement d'entité active, les comptes, les paramètres d'entité et l'installation la notent ; les paramètres d'instance, les modules, les connexions restent sans entité. `services/journal.js` lit le journal avec les filtres action (exacte, ou famille : `lieu` pour `lieu.*`), personne, entité, canal et période (bornes ISO converties en UTC), plus récent d'abord. Réservé à l'administrateur (décision du 22/10/2026). Aucune route n'écrit ni n'efface le journal. La liste rend dans `meta.actions` les actions présentes, pour le filtre de l'écran ; l'interface traduit chaque action (un test vérifie que chaque action écrite par le serveur a son libellé FR et NL).

### Notes de version (E-07)

`config/notes-version.json` porte une note par version, chaque ligne avec son public (`tous`, `admin` ou une permission). Le profil (`/api/auth/me` et la connexion) rend `nouveautes`, les notes plus récentes que `users.version_vue` jusqu'à la version installée, filtrées pour la personne. `PUT /api/auth/nouveautes` les marque lues. La migration `003_parametres` met `version_vue` à `0.2.0` pour les comptes existants ; un compte créé ensuite (assistant, écran Utilisateurs, commande de démonstration) part de la version installée et ne voit pas la note en cours (décision du 22/10/2026).

### Assistant d'installation (E-08)

`POST /api/install` accepte `default_lang` (`fr`, `nl`) et `modules` (liste des modules disponibles hors noyau à activer). Avant l'installation, `GET /api/settings/public` rend `modules_installables`. Sans ces champs, les valeurs livrées s'appliquent.

## Référentiel des demandes (0.4.0)

Migration `004_referentiel_demandes` : tables `categories`, `priorites`, `horaires`, `jours_non_ouvres`. Au démarrage, chaque entité active reçoit ce qui lui manque (arbre livré, quatre priorités, sept jours d'horaire, cinq congés) ; rien n'est modifié, une catégorie ou un congé désactivé n'est jamais recréé. Une entité créée par l'assistant ou par l'administrateur reçoit les mêmes valeurs aussitôt. Permissions nouvelles du responsable du service technique : `categories:gerer`, `delais:gerer` ; lecture par `categories:lire`, `delais:lire`, données à tous les rôles d'entité. Le module `demandes`, du noyau, ne s'éteint pas : aucun contrôle de module sur ces routes.

### Catégories (REF-06)

`config/categories.json` : catalogue fermé de 29 icônes (chacune liée à une icône d'Ant Design dans `frontend/src/referentiel.ts`, test de concordance) et arbre livré (8 domaines, 27 natures ; décision D-11, arbre validé le 22/10/2026). Règles : deux niveaux ; une nature se range sous un domaine actif de la même entité et peut en changer ; un domaine porte toujours sa priorité et sa règle de validation ; une nature reprend celles de son domaine quand elle n'en a pas (`priorite_effective`, `validation_effective`, `delai_fin_jours_effectif` dans chaque réponse) ; un domaine qui a des natures actives ne se désactive pas ; une nature ne se réactive pas sous un domaine désactivé. `GET /api/categories/arbre` rend les domaines et leurs natures dans leur ordre ; sans `inclure_inactifs`, ce sont les tuiles du demandeur. La règle de validation est enregistrée et sera appliquée à l'étape 11.

### Priorités et délais (PRI-02)

`config/priorites.json` : P1 Sécurité (heures calendaires, 1 et 4), P2 Urgente (jours ouvrables, 1 et 2), P3 Normale (2 et 10), P4 Planifiable (5, date convenue), couleurs admises, plafonds par unité (720 heures, 365 jours). Catalogue fermé : ni création ni suppression (écart E-19) ; `DELETE` rend les valeurs livrées.

### Calendrier et échéance

`config/calendrier.json` : fuseau `Europe/Brussels`, horaire livré par code d'entité (AC : du lundi au jeudi 07:45-16:15, vendredi 07:45-12:00 ; CPAS et autres entités : du lundi au vendredi 08:00-16:30 ; horaire des ouvriers, décision du 22/10/2026), dix jours fériés légaux (Pâques par l'algorithme grégorien anonyme), cinq congés livrés (8 mai, 27 septembre, 2 novembre, 15 novembre, 26 décembre). `services/echeances.js` calcule à l'heure de Bruxelles par `Intl.DateTimeFormat`, quel que soit le fuseau du serveur : réception hors horaire comptée dès l'ouverture suivante ; N jours ouvrables à la même heure, ramenée dans l'horaire du jour d'arrivée ; heures ouvrables sur le seul temps d'ouverture ; heures calendaires sur le temps réel. Le délai propre d'une catégorie remplace la fin d'une priorité comptée en jours ouvrables. Sans aucun jour ouvré sur trois ans, `CALENDRIER_VIDE`. `calculer()` servira à l'étape 8 ; `GET /api/echeances/simulation` l'expose en lecture seule.

### Traçabilité des fiches et journal des modifications (0.4.1)

`services/trace.js` ajoute à chaque fiche de catégorie, de priorité, de jour de l'horaire et de jour non ouvré un objet `trace` : `etat` (`livree`, `creee`, `modifiee`, `retablie`), `le` (UTC, ISO 8601) et `par` (prénom et nom), calculé à partir des colonnes `created_by`, `updated_by`, `created_at`, `updated_at` déjà présentes ; `retablie` quand une priorité ou un jour porte les valeurs livrées après une intervention. `par` n'est rendu qu'à une personne qui a un rôle dans l'entité de la fiche ; les identifiants `created_by` et `updated_by` ne sont plus rendus. L'interface (`components/referentiel/TraceFiche.tsx`) affiche la date à l'heure de Bruxelles, au format JJ/MM/AAAA et HH:MM assemblé à la main.

`changements(table, id, data)` de `src/audit.js` compare les champs envoyés à la ligne en base (requête constante par table) et rend `{ avant, apres }` des seuls champs changés, ou `null`. Les services des catégories, des jours non ouvrés, des lieux, des valeurs de liste et des entités n'écrivent la base et le journal que si quelque chose change, avec de quoi reconnaître la fiche (code, ou nature et date).

## Demandes d'intervention (0.5.0)

Migration `005_demandes` : tables `sequences` et `demandes`, colonne `users.lieu_habituel_id`. Elle porte une étape JavaScript (troisième élément de l'entrée dans `MIGRATIONS`, jouée dans la même transaction que son SQL) : `src/nettoyage-espaces.js` retire les espaces de début et de fin des textes déjà en base, une colonne à la fois par requête constante, journalise chaque fiche corrigée (`systeme.espaces`, canal `cli`, sans auteur, champs changés seulement) et laisse telle quelle, avec une ligne `[DB] Espaces non retirés`, une valeur qui heurterait une contrainte d'unicité ou deviendrait vide dans une colonne obligatoire. La mention « Modifié le … par … » n'est pas touchée.

Retrait des espaces à l'entrée (DV-37) : `nettoyer()` de `src/validation.js`, appelé par `validate`, `validateQuery`, `validateParams` et par `callTool` du MCP, avant le schéma ; il retire les espaces de début et de fin de toute chaîne, à toute profondeur, sauf sous les clés `password`, `current_password` et `new_password`. Un champ obligatoire fait seulement d'espaces devient vide et `minLength` le refuse.

Numérotation (`services/numerotation.js`, NUM-01 à 05) : `attribuer(entite, type, date)` s'appelle dans la transaction d'enregistrement ; format `{code de l'entité}-{code du type}-{année}-{rang sur 5 chiffres}`, le même en FR et en NL ; code du type et remise (`annuelle` ou `continue`) dans les paramètres de l'entité (groupe `numerotation`, type `choix` et `motif` nouveaux dans `parametres-entite.js`) ; année de Bruxelles ; le compteur de l'année et le compteur continu sont tenus à jour tous les deux, chacun au moins égal au plus grand rang donné, pour qu'un changement de mode ne redonne jamais un numéro ; un numéro ou un rang déjà présent est sauté ; le plus grand des deux se calcule en JavaScript (portabilité vers PostgreSQL).

Demandes (`services/demandes.js`, routes `GET`, `POST /api/demandes`, `GET /api/demandes/:id`) : permission `demandes:creer` donnée à tous les rôles d'entité, `demandes:entite` au gestionnaire et au responsable (liste de l'entité, DV-46). Un seul lieu, actif, de l'entité active ; une nature ou un domaine sans nature active ; état `a_qualifier` (DV-43) ; priorité proposée par la catégorie ; délai annoncé calculé par `echeances.calculer()` à la lecture. Le demandeur ne lit que ses demandes (SEC-02). Le profil rend `lieu_propose` (lieu habituel actif de l'entité active, sinon celui de la dernière demande) ; `PUT /api/auth/lieu-habituel` le règle pour soi, `PUT /api/users/:id` (`lieu_habituel_id`) pour l'administrateur. Ni modification ni annulation avant l'étape 9 (écart E-21).

Recherche d'un lieu (`services/lieux.js`, REF-03) : avec `q`, la liste filtre en JavaScript sur un texte sans accents, majuscules ni ponctuation (code, noms FR et NL, adresse, commune, type, et code et noms des lieux parents), chaque mot cherché devant s'y trouver ; ordre : code exact, lieux trouvés par leurs propres mots, puis par ceux de leurs parents. Chaque ligne porte `chemin` (de la racine au lieu).

Interface : `pages/NouvelleDemandePage.tsx`, `pages/DemandesPage.tsx` (« Mes demandes » et « Demandes de l'entité »), `components/demandes/LieuPicker.tsx`, `TuilesCategories.tsx`, `components/LieuHabituelModal.tsx`, `demandes.ts` ; accueil selon le rôle (`HomePage.tsx`) ; bouton « Nouvelle demande » dans l'en-tête (`AppLayout.tsx`).

## Formulaire de demande complet (0.7.0)

Migration `006_demandes_formulaire` : tables `demande_suiveurs`, `brouillons`, `questions_categorie`, `demande_reponses` ; colonnes `demandes.danger`, `beneficiaire_id`, `beneficiaire_texte`, `date_souhaitee`, `creneau`. Tables et colonnes ajoutées seulement.

Demandes du même bâtiment (`GET /api/demandes/voisines`, DEM-04) : le bâtiment le plus proche dans le chemin du lieu choisi (ou la racine, le site) et tous ses descendants ; demandes ouvertes de l'entité, triées en JavaScript (même local, même catégorie, plus récentes), sans nom du demandeur. « Moi aussi » (`POST /api/demandes/:id/suivre`) : ligne de `demande_suiveurs`, refus sur sa propre demande (`DEMANDE_PROPRE`) ou une demande fermée (`DEMANDE_FERMEE`) ; un second appel ne change rien. La fiche d'une demande suivie ne rend ni le demandeur ni le bénéficiaire ; `suiveurs` (avec la remarque) n'est rendu qu'à `demandes:entite`.

Danger (DEM-06) : `danger = 1` met la priorité à P1 ; `delai_annonce` vaut `null` pour qui n'a pas `demandes:entite`. Le profil rend `telephone_urgence` (paramètre `urgence.telephone`, sinon `contact.telephone`).

« Pour » et date (DEM-07, DEM-08) : `GET /api/demandes/beneficiaires?q=` (2 caractères, sans accents, prénom et nom, 10 au plus, comptes actifs de l'entité, soi exclu) ; `beneficiaire_id` et `beneficiaire_texte` exclusifs (`BENEFICIAIRE_DOUBLE`) ; date d'aujourd'hui à un an, jours de Bruxelles (`DATE_SOUHAITEE_INVALIDE`). Le bénéficiaire lit la demande (`pour_moi`).

Brouillon (DEM-11, `services/brouillons.js`) : `GET`, `PUT`, `DELETE /api/demandes/brouillon` (routes fixes déclarées avant `/:id`) ; contenu contrôlé par le schéma `brouillonSave` ; à la lecture, un lieu, une catégorie, une réponse ou un collègue qui ne vaut plus est retiré ; purge des brouillons de plus de 30 jours à chaque appel ; effacé dans la transaction de dépôt.

Questions de la catégorie (DEM-05, `services/questions-categorie.js`) : `GET` et `POST /api/categories/:id/questions`, `GET`, `PUT`, `DELETE /api/questions-categorie/:id` ; écriture `categories:gerer`, lecture `categories:lire` ; dix actives au plus (`QUESTIONS_MAX`) ; `GET /api/categories/arbre` porte pour chaque catégorie ses questions actives (domaine puis nature, `origine`). Au dépôt, `controler()` refuse une question hors de la catégorie et de son domaine ou inactive (`QUESTION_INVALIDE`), une réponse non proposée (`REPONSE_INVALIDE`), une obligatoire sans réponse (`REPONSE_OBLIGATOIRE`, avec les identifiants) ; `enregistrer()` copie les textes dans la transaction. Valeurs livrées de `config/categories.json` (`questions`) au démarrage, à l'installation et à la création d'une entité, pour une catégorie active qui n'a encore aucune question. Journal par `changements('questions_categorie')`.

Mentions d'information (RGPD-10) : `parametresEntite.protectionDonnees()` rend les mentions courte et complète en FR et en NL, `{entite}` et `{dpo}` remplacés (sans DPO : renvoi au responsable), et `dpo_contact` ; le profil les rend dans `protection_donnees`. Type `texte_long` : variables du catalogue seules permises ; un texte vidé revient au texte livré ; plafond du corps porté à 3 000 caractères.

Interface : `components/demandes/DemandesVoisines.tsx`, `ComplementsDemande.tsx`, `QuestionsCategorie.tsx`, `components/referentiel/QuestionsFiche.tsx` ; `NouvelleDemandePage.tsx` (danger, voisines, questions, compléments, brouillon enregistré 1,5 s après le dernier changement, mention et « En savoir plus ») ; `DemandesPage.tsx` (« Précisions », suiveurs, « Faite pour vous ») ; `ReglagesForm.tsx` (type `texte_long`) ; rubrique « Protection de vos données » de l'aide.

Rouge des erreurs (écart E-26) : `frontend/src/couleurs.ts` et `buildTheme()` d'`App.tsx` posent `colorError`, `colorErrorText` et `Button.dangerColor` en clair (`#cf1322`) et en sombre (graine `#ff8a8a`, `#dc7878` calculé par Ant Design sous les champs) ; `ErreurObligatoire.tsx` lit le jeton du thème ; `test/couleurs.test.tsx` vérifie 4,5:1 sur chaque fond à partir des jetons calculés (`theme.getDesignToken`).

## Champs sur téléphone et adresse e-mail (0.5.2)

`frontend/src/index.css` : jusqu'à 768 px de large, `input`, `textarea`, `select` et les champs de saisie des listes, dates et nombres d'Ant Design sont en 16 px (`!important`, les règles d'Ant Design étant plus précises). Safari sur iPhone n'agrandit plus la page au toucher d'un champ. La balise `viewport` de `index.html` reste `width=device-width, initial-scale=1.0`, sans `maximum-scale` ni `user-scalable` : le zoom à deux doigts reste permis (WCAG 1.4.4). Les deux points sont vérifiés par `pages.test.tsx`.

`frontend/src/validation.ts` : règle `courriel(t)`, message unique `form.courriel` (« Adresse e-mail non valide », « Ongeldig e-mailadres »). Les champs d'adresse e-mail (Utilisateurs et rôles, assistant d'installation, connexion, contact des réglages de l'entité) portent `texteObligatoire(t)`, `courriel(t)` et `validateFirst` : vide ou fait d'espaces, le champ ne montre que « Ce champ est obligatoire ». La clé `parametres.courriel.invalide` est retirée.

Après l'envoi d'une demande, les boutons « Mes demandes » et « Faire une autre demande » sont dans un `Space wrap` (12 px dans les deux sens).

## Champs obligatoires dans l'interface (0.5.1)

`frontend/src/validation.ts` donne les règles communes des formulaires Ant Design : `texteObligatoire(t)` (`required` et `whitespace`) pour un texte, `obligatoire(t)` (`required` seul) pour un choix, un nombre, une date ou un mot de passe, qui garde ses espaces (DV-37) ; message unique `form.obligatoire` (« Ce champ est obligatoire », « Dit veld is verplicht »). Les champs hors formulaire (motifs de désactivation, description d'une demande) utilisent `seulementEspaces()` et `components/ErreurObligatoire.tsx`, avec `aria-invalid` et `aria-describedby`. Le serveur garde son propre contrôle (`nettoyer()` et schémas) : l'interface évite seulement le message général « Données invalides ».

`components/demandes/LieuPicker.tsx` : le bouton « Parcourir la liste des bâtiments » porte `aria-expanded` et ouvre ou referme la carte de l'arbre ; la carte a un bouton « Masquer la liste » qui rend le focus au bouton d'ouverture.


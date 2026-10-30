# Serveur MCP

Version de l'application : **0.8.0** · Mis à jour le 30/10/2026 · Le français fait foi.

## Accès

- Adresse d'acceptance : `https://192.0.2.10:18443/api/mcp` ; en général `https://<adresse>:<port HTTPS>/api/mcp`.
- Protocole : JSON-RPC 2.0, sans état, dans le processus de l'API (obligatoire avec `sql.js`).
- Authentification : la session, ou le jeton de session en `Authorization: Bearer`. OAuth 2.1 avec PKCE arrive à l'étape 44 (écart E-10).
- Limite : 60 appels par minute et par personne (`MCP_RATE_MAX`).

## Règles

- Chaque outil appelle la même fonction de service que la route REST, sous l'identité et les droits de la personne, dans son entité active.
- Un test de parité échoue si une route n'a pas son outil ou l'inverse. Quatre routes binaires en sont exclues par une liste fermée : le dépôt et la lecture du fichier d'une photo d'un lieu, et, depuis la 0.8.0, d'une pièce jointe d'une demande (écart E-17).
- Une désactivation, un retrait ou un effacement se fait en deux appels : `prepare_*` décrit l'effet et rend un jeton de cinq minutes lié à la personne, `confirm_*` exécute. Le droit d'écrire est vérifié dès `prepare_*`.
- Descriptions en français et en néerlandais. Aucun outil de SQL libre.
- Un module éteint (Paramètres, Modules) retire ses outils de `tools/list` et refuse leur appel (`MODULE_DISABLED`) ; module Patrimoine éteint : `create_lieu`, `update_lieu`, `deactivate_lieu`, `delete_lieu_photo`.
- Depuis la 0.4.1, les fiches de catégorie, de priorité, de jour de l'horaire et de jour non ouvré portent `trace` (`etat`, `le`, `par`) : qui les a modifiées en dernier et quand, ou « livrée ». Le nom n'est rendu qu'aux personnes de l'entité. Aucun outil nouveau.
- Depuis la 0.5.0, le serveur retire les espaces de début et de fin de tout texte reçu, par le MCP comme par l'API, sauf les mots de passe ; un champ obligatoire fait seulement d'espaces est refusé (`VALIDATION`), avant tout jeton de confirmation.
- Les instructions envoyées au client demandent de commencer par `get_profile` : les données métier sont celles de l'entité active ; `select_entite` la change. Elles disent aussi que le MCP ne transporte aucun fichier, et qu'une demande se dépose par `create_demande`, le lieu proposé d'office étant `lieu_propose` dans `get_profile`, et les derniers lieux de ses demandes `lieux_recents` (0.7.5). Depuis la 0.8.0, elles disent que les pièces du brouillon partent avec la demande suivante, même déposée par `create_demande`, et qu'il faut le dire à la personne.

## 0.8.0

Outils nouveaux : `list_pieces_brouillon` (`GET /api/demandes/brouillon/pieces` : pièces du brouillon de la personne et plafonds de l'entité, `nombre`, `octets`, `types`), `get_piece` (`GET /api/pieces/:id` : nom affiché, type, taille, dimensions, numéro de la demande), `prepare_delete_piece` et `confirm_delete_piece` (`DELETE /api/pieces/:id`, suppression réelle, fichier effacé du disque ; droit vérifié dès `prepare_*`). `get_demande` rend `pieces` (avec `peut_retirer`), ou `null` pour qui suit seulement la demande. `create_demande` rattache les pièces du brouillon à la demande. `prepare_delete_brouillon` annonce le nombre de pièces effacées avec le brouillon. Le dépôt et le téléchargement d'un fichier restent hors MCP : la personne ajoute ses photos à l'écran.

## 0.7.5

Aucun outil nouveau. `get_profile` rend `lieux_recents` : les derniers lieux distincts des demandes de la personne dans l'entité active (identifiant, code, noms FR et NL, nature, chemin), cinq au plus, lieux actifs seulement, sans le lieu proposé d'office (`lieu_propose`). L'assistant peut les proposer avant de chercher par `list_lieux`.

## 0.7.4

Aucun outil nouveau. `list_audit` et `get_audit` rendent sur chaque ligne `noms` : pour chaque identifiant de lieu ou de catégorie du détail, par son chemin (`lieu_id`, `categorie_id`, `lieu_habituel_id`, `avant`, `apres`, `avant.parent_id`, `apres.parent_id`), le type, le code, le nom FR et NL et l'entité ; `introuvable: 1` si la fiche n'existe plus. Le détail enregistré ne change pas ; le bénéficiaire d'une demande reste un identifiant. Toujours réservé à l'administrateur.

## 0.7.3

Aucun outil nouveau ni changé. Correctif de sécurité des dépendances du serveur (lecture des corps JSON par `body-parser` 1.20.9) : les appels JSON-RPC sont lus comme avant.

## 0.7.2

Aucun outil nouveau ni changé. Version sans changement fonctionnel (dépôt public). Dans la copie de ce fichier versée au dépôt, l'adresse d'acceptance est une valeur d'exemple.

## 0.7.1

Aucun outil nouveau. `save_brouillon` accepte la nature du lieu (`contenu.lieu.nature`), telle que `get_profile` la rend dans `lieu_propose` : un brouillon fait avec le lieu proposé d'office était refusé. Tout autre champ inconnu reste refusé.

## Outils de la 0.7.0

| Outil | Route |
| --- | --- |
| `list_demandes_voisines` | `GET /api/demandes/voisines` : demandes ouvertes du même bâtiment que `lieu_id`, sans nom du demandeur ; à proposer avant `create_demande` |
| `suivre_demande` | `POST /api/demandes/:id/suivre` : « Moi aussi », `remarque` facultative lue par le seul service technique |
| `list_beneficiaires` | `GET /api/demandes/beneficiaires` : collègues de l'entité active pour le champ « Pour » (2 caractères au moins) |
| `get_brouillon`, `save_brouillon`, `prepare_delete_brouillon` et `confirm_delete_brouillon` | `GET`, `PUT`, `DELETE /api/demandes/brouillon` : brouillon de la personne dans l'entité active |
| `list_questions_categorie`, `get_question_categorie`, `create_question_categorie`, `update_question_categorie`, `prepare_deactivate_question_categorie` et `confirm_deactivate_question_categorie` | `GET` et `POST /api/categories/:id/questions`, `GET`, `PUT`, `DELETE /api/questions-categorie/:id` (écriture : responsable du service technique) |

Outils modifiés : `create_demande` reçoit `danger`, `beneficiaire_id` ou `beneficiaire_texte`, `date_souhaitee`, `creneau` et `reponses` (`[{ question_id, valeur }]`, `valeur` « oui », « non » ou le rang « 1 » à « 6 ») ; sa description demande de proposer d'abord `list_demandes_voisines` et d'informer la personne avec `protection_donnees.mention_courte`. `get_profile` rend `telephone_urgence` et `protection_donnees` (mentions FR et NL, contact du DPO). `get_categories_arbre` rend les `questions` de chaque catégorie. `get_demande` rend `reponses`, `suivie`, `pour_moi` et, pour le service technique, `suiveurs`. Danger : `delai_annonce` vaut `null` pour le demandeur.

## 0.5.2

Aucun outil nouveau ni modifié. Le message unique d'un champ d'adresse e-mail est un contrôle de l'interface ; par le MCP comme par l'API, le serveur vérifie toujours le format de l'adresse lui-même.

## 0.5.1

Aucun outil nouveau ni modifié. Le message « Ce champ est obligatoire » de la 0.5.1 est un contrôle de l'interface ; par le MCP comme par l'API, un champ obligatoire fait seulement d'espaces reste refusé par le serveur (`VALIDATION`, DV-37).

## Outils de la 0.5.0

| Outil | Route |
| --- | --- |
| `get_profile` | `GET /api/auth/me` (rend `lieu_propose` depuis la 0.5.0, `lieux_recents` depuis la 0.7.5) |
| `set_lieu_habituel` | `PUT /api/auth/lieu-habituel` (nouveau en 0.5.0) |
| `list_demandes`, `get_demande`, `create_demande` | `GET /api/demandes`, `GET /api/demandes/:id`, `POST /api/demandes` (nouveau en 0.5.0 ; `perimetre` `entite` pour le gestionnaire et le responsable) |
| `select_entite` | `PUT /api/auth/entite` |
| `list_entites`, `get_entite`, `list_entite_membres` | `GET /api/entites`, `GET /api/entites/:id`, `GET /api/entites/:id/membres` |
| `create_entite`, `update_entite`, `prepare_deactivate_entite`, `confirm_deactivate_entite` | `POST /api/entites`, `PUT /api/entites/:id`, `DELETE /api/entites/:id` |
| `list_roles`, `get_role` | `GET /api/roles`, `GET /api/roles/:code` |
| `list_roles_utilisateurs`, `get_role_utilisateur`, `create_role_utilisateur`, `update_role_utilisateur`, `prepare_retirer_role_utilisateur`, `confirm_retirer_role_utilisateur` | `/api/roles-utilisateurs` |
| `list_listes_valeurs`, `get_liste_valeur`, `create_liste_valeur`, `update_liste_valeur`, `prepare_deactivate_liste_valeur`, `confirm_deactivate_liste_valeur` | `/api/listes-valeurs` (nouveau en 0.2.0) |
| `list_lieux` (recherche sans accents, noms des lieux parents compris, chemin de chaque lieu, depuis la 0.5.0), `get_lieux_arbre`, `get_lieu`, `create_lieu`, `update_lieu`, `prepare_deactivate_lieu`, `confirm_deactivate_lieu` | `GET /api/lieux`, `GET /api/lieux/arbre`, `GET /api/lieux/:id`, `POST /api/lieux`, `PUT /api/lieux/:id`, `DELETE /api/lieux/:id` (nouveau en 0.2.0) |
| `prepare_delete_lieu_photo`, `confirm_delete_lieu_photo` | `DELETE /api/lieux/:id/photo` (nouveau en 0.2.0) |
| `list_categories`, `get_categories_arbre`, `get_categorie`, `create_categorie`, `update_categorie`, `prepare_deactivate_categorie`, `confirm_deactivate_categorie` | `/api/categories`, `GET /api/categories/arbre` (nouveau en 0.4.0 ; écriture par le responsable du service technique) |
| `list_priorites`, `get_priorite`, `update_priorite`, `prepare_reset_priorite`, `confirm_reset_priorite` | `/api/priorites` (nouveau en 0.4.0) |
| `list_horaires`, `get_horaire`, `update_horaire`, `prepare_reset_horaire`, `confirm_reset_horaire` | `/api/horaires` (nouveau en 0.4.0) |
| `list_jours_non_ouvres`, `get_jour_non_ouvre`, `create_jour_non_ouvre`, `update_jour_non_ouvre`, `prepare_deactivate_jour_non_ouvre`, `confirm_deactivate_jour_non_ouvre` | `/api/jours-non-ouvres` (nouveau en 0.4.0) |
| `list_jours_feries` | `GET /api/jours-feries` (nouveau en 0.4.0, calculé) |
| `simuler_echeance` | `GET /api/echeances/simulation` (nouveau en 0.4.0, lecture seule) |
| `list_parametres`, `get_parametre`, `update_parametre`, `prepare_reset_parametre`, `confirm_reset_parametre` | `/api/parametres` (nouveau en 0.3.0, administrateur) |
| `list_modules`, `get_module`, `update_module` | `/api/modules` (nouveau en 0.3.0 ; réglage par l'administrateur) |
| `list_parametres_entite`, `get_parametre_entite`, `update_parametre_entite`, `prepare_reset_parametre_entite`, `confirm_reset_parametre_entite` | `/api/parametres-entite` (nouveau en 0.3.0 ; réglage par le responsable du service technique) |
| `list_audit`, `get_audit` | `GET /api/audit`, `GET /api/audit/:id` (nouveau en 0.3.0, administrateur, lecture seule ; `noms` des lieux et des catégories depuis la 0.7.4) |
| `list_notes_version`, `get_note_version`, `marquer_nouveautes_lues` | `GET /api/notes-version`, `GET /api/notes-version/:version`, `PUT /api/auth/nouveautes` (nouveau en 0.3.0) |
| `list_users`, `get_user`, `create_user`, `update_user`, `prepare_deactivate_user`, `confirm_deactivate_user` | `/api/users` |

Hors MCP : `POST /api/lieux/:id/photo` et `GET /api/lieux/:id/photo`, `POST /api/demandes/brouillon/pieces` et `GET /api/pieces/:id/fichier` (fichiers). La fiche d'un lieu rendue par `get_lieu` dit s'il a une photo (`has_photo`) et depuis quand (`photo_at`).

## Exemples de demandes à l'assistant

- « Signale une lampe en panne dans la salle du conseil. » L'assistant appelle `get_profile`, cherche le lieu par `list_lieux` (`q` « salle du conseil ») et la catégorie par `get_categories_arbre`, puis appelle `create_demande` et donne le numéro.
- « Où en sont mes demandes ? » L'assistant appelle `list_demandes` avec `ouvertes` 1.
- « Retire la photo que j'ai jointe par erreur à ma demande. » L'assistant lit la demande par `get_demande`, nomme la pièce, puis appelle `prepare_delete_piece` et, après accord, `confirm_delete_piece`.
- « Montre-moi l'arbre du patrimoine du CPAS. » L'assistant appelle `get_profile`, `select_entite` si nécessaire, puis `get_lieux_arbre`.
- « Ajoute le local 1.02, un bureau, au premier étage de la maison communale. » L'assistant cherche le niveau par `list_lieux`, le type par `list_listes_valeurs`, puis appelle `create_lieu`.
- « Qui a modifié le nom du pouvoir local ? » (administrateur) L'assistant appelle `list_audit` avec l'action `parametre.update`.
- « Quel est le téléphone du service technique ? » L'assistant appelle `get_parametre_entite` avec `contact.telephone`.
- « Quoi de neuf dans cette version ? » L'assistant appelle `list_notes_version`.
- « Une fuite d'eau signalée vendredi à 13 h au CPAS, à quand la prise en charge ? » L'assistant choisit l'entité, cherche la catégorie par `list_categories`, puis appelle `simuler_echeance` avec `categorie_id` et `recu_le`.
- « Qui a changé le délai de P3 ? » (responsable) L'assistant appelle `get_priorite` avec `P3` et lit `trace` ; l'administrateur peut aussi chercher `priorite.update` par `list_audit`.
- « Ajoute une fermeture du 28 au 31 décembre. » (responsable) L'assistant appelle `create_jour_non_ouvre` avec `nature` `fermeture`, `date_debut`, `date_fin` et les libellés FR et NL.

## À venir

Chaque ressource nouvelle arrive avec ses outils dans la même version (API-05). Invites FR et NL prêtes à l'emploi à l'étape 40 (API-08). Jetons d'application (GRC) à l'étape 37 (API-07).

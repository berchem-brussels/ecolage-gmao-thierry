

## 0.10.0

New tools: `get_auth_settings` (Microsoft sign-in settings: mode, tenant, application, public address, domains, redirect address; the secret is never returned, only whether it is set) and `update_auth_settings` (two calls: `prepare_update_auth_settings` then `confirm_update_auth_settings`; mode `sso` refused while no active administrator can sign in). Administrator only.

## 0.9.1

No new or changed tool.

## 0.9.0

New tools: `get_tableau_bord` (technical department dashboard: to qualify, overdue, open P1 and P2, due within two working days), `qualifier_demande` (category, place and priority required; reason when the priority differs from the proposed one; estimated duration, instructions, visibility of the department's photos, agreed date; permission `demandes:qualifier`), `list_vues_demandes`, `get_vue_demandes`, `create_vue_demandes`, `update_vue_demandes`, `prepare_delete_vue_demandes` and `confirm_delete_vue_demandes` (saved views of the person in the active entity). `list_demandes` takes the department list filters (`etats`, `priorites`, `categorie_id`, `batiment_id`, `echeance`, `canal`, `danger`, `tri`, `ordre`); each request returned to the department carries `echeance_courante`, `echeance_type` and `retard`. Instructions and reason are never returned to the requester.

## 0.8.0

New tools: `list_pieces_brouillon` (attachments of the person's draft and the entity's limits), `get_piece` (attachment record), `prepare_delete_piece` and `confirm_delete_piece` (real deletion, file erased from disk). `get_demande` returns `pieces` (with `peut_retirer`), or `null` for someone who only follows the request. `create_demande` attaches the draft's attachments to the request. Uploading and downloading a file stay outside MCP (gap E-17, four routes).

## 0.7.1

No new tool. `save_brouillon` accepts the place type (`contenu.lieu.nature`), as `get_profile` returns it in `lieu_propose`: a draft made with the proposed place was refused. Any other unknown field is still refused.

## 0.7.0

New tools: `list_demandes_voisines`, `suivre_demande`, `list_beneficiaires`, `get_brouillon`, `save_brouillon`, `delete_brouillon` (two calls), `list_questions_categorie`, `get_question_categorie`, `create_question_categorie`, `update_question_categorie`, `deactivate_question_categorie` (two calls). `create_demande` accepts `danger`, `beneficiaire_id` or `beneficiaire_texte`, `date_souhaitee`, `creneau` and `reponses`; first offer `list_demandes_voisines` and inform the person with `protection_donnees.mention_courte`. `get_profile` returns `telephone_urgence` and `protection_donnees`; `get_categories_arbre` the `questions` of each category.

## 0.5.2

No new or changed tool. The single message of an e-mail field is an interface check; the server still validates addresses on its own.

## 0.5.1

No new or changed tool. A required field containing only spaces is still refused by the server.

## New in 0.5.0

`list_demandes`, `get_demande`, `create_demande` (submit a request on behalf of the signed-in person; returns the number, for example AC-DI-2026-00001); `set_lieu_habituel` (usual workplace). `get_profile` returns `lieu_propose`. `list_lieux` searches without accents, also through parent places' names. Extra spaces around every text are removed, except passwords.

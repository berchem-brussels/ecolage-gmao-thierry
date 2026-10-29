

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

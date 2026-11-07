# MCP server

Application version: **0.12.0** · Updated on 06/11/2026 · The French text prevails (`docs/fr/MCP.md`).

## Access and rules

- Acceptance address: `https://192.0.2.10:18443/api/mcp`; in general `https://<address>:<HTTPS port>/api/mcp`.
- Protocol: JSON-RPC 2.0, stateless, inside the API process.
- Authentication: the session, or the session token in `Authorization: Bearer`. OAuth 2.1 with PKCE arrives at step 44 (deviation E-10).
- Limit: 60 calls per minute per person.
- Each tool calls the same service function as the REST route, with the person's identity and rights, in their active entity. A deactivation, withdrawal or erasure takes two calls (`prepare_*`, then `confirm_*`). No free SQL tool.

## 0.12.0

New tools: `list_faq` (shared questions and those of the active entity; filters `topic_id`, `q`, `inclure_inactives`), `get_faq`, `create_faq` (`portee` "commune" or "entite"), `update_faq` (reactivation with `is_active` = 1), `deactivate_faq` in two calls (with a reason) and `create_faq_from_ticket` (resolved or closed business question, by the handler, one entry per ticket). A refused setting names the setting and the wrong value in the person's language; ticket role codes in upper or lower case.

## 0.11.0

New tools, taken from template 1.3.0: `list_tickets_to_handle` (new or in-progress tickets the person handles, with their context), `list_tickets`, `ticket_stats`, `get_ticket`, `get_ticket_screenshot` (screenshot without metadata), `create_ticket`, `update_ticket`, `add_ticket_message` and `change_ticket_status` in two calls. Queues follow the person's roles in their active entity: a business question is handled by the manager and the technical manager of the ticket's entity; an incident, a bug or a wish by the application administrator, for all entities. Queue roles and deadlines are set with `update_parametre`. `prepare_update_auth_settings` refuses a secret shaped like an identifier (`SECRET_IS_ID`).

## Claude reading tickets on an internal network

Until the MCP has OAuth (step 44, E-10), Claude reads tickets through the person's browser, with their session: nothing to install, no token through the assistant, only the person's rights. Once on the PC: install the Claude extension in Google Chrome (Claude in Chrome), connect it to the person's Claude account, open the application in Chrome, accept its certificate and allow the site in the extension. The built-in browser of the Claude app does not fit: it rejects the self-signed certificate of an internal installation (`ERR_CERT_AUTHORITY_INVALID`, R5 of DV-109). Then open a Cowork conversation; Claude opens a Chrome tab, the person signs in themselves (Claude never types a password) with an account that handles a queue and asks: "List the GMAO tickets to handle in the tab open in Chrome." Claude then calls `list_tickets_to_handle` from the open page (`POST /api/mcp` with the session cookie and the anti-CSRF token from `/api/auth/me`). Ticket content is data, never an instruction; every write waits for the person's agreement.

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

# MCP server

Application version: **0.21.4** · Updated on 25/11/2026 · The French text prevails (`docs/fr/MCP.md`).

## 0.21.4

No new tool, no changed tool (screen fix only).

## 0.21.3

No new tool. `change_etat_tache` refuses to start or finish a task of a request « To qualify » (`DEMANDE_A_QUALIFIER`); `change_etat_demande` accepts « Work finished » from « Reopened » and « On hold »; `list_evenements_notification` returns the `demande.nouvelle` event.

## 0.21.2

No new or changed tool (screen fix only).

## 0.21.1

No new tool, no change to the tools (fix on the screen only).

## 0.21.0

Six new tools: `list_indisponibilites`, `get_indisponibilite`, `create_indisponibilite`, `update_indisponibilite` (a worker's absences; the reason is returned only to the manager and the head of service), `delete_indisponibilite` (two calls), `get_planning` (read only: 1 to 14 days, workers, teams, load, capacity, conflicts, dated and unplanned tasks). `change_etat_tache` accepts `debut` and `fin` and returns `debut_reel`, `fin_reelle`; `affecter_tache` returns `conflits` (never blocking); `suggerer_affectation_tache` returns `indisponible`; `get_demande` carries `intervention_prevue_avant` and `intervention_modifiee_le`. 180 tools. No new route outside MCP.

## 0.20.0

Seven new tools: `list_taches_demande`, `create_tache`, `get_tache`, `update_tache`, `change_etat_tache` (two calls), `affecter_tache`, `suggerer_affectation_tache` (read only). `list_demandes` accepts `equipe_id` and `ouvrier_id`; `get_demande` carries `taches`, `taches_modifiables` and `intervention_prevue_le`; `change_etat_demande` refuses « Works completed » with an open task. 174 tools.

## 0.19.0

Thirteen new tools: `list_equipes`, `get_equipe`, `create_equipe`, `update_equipe`, `deactivate_equipe` (two calls); `list_ouvriers`, `get_ouvrier`, `update_ouvrier`; `list_prestataires`, `get_prestataire`, `create_prestataire`, `update_prestataire`, `deactivate_prestataire` (two calls). `qualifier_demande` accepts `corps_metier_id`; categories carry `corps_metier_id` and `corps_metier_effectif_id`.

## 0.18.0

No new tool. The three Excel and CSV exports return a file and stay outside MCP (deviation E-17, nine routes in the closed list); the same rows are read through `list_demandes`, `list_demandes_a_valider` and `list_tickets`. Search, assistant and guided tour are screen features.

## 0.17.0

Sixteen new tools: notifications of the signed-in person (`list_notifications`, `get_compteur_notifications`, `get_notification`, `list_evenements_notification`, `marquer_notification_lue`, `marquer_notifications_lues`), e-mail for the administrator (`get_mail_settings`, `update_mail_settings` in two calls, `send_test_mail`, `list_courriels`, `get_courriel`) and e-mail templates (`list_modeles_courriel`, `get_modele_courriel`, `update_modele_courriel`, `retablir_modele_courriel` in two calls, `apercu_modele_courriel`).

## 0.16.1

No new tool. `get_piece` also opens to the head of service the attachments of the requests they must approve. `create_demande`: a request with `danger` in a category that needs approval arrives "To qualify" in P1.

## Access and rules

- Acceptance address: `https://192.0.2.10:18443/api/mcp`; in general `https://<address>:<HTTPS port>/api/mcp`.
- Protocol: JSON-RPC 2.0, stateless, inside the API process.
- Authentication: the session, or the session token in `Authorization: Bearer`. OAuth 2.1 with PKCE arrives at step 44 (deviation E-10).
- Limit: 60 calls per minute per person.
- Each tool calls the same service function as the REST route, with the person's identity and rights, in their active entity. A deactivation, withdrawal or erasure takes two calls (`prepare_*`, then `confirm_*`). No free SQL tool.

## 0.16.0

New tools: `list_demandes_a_valider` (requests awaiting approval for the services where the person is head, or deputy during the period; approve or refuse with `change_etat_demande`), `list_services`, `get_service`, `create_service`, `update_service` and `deactivate_service` in two calls (administrator; head and deputy hold the "Approver" role), `fusionner_demande` (`principale_id`, `commentaire`) and `decouper_demande` (`parties`, one to five, `commentaire`), each in two calls (`demandes:traiter`). Enriched: `create_demande` takes `demandeur_id` and `canal` together (request received by the technical department); `get_demande` returns `service`, `valideur`, `encodee_par`, `fusionnee_dans`, `regroupees`, `issue_de`, `issues`, `decoupable`; `update_user` and `list_users` take `service_id`.

## 0.15.0

New tools: `list_messages_demande` (thread of a request; the requester and the beneficiary receive neither internal notes nor department agent names; a mere follower does not read the thread), `add_message_demande` (`texte`, `interne`, `mentions` of department colleagues in an internal note, open requests only), `mark_messages_lus`, `list_mentionnables_demande`, `list_pieces_message`, `list_modeles_reponse`, `get_modele_reponse`, `create_modele_reponse`, `update_modele_reponse`, `deactivate_modele_reponse` in two calls (variables `{numero}`, `{lieu}`, `{etat}`, `{prenom}` only), `ne_plus_suivre_demande` in two calls. `suivre_demande` takes `source` `abonnement`; `get_demande`, `list_demandes` (`messages`, `mentions`) and `get_tableau_bord` (`messages_a_lire`, `mentions`) are enriched. Uploading a message attachment stays outside MCP (E-17).

## 0.14.0

New tools: `get_historique_demande` (history of a request; the requester does not see internal notes), `change_etat_demande` in two calls (`prepare_change_etat_demande`, `confirm_change_etat_demande`: target status `etat`, `motif_id`, `commentaire`, `compte_rendu` according to the transition; also reopening by the requester with `etat` `rouverte`), `list_etats_demande`, `list_transitions_demande`, `update_etat_demande` (labels per entity, head of department), `complete_demande` (addition by the requester or the beneficiary), `cancel_demande` in two calls (cancellation with a reason, as long as work has not started) and `give_avis_demande` (score 1 to 5, one per closure). `get_demande` returns `transitions` (service), `complements`, `completable`, `annulable`, `reouvrable`, `reouvrable_jusqu_au`, `avis_possible`, `avis`. `get_tableau_bord` returns `attente_longue` and `a_cloturer`; `list_demandes` takes `attente` = `longue`. Adding a photo to a sent request stays outside MCP (`POST /api/demandes/:id/pieces`, E-17, five routes).

## 0.13.0

No new tool. `list_lieux` takes `has_photo` (0: places without a photo, 1: with one, active entity only). `get_demande` returns `photo_lieu` to the technical service only: the place whose photo shows the spot (the request's place, `du_lieu` 1, or the nearest place above it, `du_lieu` 0), `null` when no place in the path has a photo. Audit log: `noms.cle` names a setting; a ticket status change records `motif_donne` (0 or 1) instead of the reason text.

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

# Architecture

Application version: **0.21.1** · The French text prevails (`docs/fr/ARCHITECTURE.md`); this file summarises each version.

## Typed dates and times kept before sending (0.21.1)

`saisieDate.ts`: `installerSaisieDate()` (called once in `main.tsx`) listens in capture phase to `click` and `submit` on the document; when a date or time field (rc-picker) still has focus and the event comes from elsewhere, it sends Enter to the field (rc-picker keeps a valid text at once; losing focus alone keeps it two frames later, too late) and blurs it. `texteNonRetenu()` compares the text shown at the click with the retained value; « Terminer la tâche » refuses to send when they differ.

## Actual times, absences, planning, conflicts and announced date (0.21.0)

Migration `018_planning`: `demande_taches.debut_reel` and `fin_reelle` (UTC), table `indisponibilites` (worker, from, to, whole day / morning / afternoon, reason leave / training / other), three columns of `demandes` for the date announced to the requester and its previous value. Services: `taches.js` rules 13 (actual times) and 14 (`suivreDate()`, notice `demande.date_prevue`), `indisponibilites.js` (rules 1 to 6), `planning.js` (rules 1 to 9: period of 1 to 14 days, capacity, conflicts `absent` / `jour_non_travaille` / `trop_charge`, unplanned tasks). Routes `/api/indisponibilites` and `GET /api/planning`; six MCP tools (180); permission `indisponibilites:gerer`. The reason for an absence is never logged nor shown to anyone but the manager and the head of service. Interface: `PlanningPage.tsx` (drag and drop, « Move » and « Plan » window), `IndisponibilitesOuvrier.tsx`, « Finish the task » window in `TachesDemande.tsx`, `saisieDate.ts`. Fixes from the 0.20.0 acceptance test (DV-164). Phone check: 66 screens.

## Tasks, assignment, suggestion and filters per team (0.20.0)

Migration `017_taches`: `demande_taches` (rank within the request, title, instructions, trade, estimated duration, status `a_faire` / `en_cours` / `terminee` / `annulee`, cancellation reason, `annulation_auto`, `equipe_id`, `date_prevue`, `heure_debut`), `tache_ouvriers`; table `demande_transitions` rebuilt identically to accept `via = 'affecter'` (42 transitions, nine new from « Planned », DV-161). Service `services/taches.js` (rules 1 to 12), `cycle.passageAuto()` and `executer()`, `echeances.jourOuvre()`, list filters `equipe_id` and `ouvrier_id` (non-cancelled tasks, bounded to the active entity). Seven routes under `/api/demandes/:id/taches` and `/api/taches`, seven MCP tools (174). Interface: `TachesDemande.tsx`, « Team » and « Worker » lists in `GestionDemandesPage.tsx`, « Intervention planned on » for the requester; calendar panel centred below 480 px. Fixes from the 0.19.0 acceptance test (DV-159). Phone check: 61 screens.

## Teams, workers, contractors and trades (0.19.0)

Migration `016_equipes_prestataires`: `equipes`, `equipe_membres`, `equipe_horaires` (one slot per day, 1 = Monday … 7 = Sunday; no slot = the entity's schedule), `ouvrier_profils`, `ouvrier_competences`, `prestataires` (company number 0123.456.789, unique in the entity), `prestataire_corps`; columns `categories.corps_metier_id` and `demandes.corps_metier_id`; a JavaScript step completes the delivered categories that have no trade. Value lists `corps_metier` and `competence`. New permissions `equipes:lire`, `equipes:gerer`, `equipes:diriger`, `interventions:realiser`, `prestataires:lire`, `prestataires:gerer`. Services `equipes.js` and `prestataires.js` (modulo 97 check digits); routes `/api/equipes`, `/api/ouvriers`, `/api/prestataires`; thirteen MCP tools. `categories.js` and `qualification.js`: the category's trade (the domain's for a nature), proposed at qualification, internal to the department. Audit log: lists of ids named element by element, schedule by day. Interface: `EquipesPage.tsx`, `PrestatairesOnglet.tsx`, « Trade » field in `CategoriesTab.tsx` and `QualificationForm.tsx`. Fixes from the 0.18.0 acceptance test (`exports.js`, `VisiteGuidee.tsx`). Phone check: 57 screens.

## Search, exports, assistant and guided tour (0.18.0)

No migration. Server: `services/exports.js` (Excel through `exceljs`, CSV with BOM and « ; », `celluleCsv()`, 5,000-row ceiling, `export.liste` in the log) and three routes calling `demandes.list`, `demandes.aValider` and `tickets.list` (same rights and partition), outside MCP (E-17). Interface: `RechercheGlobale.tsx`, `BoutonExport.tsx` and `api.telecharger()`, `Chatbot.tsx` (`ACCES_ECRANS`, follow-up through the API, help sheets), `VisiteGuidee.tsx` (Ant Design `Tour`, without a mask). `mobile:check`: `charge()` and `ouvrir()`, screens `#recherche`, `#chatbot`, `#visite`, journeys 6 to 8.

## Notifications, e-mail and alerts (0.17.0)

Migration `015_notifications` (notifications, e-mails with queue and log, e-mail templates, deadline alerts). Catalogues `config/notifications.json` (NOT-01) and `config/modeles-courriel.json`. Services: `notifications.js` (bell, own notifications only), `courriel.js` (settings, queue, test, `nodemailer` without file or URL access), `modeles-courriel.js` (composed in the recipient's language), `avis.js` (who gets what: submission, state change through `cycle.ecrire`, messages, tickets, deadlines every 15 minutes). Interface: `NotificationsCloche.tsx`, `CourrielPanel.tsx`, `ModelesCourriel.tsx`.

## Approver, attachments and danger (0.16.1)

One rule "the person approves today the requests of this request's service": `valideurDe` of `services/services.js`, used by reading, transitions and attachments (R5: the approver opens the attachments). A danger request in a category that needs approval arrives "To qualify" in P1 (`validation: danger` in the log). Phone check on Chromium and WebKit, with complete journeys on a local copy only.

## Message thread, mentions, reply templates and following (0.15.0)

Migration `013_messages`: tables `demande_messages` (author requester, beneficiary or department; internal note; text up to 4,000 characters; language; channel), `demande_messages_lus` (last message read per person and request), `demande_mentions`, `modeles_reponse`; columns `pieces_jointes.message_id` and `attente_message`, `demande_suiveurs.source`. Services `services/messages.js` (read by requester, beneficiary and department, internal notes for the department only, writing on open requests only, unread, mentions), `services/modeles-reponse.js` (variables `{numero}`, `{lieu}`, `{etat}`, `{prenom}`, four delivered templates). Routes `/api/demandes/:id/messages` (and `/lu`, `/pieces`, `/mentionnables`), `DELETE /api/demandes/:id/suivre`, `/api/modeles-reponse`; eleven MCP tools; message attachments outside MCP (E-17, six routes). Interface: `FilMessages.tsx`, `SuiviDemande.tsx`, `ModelesTab.tsx`, counters "Messages to read" and "Notes where you are mentioned".

## Life cycle of requests (0.14.0)

Catalogue `backend/config/cycle-de-vie.json` (15 statuses, 42 transitions; seven added in 0.16.0 for approval and merging, nine in 0.20.0 for « Planned », DV-161), copied at start-up into `demande_transitions` and, per entity, into `demande_etats` (labels for the requester and for the CRM). Migration `012_cycle_de_vie`: tables `demande_transitions`, `demande_etats`, `demande_historique`, `demande_complements`, `demande_avis`, seven columns of `demandes`. Service `services/cycle.js`: order of checks (entity, request 404 or 403, permission 403, module, transition 409), new permission `demandes:traiter`, deadline suspended during a wait for a ticked reason. Nine routes (`/api/demandes/:id/historique`, `/transitions`, `PUT` and `DELETE /api/demandes/:id`, `/pieces`, `/avis`, `/api/etats-demande`), eight MCP tools. Interface: `ChangerEtat.tsx`, `HistoriqueDemande.tsx`, `ActionsDemandeur.tsx`, `EtatsTab.tsx`.

## Help per screen and local FAQ (0.12.0)

One sheet per screen in the interface (`frontend/src/help/`), field explanations in `hints.ts` ("?"), blocking checks in `help.test.ts`; screenshots by `npm run help:capture` in `frontend/public/aide-captures/` (never under `public/help/`). Table `help_faq` (migration `011_faq`) with `entite_id` (empty: shared), `topic_id`, question and answer FR and NL, `source_ticket_id`, deactivation with a reason; routes `/api/faq`, `POST /api/tickets/:id/faq`, six MCP tools; permission `faq:gerer`. Refused setting naming the wrong value (`refus-reglage.js`). Post-installation checks: `recette.sh` and `backend/src/recette-api.js`.

## Tickets (0.11.0)

Tables `tickets` (reference `TCK-YYYY-NNNNN`, type, queue `business` or `it`, priority P1 to P4, status, requester's `entite_id` when reporting, screenshot without metadata) and `ticket_messages` (messages, events, internal notes), migration `010_tickets`. Service, routes, schemas and nine MCP tools from template 1.3.0; the business queue follows the person's roles in their active entity, the IT queue the administrator for all entities. Settings in the instance parameters, group `tickets`. "Report" button in the header, Tickets screen in the Help menu.

## Microsoft sign-in (0.10.0)

Table `auth_pending`, columns `users.oid` and `users.is_admin_local` (migration `009_sso`); `oidc.js`, `settings.js`, `routes/sso.js` from template 1.3.0; settings through `services/connexion.js`.

## Technical department: dashboard, list and qualification (0.9.0)

Migration `008_qualification`: ten columns of `demandes` (proposed priority, reason for a change, pick-up and completion due dates, agreed date, estimated duration, instructions, visibility of the department's photos, who qualified and when), one index, table `vues_demandes`; additions only. Due dates of existing requests are computed by the migration and completed at every start for any request without one. Due dates are computed when the request is filed and recomputed at each qualification, always from the reception time; the due date that counts is the pick-up one while the request is « À qualifier », then the completion one. `POST /api/demandes/:id/qualifier` (permission `demandes:qualifier`, manager and head of department): category, place and priority required, reason required when the priority differs from the proposed one (409 `MOTIF_PRIORITE_REQUIS`); « À qualifier » becomes « Qualifiée »; other states 409 `DEMANDE_ETAT`. Instructions and reason are never returned to the requester. `GET /api/demandes/tableau-bord`, filters and sorting of `GET /api/demandes?perimetre=entite`, saved views `/api/vues-demandes` (per person and entity, twenty at most). Screen `GestionDemandesPage.tsx`, components `TableauBord.tsx` and `QualificationForm.tsx`. The `pieces` group now shows in the entity settings.

## Photos and attachments on requests (0.8.0)

Migration `007_pieces_jointes`: table `pieces_jointes` (`demande_id` NULL while the attachment is in the draft, server-generated file name, cleaned display name, type, size, dimensions; no `is_active`, real deletion). Reception by `backend/src/fichiers.js` on `multer` 2.x (in memory, one file in the `fichier` field, limit and types per entity, type checked on the first bytes, PDF with active content refused); the photo of a place uses the same reader. New routes: `GET` and `POST /api/demandes/brouillon/pieces`, `GET /api/pieces/:id`, `GET /api/pieces/:id/fichier`, `DELETE /api/pieces/:id`. New permission `pieces:supprimer` (manager, head of service). Parameter group `pieces`. Interface: `PiecesDemande.tsx`, `VignettesPieces.tsx`.

## Complete request form (0.7.0)

Migration `006_demandes_formulaire`: tables `demande_suiveurs` (« Me too », remark read by the technical service only), `brouillons` (one draft per person and entity, 30 days, outside the audit log, gap E-27), `questions_categorie` (questions per domain or type, « oui_non » or « choix » with 2 to 6 answers in FR and NL, at most ten active) and `demande_reponses` (answers with a copy of the texts at submission); columns `demandes.danger`, `beneficiaire_id`, `beneficiaire_texte`, `date_souhaitee`, `creneau`. Additions only. New routes: `GET /api/demandes/voisines`, `POST /api/demandes/:id/suivre`, `GET /api/demandes/beneficiaires`, `GET`, `PUT`, `DELETE /api/demandes/brouillon`, `GET` and `POST /api/categories/:id/questions`, `GET`, `PUT`, `DELETE /api/questions-categorie/:id`. Danger sets priority P1, with no time promised to the requester. The profile returns `telephone_urgence` and `protection_donnees` (GDPR notices per entity, parameter group `rgpd`, type `texte_long` with variables `{entite}` and `{dpo}`). Error red (E-26): `frontend/src/couleurs.ts` and `buildTheme()`, at least 4.5:1 in light and dark themes, checked by `couleurs.test.tsx`.

## Fields on phones and e-mail address (0.5.2)

`frontend/src/index.css`: up to 768 px wide, inputs, text areas and Ant Design list, date and number inputs use 16 px (`!important`), so Safari on iPhone no longer zooms in when a field is touched. The `viewport` tag keeps pinch-zoom (no `maximum-scale`, no `user-scalable`, WCAG 1.4.4). `validation.ts`: rule `courriel(t)`, single message « Adresse e-mail non valide » / « Ongeldig e-mailadres »; e-mail fields (users and roles, installation wizard, sign-in, entity contact) use `texteObligatoire(t)`, `courriel(t)` and `validateFirst`, so an empty field shows only « Ce champ est obligatoire ». After a request is sent, the two buttons sit in a wrapping `Space` (12 px gap).

## Required fields in the interface (0.5.1)

`frontend/src/validation.ts`: shared rules `texteObligatoire(t)` (text, spaces only refused) and `obligatoire(t)` (choice, number, date, password), single message « Ce champ est obligatoire » / « Dit veld is verplicht ». Fields outside a form (deactivation reasons, request description) use `seulementEspaces()` and `ErreurObligatoire.tsx`. The server still refuses on its own. `LieuPicker.tsx`: the list of buildings opens and closes (`aria-expanded`, « Masquer la liste » button).

## Work requests (0.5.0)

Migration `005_demandes`: tables `sequences` (counters per entity, type and year; year 0 for the continuous counter) and `demandes` (unique number `AC-DI-2026-00001`, place, category, description of 10 to 5,000 characters, status `a_qualifier` on creation, proposed priority, channel, requester), column `users.lieu_habituel_id`; a JavaScript step (`src/nettoyage-espaces.js`) removes extra spaces from stored texts and logs each corrected record. `nettoyer()` in `src/validation.js` trims every received string (routes and MCP), except passwords. Numbering in `services/numerotation.js`, assigned inside the saving transaction. Routes `GET`, `POST /api/demandes`, `GET /api/demandes/:id`, `PUT /api/auth/lieu-habituel`; permissions `demandes:creer` (all entity roles) and `demandes:entite` (manager, head of service). Place search ignores accents and also matches parent places' names; each row carries its path.

## Photo of the spot, "Without photo" filter, phones (0.13.0)

`photo_lieu` of `GET /api/demandes/:id` for the technical department only (the request's place, or the nearest place above with a photo), `PhotoLieu.tsx`; `has_photo` filter of `GET /api/lieux` and `list_lieux`, "Without photo (n)" checkbox in Assets (`?photo=sans`); audit log names settings and place types on read; ticket reasons no longer copied to the log (`motif_donne`, E-46); phone header: language in the person's menu below 768 px, checked by `npm run mobile:check`.

# Architecture

Application version: **0.13.0** · The French text prevails (`docs/fr/ARCHITECTURE.md`); this file summarises each version.

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

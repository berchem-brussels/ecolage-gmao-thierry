

## Complete request form (0.7.0)

Migration `006_demandes_formulaire`: tables `demande_suiveurs` (« Me too », remark read by the technical service only), `brouillons` (one draft per person and entity, 30 days, outside the audit log, gap E-27), `questions_categorie` (questions per domain or type, « oui_non » or « choix » with 2 to 6 answers in FR and NL, at most ten active) and `demande_reponses` (answers with a copy of the texts at submission); columns `demandes.danger`, `beneficiaire_id`, `beneficiaire_texte`, `date_souhaitee`, `creneau`. Additions only. New routes: `GET /api/demandes/voisines`, `POST /api/demandes/:id/suivre`, `GET /api/demandes/beneficiaires`, `GET`, `PUT`, `DELETE /api/demandes/brouillon`, `GET` and `POST /api/categories/:id/questions`, `GET`, `PUT`, `DELETE /api/questions-categorie/:id`. Danger sets priority P1, with no time promised to the requester. The profile returns `telephone_urgence` and `protection_donnees` (GDPR notices per entity, parameter group `rgpd`, type `texte_long` with variables `{entite}` and `{dpo}`). Error red (E-26): `frontend/src/couleurs.ts` and `buildTheme()`, at least 4.5:1 in light and dark themes, checked by `couleurs.test.tsx`.

## Fields on phones and e-mail address (0.5.2)

`frontend/src/index.css`: up to 768 px wide, inputs, text areas and Ant Design list, date and number inputs use 16 px (`!important`), so Safari on iPhone no longer zooms in when a field is touched. The `viewport` tag keeps pinch-zoom (no `maximum-scale`, no `user-scalable`, WCAG 1.4.4). `validation.ts`: rule `courriel(t)`, single message « Adresse e-mail non valide » / « Ongeldig e-mailadres »; e-mail fields (users and roles, installation wizard, sign-in, entity contact) use `texteObligatoire(t)`, `courriel(t)` and `validateFirst`, so an empty field shows only « Ce champ est obligatoire ». After a request is sent, the two buttons sit in a wrapping `Space` (12 px gap).

## Required fields in the interface (0.5.1)

`frontend/src/validation.ts`: shared rules `texteObligatoire(t)` (text, spaces only refused) and `obligatoire(t)` (choice, number, date, password), single message « Ce champ est obligatoire » / « Dit veld is verplicht ». Fields outside a form (deactivation reasons, request description) use `seulementEspaces()` and `ErreurObligatoire.tsx`. The server still refuses on its own. `LieuPicker.tsx`: the list of buildings opens and closes (`aria-expanded`, « Masquer la liste » button).

## Work requests (0.5.0)

Migration `005_demandes`: tables `sequences` (counters per entity, type and year; year 0 for the continuous counter) and `demandes` (unique number `AC-DI-2026-00001`, place, category, description of 10 to 5,000 characters, status `a_qualifier` on creation, proposed priority, channel, requester), column `users.lieu_habituel_id`; a JavaScript step (`src/nettoyage-espaces.js`) removes extra spaces from stored texts and logs each corrected record. `nettoyer()` in `src/validation.js` trims every received string (routes and MCP), except passwords. Numbering in `services/numerotation.js`, assigned inside the saving transaction. Routes `GET`, `POST /api/demandes`, `GET /api/demandes/:id`, `PUT /api/auth/lieu-habituel`; permissions `demandes:creer` (all entity roles) and `demandes:entite` (manager, head of service). Place search ignores accents and also matches parent places' names; each row carries its path.

# Security

The French text (`docs/fr/SECURITE.md`) prevails and holds the full grid per version.

## 0.7.4 (29/10/2026)

Names of the location and category in the audit log detail (DV-50). Names are looked up when the log is read; nothing more is stored and the log itself does not change. The log stays reserved to the administrator, through the API and the MCP. Two new constant queries, identifiers passed as a single JSON parameter. No new route, migration or dependency. Proof of failure: with the 0.7.3 journal service, `journal-noms.test.js` fails (5 of 6).

## 0.7.3 (29/10/2026)

Security fix of the server dependencies, no functional change. Targeted update of the server lock file, without changing `package.json` and without `npm audit fix`: `body-parser` 1.20.9, `fast-uri` 3.1.9, `qs` 6.16.2. Server `npm audit --omit=dev`: 0 vulnerabilities (E-24, E-30 fixed). New test `dependances.test.js`: the lock file never falls below the fixed versions. Proof of failure: with the 0.7.2 lock file the new test fails.

## 0.7.2 (29/10/2026)

Release with no functional change: code ready for the public GitHub repository (licence EUPL-1.2). No new route, dependency or migration. Address, ports and folders of the acceptance host replaced by example values in every file (`192.0.2.10`, 18443, 18080, `/volume1/docker/monapp`); portability test widened to any private IPv4 address in the code; `.gitignore` completed; `.github/workflows/ci.yml` added (no secret, no deployment). Server `npm audit --omit=dev`: 1 high, 2 moderate, unchanged (E-24); the CI audit step fails until E-24 is decided (E-30). Proof of failure: a private IP address in `backend/src/config.js` makes the portability test fail.

## 0.7.1 (28/10/2026)

Fix release with no new route, dependency or migration. The draft schema accepts the place type (`nature`), as the profile returns it; any other unknown field is still refused (tested). The interface sends only the known place fields. Delivered full notice reworded (« Responsable du traitement : … »), same content. Proof of failure: schema or interface in their 0.7.0 state make the new tests fail; restored: server 289/289, interface 127/127. `npm audit` unchanged (E-24 open).

## 0.7.0 (28/10/2026)

Step 7 with migration `006_demandes_formulaire` (additions only) and eleven new routes, each with its MCP tool; no new dependency. AC and CPAS partition tested on every new route with an identifier (read and write refused from the other entity, through the API and MCP); a draft is readable by its owner only; questions writable only with `categories:gerer`, notices with `parametres:gerer`. Minimisation: no name or number in the list of open requests in the same building, « Me too » remark read by the technical service only, audit log without free text; drafts outside the audit log (E-27). Error red at least 4.5:1 (E-26 fixed). `npm audit --omit=dev` server: 1 high, 2 moderate (`body-parser`, `fast-uri` and, published since 0.5.2, `qs`); E-24 open before production. Proof of failure: removing each new check one at a time makes tests fail; restored: server 287/287, interface 127/127.

## 0.5.2 (27/10/2026)

Patch release, no new route, dependency or migration. Inputs use 16 px on small screens so the iPhone no longer zooms in on a field; pinch-zoom stays allowed (WCAG 1.4.4). An e-mail field shows a single message (required, or « Adresse e-mail non valide »); the sign-in screen checks the format before sending; the server still checks on its own. Failure proof: with the seven interface files of 0.5.1, 5 of 95 interface tests fail. `npm audit` unchanged (E-24 open, Renaud's decision). E-26 unchanged.

## 0.5.1 (26/10/2026)

Patch release, no new route, dependency or migration. Required fields are flagged in the interface before sending (spaces only included); the server still refuses. Failure proof: with the seven screen files of 0.5.0, 9 of 89 interface tests fail. `npm audit` unchanged (E-24 open, Renaud's decision). Contrast of Ant Design's error red 3.3:1 (E-26).

## 0.5.0 (26/10/2026)

New routes for requests and the usual workplace, migration `005_demandes`, no new dependency. Tested: entity partition (request, place or category of the other entity: 403, also through MCP, without consuming a number), a requester reads only their own requests, the entity list only for managers and heads of service, spaces trimmed except passwords, number assigned inside the transaction with no gap or duplicate. Failure proof for each new check. `npm audit --omit=dev`: server 1 high and 1 moderate (`body-parser`, `fast-uri`), published after 0.4.1, deviation E-24, Renaud's decision; interface 3 moderate (E-09). Details in `docs/fr/SECURITE.md`.

## 0.4.1 (23/10/2026)

Patch release, no new route, dependency or migration. New: the name of whoever modified a record is only returned to people with a role in the record's entity (otherwise the date only; tested, failure proof: 1 of 6 tests in `trace` fails without the check); authors' internal ids are no longer returned; the audit log only records changed fields (6 tests, all six fail on the 0.4.0 code); no table name interpolated into SQL. `npm audit --omit=dev`: server 0, interface 3 moderate (E-09). Details in `docs/fr/SECURITE.md`.

## 0.4.0 (22/10/2026)

Grid replayed. New: categories written only with `categories:gerer`, priorities, timetable, holidays and closures only with `delais:gerer` (head of the technical service of the active entity), for the API and the MCP; categories and non-working days partitioned by entity (403, tested); values checked against closed catalogues; due-date computation bounded (`CALENDRIER_VIDE` instead of a loop); no personal data and no dependency added; `npm audit --omit=dev` server 0, interface 3 moderate (E-09). Failure proof: without the permission checks 3 tests fail in each of `categories`, `priorites` and `calendrier`; without the entity checks 8 of 30 in `cloison`. Details in `docs/fr/SECURITE.md`.

## 0.3.1 (22/10/2026)

Content version (help, assistant, release note). No new route, dependency or migration. Grid replayed through the full test suites: compliant. `npm audit --omit=dev`: server 0, interface 3 moderate (E-09).

## 0.3.0 (22/10/2026)

Grid replayed. New: settings and modules for the administrator only; audit log readable by the administrator only; entity settings only by the head of the technical service of the active entity (partition tested); disabled module refused (403 `MODULE_DISABLED`) after the role check, for the API and the MCP; values checked against the catalogue; no new dependency; `npm audit --omit=dev` server 0, interface 3 moderate (E-09). Failure proof: without the module check 3 of 8 tests fail, without the `parametres:gerer` check 3 of 6, without the administrator restriction of the log 1 of 7. Details in `docs/fr/SECURITE.md`.

## 0.2.0 (21/10/2026)

The grid was replayed. New checks: partition of places, photos and value lists between entities, read and write, by the API and MCP (403); uploaded files checked on their first bytes, structure and dimensions, metadata stripped (EXIF, GPS position, camera, comments, PNG text blocks), real deletion of replaced or deleted photos, storage outside the web root, authenticated reading, CSRF on upload, size limit (413 by the API and by nginx). `npm audit --omit=dev`: server 0; interface 3 moderate (unchanged, E-09). Full interface audit: 12 high, 7 moderate and 1 low, all in build and test tooling (E-18). No new dependency; `multer` set aside (E-16). Failure proofs: without the entity check on places, 11 of the 21 tests in `cloison.test.js` fail; without it on value lists, 4 fail; without metadata stripping or type checking, one test in `lieux.test.js` fails each time.

## 0.1.0 (15/10/2026)

All checks of section 10.2 of the standard were run or marked not applicable (password reset and file upload do not exist yet). The three checks that may never stay "not run" (committed secrets, server-side access control, IDOR) were run. `npm audit --omit=dev`: server 0 vulnerabilities; interface 3 moderate (`react-router-dom` 6, open redirect, fixed only in version 7, a generation change forbidden without Renaud's approval), no high or critical. Failure proof of the partition tests: without the control, 3 of the 6 tests in `cloison.test.js` fail.

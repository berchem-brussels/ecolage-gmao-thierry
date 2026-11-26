# After deployment

Application version: **0.21.5** · Updated on 26/11/2026

The French text prevails. Update procedure: upload the archive, `cd <folder>`, `ls -l` the archive, `sudo bash backup.sh`, `sudo rm -rf backend frontend docs`, `sudo tar xzf … --strip-components=1`, `ls backend frontend`, `sudo docker compose build`, `sudo docker compose up -d`, `sudo docker compose ps`, `curl -sk https://localhost:<https>/api/version`, checklist from the delivery message. `.env` and the volumes are never touched.

## 0.21.5 (26/11/2026)

Feedback from the user-oriented test and the 0.21.4 acceptance test. Update through section 3, **without migration, without new dependency, without `demo.js`**. `sudo docker logs gmao-api --tail 30`: `[APP] API 0.21.5`, no `[DB] Migration` line. `sudo bash recette.sh`: 9/9, check 4 expects 0.21.5. Rollback to 0.21.4 without restoring the database.

## 0.21.4 (25/11/2026)

Fix of check 7 of the 0.21.3 acceptance test. Update through section 3, **without migration, without new dependency, without `demo.js`**. `sudo docker logs gmao-api --tail 30`: `[APP] API 0.21.4`, no `[DB] Migration` line. `sudo bash recette.sh`: 9/9, check 4 expects 0.21.4. Rollback to 0.21.3 without restoring the database.

## 0.21.3 (25/11/2026)

Fix from the specification audit. Update through section 3, **without migration, without new dependency, without `demo.js`**. `sudo docker logs gmao-api --tail 30`: `[APP] API 0.21.3`, no `[DB] Migration` line. `sudo bash recette.sh`: 9/9, check 4 expects 0.21.3. Rollback to 0.21.2 without restoring the database.

## 0.21.2 (24/11/2026)

Fix of the date fields (calendar through the icon on a PC; « Terminer la tâche » in one click). Update through section 3, **without migration, without new dependency, without `demo.js`**. `sudo docker logs gmao-api --tail 30`: `[APP] API 0.21.2`, no `[DB] Migration` line. `sudo bash recette.sh`: 9/9. Rollback to 0.21.1: same commands with its archive, without restoring the database.

## 0.21.1 (24/11/2026)

Fix of the « Terminer la tâche » window (typed time kept before sending). Update through section 3, **without migration, without new dependency, without `demo.js`**. `sudo docker logs gmao-api --tail 30`: `[APP] API 0.21.1`, no `[DB] Migration` line. `sudo bash recette.sh`: 9/9. Rollback to 0.21.0: same commands with its archive, without restoring the database.

## 0.21.0 (20/11/2026)

Weekly and daily planning, unplanned tasks, conflicts, workers' absences, actual task times, date announced to the requester; remarks from the 0.20.0 acceptance test (step 17). Update through section 3, **with migration, no new dependency**. `sudo docker logs gmao-api --tail 30`: `[DB] Migration 018_planning appliquée`, then `[APP] API 0.21.0 sur le port 3001`. No rerun of `demo.js`: the demo password stays valid. `sudo bash recette.sh`: nine `OK` lines. Rollback to 0.20.0: possible without restoring (tried), recommended with the day's backup.

## 0.20.0 (19/11/2026)

Tasks of a request, assignment, « Planned », suggested workers, filters per team and per worker; remarks from the 0.19.0 acceptance test (step 16). Update through section 3, **with migration, no new dependency**. `sudo docker logs gmao-api --tail 30`: `[DB] Migration 017_taches appliquée`, then `[APP] API 0.20.0 sur le port 3001`. No rerun of `demo.js`: the demo password stays valid. `sudo bash recette.sh`: nine `OK` lines. Rollback to 0.19.0: always with the day's backup restored.

## 0.19.0 (18/11/2026)

Teams, trades, skills, contractors; fixes from the 0.18.0 acceptance test (step 15). Update through section 3, **with migration, no new dependency**. `sudo docker logs gmao-api --tail 30`: `[DB] Migration 016_equipes_prestataires appliquée`, then `[APP] API 0.19.0`. Then reload the demonstration data (`demo.js`, new shared password), before `sudo bash recette.sh`: nine `OK` lines. Back to 0.18.0 with the backup of the day.

## 0.18.0 (18/11/2026)

Global search, Excel and CSV export, assistant, guided tour, help, usability test protocol (step 14). Update through section 3, **without migration, with a new dependency** (`exceljs`, downloaded when building the `api` image). `sudo docker logs gmao-api --tail 30`: `[APP] API 0.18.0`, no « Migration » line. `sudo bash recette.sh`: nine `OK` lines. Back to 0.17.0 without restoring the database.

## 0.17.0 (17/11/2026)

Notifications: bell, e-mail, templates, notices for requests and tickets, deadline alerts (step 13). Update through section 3, **with a migration and a new dependency**: building the `api` image downloads `nodemailer`. `sudo docker logs gmao-api --tail 30` shows `[DB] Migration 015_notifications appliquée` and `[APP] API 0.17.0 sur le port 3001`. No new run of `demo.js`. E-mail is delivered in test mode: nothing is sent. `sudo bash recette.sh`: nine `OK` lines. Back to 0.16.1 without restoring the database.

## 0.16.1 (16/11/2026)

Usual update, no migration and no new run of `demo.js`; `[APP] API 0.16.1`. Rollback to 0.16.0 without restoring the database.

## 0.16.0 (10/11/2026)

Update with the procedure in the French text, **with migration**: `sudo docker logs gmao-api --tail 30` shows `[DB] Migration 014_validation appliquée` then `[APP] API 0.16.0`. Then reload the demo data (`sudo docker compose stop api`, `sudo docker compose run --rm api node src/demo.js`, `sudo docker compose up -d`): it creates each entity's demo service (head `valideur.<entity>`) and gives a new shared password. Then `sudo bash recette.sh`: nine checks OK, check 5 reads `014_validation`, the services table and the approver transitions. Both images are rebuilt; no new dependency. Rollback to 0.15.0: always with the backup taken just before the update (0.15.0 leaves a request awaiting approval without any button).

## 0.15.0 (09/11/2026)

Update by the procedure of the French text, **with migration**: `sudo docker logs gmao-api --tail 30` shows `[DB] Migration 013_messages appliquée` then `[APP] API 0.15.0`. Then `sudo bash recette.sh`: nine checks OK, check 5 reads `013_messages` and the reply templates. Both images are rebuilt; Dockerfile, compose, `nginx.conf`, `backup.sh` and `.env` unchanged. On screen: message thread, internal note with mention, reply templates, follow and unfollow, on iPhone and Android. Rollback to 0.14.0: always restore the backup taken just before the update (0.14.0 would show internal message attachments).

## 0.14.0 (08/11/2026)

Update by the procedure of the French text, **with migration**: `sudo docker logs gmao-api --tail 30` shows `[DB] Migration 012_cycle_de_vie appliquée` then `[APP] API 0.14.0`. Then `sudo bash recette.sh`: the demonstration password is typed visibly, the line is erased on Enter and the number of characters received is shown; nine checks OK. Both images are rebuilt; Dockerfile, compose, `nginx.conf`, `backup.sh` and `.env` unchanged. Rollback to 0.13.0: 0.13.0 starts on the migrated database, but preferably restore the backup taken just before the update.

## 0.13.0 (08/11/2026)

Update without migration: `[APP] API 0.13.0` in the log. Then `sudo bash recette.sh`: nine checks OK. Rollback to 0.12.0 without restoring the database.

## 0.12.0 (06/11/2026)

Update by the procedure of the French text, **with migration**: `sudo docker logs gmao-api --tail 30` shows `[DB] Migration 011_faq appliquée` then `[APP] API 0.12.0`. Then `sudo bash recette.sh` (demonstration password typed without echo): nine checks OK. Both images are rebuilt; Dockerfile, compose, `nginx.conf`, `backup.sh` and `.env` unchanged. Rollback to 0.11.0 without restoring the database.

## 0.11.0 (05/11/2026)

Update by the procedure of the French text, **with migration**: `sudo docker logs gmao-api --tail 30` shows `[DB] Migration 010_tickets appliquée` then `[APP] API 0.11.0`. No new dependency; both images are rebuilt; Dockerfile, compose, `nginx.conf`, `backup.sh` and `.env` unchanged. Rollback to 0.10.0 without restoring the database.

## 0.10.0 (05/11/2026)

Update with migration `009_sso`; then set up Microsoft sign-in in Parameters (French text and delivery notes).

## 0.9.1 (03/11/2026)

Fix of 0.9.0 (R1, R2), no migration: `[APP] API 0.9.1 sur le port 3001` in the log. No new dependency. Check: `v0.9.1` at the bottom of the menu, dashboard counters refreshed after a qualification, state spelled out in the audit log. Rollback to 0.9.0 without restoring the database.

## 0.9.0 (02/11/2026)

Update with migration `008_qualification` (`[DB] Migration 008_qualification appliquée` in `sudo docker logs gmao-api --tail 30`). No new dependency; both images are rebuilt. The migration computes the due dates of existing requests. Check: dashboard on the manager's home page, filtered list « Demandes de l'entité », « Qualifier » on a record, group « Pièces jointes des demandes » in the entity settings. Rollback to 0.8.0 without restoring the database.

## 0.8.0 (30/10/2026)

Update with migration `007_pieces_jointes` (`[DB] Migration 007_pieces_jointes appliquée` in `sudo docker logs gmao-api --tail 30`). `docker compose build` downloads `multer` (a few extra minutes). `backup.sh` now also reports `pièces jointes copiées` or `aucune pièce jointe à copier`. Check: « Photos et documents » block in the form, attachments on the request record, group « Pièces jointes des demandes » in Entity settings. Rollback to 0.7.5 without restoring the database.

## 0.2.0 (21/10/2026)

Update with migration `002_lieux`, applied automatically at start-up (`[DB] Migration 002_lieux appliquée` in `sudo docker logs gmao-api --tail 30`). Then reload the demonstration data (`sudo docker compose stop api`, `sudo docker compose run --rm api node src/demo.js`, `sudo docker compose up -d`) and upload the photos on screen. Check: Places screen, AC tree invisible from CPAS, photo of a place, Value lists screen. `backup.sh` now also copies the photos.

## 0.1.1 (15/10/2026)

Update without migration. Check: Users and roles screen without cut-off columns. HTTPS port on NIXUS: 18443.

## 0.1.0 (15/10/2026)

First installation following `INSTALLATION.md`. No data migration.

### 0.3.0 (22/10/2026)

Update through section 3. Migration `003_parametres` is applied when `gmao-api` starts (`[DB] Migration 003_parametres appliquée` in `sudo docker logs gmao-api --tail 30`). No change to the Dockerfiles, the compose file or `.env`. Check: release note at login, local authority name corrected in Administration, Settings, Patrimoine module switched off and on, audit log, entity settings and Help, Contact.

### 0.3.1 (22/10/2026)

Update through section 3, no migration. Check: release note 0.3.1 at login, camera question (Android and iPhone) in Help, Frequently asked questions.

### 0.4.0 (22/10/2026)

Update through section 3. Migration `004_referentiel_demandes` is applied when `gmao-api` first starts (`[DB] Migration 004_referentiel_demandes appliquée` in `sudo docker logs gmao-api --tail 30`); each active entity then receives the shipped categories, priorities, timetable and holidays. No change to the Dockerfiles, the compose file or `.env`. Check: release note 0.4.0 at login, Service settings, Categories and periods with a head of the technical service, Friday of the AC until 12:00, simulator. Rollback to 0.3.1 without restoring the database.

### 0.4.1 (23/10/2026)

Update through section 3, no migration: `sudo docker logs gmao-api --tail 30` only shows `[APP] API 0.4.1 sur le port 3001`. No change to the Dockerfiles, the compose file or `.env`. Check: release note 0.4.1 at login with a head of the technical service, simulator with the period under the time (1280 px and phone), "Modified on … by …" or "Shipped value" on a category, a priority, a day of the timetable, a holiday and a closure, audit log of a change limited to the changed fields. Rollback to 0.4.0 without restoring the database.

### 0.5.0 (26/10/2026)

Update through section 3. Migration `005_demandes` is applied when `gmao-api` first starts: tables `sequences` and `demandes`, column `lieu_habituel_id` on accounts, then leading and trailing spaces removed from labels, names, codes and addresses already stored (`[DB] Espaces retirés sur N fiche(s)` and `[DB] Migration 005_demandes appliquée` in `sudo docker logs gmao-api --tail 30`). No change to the Dockerfiles, the compose file or `.env`. Check: `agent.ac` home page, a request submitted in under a minute with number `AC-DI-2026-00001`, « My requests », « Requests of the entity » for `gestionnaire.ac` and `responsable.cpas` (empty), Numbering block in Entity settings. Rollback to 0.4.1 without restoring the database.

### 0.5.1 (26/10/2026)

Patch release after the 26/10/2026 acceptance test, no migration: `sudo docker logs gmao-api --tail 30` only shows `[APP] API 0.5.1 sur le port 3001`. Dockerfiles, compose and `.env` unchanged. Check: release note at sign-in (two lines, for everyone); in « Changer de lieu », the list of buildings opens and closes with « Parcourir la liste des bâtiments » and « Masquer la liste »; « Mes demandes » without its own « Nouvelle demande » button; « Ce champ est obligatoire » under a required field containing only spaces. Rollback to 0.5.0 without restoring the database.

### 0.5.2 (27/10/2026)

Patch release after the 27/10/2026 acceptance test, no migration: `sudo docker logs gmao-api --tail 30` only shows `[APP] API 0.5.2 sur le port 3001`. Dockerfiles, compose and `.env` unchanged. Check: release note at sign-in (two lines, for everyone); after a request is sent on a phone, a gap between « Mes demandes » and « Faire une autre demande »; on an iPhone, touching a field no longer zooms the page and pinch-zoom still works; an e-mail field left empty shows only « Ce champ est obligatoire », a malformed address shows « Adresse e-mail non valide ». Rollback to 0.5.1 without restoring the database.

### 0.7.0 (28/10/2026)

Step 7, update through section 3. Migration `006_demandes_formulaire` at the first start of `gmao-api`: `sudo docker logs gmao-api --tail 30` shows `[DB] Migration 006_demandes_formulaire appliquée` then `[APP] API 0.7.0 sur le port 3001`. Dockerfiles, compose and `.env` unchanged. Check: release note at login (three lines for everyone, five for the manager); form with « Danger », open requests in the same building and « Me too », category questions, « For someone else? », date or time slot, resumed draft, notice and « Learn more »; questions in Categories and deadlines; group « Protection des données » in Entity settings. After the update, each manager sets the emergency number and the DPO contact. Rollback to 0.5.2: reinstall 0.5.2 and restore the backup taken just before the update; requests made under 0.7.0 are then lost.

### 0.7.1 (28/10/2026)

Fix from the 0.7.0 acceptance test, no migration: `sudo docker logs gmao-api --tail 30` shows only `[APP] API 0.7.1 sur le port 3001`. Dockerfile, compose and `.env` unchanged. Check: 0.7.1 release note at login (one line for everyone, two for the manager); in « Nouvelle demande », keeping the proposed place, « Brouillon enregistré à … » appears under the send button as soon as the description is typed; « En savoir plus » starts with « Responsable du traitement : » and the entity name. Rollback to 0.7.0 without restoring the database.

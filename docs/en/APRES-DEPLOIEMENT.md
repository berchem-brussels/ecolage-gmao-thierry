# After deployment

The French text prevails. Update procedure: upload the archive, `cd <folder>`, `ls -l` the archive, `sudo bash backup.sh`, `sudo rm -rf backend frontend docs`, `sudo tar xzf … --strip-components=1`, `ls backend frontend`, `sudo docker compose build`, `sudo docker compose up -d`, `sudo docker compose ps`, `curl -sk https://localhost:<https>/api/version`, checklist from the delivery message. `.env` and the volumes are never touched.

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

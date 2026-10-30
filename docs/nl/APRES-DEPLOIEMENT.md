# Na de uitrol

De Franse tekst is rechtsgeldig. Bijwerkingsprocedure: archief plaatsen, `cd <map>`, `ls -l` van het archief, `sudo bash backup.sh`, `sudo rm -rf backend frontend docs`, `sudo tar xzf … --strip-components=1`, `ls backend frontend`, `sudo docker compose build`, `sudo docker compose up -d`, `sudo docker compose ps`, `curl -sk https://localhost:<https>/api/version`, controlelijst van het leveringsbericht. `.env` en de volumes worden nooit aangeraakt.

## 0.8.0 (30/10/2026)

Bijwerking met migratie `007_pieces_jointes` (`[DB] Migration 007_pieces_jointes appliquée` in `sudo docker logs gmao-api --tail 30`). `docker compose build` downloadt `multer` (enkele minuten extra). `backup.sh` meldt nu ook `pièces jointes copiées` of `aucune pièce jointe à copier`. Controle: blok « Foto's en documenten » in het formulier, bijlagen op de fiche, groep « Bijlagen bij aanvragen » in Instellingen van de entiteit. Terugkeer naar 0.7.5 zonder de databank terug te zetten.

## 0.2.0 (21/10/2026)

Bijwerking met migratie `002_lieux`, automatisch toegepast bij het starten (`[DB] Migration 002_lieux appliquée` in `sudo docker logs gmao-api --tail 30`). Daarna de demonstratiegegevens opnieuw laden (`sudo docker compose stop api`, `sudo docker compose run --rm api node src/demo.js`, `sudo docker compose up -d`) en de foto's op het scherm opladen. Controle: scherm Patrimonium, boom van AC onzichtbaar vanuit OCMW, foto van een plaats, scherm Waardelijsten. `backup.sh` kopieert nu ook de foto's.

## 0.1.1 (15/10/2026)

Bijwerking zonder migratie. Controle: scherm Gebruikers en rollen zonder afgesneden kolommen. HTTPS-poort op NIXUS: 18443.

## 0.1.0 (15/10/2026)

Eerste installatie volgens `INSTALLATION.md`. Geen gegevensmigratie.

### 0.3.0 (22/10/2026)

Update volgens sectie 3. Migratie `003_parametres` wordt bij het starten van `gmao-api` toegepast (`[DB] Migration 003_parametres appliquée` in `sudo docker logs gmao-api --tail 30`). Geen wijziging aan de Dockerfiles, de compose of `.env`. Controle: versienota bij het aanmelden, naam van het lokaal bestuur verbeterd via Beheer, Parameters, module Patrimonium uit- en weer ingeschakeld, auditlogboek, Instellingen van de entiteit en Help, Contact.

### 0.3.1 (22/10/2026)

Update volgens sectie 3, zonder migratie. Controle: versienota 0.3.1 bij het aanmelden, vraag over de camera (Android en iPhone) in Help, Veelgestelde vragen.

### 0.4.0 (22/10/2026)

Update volgens sectie 3. Migratie `004_referentiel_demandes` wordt toegepast bij de eerste start van `gmao-api` (`[DB] Migration 004_referentiel_demandes appliquée` in `sudo docker logs gmao-api --tail 30`); elke actieve entiteit krijgt dan de geleverde categorieën, prioriteiten, het uurrooster en de verlofdagen. Geen wijziging aan de Dockerfiles, het compose-bestand of `.env`. Controle: versienota 0.4.0 bij het aanmelden, Instellingen van de dienst, Categorieën en termijnen met een verantwoordelijke van de technische dienst, vrijdag van het AC tot 12:00, simulator. Terugkeer naar 0.3.1 zonder de databank te herstellen.

### 0.4.1 (23/10/2026)

Update volgens sectie 3, zonder migratie: `sudo docker logs gmao-api --tail 30` toont alleen `[APP] API 0.4.1 sur le port 3001`. Geen wijziging aan de Dockerfiles, het compose-bestand of `.env`. Controle: versienota 0.4.1 bij het aanmelden met een verantwoordelijke, simulator met de termijn onder het uur (1280 px en telefoon), vermelding « Gewijzigd op … door … » of « Geleverde waarde » op een categorie, een prioriteit, een dag van het uurrooster, een verlofdag en een sluiting, auditlogboek van een wijziging beperkt tot de gewijzigde velden. Terugkeer naar 0.4.0 zonder de databank te herstellen.

### 0.5.0 (26/10/2026)

Update volgens sectie 3. Migratie `005_demandes` wordt toegepast bij de eerste start van `gmao-api`: tabellen `sequences` en `demandes`, kolom `lieu_habituel_id` van de accounts, en overtollige spaties vooraan en achteraan in de reeds opgeslagen labels, namen, codes en adressen worden verwijderd (`[DB] Espaces retirés sur N fiche(s)` en `[DB] Migration 005_demandes appliquée` in `sudo docker logs gmao-api --tail 30`). Geen wijziging aan de Dockerfiles, het compose-bestand of `.env`. Controle: startpagina van `agent.ac`, een aanvraag indienen in minder dan een minuut met nummer `AC-DI-2026-00001`, « Mijn aanvragen », « Aanvragen van de entiteit » van `gestionnaire.ac` en `responsable.cpas` (leeg), blok Nummering in Instellingen van de entiteit. Terugkeer naar 0.4.1 zonder de databank te herstellen.

### 0.5.1 (26/10/2026)

Correctieversie na de test van 26/10/2026, zonder migratie: `sudo docker logs gmao-api --tail 30` toont alleen `[APP] API 0.5.1 sur le port 3001`. Dockerfile, compose en `.env` ongewijzigd. Controle: versienota bij het aanmelden (twee regels, voor iedereen); in « Andere plaats » gaat de lijst van de gebouwen open en dicht met « De lijst van de gebouwen doorlopen » en « Lijst verbergen »; « Mijn aanvragen » zonder eigen knop « Nieuwe aanvraag »; « Dit veld is verplicht » onder een verplicht veld met alleen spaties. Terug naar 0.5.0 zonder de databank te herstellen.

### 0.5.2 (27/10/2026)

Correctieversie na de test van 27/10/2026, zonder migratie: `sudo docker logs gmao-api --tail 30` toont alleen `[APP] API 0.5.2 sur le port 3001`. Dockerfile, compose en `.env` ongewijzigd. Controle: versienota bij het aanmelden (twee regels, voor iedereen); na het verzenden van een aanvraag op een telefoon ruimte tussen « Mijn aanvragen » en « Nog een aanvraag indienen »; op een iPhone wordt de pagina niet meer groter bij het aanraken van een veld en zoomen met twee vingers werkt nog; een leeg e-mailveld toont alleen « Dit veld is verplicht », een verkeerd adres « Ongeldig e-mailadres ». Terug naar 0.5.1 zonder de databank te herstellen.

### 0.7.0 (28/10/2026)

Stap 7, update volgens sectie 3. Migratie `006_demandes_formulaire` bij de eerste start van `gmao-api`: `sudo docker logs gmao-api --tail 30` toont `[DB] Migration 006_demandes_formulaire appliquée` en daarna `[APP] API 0.7.0 sur le port 3001`. Dockerfile, compose en `.env` ongewijzigd. Controle: versienota bij het aanmelden (drie regels voor iedereen, vijf voor de verantwoordelijke); formulier met « Gevaar », open aanvragen van hetzelfde gebouw en « Ik ook », vragen van de categorie, « Voor iemand anders? », datum of moment, hervat ontwerp, vermelding en « Meer weten »; vragen in Categorieën en termijnen; groep « Gegevensbescherming » in Instellingen van de entiteit. Na de update stelt elke verantwoordelijke het noodnummer en het contact van de DPO in. Terugkeer naar 0.5.2: 0.5.2 opnieuw installeren en de back-up van vlak vóór de update terugzetten; aanvragen van 0.7.0 gaan dan verloren.

### 0.7.1 (28/10/2026)

Correctie na de test van 0.7.0, zonder migratie: `sudo docker logs gmao-api --tail 30` toont alleen `[APP] API 0.7.1 sur le port 3001`. Dockerfile, compose en `.env` ongewijzigd. Controle: versienota bij het aanmelden (één regel voor iedereen, twee voor de verantwoordelijke); in « Nieuwe aanvraag », zonder de voorgestelde plaats te wijzigen, verschijnt « Ontwerp bewaard om … » onder de verzendknop zodra de beschrijving getypt wordt; « Meer weten » begint met « Verwerkingsverantwoordelijke: » en de naam van de entiteit. Terug naar 0.7.0 zonder de databank te herstellen.

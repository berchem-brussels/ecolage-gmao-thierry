# Installatie

Versie 0.1.0 · De Franse tekst is rechtsgeldig.

1. Maak de map van de toepassing aan (Synology: File Station, gedeelde map `docker`, map `gmao`) en plaats er het archief `gmao-vX_Y_Z.tar.gz` in.
2. In SSH: `cd <map>`.
3. `sudo tar xzf gmao-vX_Y_Z.tar.gz --strip-components=1`.
4. `sudo sh verifier-ports.sh <https> <http>`: `LIBRE` voor elke poort.
5. `.env` één keer aanmaken met gegenereerde geheimen (commando in `docs/fr/INSTALLATION.md`, stap 5). `DEMO_ALLOWED` is `1` enkel op een acceptatie-installatie.
6. `sudo chmod 600 .env`
7. `sudo docker compose build`
8. `sudo docker compose up -d`
9. `sudo docker compose ps`: `gmao-api` en `gmao-web` in `Up (healthy)`.
10. `curl -sk https://localhost:<https>/api/version`: de versie in de envelop.
11. Open `https://<adres>:<https>`: de installatiewizard vraagt de naam van het lokaal bestuur in FR en NL, de eerste entiteit en de eerste beheerder.
12. Dagelijkse back-up: geplande taak (DSM, gebruiker `root`, elke dag om 02:00, `bash <map>/backup.sh`).

Demonstratieaccounts (enkel acceptatie, met `DEMO_ALLOWED=1`): `sudo docker compose stop api`, dan `sudo docker compose run --rm api node src/demo.js`, dan `sudo docker compose up -d`.

Vanaf versie 0.3.0 vraagt de installatiewizard ook de standaardtaal en de modules die worden ingeschakeld.

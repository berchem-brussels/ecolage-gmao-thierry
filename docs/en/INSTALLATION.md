# Installation

Version 0.1.0 · The French text prevails.

1. Create the application folder (Synology: File Station, shared folder `docker`, folder `gmao`) and upload `gmao-vX_Y_Z.tar.gz`.
2. Over SSH: `cd <folder>`.
3. `sudo tar xzf gmao-vX_Y_Z.tar.gz --strip-components=1`.
4. `sudo sh verifier-ports.sh <https> <http>`: `LIBRE` for each port.
5. Create `.env` once with generated secrets (command in `docs/fr/INSTALLATION.md`, step 5). `DEMO_ALLOWED` is `1` on an acceptance installation only.
6. `sudo chmod 600 .env`
7. `sudo docker compose build`
8. `sudo docker compose up -d`
9. `sudo docker compose ps`: `gmao-api` and `gmao-web` `Up (healthy)`.
10. `curl -sk https://localhost:<https>/api/version`: the version in the envelope.
11. Open `https://<address>:<https>`: the installation wizard asks for the local authority name in FR and NL, the first entity and the first administrator.
12. Daily backup: host scheduled task (DSM, user `root`, every day at 02:00, `bash <folder>/backup.sh`).

Demo accounts (acceptance only, with `DEMO_ALLOWED=1`): `sudo docker compose stop api`, then `sudo docker compose run --rm api node src/demo.js`, then `sudo docker compose up -d`.

Since version 0.3.0 the installation wizard also asks for the default language and the modules to enable.

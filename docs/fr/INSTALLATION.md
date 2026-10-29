# Installation

Version 0.1.0 · Le français fait foi. Du serveur vide au premier écran, pour tout hôte Docker Compose. Les notes de livraison donnent les mêmes commandes avec les valeurs de NIXUS.

## Prérequis

Docker Engine avec Compose et BuildKit, accès SSH avec `sudo`, deux ports libres (HTTPS et HTTP), `openssl` sur l'hôte.

## Étapes

1. Créer le dossier de l'application (sur un NAS Synology : File Station, dossier partagé `docker`, dossier `gmao`) et y déposer l'archive `gmao-vX_Y_Z.tar.gz`.
2. En SSH, se placer dans ce dossier : `cd <dossier>`.
3. Extraire : `sudo tar xzf gmao-vX_Y_Z.tar.gz --strip-components=1`. Attendu à `ls` : `backend`, `frontend`, `docs`, `docker-compose.yml`, `backup.sh`, `verifier-ports.sh` et les fichiers de suivi.
4. Vérifier les ports : `sudo sh verifier-ports.sh <https> <http>`. Attendu : `LIBRE` pour chacun. Un port occupé se remplace par un autre, vérifié de la même façon.
5. Créer le `.env` une seule fois, secrets générés par la commande :

```bash
printf 'APP_NAME=%s\nHTTPS_PORT=%s\nHTTP_PORT=%s\nPUBLIC_HOST=%s\nDEMO_ALLOWED=%s\nJWT_SECRET=%s\nCONFIG_ENC_KEY=%s\n' gmao <https> <http> <adresse> 0 "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" | sudo tee .env > /dev/null
```

`DEMO_ALLOWED` vaut `1` sur une installation d'acceptance qui reçoit les comptes de démonstration, `0` partout ailleurs.

6. `sudo chmod 600 .env`
7. `sudo docker compose build`
8. `sudo docker compose up -d`
9. `sudo docker compose ps` : après une minute, `gmao-api` et `gmao-web` en `Up (healthy)`.
10. `curl -sk https://localhost:<https>/api/version` : `{"data":{"version":"X.Y.Z"},"meta":{"envelope":1,"version":"X.Y.Z"}}`.
11. Ouvrir `https://<adresse>:<https>` : l'assistant d'installation demande le nom du pouvoir local en FR et NL, la première entité (code court, nom FR et NL), depuis la 0.3.0 la langue par défaut et les modules à activer, puis le premier administrateur. Les autres entités se créent ensuite dans Administration, Entités ; les paramètres et les modules se changent dans Administration, Paramètres.
12. Sauvegarde quotidienne : tâche planifiée de l'hôte (DSM : Panneau de configuration, Planificateur de tâches, utilisateur `root`, chaque jour à 02:00, script `bash <dossier>/backup.sh`, courriel en cas d'échec).

## Comptes de démonstration (acceptance seulement)

Avec `DEMO_ALLOWED=1` et après l'étape 11 :

1. `sudo docker compose stop api`
2. `sudo docker compose run --rm api node src/demo.js` : liste des comptes et mot de passe commun, affiché une seule fois.
3. `sudo docker compose up -d`

`sudo docker compose run --rm api node src/demo.js --retirer` désactive ces comptes (même encadrement par `stop` et `up -d`).

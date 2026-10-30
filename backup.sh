#!/bin/sh
# Sauvegarde quotidienne (patron SAGA backup.sh ; standard v3.2, section 15.6), à lancer par une tâche DSM à 02:00 :
#   bash /volume1/docker/NOM/backup.sh
# Lit APP_NAME dans le .env voisin ; garde 30 jours de sauvegardes.
# Copie la base et, depuis la version 0.2.0, les photos des lieux (dossier /app/data/photos du conteneur de l'API) ;
# depuis la version 0.8.0, les pièces jointes des demandes (dossier /app/data/pieces).
set -e
cd "$(dirname "$0")"
APP_NAME=$(grep '^APP_NAME=' .env | cut -d= -f2)
BACKUP_DIR="${BACKUP_DIR:-/volume1/backups/$APP_NAME}"
KEEP_DAYS=30
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$BACKUP_DIR"
docker cp "$APP_NAME-api:/app/data/app.db" "$BACKUP_DIR/$APP_NAME-$STAMP.db"
if docker exec "$APP_NAME-api" test -d /app/data/photos; then
  docker cp "$APP_NAME-api:/app/data/photos" - | gzip > "$BACKUP_DIR/$APP_NAME-photos-$STAMP.tar.gz"
  PHOTOS="photos copiées"
else
  PHOTOS="aucune photo à copier"
fi
if docker exec "$APP_NAME-api" test -d /app/data/pieces; then
  docker cp "$APP_NAME-api:/app/data/pieces" - | gzip > "$BACKUP_DIR/$APP_NAME-pieces-$STAMP.tar.gz"
  PIECES="pièces jointes copiées"
else
  PIECES="aucune pièce jointe à copier"
fi
find "$BACKUP_DIR" -name "$APP_NAME-*.db" -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name "$APP_NAME-photos-*.tar.gz" -mtime +"$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name "$APP_NAME-pieces-*.tar.gz" -mtime +"$KEEP_DAYS" -delete
echo "[$APP_NAME] $(date) : sauvegarde terminée ($PHOTOS, $PIECES), $(ls -1 "$BACKUP_DIR"/"$APP_NAME"-*.db | wc -l) sauvegardes de la base conservées."

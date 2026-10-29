#!/bin/sh
# Certificat auto-signé créé au premier démarrage s'il manque (patron SAGA), pour l'adresse de PUBLIC_HOST.
# Un certificat signé déposé dans le volume ssl-certs (app.crt, app.key) le remplace.
set -e
: "${HTTPS_PORT:?HTTPS_PORT manquant}"
: "${PUBLIC_HOST:?PUBLIC_HOST manquant}"
if [ ! -f /etc/nginx/ssl/app.crt ]; then
  mkdir -p /etc/nginx/ssl
  case "$PUBLIC_HOST" in
    *[!0-9.]*) SAN="DNS:$PUBLIC_HOST" ;;
    *) SAN="IP:$PUBLIC_HOST" ;;
  esac
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/app.key -out /etc/nginx/ssl/app.crt \
    -subj "/CN=$PUBLIC_HOST" -addext "subjectAltName=$SAN" 2>/dev/null
  echo "[APP] Certificat auto-signé créé pour $PUBLIC_HOST"
fi
envsubst '${HTTPS_PORT}' < /etc/nginx/app.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'

#!/bin/sh
# Vérifie que des ports sont libres sur l'hôte avant d'installer une application.
# Usage : sudo sh verifier-ports.sh 18443 18080
# Contrôle les ports publiés par les conteneurs Docker et les ports écoutés par l'hôte.
# Code de sortie 0 si tous sont libres, 1 sinon.
if [ "$#" -eq 0 ]; then echo "Usage : sudo sh verifier-ports.sh PORT [PORT...]"; exit 2; fi
if command -v netstat >/dev/null 2>&1; then LISTEN="netstat -tln"
elif command -v ss >/dev/null 2>&1; then LISTEN="ss -tln"
else LISTEN=""; echo "Attention : ni netstat ni ss, seuls les conteneurs Docker sont contrôlés."; fi
status=0
for p in "$@"; do
  used=""
  if docker ps --format '{{.Names}} {{.Ports}}' | grep -Eq "[:]$p->"; then
    used="publié par $(docker ps --format '{{.Names}} {{.Ports}}' | grep -E "[:]$p->" | cut -d' ' -f1 | tr '\n' ' ')"
  elif [ -n "$LISTEN" ] && $LISTEN 2>/dev/null | grep -Eq "[:.]$p[[:space:]]"; then
    used="écouté par un service de l'hôte"
  fi
  if [ -n "$used" ]; then echo "Port $p : OCCUPÉ ($used)"; status=1; else echo "Port $p : LIBRE"; fi
done
exit $status

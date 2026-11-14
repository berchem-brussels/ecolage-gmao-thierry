#!/bin/bash
# Contrôles automatiques après installation (0.12.0, DV-110 ; 0.14.0 : saisie visible DV-117 ; 0.15.0 : migration 013_messages ; 0.16.0 : migration 014_validation), à lancer dans la session SSH du NAS, dans le dossier
# de l'application :   sudo bash recette.sh            (compte de démonstration multi-entites@demo.invalid)
#                      sudo bash recette.sh <adresse>  (un autre compte de démonstration qui a un rôle dans deux entités)
# Le mot de passe de démonstration est demandé et reste visible pendant la saisie (0.14.0, DV-117) ; la ligne est effacée
# dès Entrée, puis seul le nombre de caractères reçus s'affiche. Il n'est ni écrit, ni gardé, ni recopié dans la sortie
# à coller dans la conversation.
# Lecture seule pour les données : rien n'est créé, modifié ni supprimé ; la connexion du compte laisse sa ligne
# ordinaire au journal d'audit (contrôle 9). Une ligne OK ou ECHEC par contrôle, puis le bilan ; on colle la sortie
# dans la conversation.
set -u
cd "$(dirname "$0")"
APP_NAME=$(grep '^APP_NAME=' .env | cut -d= -f2)
HTTPS_PORT=$(grep '^HTTPS_PORT=' .env | cut -d= -f2)
VERSION=$(grep -m1 '"version"' backend/package.json | sed 's/.*"version": *"\([^"]*\)".*/\1/')
ADRESSE="${1:-multi-entites@demo.invalid}"
BASE="${RECETTE_BASE:-https://localhost:${HTTPS_PORT}}"
OK=0; KO=0
note() { if [ "$1" = 0 ]; then echo "OK     $2"; OK=$((OK+1)); else echo "ECHEC  $2"; KO=$((KO+1)); fi; }

echo "[$APP_NAME] recette automatique de la version $VERSION ($(date '+%d/%m/%Y %H:%M'))"

# 1. Les deux conteneurs en bonne santé.
SANTE_API=$(docker inspect -f '{{.State.Health.Status}}' "$APP_NAME-api" 2>/dev/null)
SANTE_WEB=$(docker inspect -f '{{.State.Health.Status}}' "$APP_NAME-web" 2>/dev/null)
[ "$SANTE_API" = healthy ] && [ "$SANTE_WEB" = healthy ]; note $? "1. conteneurs $APP_NAME-api et $APP_NAME-web : $SANTE_API, $SANTE_WEB"

# 2. L'écran du mode d'emploi est servi par l'application (et non un dossier), en HTTPS.
CODE_HELP=$(curl -sk -o /tmp/recette-help.html -w '%{http_code} %{content_type}' "$BASE/help")
echo "$CODE_HELP" | grep -q '^200 text/html' && grep -q '<div id="root">' /tmp/recette-help.html; note $? "2. écran /help servi par l'application ($CODE_HELP)"
rm -f /tmp/recette-help.html

# 3. Les captures de l'aide sont servies, en français et en néerlandais.
C_FR=$(curl -sk -o /dev/null -w '%{http_code} %{content_type}' "$BASE/aide-captures/fr/accueil-overview.jpg")
C_NL=$(curl -sk -o /dev/null -w '%{http_code} %{content_type}' "$BASE/aide-captures/nl/accueil-overview.jpg")
[ "$C_FR" = "200 image/jpeg" ] && [ "$C_NL" = "200 image/jpeg" ]; note $? "3. captures de l'aide servies (fr : $C_FR ; nl : $C_NL)"

# 4 à 9. Contrôles du serveur, dans le conteneur de l'API (version, migration, refus, cloison, journal).
echo "Compte de démonstration : $ADRESSE (le mot de passe reste visible pendant la saisie, la ligne s'efface à Entrée)"
# Invite courte : la ligne saisie tient sur une ligne du terminal, que la commande suivante efface.
read -r -p "Mot de passe : " MDP
MDP="${MDP%$'\r'}"
# Efface la ligne saisie (le mot de passe ne reste ni à l'écran ni dans la sortie à coller), puis dit ce qui est reçu.
printf '\033[1A\033[2K\r'
echo "Mot de passe reçu : ${#MDP} caractère(s)."
if [ -z "$MDP" ]; then echo "Aucun mot de passe reçu : relancez sudo bash recette.sh et tapez-le avant Entrée."; fi
SORTIE=$(printf '%s\n' "$MDP" | docker exec -i "$APP_NAME-api" node src/recette-api.js "$VERSION" "$ADRESSE")
unset MDP
echo "$SORTIE" | grep -v '^SERVEUR '
OK=$((OK + $(echo "$SORTIE" | grep -c '^OK')))
KO=$((KO + $(echo "$SORTIE" | grep -c '^ECHEC')))

echo "BILAN : $OK contrôle(s) OK, $KO en échec."
[ "$KO" = 0 ]

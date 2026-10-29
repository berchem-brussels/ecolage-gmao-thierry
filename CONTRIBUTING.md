# Contribuer et réutiliser

## Installer pour un autre pouvoir local

Rien de propre à un pouvoir local n'est écrit dans le code. Le nom du pouvoir local et la première entité se donnent dans l'assistant d'installation ; les autres entités se créent dans Administration, Entités. Les couleurs par défaut sont dans `backend/config/instance.defaut.json`. La procédure complète est dans `docs/fr/INSTALLATION.md`.

## Règles

Le stack est fermé (section 4 de `STANDARD.md`) : aucune brique ajoutée sans accord écrit. SQL écrit à la main par la couche `prepare()`, Ant Design 5 seul, dictionnaire FR et NL maison, une fonction de service par opération appelée par la route et par l'outil MCP.

## Tests

Toutes les suites passent avant une proposition de fusion : `npm test` dans `backend` et `frontend`, `npm run build` et `npm run a11y` dans `frontend`. GitHub Actions les rejoue (`.github/workflows/ci.yml`, travail `tests`) ; la branche `main` n'accepte qu'une fusion au vert. Un test de sécurité ne se retire jamais.

## Ce qui n'entre jamais dans le dépôt

`.env` et secrets, bases et sauvegardes (`data/`, `*.db`), données réelles de personnes, `node_modules` et `dist/` (`.gitignore`), adresse, ports et dossiers réels des serveurs (valeurs d'exemple `192.0.2.10` et `monapp` dans la documentation).

## Licence

EUPL-1.2 (`LICENCE`).

# Notes de livraison 0.1.0

15/10/2026 · GMAO communale · Étape 1 du planning (lot L0)

## Périmètre

Livré : socle repris du gabarit 1.1.0 ; entités en données avec l'écran Entités ; assistant d'installation qui demande le nom du pouvoir local et la première entité ; onze rôles déclarés dans `backend/config/roles.json` ; rôles par entité avec l'écran Utilisateurs et rôles ; rôle de demandeur d'office ; entité active choisie dans l'en-tête et contrôlée par le serveur ; accueil avec l'entité active, les rôles et les personnes de l'entité ; outils MCP de ces ressources ; commande de comptes de démonstration fictifs.

Pas livré : référentiel des lieux (0.2.0), modules et paramètres (0.3.0), tout le contenu métier, SSO, PostgreSQL.

Défauts corrigés : aucun (première version). Écarts au gabarit corrigés : E-02 à E-04 de `ECARTS-CDC.md`.

## Commandes NIXUS (première installation)

Dans File Station : créer le dossier `gmao` dans le dossier partagé `docker`, puis y téléverser `gmao-v0_1_0.tar.gz`. Ensuite en SSH, une commande à la fois.

```bash
ssh admin@192.0.2.10
```

```bash
cd /volume1/docker/monapp
```

```bash
sudo tar xzf gmao-v0_1_0.tar.gz --strip-components=1
```

```bash
ls
```

Attendu : `backend`, `frontend`, `docs`, `docker-compose.yml`, `backup.sh`, `verifier-ports.sh`, l'archive elle-même et les fichiers de suivi (`README`, `CHANGELOG`, `MANIFESTE`, `ETAT`, `ECARTS-CDC`, `NOTES_LIVRAISON_v0.1.0`, `STANDARD`, `LICENCE`, `CONTRIBUTING`).

```bash
sudo sh verifier-ports.sh 18444 18080
```

Attendu : `Port 18444 : LIBRE` et `Port 18080 : LIBRE`. Si un port est occupé, s'arrêter et me donner la sortie : rien n'a encore été créé.

```bash
printf 'APP_NAME=%s\nHTTPS_PORT=%s\nHTTP_PORT=%s\nPUBLIC_HOST=%s\nDEMO_ALLOWED=%s\nJWT_SECRET=%s\nCONFIG_ENC_KEY=%s\n' gmao 18444 18080 192.0.2.10 1 "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" | sudo tee .env > /dev/null
```

Attendu : aucune sortie.

```bash
sudo chmod 600 .env
```

```bash
sudo docker compose build
```

Attendu : `Image gmao-api Built` et `Image gmao-web Built`. Le serveur installe ses dépendances (une à deux minutes) ; l'interface est déjà construite et seulement copiée.

```bash
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```bash
sudo docker compose ps
```

Attendu, après une minute : `gmao-api` et `gmao-web` en `Up (healthy)`.

```bash
curl -sk https://localhost:18444/api/version
```

Attendu : `{"data":{"version":"0.1.0"},"meta":{"envelope":1,"version":"0.1.0"}}`

```bash
sudo docker compose exec api id -u
```

Attendu : `10001`.

Ouvrir ensuite `https://192.0.2.10:18444` (accepter le certificat auto-signé). L'assistant d'installation demande le nom du pouvoir local en français et en néerlandais, la première entité et le premier administrateur. Suggestion pour la première entité : code `AC`, « Administration communale », « Gemeentebestuur ». Créer ensuite la seconde entité dans Administration, Entités : code `CPAS`, « Centre public d'action sociale », « Openbaar centrum voor maatschappelijk welzijn ».

Comptes de démonstration, après la création des deux entités :

```bash
sudo docker compose stop api
```

Attendu : `Container gmao-api Stopped`.

```bash
sudo docker compose run --rm api node src/demo.js
```

Attendu : `[DEMO] 21 comptes de démonstration prêts.`, la liste des adresses en `@demo.invalid` puis le mot de passe commun, affiché une seule fois. Le noter pour l'atelier. Relancer la commande donne un nouveau mot de passe.

```bash
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy`.

Tâche de sauvegarde dans DSM : Panneau de configuration, Planificateur de tâches, Créer, Tâche planifiée, Script défini par l'utilisateur ; utilisateur `root` ; chaque jour à 02:00 ; script `bash /volume1/docker/monapp/backup.sh` ; courriel en cas d'échec. Contrôle immédiat :

```bash
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée, 1 sauvegardes conservées.`

## Liste de contrôle à l'écran

1. La page de connexion porte le nom « Gestion technique » et le nom du pouvoir local saisi, aux couleurs de l'institution ; le sélecteur Français ou Nederlands change la page.
2. L'administrateur voit l'accueil avec l'entité AC et le seul rôle « Demandeur » ; le menu montre Administration, Entités et Utilisateurs et rôles.
3. Entités : AC et CPAS listées ; un code en minuscules est mis en majuscules ; la désactivation demande un motif.
4. Utilisateurs et rôles : les comptes de démonstration portent le marqueur « Démonstration » ; la recherche « multi » trouve le compte Plusieurs entités.
5. Bouton « Rôles » d'un compte : une carte par entité, le rôle Demandeur de l'entité de rattachement grisé ; cocher « Lecteur » au CPAS puis enregistrer ajoute « CPAS · Lecteur » dans la ligne.
6. Se connecter avec `multi-entites@demo.invalid` : l'en-tête montre AC et CPAS en boutons ; cliquer sur CPAS change l'accueil, les rôles et la liste des personnes, qui ne contient plus que des comptes du CPAS.
7. Se connecter avec `gestionnaire.ac@demo.invalid` : la liste des personnes ne contient aucun compte du CPAS.
8. Se connecter avec `agent.cpas@demo.invalid` : l'accueil ne montre pas la liste des personnes ; le menu n'a pas d'Administration.
9. Passer en NL : menus, accueil, rôles (« Technisch beheerder »), aide et chatbot en néerlandais.
10. Sur un téléphone : menu en tiroir, sélecteur d'entité visible, bascule Simple ou Complet dans le menu de la personne, aucun défilement horizontal.
11. Thème sombre : lisible sur l'accueil et les deux écrans d'administration.
12. Aide : rubrique « Entité active » pour tous, « Entités » et « Utilisateurs et rôles » pour l'administrateur ; trois questions de FAQ ; le chatbot répond à « changer d'entité ».

## Questions RGPD

| Question | Réponse |
| --- | --- |
| Nouvelles données personnelles | Comptes des agents : nom, prénom, adresse professionnelle, langue, entité de rattachement, rôles ; journal d'audit des connexions et des changements. Comptes de démonstration fictifs, sans personne réelle. |
| Nouvelle finalité | Gestion des accès à la GMAO. |
| Nouveau destinataire | Aucun. Aucun appel sortant. |

Le registre, les durées et l'analyse d'impact sont menés en parallèle (instructions du projet) ; les durées des comptes sont à fixer avec D-09.

## Simulé ou incomplet

- Rien n'est simulé.
- Les comptes de démonstration sont fictifs et marqués ; ils se désactivent par `sudo docker compose run --rm api node src/demo.js --retirer` (encadré par `stop api` et `up -d`).
- Note de version pas encore affichée à la première connexion (E-07).
- Images construites dans le bac à sable avec un certificat d'autorité ajouté pour son proxy, dans des Dockerfile de test non livrés : la construction avec les Dockerfile livrés se joue pour la première fois sur NIXUS.
- Restauration jouée dans le bac à sable seulement.
- `react-router-dom` : 3 vulnérabilités modérées, aucune haute (E-09).

## Liste de contrôle de la version (section 18 du standard)

Stack, composants Ant Design, SQL à la main, identité visuelle : conformes. Ressources nouvelles avec API et MCP : conformes, test de parité vert. Migration numérotée : `001_noyau`. Portabilité : test vert. FR et NL : tests verts. Suites : 58 et 22 tests, 0 échec ; construction et accessibilité statique à 0 erreur. Grille de sécurité : `docs/fr/SECURITE.md`. Documentation : FR, NL, EN. Archive vérifiée par `tar tzf`, sans `.env` ni base. Déploiement et recette sur NIXUS : à faire, sorties à coller dans la conversation.

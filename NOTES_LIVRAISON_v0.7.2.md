# Notes de livraison 0.7.2

29/10/2026 · GMAO communale · Version sans changement fonctionnel : code prêt pour le dépôt public GitHub

## Périmètre

- **Tests automatiques sur GitHub.** `.github/workflows/ci.yml` ajouté, à l'identique de la section 7 de `GITHUB.md` : travail `tests`, Node 20, suites du serveur et de l'interface, construction, accessibilité et `npm audit --omit=dev --audit-level=high` du serveur.
- **`.gitignore` vérifié et complété.** Déjà exclus : `node_modules/`, `dist/`, `data/`, `*.db`, `.env`, `*.tar.gz`, `ssl-certs/`, `*.tsbuildinfo`. Ajoutés : `.env.*` (sauf `.env.example`), fichiers annexes des bases SQLite, `backups/`, certificats et clés, journaux, fichiers du poste.
- **Valeurs interdites remplacées (section 6 de `GITHUB.md`).** Dans tous les fichiers de l'archive, l'adresse, les ports et le dossier de l'hôte d'acceptance, ainsi que le nom du compte d'administration du NAS, sont remplacés par des valeurs d'exemple : `192.0.2.10`, 18443 (HTTPS), 18080 (HTTP), 18444 (port prévu à l'origine), `/volume1/docker/monapp`, compte `admin`. Dans la copie de `STANDARD.md` : mêmes remplacements, plus les dossiers et ports des autres applications (`app-a`, `app-b`, `app-c`, ports 18445 et suivants), avec un avertissement en tête. Les fichiers du projet Claude et le message de livraison gardent les valeurs réelles (DV-70).
- **Tests.** Portabilité : toute adresse IPv4 privée est refusée dans le code (au lieu de la seule adresse de NIXUS, qui n'apparaît plus dans le dépôt). Une adresse professionnelle d'un test d'écran est remplacée par `jean.dupont@exemple.test`.
- **Note de version.** Une ligne pour l'administrateur seulement (exigée par le test du catalogue) ; aucune fenêtre ne s'ouvre pour les autres comptes.

Aucune migration, aucune route, aucun outil MCP, aucune dépendance nouvelles. Dockerfile, compose, `nginx.conf`, `backup.sh` et `.env` inchangés ; `frontend/dist/` identique à celui de la 0.7.1.

**À savoir avant le premier envoi sur GitHub.** L'étape `npm audit --omit=dev --audit-level=high` échoue (1 vulnérabilité haute, `body-parser`, E-24) : le travail `tests` sera rouge (E-30). Rien n'a été retiré du fichier imposé et aucun `npm audit fix` n'a été lancé. La correction est la mise à jour ciblée du verrou, qui attend l'accord de Renaud.

**Écart signalé (E-29).** `GITHUB.md` demande une archive sans `dist/` ; DV-01 livre l'interface construite parce que NIXUS ne la construit pas. L'archive garde `dist/` ; `.gitignore` le tient hors du dépôt.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_7_2.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_7_2.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

```
ssh admin@192.0.2.10
```

Attendu : demande du mot de passe, puis l'invite `admin@nas:~$`.

**Dans la session SSH du NAS** :

```
cd /volume1/docker/monapp
```

Attendu : aucune sortie.

```
sudo mv /tmp/gmao-v0_7_2.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_7_2.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées), N sauvegardes de la base conservées.`

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_7_2.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend frontend
```

Attendu : le contenu des deux dossiers (`Dockerfile`, `package.json`, `src`… et `dist` dans `frontend`).

```
sudo docker compose build
```

Attendu, après une à deux minutes : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web` (ou `Image … Built`), sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[APP] API 0.7.2 sur le port 3001`, sans ligne `[DB] Migration` (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.7.2"},"meta":{"envelope":1,"version":"0.7.2"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_7_1.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. **Version.** Avec `agent.ac` : aucune fenêtre « Nouveautés » ; le bas du menu montre `v0.7.2`.
2. **Note de l'administrateur.** Avec le compte administrateur de Thierry : la fenêtre « Nouveautés de la version 0.7.2 » montre une ligne (code publié sous licence libre) ; « J'ai lu » la ferme.

Puis reprendre la recette en cours sur la 0.7.2 : contrôles 2 et 3 de la 0.7.1, puis contrôles 5 à 9 de la 0.7.0 (le code de ces fonctions est celui de la 0.7.1).

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` ; aucune dépendance nouvelle | Coché |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché (aucun écran changé) |
| Toute ressource nouvelle a ses routes et ses outils MCP | Sans objet |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Sans objet : aucune écriture nouvelle ; E-27 inchangé |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Sans objet |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché (test de portabilité élargi) |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 290/290, interface 127/127 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | **Non** : serveur 1 haute (`body-parser`) et 2 modérées (`fast-uri`, `qs`), inchangées ; E-24 et E-30, décision de Renaud |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **non**. Une adresse professionnelle retirée d'un test.
2. Finalité nouvelle : **non**.
3. Destinataire nouveau : **non**. Le code devient public ; il ne contient aucune donnée de personne ni secret (recherche faite sur les fichiers versés).

## Simulé ou incomplet

Rien de simulé. GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.20.2. Image Docker non reconstruite dans le bac à sable.

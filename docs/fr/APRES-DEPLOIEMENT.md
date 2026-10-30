# Après déploiement : installer et mettre à jour la GMAO sur NIXUS

Version de l'application : **0.8.0** · Mis à jour le 30/10/2026 · Le français fait foi.

Procédure pas à pas depuis un PC Windows, sans passer par DSM. Une commande à la fois ; on attend son résultat avant la suivante. Si un résultat diffère de l'attendu, on s'arrête et on colle la sortie dans la conversation.

## 1. Repères

| Élément | Valeur |
| --- | --- |
| NAS | NIXUS, adresse `192.0.2.10` |
| Compte | `admin` (mot de passe du NAS, demandé à chaque connexion et à chaque `sudo`) |
| SSH | port 22 |
| Dossier de l'application | `/volume1/docker/monapp` |
| Adresse de l'application | `https://192.0.2.10:18443` (HTTP 18080 redirigé) |
| Dossier sur le PC | `C:\gmao` : on y enregistre chaque archive reçue |
| Archive | `gmao-vX_Y_Z.tar.gz` ; dans les commandes, remplacer `X_Y_Z` par le numéro réel (par exemple `0_2_0`) |

## 2. Deux fenêtres, à ne pas confondre

| Fenêtre | Comment l'ouvrir | Invite affichée | Ce qu'on y tape |
| --- | --- | --- | --- |
| **cmd du PC** | Touche Windows, taper `cmd`, Entrée | `C:\Users\…>` | `scp` (copie vers le NAS) et `ssh` (connexion au NAS) |
| **SSH du NAS** | Depuis le cmd du PC, par `ssh` | `admin@nas:~$` | Toutes les commandes `sudo`, `cd`, `ls`, `docker`, `curl` |

Pièges déjà rencontrés :

- Ne pas utiliser PowerShell ISE : la connexion SSH y reste bloquée. Utiliser `cmd`.
- Ne jamais taper `sudo` dans le cmd du PC : `sudo` n'existe que sur le NAS.
- `scp` se lance depuis le cmd du PC, jamais depuis la session SSH du NAS.
- Copier seulement la commande, sans les trois accents graves (```` ``` ````) qui l'entourent dans ce document, et sans l'invite (`admin@nas:~$`).
- Ne pas taper les chevrons d'un exemple (`<port>`) : ils marquent une valeur à remplacer.
- Ne sauter aucune commande, en particulier `sudo rm -rf backend frontend docs` avant l'extraction.
- Si le navigateur enregistre l'archive sous `gmao-vX_Y_Z.tar.gz.gz`, la renommer dans le cmd : `ren C:\gmao\gmao-vX_Y_Z.tar.gz.gz gmao-vX_Y_Z.tar.gz` (vu le 22/10/2026).
- Si `docker` est introuvable ou si `curl` ne répond rien, vérifier Container Manager : `sudo /usr/syno/bin/synopkg status ContainerManager` ; s'il est arrêté (`"status":"stop"`), `sudo /usr/syno/bin/synopkg start ContainerManager`, attendre l'invite sans toucher au clavier (deux à trois minutes), puis vérifier `/api/version` (vu le 22/10/2026).
- Un caractère `~` peut se coller en fin de ligne lors d'un collage : l'effacer avant Entrée.

## 3. Mise à jour (cas courant)

### 3.1 Dans le cmd du PC : copier l'archive sur le NAS

Enregistrer d'abord l'archive reçue dans `C:\gmao`. Ouvrir `cmd`, puis :

```
scp -O C:\gmao\gmao-vX_Y_Z.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-vX_Y_Z.tar.gz 100% …`. À la toute première connexion, répondre `yes` à la question sur l'empreinte du NAS.

### 3.2 Dans le cmd du PC : se connecter au NAS

```
ssh admin@192.0.2.10
```

Attendu : demande du mot de passe, puis l'invite `admin@nas:~$`. Toutes les commandes suivantes se tapent dans cette session.

### 3.3 Dans la session SSH du NAS

```
cd /volume1/docker/monapp
```

Attendu : aucune sortie ; l'invite devient `admin@nas:/volume1/docker/monapp$`.

```
sudo mv /tmp/gmao-vX_Y_Z.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-vX_Y_Z.tar.gz
```

Attendu : une ligne avec la taille de l'archive. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée, N sauvegardes conservées.` Depuis la 0.2.0, le message dit aussi `photos copiées` ou `aucune photo à copier` ; depuis la 0.8.0, `pièces jointes copiées` ou `aucune pièce jointe à copier`.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie. Le `.env`, la base, les photos, les pièces jointes et les certificats ne sont pas touchés (ils sont dans le `.env` et dans des volumes Docker).

```
sudo tar xzf gmao-vX_Y_Z.tar.gz --strip-components=1
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
sudo docker compose ps
```

Attendu, après une minute : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"X.Y.Z"},"meta":{"envelope":1,"version":"X.Y.Z"}}` avec le nouveau numéro.

Si la version contient une migration de base, les notes de livraison le disent et ajoutent leurs commandes à cet endroit.

### 3.4 Dans le navigateur

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5, vérifier le numéro de version en bas du menu, puis dérouler la liste de contrôle des notes de livraison. Envoyer une capture dans la conversation.

### 3.5 Quitter le NAS

```
exit
```

Attendu : retour à l'invite `C:\Users\…>` du cmd.

## 4. Retour arrière

Mêmes commandes que la section 3.3 avec l'archive précédente, toujours présente dans `/volume1/docker/monapp`. Si la version annulée contenait une migration, restaurer aussi la base par la procédure de `docs/fr/EXPLOITATION.md` (copie de la sauvegarde dans le volume, `chown 10001`). La migration `002_lieux` de la 0.2.0 ajoute des tables sans rien changer aux anciennes : la 0.1.1 démarre encore sur une base passée en 0.2.0 et ignore simplement les lieux. De même, la 0.2.0 démarre sur une base passée en 0.3.0 (`003_parametres` ajoute une table et des colonnes). La 0.3.1 démarre sur une base passée en 0.4.0 (`004_referentiel_demandes` ajoute quatre tables) ; essayé dans le bac à sable le 22/10/2026. La 0.4.1 n'a pas de migration : retour à la 0.4.0 sans restaurer la base, essayé dans le bac à sable le 23/10/2026. La 0.4.1 démarre sur une base passée en 0.5.0 (`005_demandes` ajoute deux tables et une colonne, et retire des espaces en trop dans des libellés) : retour sans restaurer la base, essayé dans le bac à sable le 26/10/2026 ; les demandes déposées restent en base et réapparaissent au retour à la 0.5.0. La 0.5.1 et la 0.5.2 n'ont pas de migration : retour à la version précédente sans restaurer la base. La 0.7.5 démarre sur une base passée en 0.8.0 (`007_pieces_jointes` ajoute une table) et ignore les pièces jointes : retour sans restaurer la base, essayé dans le bac à sable le 30/10/2026 ; les pièces restent en base et sur le disque, et réapparaissent au retour à la 0.8.0.

## 5. Données de démonstration (acceptance seulement)

Dans la session SSH du NAS, dans `/volume1/docker/monapp`, une commande à la fois :

```
sudo docker compose stop api
```

Attendu : `Container gmao-api Stopped`.

```
sudo docker compose run --rm api node src/demo.js
```

Attendu : `[DEMO] 21 comptes de démonstration prêts.`, la liste des adresses en `@demo.invalid`, depuis la 0.2.0 la ligne `[DEMO] N lieu(x) de démonstration créé(s)`, puis le mot de passe commun, affiché une seule fois. Relancer la commande donne un nouveau mot de passe et garde les lieux déjà présents, avec leurs photos. Depuis la 0.3.0, un compte de démonstration créé par la commande ne voit pas la note de la version en cours ; un compte qui existait déjà la voit à sa prochaine connexion. Avec `--retirer` à la fin, la commande désactive ces comptes et ces lieux.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy`.

## 6. Sauvegarde planifiée (à faire une fois)

La tâche se crée dans DSM, seul endroit où le NAS planifie des tâches : ouvrir `http://192.0.2.10:5000`, Panneau de configuration, Planificateur de tâches, Créer, Tâche planifiée, Script défini par l'utilisateur. Utilisateur `root` ; chaque jour à 02:00 ; script `bash /volume1/docker/monapp/backup.sh` ; courriel en cas d'échec. Contrôle immédiat dans la session SSH :

```
sudo bash /volume1/docker/monapp/backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, aucune pièce jointe à copier), N sauvegardes de la base conservées.` Depuis la 0.8.0, `pièces jointes copiées` dès la première pièce déposée.

## 7. Première installation (pour mémoire, faite le 15/10/2026)

Suivie une seule fois, avec la 0.1.0. Elle reste décrite dans `docs/fr/INSTALLATION.md` et `NOTES_LIVRAISON_v0.1.0.md` de l'archive. Ordre : dossier `/volume1/docker/monapp` créé, archive copiée, extraction, `sudo sh verifier-ports.sh 18443 18080` (attendu : deux fois `LIBRE` ; le 18444 est occupé par la GRC), création du `.env` (une seule fois, `DEMO_ALLOWED=1` en acceptance, `chmod 600`), `build`, `up -d`, assistant d'installation dans le navigateur (nom du pouvoir local, entité AC, premier administrateur), création de l'entité CPAS dans Administration, Entités, comptes de démonstration.

## 8. Notes par version

### 0.8.0 (30/10/2026)

Photos et pièces jointes des demandes (étape 6 ; DV-82 à DV-85). Mise à jour par la section 3, **avec migration** : `sudo docker logs gmao-api --tail 30` montre `[DB] Migration 007_pieces_jointes appliquée` puis `[APP] API 0.8.0 sur le port 3001`. Dépendance nouvelle `multer` : `sudo docker compose build` la télécharge (quelques minutes de plus). Les deux images se reconstruisent ; `nginx.conf` (11 Mo sur la route de dépôt des pièces) et `backup.sh` (dossier `pieces`) changent dans l'archive ; Dockerfile, compose et `.env` inchangés ; `--no-cache` inutile. Contrôle : bas du menu `v0.8.0` ; note de la 0.8.0 (une ligne pour tous, deux pour le responsable) ; bloc « Photos et documents » du formulaire ; fiche de la demande avec ses pièces ; Réglages de l'entité, groupe « Pièces jointes des demandes ». Retour arrière vers la 0.7.5 sans restaurer la base (section 4).

### 0.7.5 (29/10/2026)

Lieux récents, bandeau de connexion, affichage du journal d'audit (DV-74, DV-53, DV-76). Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.7.5 sur le port 3001`. Les deux images se reconstruisent ; aucune modification des Dockerfile, du compose, de `backup.sh` ni du `.env` ; `--no-cache` inutile. Contrôle : bas du menu `v0.7.5` ; note de la 0.7.5 à la connexion (deux lignes pour tous, trois pour l'administrateur) ; « Changer de lieu » montre « Vos lieux récents » pour `agent.ac` ; un mauvais mot de passe puis une adresse corrigée efface le bandeau ; journal d'audit : « Non » au lieu de `0`, plus de ligne vide. Retour arrière vers la 0.7.4 sans restaurer la base.

### 0.7.4 (29/10/2026)

Noms du lieu et de la catégorie dans le détail du journal d'audit (DV-50). Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.7.4 sur le port 3001`. Les deux images se reconstruisent (code du serveur et `frontend/dist/` changés ; `docker compose build`, une à deux minutes) ; aucune modification des Dockerfile, du compose, de `backup.sh` ni du `.env` ; `--no-cache` inutile. Contrôle : bas du menu `v0.7.4` ; l'administrateur voit la note de la 0.7.4 (une ligne) ; aucune fenêtre de nouveautés pour `agent.ac` ni `responsable.ac` ; dans Administration, Journal d'audit, la ligne « Demande déposée » de `AC-DI-2026-00004` dépliée montre « Lieu » et « Catégorie » par leur code et leur nom, l'identifiant entre parenthèses. Retour arrière vers la 0.7.3 sans restaurer la base.

### 0.7.3 (29/10/2026)

Correctif de sécurité des dépendances du serveur (E-24, E-30), sans changement fonctionnel. Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.7.3 sur le port 3001`. L'image du serveur se reconstruit avec le nouveau verrou (`docker compose build`, une à deux minutes) ; aucune modification des Dockerfile, du compose, de `backup.sh` ni du `.env` ; `frontend/dist/` identique à la 0.7.2 ; `--no-cache` inutile. Peut s'installer directement sur la 0.7.1 : la 0.7.2 n'apporte rien de plus à l'écran. Contrôle : bas du menu `v0.7.3` ; l'administrateur voit la note de la 0.7.3 (correctif de sécurité), et aussi celle de la 0.7.2 s'il ne l'a pas encore lue ; aucune fenêtre de nouveautés pour `agent.ac` ni `responsable.ac`. Retour arrière vers la 0.7.1 ou la 0.7.2 sans restaurer la base.

### 0.7.2 (29/10/2026)

Version sans changement fonctionnel (dépôt public GitHub). Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.7.2 sur le port 3001`. Aucune modification des Dockerfile, du compose, de `backup.sh` ni du `.env` ; `frontend/dist/` identique à la 0.7.1 ; `--no-cache` inutile. Contrôle : bas du menu `v0.7.2` ; l'administrateur voit une note d'une ligne (code publié sous licence libre) ; aucune fenêtre de nouveautés pour `agent.ac` ni `responsable.ac`. Retour arrière vers la 0.7.1 sans restaurer la base. Depuis la 0.7.2, la copie de ce fichier dans l'archive et dans le dépôt GitHub utilise des valeurs d'exemple (`192.0.2.10`, 18443, 18080, `/volume1/docker/monapp`, compte `admin`) ; les valeurs réelles sont dans ce fichier du projet et dans les messages de livraison.

### 0.7.1 (28/10/2026)

Correctif de la recette de la 0.7.0 (DV-04). Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.7.1 sur le port 3001`. Aucune modification des Dockerfile, du compose ni du `.env` ; `--no-cache` inutile. Contrôle : note de la 0.7.1 à la connexion (une ligne pour tous, deux pour le responsable) ; dans « Nouvelle demande », sans changer le lieu proposé, « Brouillon enregistré à … » s'affiche sous le bouton d'envoi dès qu'on tape la description ; « En savoir plus » commence par « Responsable du traitement : » et le nom de l'entité. Retour arrière vers la 0.7.0 sans restaurer la base.

### 0.7.0 (28/10/2026)

Étape 7 du planning. Mise à jour par la section 3. Migration `006_demandes_formulaire` appliquée seule au premier démarrage de `gmao-api` : tables `demande_suiveurs`, `brouillons`, `questions_categorie`, `demande_reponses` et cinq colonnes de `demandes` ; puis trois questions livrées par entité active. Contrôle par `sudo docker logs gmao-api --tail 30`, qui montre `[DB] Migration 006_demandes_formulaire appliquée` puis `[APP] API 0.7.0 sur le port 3001`. Aucune modification des Dockerfile, du compose ni du `.env` ; `--no-cache` inutile. Contrôle : note de la 0.7.0 à la connexion (trois lignes pour tous, cinq pour le responsable) ; formulaire avec la case « Danger », les demandes ouvertes du même bâtiment et « Moi aussi », les questions de la catégorie, « Pour quelqu'un d'autre ? », « Une date ou un moment à respecter ? », le brouillon repris, la mention et « En savoir plus » ; questions dans Catégories et délais ; groupe « Protection des données » dans Réglages de l'entité ; messages d'erreur dans un rouge plus foncé. À régler après la mise à jour par chaque responsable : téléphone d'urgence et contact du DPO de son entité. Retour arrière vers la 0.5.2 : réinstaller la 0.5.2 par la section 3, puis restaurer la sauvegarde de la base prise par `backup.sh` juste avant la mise à jour (`docs/fr/EXPLOITATION.md`, Restauration) ; les demandes déposées sous la 0.7.0 seraient perdues.

### 0.5.2 (27/10/2026)

Correctif de la recette du 27/10/2026 (DV-04). Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.5.2 sur le port 3001`. Aucune modification des Dockerfile, du compose ni du `.env` ; `--no-cache` inutile. Contrôle : note de la 0.5.2 à la connexion (deux lignes, pour tous) ; après l'envoi d'une demande sur téléphone, un espace entre « Mes demandes » et « Faire une autre demande » ; sur un iPhone, toucher la recherche d'un lieu ou la description n'agrandit plus la page, et le zoom à deux doigts marche encore ; adresse e-mail vide : « Ce champ est obligatoire » seul ; adresse mal formée : « Adresse e-mail non valide ». Retour arrière vers la 0.5.1 sans restaurer la base.

### 0.5.1 (26/10/2026)

Correctif de la recette du 26/10/2026 (DV-04). Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.5.1 sur le port 3001`. Aucune modification des Dockerfile, du compose ni du `.env` ; `--no-cache` inutile. Contrôle : note de la 0.5.1 à la connexion (deux lignes, pour tous) ; dans « Changer de lieu », la liste des bâtiments s'ouvre et se referme par « Parcourir la liste des bâtiments » et par « Masquer la liste » ; « Mes demandes » sans bouton « Nouvelle demande » dans la page ; « Ce champ est obligatoire » sous un champ obligatoire fait seulement d'espaces (valeur de liste, description d'une demande, motif de désactivation) ; contrôle 5 de la 0.5.0 sur iPhone et Samsung en néerlandais. Retour arrière vers la 0.5.0 sans restaurer la base.

### 0.5.0 (26/10/2026)

Mise à jour par la section 3. Migration `005_demandes` appliquée seule au premier démarrage de `gmao-api` : tables `sequences` (compteurs des numéros) et `demandes`, colonne `lieu_habituel_id` des comptes, puis retrait des espaces de début et de fin des libellés, noms, codes et adresses déjà en base. Contrôle par `sudo docker logs gmao-api --tail 30`, qui montre `[DB] Espaces retirés sur N fiche(s), voir le journal d'audit (systeme.espaces)` (seulement s'il y en avait), `[DB] Migration 005_demandes appliquée` puis `[APP] API 0.5.0 sur le port 3001`. Une ligne `[DB] Espaces non retirés : …` signale une valeur laissée telle quelle (code en conflit ou libellé qui deviendrait vide), à corriger à l'écran. Aucune modification des Dockerfile, du compose ni du `.env` ; `--no-cache` inutile. Contrôle : accueil de `agent.ac` avec « Nouvelle demande » et « Mes demandes » ; dépôt d'une demande en moins d'une minute, numéro `AC-DI-2026-00001` ; « Mes demandes » ; « Demandes de l'entité » de `gestionnaire.ac` (la demande y est) et de `responsable.cpas` (vide) ; bloc Numérotation des demandes dans Réglages de l'entité ; recherche d'un lieu sans accent ; journal d'audit (« Demande d'intervention déposée », « Espaces en trop retirés »). Retour arrière vers la 0.4.1 sans restaurer la base.

### 0.4.1 (23/10/2026)

Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.4.1 sur le port 3001`. Aucune modification des Dockerfile, du compose ni du `.env` ; `--no-cache` inutile. Contrôle : note de la 0.4.1 à la connexion d'un compte responsable (aucune fenêtre pour un demandeur, qui n'a pas de ligne), simulateur avec le délai sous l'heure à 1280 px et sur téléphone, mention « Modifié le … par … » ou « Valeur livrée » sur une catégorie, une priorité, un jour de l'horaire, un congé et une fermeture, journal d'audit d'une modification limité aux champs changés. Les fiches modifiées sous la 0.4.0 affichent « Modifié le … par … » avec l'auteur et la date déjà en base. Retour arrière vers la 0.4.0 sans restaurer la base.

### 0.4.0 (22/10/2026)

Mise à jour par la section 3. Migration `004_referentiel_demandes` appliquée seule au premier démarrage de `gmao-api` (tables `categories`, `priorites`, `horaires`, `jours_non_ouvres`) ; contrôle par `sudo docker logs gmao-api --tail 30`, qui montre `[DB] Migration 004_referentiel_demandes appliquée` puis `[APP] API 0.4.0 sur le port 3001`. Au même démarrage, chaque entité active reçoit l'arbre des catégories, les priorités, l'horaire (choisi par le code `AC` ou `CPAS`) et les congés livrés. Aucune modification des Dockerfile, du compose ni du `.env` ; `--no-cache` inutile. Contrôle : note de la 0.4.0 à la connexion, écran Réglages du service, Catégories et délais avec un compte responsable, vendredi de l'AC jusqu'à 12:00 et du CPAS jusqu'à 16:30, simulateur, rubrique « Délais des demandes » de l'aide. Retour arrière possible vers la 0.3.1 sans restaurer la base.

### 0.3.1 (22/10/2026)

Mise à jour par la section 3, sans migration : `sudo docker logs gmao-api --tail 30` montre seulement `[APP] API 0.3.1 sur le port 3001`. Aucune modification des Dockerfile, du compose ni du `.env`. Contrôle : note de la 0.3.1 à la connexion, question de l'appareil photo (Android et iPhone) dans Aide, Questions fréquentes, réponse de l'assistant à « appareil photo Samsung ». Retour arrière vers la 0.3.0 sans restaurer la base.

### 0.3.0 (22/10/2026)

Installée et recettée le 22/10/2026. Mise à jour par la section 3. Migration `003_parametres` appliquée seule au démarrage de `gmao-api` (table `parametres_entite`, colonne `entite_id` du journal, colonne `version_vue` des comptes) ; contrôle par `sudo docker logs gmao-api --tail 30`, qui montre `[DB] Migration 003_parametres appliquée`. Aucune modification des Dockerfile, du compose ni du `.env` ; `--no-cache` inutile. Les comptes existants verront la note de la 0.3.0 à leur prochaine connexion. Contrôle : note de version à la connexion, nom du pouvoir local corrigé dans Administration, Paramètres, module Patrimoine éteint puis rallumé, journal d'audit, Réglages de l'entité et Aide, Contact, question de FAQ sur l'iPhone. Retour arrière possible vers la 0.2.0 sans restaurer la base : la 0.2.0 ignore la table et les colonnes ajoutées (essayé dans le bac à sable).

### 0.2.0 (21/10/2026)

Mise à jour par la section 3. Migration `002_lieux` appliquée seule au démarrage de `gmao-api` (tables `listes_valeurs` et `lieux`) ; contrôle par `sudo docker logs gmao-api --tail 30`, qui montre `[DB] Migration 002_lieux appliquée`. Les types de lieux livrés sont créés pour chaque entité. Ensuite, section 5 pour charger les lieux de démonstration, puis dépôt des photos à l'écran. Aucune modification des Dockerfile, du compose ni du `.env`. Contrôle : écran Patrimoine, arbre de l'AC invisible depuis le CPAS, photo d'un lieu, écran Listes de valeurs du responsable. Installée et recettée le 22/10/2026.

### 0.1.1 (15/10/2026)

Mise à jour par la section 3, sans migration. Contrôle : écran Utilisateurs et rôles sans colonne coupée, colonne Actions fixée à droite, panneau Rôles avec l'accès à l'administration, une seule colonne sur téléphone. Port HTTPS de NIXUS : 18443. Installée le 15/10/2026 ; capture de validation attendue.

### 0.1.0 (15/10/2026)

Première installation (section 7). Aucune migration de données (base neuve). Contrôle : assistant d'installation, création de la seconde entité, comptes de démonstration, changement d'entité active. Installée le 15/10/2026.

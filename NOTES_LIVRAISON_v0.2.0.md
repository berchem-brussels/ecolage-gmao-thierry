# Notes de livraison 0.2.0

21/10/2026 · GMAO communale · Étape 2 du planning : référentiel des lieux

## Périmètre

Livré :

- Écran Patrimoine : arbre site, bâtiment, niveau, local de l'entité active, recherche par code, nom ou adresse, fiche du lieu avec chemin, type, statut, adresse, surface et photo (REF-01).
- Création, modification, déplacement et désactivation des lieux par le gestionnaire technique et le responsable, selon les sept règles validées le 21/10/2026.
- Cloison complète : un lieu, une photo ou une valeur de l'autre entité répond 403, par l'API comme par le MCP ; le même code peut exister dans les deux entités sans rien partager (REF-02).
- Écran Listes de valeurs du responsable, première liste : les types de lieux en FR et en NL, avec ordre et activation ; dix types livrés pour chaque entité (REF-08, LNG-02).
- Photo d'un lieu : réduction à 1 600 pixels et retrait des métadonnées dans le navigateur, second contrôle et second nettoyage par le serveur, effacement réel de l'ancienne photo, photos comprises dans `backup.sh`.
- Outils MCP des lieux et des listes ; commande de démonstration étendue aux lieux fictifs ; aide, FAQ, assistant et note d'accueil en FR et en NL.

Règles appliquées (validées le 21/10/2026) :

1. Un bâtiment se range sous un site, un niveau sous un bâtiment ; un bâtiment peut exister sans niveau.
2. Un lieu extérieur (cour, parking, toiture) est un local de type « Extérieur », rangé directement sous le site ou le bâtiment.
3. Code court unique dans l'entité ; le même code peut exister à l'AC et au CPAS.
4. Un lieu qui contient encore des lieux actifs ne se désactive pas.
5. Adresse saisie sur le site, reprise par défaut sur ses bâtiments.
6. Une photo par lieu ; une nouvelle photo efface réellement l'ancienne.
7. Types de lieux livrés : bureau, salle de réunion, atelier, garage, classe, cuisine, sanitaires, stockage, local technique, extérieur.

Pas livré dans cette version : équipements, fiche de bâtiment complète, plans et documents (étape 27), lieu de travail habituel des agents (étape 5), import du patrimoine depuis un fichier (étape 32).

Écarts signalés avant la livraison (détail dans `ECARTS-CDC.md`) :

- E-16 : pas de `multer`. La seule version 1.x encore publiée est dépréciée par son éditeur pour des failles corrigées en 2.x seulement. La photo arrive par le lecteur intégré d'Express, sans dépendance nouvelle. **Décision de Renaud attendue avant l'étape 6.**
- E-17 : le dépôt et la lecture du fichier de photo n'ont pas d'outil MCP (le corps JSON-RPC ne porte pas de fichier) ; l'effacement en a un.
- E-18 : l'audit complet de l'interface trouve 12 failles hautes dans l'outillage de construction et de test, aucune dans ce qui part en production. **Décision de Renaud attendue** sur la mise à jour de l'outillage.
- E-06 fermé : `backup.sh` copie les photos.

Migration : `002_lieux` (tables `listes_valeurs` et `lieux`), appliquée seule au démarrage. Aucune modification des Dockerfile, du `docker-compose.yml`, de `nginx.conf` ni du `.env`. Aucune dépendance nouvelle.

## Commandes de mise à jour

**Sur ton PC**, dans une fenêtre `cmd` (pas dans la session SSH). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_2_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : `gmao-v0_2_0.tar.gz 100% …`.

```
ssh admin@192.0.2.10
```

Attendu : l'invite `admin@nas:~$`.

**Sur le NAS**, dans la session SSH, une commande à la fois :

```
cd /volume1/docker/monapp
```

Attendu : aucune sortie.

```
sudo mv /tmp/gmao-v0_2_0.tar.gz .
```

Attendu : aucune sortie.

```
ls -l gmao-v0_2_0.tar.gz
```

Attendu : le fichier listé. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée, N sauvegardes conservées.` (c'est encore le script de la 0.1.1).

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_2_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend frontend
```

Attendu : le contenu des deux dossiers (`Dockerfile`, `package.json`, `src`… et `dist` dans `frontend`).

```
sudo docker compose build
```

Attendu : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web` (ou `Image … Built`), sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[DB] Migration 002_lieux appliquée` puis `[APP] API 0.2.0 sur le port 3001`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.2.0"},"meta":{"envelope":1,"version":"0.2.0"}}`

## Chargement des lieux de démonstration

Toujours dans la session SSH du NAS, dans `/volume1/docker/monapp` :

```
sudo docker compose stop api
```

Attendu : `Container gmao-api Stopped`.

```
sudo docker compose run --rm api node src/demo.js
```

Attendu : `[DEMO] 21 comptes de démonstration prêts.`, la liste des adresses, `[DEMO] 31 lieu(x) de démonstration créé(s) ; les lieux déjà présents sont gardés tels quels.`, puis le nouveau mot de passe commun, affiché une seule fois. Le noter : l'ancien ne vaut plus.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy`.

```
exit
```

Attendu : retour à l'invite `C:\Users\…>`.

## Dépôt des photos réelles

Les photos ne sont pas dans l'archive : elles se déposent à l'écran et restent dans la base de NIXUS. Pour chaque ligne : se connecter avec le compte indiqué, ouvrir Patrimoine, cliquer sur le lieu dans l'arbre (déplier avec le petit triangle), cliquer sur « Ajouter une photo », choisir le fichier.

| Lieu | Compte | Photo |
| --- | --- | --- |
| AC-B1 Maison communale | `gestionnaire.ac@demo.invalid` | Façade de la maison communale |
| AC-B1-L02 Salle du conseil (sous AC-B1-R0) | `gestionnaire.ac@demo.invalid` | Salle du conseil |
| AC-B2 Annexe technique | `gestionnaire.ac@demo.invalid` | Cour de l'annexe prise au téléphone |
| AC-B2-L01 Atelier | `gestionnaire.ac@demo.invalid` | Établi de menuiserie |
| AC-B2-L02 Garage | `gestionnaire.ac@demo.invalid` | Garage avec véhicules |
| AC-B3 Bâtiment des classes | `gestionnaire.ac@demo.invalid` | École aux façades colorées |
| AC-S2-X01 Cour de récréation | `gestionnaire.ac@demo.invalid` | Préau et cour |
| CPAS-B1 Bâtiment principal | `gestionnaire.cpas@demo.invalid` | Panneau du CPAS |
| CPAS-B1-L03 Salle de réunion (sous CPAS-B1-R1) | `gestionnaire.cpas@demo.invalid` | Salle de réunion |
| CPAS-B2 Résidence pour aînés | `gestionnaire.cpas@demo.invalid` | Val des Fleurs |
| CPAS-S1-X01 Parking | `gestionnaire.cpas@demo.invalid` | Siège et parking |

Les noms restent fictifs (« démo ») ; « Modifier » permet de les remplacer par les vrais noms. Une fois les photos déposées, dans une nouvelle session SSH du NAS :

```
sudo bash /volume1/docker/monapp/backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées), N sauvegardes de la base conservées.`

## Liste de contrôle à l'écran

1. Recharger la page (Ctrl+F5) : la version affichée en bas du menu est v0.2.0.
2. `gestionnaire.ac@demo.invalid` : le menu propose Patrimoine. L'arbre montre AC-S1 et AC-S2. Déplier AC-B1 : niveaux AC-B1-R0 et AC-B1-R1, puis leurs locaux.
3. Taper « conseil » dans la recherche : seul le chemin vers AC-B1-L02 reste affiché.
4. Ouvrir AC-B1 : la photo s'affiche, avec « Changer la photo » et « Supprimer la photo ». L'adresse de la page finit par `?lieu=` suivi d'un numéro.
5. Dans AC-B2, cliquer sur « Ajouter un local » et enregistrer sans type : le formulaire demande le type du local.
6. Passer en mode Complet, ouvrir AC-B1 et essayer « Désactiver ce lieu » avec un motif : refus, le lieu contient encore des lieux actifs.
7. Se connecter avec `multi-entites@demo.invalid`, ouvrir Patrimoine, cliquer sur CPAS dans l'en-tête : l'arbre ne montre que des codes CPAS, aucun code AC.
8. Se connecter avec `responsable.ac@demo.invalid` : menu Réglages du service, Listes de valeurs. Créer « Chaufferie » / « Stookruimte » ; elle apparaît dans le type d'un nouveau local de l'AC. Elle n'apparaît pas au CPAS.
9. Se connecter avec `agent.ac@demo.invalid` : Patrimoine se consulte, sans bouton « Créer un site » ni « Modifier » ; le menu ne propose pas Listes de valeurs.
10. Passer en NL : arbre, fiche et boutons en néerlandais (« Een foto toevoegen », « Een verdieping toevoegen »).
11. Sur un téléphone : l'arbre, puis la fiche en dessous, sans défilement horizontal ; « Ajouter une photo » ouvre l'appareil photo ou la galerie.

Envoyer une capture des points 4, 7 et 11.

## Questions RGPD

1. Données personnelles nouvelles : aucune dans les lieux. Une photo de lieu peut montrer une personne, une plaque ou un dispositif de sécurité : l'écran demande de les éviter. Les métadonnées (date, appareil, position) sont retirées. La catégorie « photos des lieux » est à inscrire à l'analyse d'impact par le DPO, dans le travail mené en parallèle.
2. Finalité nouvelle : aucune. La description du patrimoine sert la gestion technique.
3. Destinataire nouveau : aucun. Aucun appel sortant, aucun tiers.

## Simulé ou incomplet

Rien de simulé. Les lieux de démonstration sont fictifs et marqués « Démonstration » ; les photos réelles sont à déposer à la main. Le MCP ne transporte pas de fichier (E-17). La recherche tolère les accents dans l'arbre de l'écran ; la recherche de l'API (`q`) ne les tolère pas encore (REF-03, étape 5). Les points ouverts restent ouverts : note de version à la première connexion (E-07, étape 3), `react-router-dom` 7 (E-09), tâche DSM de sauvegarde.

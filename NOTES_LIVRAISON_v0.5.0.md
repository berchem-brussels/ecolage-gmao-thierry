# Notes de livraison 0.5.0

26/10/2026 · GMAO communale · Étape 5 du planning (lot L1) : accueil du demandeur, formulaire Où, Quoi, Description, numérotation par entité, « Mes demandes »

## Périmètre

Livré en six points (DV-22), après le relevé des écrans de 3P du 26/10/2026 (D-14 levé, DV-38) :

- **Point 1, espaces en trop (DV-37).** Le serveur retire les espaces de début et de fin de tout texte reçu, par l'écran comme par l'assistant (MCP), sauf les mots de passe. Un champ obligatoire fait seulement d'espaces est refusé. Défaut « Mobilier » de la recette du 24/10/2026.
- **Point 2, numérotation (NUM-01 à 05).** Chaque entité a ses numéros : `AC-DI-2026-00001`, `CPAS-DI-2026-00001`, le même numéro en français et en néerlandais (DV-44). Le responsable règle dans Réglages de l'entité le code des demandes (DI) et la remise à un chaque année ou la numérotation continue. Le numéro est donné au moment de l'enregistrement, sans trou ni doublon, et n'est jamais redonné. La mise à jour retire aussi, une fois, les espaces en trop des libellés déjà enregistrés (DV-47).
- **Point 3, demandes.** Toute personne qui a un rôle dans l'entité active dépose une demande : un seul lieu (DV-39), une catégorie, une description de 10 caractères au moins (DV-40). Elle arrive « Reçue par le service technique » (état « À qualifier », DV-43). Le lieu proposé d'office est le lieu de travail habituel, sinon celui de la dernière demande (DV-42). Le demandeur ne voit que ses demandes ; le gestionnaire et le responsable voient toutes celles de leur entité (DV-46).
- **Point 4, recherche d'un lieu (REF-03).** Sans accents, en français ou en néerlandais, par le nom, le code, l'adresse, la commune ou le type, et par le nom du bâtiment : « alcyons salle 21 » trouve la salle 21 du bâtiment Alcyons.
- **Point 5, écrans.** Accueil selon le rôle (« Nouvelle demande », « Mes demandes », demandes en cours ; pour le service technique, nombre de demandes à qualifier) ; bouton « Nouvelle demande » en haut de chaque écran ; formulaire en trois blocs avec les tuiles des 35 catégories (DV-41) ; numéro et délai indicatif après l'envoi ; « Mes demandes » ; « Demandes de l'entité » en lecture ; « Mon lieu de travail » dans le menu de l'utilisateur.
- **Point 6.** Aide (quatre rubriques), questions 16 à 19 de la FAQ, réponses de l'assistant (« où en est ma demande », « signaler une fuite », « mon lieu de travail »), note de version, documentation FR, NL et EN, fiche fonctionnelle `docs/fonctionnel/demandes.md`.

Migration `005_demandes` (deux tables et une colonne, nettoyage des espaces). Routes nouvelles : `GET` et `POST /api/demandes`, `GET /api/demandes/:id`, `PUT /api/auth/lieu-habituel`, avec leurs outils MCP. Module « demandes » du noyau rendu disponible. Aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh` et `.env` inchangés.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_5_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_5_0.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande (vu le 24/10/2026).

```
ssh admin@192.0.2.10
```

Attendu : demande du mot de passe, puis l'invite `admin@nas:…$`.

**Dans la session SSH du NAS** :

```
cd /volume1/docker/monapp
```

Attendu : aucune sortie.

```
sudo mv /tmp/gmao-v0_5_0.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_5_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées), N sauvegardes de la base conservées.` Cette sauvegarde précède la migration.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_5_0.tar.gz --strip-components=1
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

Attendu : `[DB] Espaces retirés sur N fiche(s), voir le journal d'audit (systeme.espaces)` (seulement s'il reste des espaces en trop en base ; « Mobilier » a été corrigé à la main le 24/10/2026, la ligne peut donc manquer), puis `[DB] Migration 005_demandes appliquée` et `[APP] API 0.5.0 sur le port 3001`. Une ligne `[DB] Espaces non retirés : …` désigne une valeur laissée telle quelle, à corriger à l'écran : la copier dans la conversation.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.5.0"},"meta":{"envelope":1,"version":"0.5.0"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_4_1.tar.gz`, sans restaurer la base : la 0.4.1 démarre sur une base passée en 0.5.0 et ignore les demandes, qui réapparaissent au retour à la 0.5.0 (essayé dans le bac à sable le 26/10/2026).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5. Comptes de démonstration (`@demo.invalid`, mot de passe commun).

1. Connexion avec `agent.ac` : la fenêtre « Nouveautés de la version 0.5.0 » montre trois lignes ; « J'ai lu » la ferme. Le bas du menu montre `v0.5.0`. L'accueil montre « Nouvelle demande » et « Mes demandes » en gros boutons, puis « Mes demandes en cours » (vide).
2. **Une demande en moins d'une minute**, chronomètre en main : « Nouvelle demande » ; « Changer de lieu », taper `conseil` ou `raadzaal`, choisir la salle ; toucher une tuile de domaine puis une nature ; écrire une phrase ; « Envoyer la demande ». L'écran donne `AC-DI-2026-00001`, le lieu et le délai indicatif.
3. « Mes demandes » : la demande en tête, « Reçue par le service technique », délai annoncé ; clic sur le numéro : la fiche s'ouvre. « Faire une autre demande » : le lieu de la demande précédente est proposé.
4. Le menu de l'utilisateur (nom en haut à droite), « Mon lieu de travail » : chercher un bureau, « Enregistrer ». Une nouvelle demande propose ce lieu, avec « Votre lieu de travail habituel ».
5. Le même parcours sur un iPhone et sur un téléphone Samsung (Chrome), en néerlandais : bouton « + » en haut, tuiles sur deux colonnes, rien ne déborde.
6. Connexion avec `gestionnaire.ac` : l'accueil montre « Demandes de l'entité (n à qualifier) » ; l'écran liste la demande avec le nom du demandeur, sans bouton de modification. Avec `responsable.cpas` : « Demandes de l'entité » est vide (cloison AC et CPAS).
7. Avec `responsable.cpas` : Réglages de l'entité, bloc « Numérotation des demandes » : code `DI`, « Remise à un chaque année ». Une nouvelle demande au CPAS reçoit `CPAS-DI-2026-00001`.
8. Recherche sans accent : dans « Changer de lieu », `ecole` trouve « École (démo) », `gelijkvloers` trouve les rez-de-chaussée et leurs locaux.
9. Espaces en trop : avec `responsable.cpas`, Réglages du service, Listes de valeurs, ajouter une valeur au libellé « ␣Essai␣ » (espaces avant et après) : elle est enregistrée « Essai ». La désactiver ensuite. Un libellé fait seulement d'espaces est refusé.
10. Avec le compte administrateur : Administration, Journal d'audit, action « Demande d'intervention déposée » (numéro, lieu, catégorie, sans la description) et, s'il y en a eu, « Espaces en trop retirés (mise à jour 0.5.0) ».

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` ; aucune dépendance nouvelle | Coché |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP pour créer, lire, modifier et annuler | Création et lecture ; modification et annulation à l'étape 9 (écart E-21) |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché (`005_demandes`, routes servies sur `/api/openapi.json`) |
| Aucune valeur propre à un pouvoir local dans le code ; réglable en paramètre FR et NL ; textes FR et NL | Coché (tests de portabilité et de parité) |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec ; tests avec cas de refus ; parcours FR, NL, 360, 768, 1280 px | Coché |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | **Non** : serveur 1 haute (`body-parser`) et 1 modérée (`fast-uri`), avis publiés après la 0.4.1, verrou inchangé ; écart E-24, décision de Renaud |
| Aucun appel sortant nouveau ; trois questions RGPD | Coché (ci-dessous) |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **oui**. Une demande garde le nom de son demandeur (lien vers son compte), le lieu, la catégorie, la date et la description en texte libre, que la personne écrit elle-même ; le compte peut garder un lieu de travail habituel, choisi par la personne ou par l'administrateur. La description ne demande aucune donnée sur une personne ; l'aide dit de décrire le problème. Le journal d'audit d'un dépôt ne garde pas la description.
2. Finalité nouvelle : **oui**, celle de l'application : traiter et suivre les demandes adressées au service technique (cahier des charges, section 22.1, « Demandeurs »).
3. Destinataire nouveau : **oui**, interne. Le nom du demandeur et sa demande sont visibles du gestionnaire technique et du responsable du service technique de son entité ; ceux de l'autre entité ne les voient pas. Aucun destinataire extérieur. Durées de conservation à fixer (D-09, étape 41). À porter au registre et à l'analyse d'impact menés en parallèle (hors du périmètre de Claude).

## Simulé ou incomplet

Rien de simulé. Le dépôt chronométré l'a été par un automate (2 à 3 secondes) ; la mesure avec des agents se fait à la recette (contrôle 2) et à l'étape 14 (REC-03). Contrôle visuel avec le moteur de Chrome (gabarits iPhone 13 et Galaxy S9+) ; Safari sur iPhone à confirmer (contrôle 5). Hors de cette version : photos (étape 6), « Moi aussi », case « Danger », champ « Pour » (étape 7), courriel d'accusé de réception (étape 13). Écarts nouveaux : E-21 (pas de modification ni d'annulation avant l'étape 9), E-22 (validation par le chef de service à l'étape 11), E-23 (filtre « Mon service » à l'étape 39), E-24 (`npm audit` serveur, Renaud), E-25 (lieu habituel d'un agent réglé par l'administrateur par l'API et le MCP seulement).

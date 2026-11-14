# Notes de livraison 0.16.0

10/11/2026 · GMAO communale · Validation par le chef de service, création par le gestionnaire, regroupement, découpage, vue en colonnes (étapes 11 et 12 regroupées ; DV-121, DV-128 à DV-132)

## Périmètre

Les demandes d'aménagement, de déménagement et d'achat passent désormais par le chef de service du demandeur avant d'arriver au service technique. Le service technique encode les demandes reçues par téléphone ou par courriel, regroupe les doublons, découpe une demande qui signale plusieurs problèmes et travaille, s'il le veut, en colonnes par état. Les remarques R1 et R2 de la recette de la 0.15.0 sont corrigées. Tout est vérifié aux largeurs de téléphone de 320 à 412 px, en FR et en NL (DV-102).

- **Services et valideurs** (ROL-04 ; DV-128) : écran « Services et valideurs » de l'administrateur.
  - Chaque entité a ses services (code unique dans l'entité, nom FR et NL) et leur chef de service, qui doit avoir le rôle « Valideur » dans cette entité.
  - Un suppléant valide aussi pendant une période (premier et dernier jour compris) ; le chef garde le droit.
  - Un service se désactive avec un motif et se réactive.
  - Utilisateurs et rôles : champ « Service » de chaque personne (un service actif de son entité de rattachement).
  - La lecture du chef dans Entra ID ou dans SAGA n'est pas faite : écart E-47.
- **Validation par le chef de service** (DEM-15 ; DV-128 ; fin de E-22) :
  - Une demande d'une catégorie « Validation du chef de service » (domaine « Aménagement, déménagement, achat » livré ainsi) passe « En validation ». Le demandeur lit « En attente de l'accord de votre chef de service », et son délai ne compte pas encore.
  - Sans service, sans chef actif ou avec un service désactivé, la demande arrive directement au service technique ; le journal le dit. Si le demandeur est lui-même le chef de son service, la demande arrive aussi directement.
  - Le chef de service a « Demandes à valider (n) » dans le menu et sur l'accueil. Dans la fiche, « Votre décision » : « Valider et transmettre » (commentaire facultatif) ou « Refuser la demande » (motif obligatoire, lu par le demandeur).
  - Une demande validée passe « À qualifier », et ses délais comptent à partir de la validation.
  - Le demandeur peut annuler une demande qui attend l'accord. Le service technique la voit, mais ne la valide pas à la place du chef.
- **Demande reçue par téléphone ou par courriel** (GES-05 ; DV-129) :
  - « Encoder une demande reçue » dans « Demandes de l'entité » (gestionnaire, responsable) : bloc « Demande reçue » (Téléphone ou Courriel, recherche de la personne par son nom), puis le formulaire habituel.
  - La demande est au nom de l'agent : il la retrouve dans ses demandes, et elle suit le circuit de son service. La fiche dit « Reçue par Téléphone » ; le service lit aussi qui l'a encodée.
  - Ni brouillon, ni pièce jointe, ni « Moi aussi » dans ce formulaire.
- **Regrouper des doublons** (GES-06 ; DV-130) : dans la fiche, « Regrouper avec une autre demande ».
  - Le formulaire propose les demandes ouvertes du même bâtiment et permet d'en chercher une autre ; il annonce l'effet avant l'envoi.
  - La demande passe « Fusionnée » (« Regroupée avec une autre demande » pour le demandeur) et renvoie vers la demande principale. Son demandeur, son bénéficiaire et les personnes qui la suivaient suivent la principale.
  - La principale liste « Demandes regroupées ici ». Rien n'est supprimé.
  - Une demande « En validation » ne se regroupe pas.
- **Découper une demande** (GES-06 ; DV-131) : « Découper en plusieurs demandes ».
  - La demande garde son premier problème ; chaque autre devient une demande nouvelle, une à cinq. Chacune a sa description, et au besoin sa catégorie et son lieu.
  - Les demandes nouvelles sont au nom du même demandeur, « À qualifier », avec les délais comptés depuis la réception de l'origine.
  - Liens dans les deux sens : « Demandes issues de celle-ci », « Cette demande est issue de la demande … ». Tout ou rien, numéros sans trou.
- **Colonnes par état** (GES-03 ; DV-132) : « Liste » ou « Colonnes par état » au-dessus de la liste.
  - Six colonnes : À qualifier, Qualifiée, En attente, En cours, Travaux terminés, Rouverte. Les filtres de la liste s'appliquent ; 200 demandes au plus.
  - Une carte ne se déplace que vers un état permis depuis le sien pour la personne : glisser-déposer sur grand écran, bouton « Déplacer » partout.
  - Déplacer ouvre la fiche sur le formulaire du passage : rien ne change sans confirmation.
  - Sur téléphone, une colonne à la fois.
- **Remarques de la recette de la 0.15.0** :
  - R1 : le journal d'audit dit « Note interne » comme les écrans.
  - R2 : un message prend la langue de l'écran ; un modèle inséré donne la langue de la demande ; le service voit et corrige « Langue du message ».
- **Aide et assistant** :
  - Fiches nouvelles : « Demandes à valider », « Services et valideurs », « Encoder une demande reçue ».
  - « Demandes de l'entité » : procédures colonnes, regrouper, découper, encoder. « Mes demandes » : trois questions.
  - Sept captures nouvelles par langue (30 par langue) ; six réponses de l'assistant.
  - Le texte de l'onglet Catégories sur le circuit de validation ne dit plus « appliqué plus tard ».
- **Outils de contrôle** :
  - `mobile:check` couvre l'encodage, les colonnes, « Déplacer », le regroupement et le découpage ; il accepte deux comptes facultatifs, le chef de service (`MOBILE_VALIDEUR_USER`) et l'administrateur (`MOBILE_ADMIN_USER`) ; une connexion par compte.
  - `help:capture` prend deux captures avec le compte du chef de service (`HELP_USER_VALIDEUR`).
- **`recette.sh`** : le contrôle 5 lit la migration `014_validation`, la table des services et les passages du valideur.

**Migration `014_validation`** (ajouts, aucune perte) :

- table `services` ;
- colonnes `users.service_id`, `demandes.service_id`, `demandes.fusionnee_dans` et `demandes.issue_de` ;
- table des passages refaite avec des contraintes élargies (acteur « valideur », regroupement), tous les passages gardés, désactivés compris ; 33 passages livrés.

**Données de démonstration** : relancer `demo.js` (commandes ci-dessous) crée un service « <ENTITÉ>-DEMO » par entité (chef `valideur.<entité>`, membre `agent.<entité>`) et donne un nouveau mot de passe commun.

Huit routes et huit outils MCP nouveaux ; deux permissions nouvelles dans `config/roles.json` : `demandes:valider` (rôle « Valideur », qui existait sans usage) et `services:gerer` (administrateur). Aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env` et `ci.yml` sont inchangés ; les deux images changent.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_16_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_16_0.tar.gz 100% …` (environ 10 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_16_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_16_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.` Noter le nom de la sauvegarde du jour : un retour arrière la restaure obligatoirement.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_16_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/src/services/services.js backend/src/services/fusion.js backend/src/services/decoupage.js frontend/src/pages/AValiderPage.tsx frontend/src/components/demandes/VueColonnes.tsx
```

Attendu : les cinq chemins affichés, sans « No such file ».

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

Attendu : `[DB] Migration 014_validation appliquée` puis `[APP] API 0.16.0 sur le port 3001`.

```
sudo docker compose stop api
```

Attendu : `Container gmao-api Stopped`.

```
sudo docker compose run --rm api node src/demo.js
```

Attendu :

- `[DEMO] 21 comptes de démonstration prêts.` et la liste des adresses ;
- `[DEMO] 0 lieu(x) de démonstration créé(s)…` ;
- `[DEMO] 2 service(s) de démonstration créé(s) (valideur : valideur.<entité>, membre : agent.<entité>).` ;
- le nouveau mot de passe commun, affiché une seule fois : le noter, il sert à `recette.sh` et à la recette.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu :

1. « Compte de démonstration : multi-entites@demo.invalid (le mot de passe reste visible pendant la saisie, la ligne s'efface à Entrée) », puis « Mot de passe : ».
2. Taper le **nouveau** mot de passe commun des comptes de démonstration (il s'affiche pendant la frappe, c'est voulu), puis Entrée.
3. La ligne s'efface et « Mot de passe reçu : N caractère(s). » s'affiche.
4. Neuf lignes `OK`, dont « 5. migration 014_validation appliquée, table des services présente, passages du valideur copiés ».
5. `BILAN : 9 contrôle(s) OK, 0 en échec.`

Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : la 0.15.0 démarre sur une base passée en 0.16.0. Essai du 10/11/2026 dans le bac à sable : connexion, liste, fiches, historique, tableau de bord et dépôt répondent. Mais une demande « En validation » n'y a plus aucun bouton, et personne ne pourrait la valider. Le retour se fait donc **toujours** en deux temps :

1. mêmes commandes avec `gmao-v0_15_0.tar.gz` ;
2. restauration de la sauvegarde du jour (`docs/fr/EXPLOITATION.md`, Restauration ; `chown 10001`).

Les demandes, validations, regroupements et découpages faits depuis la mise à jour sont alors perdus.

## Liste de contrôle à l'écran

Dans Chrome (extension Claude connectée, certificat de NIXUS accepté), à l'adresse `https://192.0.2.10:18443`.

- **C** : contrôle fait par Claude dans l'onglet qu'il ouvre.
- **T** : contrôle de Thierry.

Thierry tape toujours lui-même les mots de passe ; Claude n'écrit qu'après l'accord de Thierry.

1. **T** Connexion avec le compte administrateur.
2. **C** Fenêtre « Nouveautés » : pour l'administrateur, la 0.16.0 en trois lignes (deux pour tous ; « Services et valideurs ») ; bas du menu `v0.16.0`.
3. **C** Administration, « Services et valideurs » : AC et CPAS ont chacun « Secrétariat (démo) », chef « Démo Valideur ». Ouvrir le service de l'AC : un suppléant sans le rôle « Valideur » est refusé, rien n'est enregistré. Utilisateurs et rôles : `agent.ac` porte le service « Secrétariat (démo) ».
4. **T** Connexion de `agent.ac` (Thierry) : nouvelle demande dans « Aménagement, déménagement, achat » ; l'écran dit qu'elle attend l'accord du chef de service, avec un délai compté à partir de cet accord.
5. **T** puis **C** Connexion de `valideur.ac` : « Demandes à valider (1) » dans le menu et sur l'accueil. Avec l'accord de Thierry :
   - ouvrir la demande et « Valider et transmettre » ;
   - sur une seconde demande d'aménagement de `agent.ac`, « Refuser la demande » sans motif : le formulaire demande le motif et rien n'est envoyé ; puis avec un motif : la demande quitte la liste.
6. **T** Retour sur `agent.ac` : la demande validée est « Reçue par le service technique », la refusée « Refusée par votre chef de service », avec le motif dans la ligne du temps.
7. **C** Connexion de `responsable.ac` (Thierry) : note de la 0.16.0 (deux lignes pour tous, une pour le service technique). Puis :
   - « Encoder une demande reçue », Téléphone, pour `agent.ac` : numéro donné, fiche « Reçue par Téléphone », encodée par le responsable ;
   - « Regrouper avec une autre demande » sur un doublon : effet annoncé, puis la principale liste la demande regroupée ;
   - « Découper en plusieurs demandes » en deux : deux numéros, liens dans les deux sens.
8. **C** « Colonnes par état » : six colonnes avec leur nombre ; « Déplacer » sur une carte « À qualifier » ne propose que les états permis et ouvre la qualification sans rien changer ; glisser une carte vers une colonne refusée n'ouvre rien.
9. **C** Journal d'audit (administrateur), en FR et en NL :
   - création et modification d'un service, avec le chef et le suppléant nommés ;
   - dépôt d'une demande avec son circuit en clair ;
   - « Demande regroupée » et « Demande découpée », avec les numéros, jamais les textes ;
   - R1 : « Note interne » sur une ligne de message.
10. **C** Lecture par le MCP :
    - depuis la page de `valideur.ac` : `list_demandes_a_valider` ;
    - depuis celle de `responsable.ac` : `prepare_fusionner_demande`, qui décrit l'effet sans rien changer ;
    - depuis celle de `responsable.cpas` : une demande de l'AC refusée (403).
11. **T** Téléphones, iPhone (Safari) et Android (Chrome) :
    - « Demandes à valider » et la décision du chef ;
    - encodage, regroupement, découpage, colonnes et « Déplacer » ;
    - R2 : un message écrit en NL depuis l'écran en NL ;
    - rien ne dépasse de l'écran (DV-102).
12. **T** Jugement sur l'ergonomie et le métier :
    - catégories soumises à validation (seul le domaine « Aménagement, déménagement, achat » l'est) ;
    - services réels de l'AC et du CPAS et leurs chefs (D-11) ;
    - intérêt de la vue en colonnes pour le service technique.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : aucune dépendance nouvelle ; glisser-déposer natif du navigateur |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : huit routes, huit outils MCP ; parité testée |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché : schémas `ajv`, administrateur pour les services, `demandes:valider` pour le chef de son service seulement, `demandes:traiter` pour l'encodage, le regroupement et le découpage ; cloison testée ; journal sans texte libre |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : `014_validation` ajoute et refait la table des passages sans perte ; contrat généré depuis les routes |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché : circuit par catégorie dans `backend/config/categories.json`, passages dans `cycle-de-vie.json` ; services saisis à l'écran ; test de portabilité vert |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (chiffres dans `MANIFESTE.md`) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | Coché dans Chromium : `mobile:check` à 320, 360, 390 et 412 px, FR et NL, avec trois comptes (41 écrans) ; 1280 px par les captures et le glisser-déposer |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché, avec les preuves d'échec (un trou trouvé et comblé : valideur d'un autre service) |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, note de version | Coché : `demandes.md`, `service-technique.md`, `administration.md`, `referentiel-demandes.md`, `aide.md` ; trois fiches d'aide nouvelles ; intentions de l'assistant ; note de version |
| Aide par écran : fiche, captures, explication de chaque champ, contrôles bloquants | Coché : sept captures nouvelles par langue (30 par langue), « ? » sur chaque champ nouveau, `help:check` 11/11 |

## Questions RGPD

1. Données personnelles nouvelles : **oui**.
   - Le service de chaque personne et le service du demandeur noté sur la demande.
   - Le chef de service et son suppléant, avec la période de suppléance.
   - Le nom du chef qui valide ou refuse, et le motif d'un refus, lus par le demandeur.
   - La personne qui a encodé une demande reçue, et le canal (téléphone, courriel).
   - Les textes des demandes nouvelles d'un découpage et le commentaire d'un regroupement ou d'un découpage. Ce sont des textes libres : l'aide rappelle de décrire le problème, pas les personnes.
   - Le journal d'audit ne garde que les numéros, les identifiants et `commentaire_donne`, jamais un texte.
2. Finalité nouvelle : **non**. Il s'agit toujours de traiter la demande. L'accord du chef de service sur une dépense ou un aménagement est un circuit du traitement, prévu au cahier des charges (DEM-15).
3. Destinataires nouveaux : **oui**, le chef de service et son suppléant.
   - Ils lisent les demandes « à valider » des agents de leur service, sans les champs internes du service technique ni le fil de messages.
   - Ils ne voient rien d'autre, et rien de l'autre entité.
   - Durées de conservation à fixer avec celles des demandes (D-09, étape 41).

## Simulé ou incomplet

- `mobile:check` et les contrôles d'écran ont tourné dans le Chromium du bac à sable (iPhone SE, iPhone 13, Galaxy S9+ et Pixel 7 émulés). Le toucher et Safari se vérifient sur de vrais téléphones (contrôle 11).
- GitHub Actions n'a pas tourné ; les suites ont tourné sous Node 22.23.4 (parcours `ci.yml` sous Node 20 non rejoué).
- Images Docker non reconstruites dans le bac à sable. La migration a tourné sur une base 0.15.0 garnie (installation, comptes et lieux de démonstration, trois demandes), puis `demo.js` et les contrôles du serveur de `recette.sh` (6 sur 6). Le retour vers la 0.15.0 a été essayé sur une base passée en 0.16.0.
- Le chef de service n'est pas lu dans Entra ID ni dans SAGA (E-47) : l'administrateur le désigne à l'écran.
- Le courriel au chef de service pour une demande à valider, et au demandeur pour la décision, arrive avec la 0.17.0 (étape 13).

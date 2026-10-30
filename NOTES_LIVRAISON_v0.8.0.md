# Notes de livraison 0.8.0

30/10/2026 · GMAO communale · Étape 6 : photos et pièces jointes des demandes (DV-82 à DV-85)

## Périmètre

Étape 6 du planning, seule (DV-82), en cinq points.

- **Socle des fichiers (E-16).** `multer` 2.5.0, décidé par Renaud le 28/10/2026, dans un lecteur commun (`backend/src/fichiers.js`) : formulaire multipart, un seul fichier au champ `fichier`, gardé en mémoire, plafonné. Le contenu est jugé sur les premiers octets ; les photos passent par `images.js` (métadonnées retirées, dimensions plafonnées) ; un PDF tronqué ou qui contient un script, un fichier joint ou un formulaire est refusé. La photo d'un lieu passe sur ce lecteur, sans changement à l'écran ; droits, module et cloison sont maintenant contrôlés avant la lecture du fichier.
- **Pièces jointes côté serveur.** Migration `007_pieces_jointes`, dossier `pieces` à côté de la base. Une pièce s'ajoute au brouillon de la personne (DV-85), passe à la demande à l'envoi, s'efface avec le brouillon (« Recommencer à zéro », « Moi aussi », purge des 30 jours). Lecture par le demandeur, le bénéficiaire et le service technique, pas par qui suit seulement ; fichier toujours téléchargé en pièce jointe. Suppression réelle selon DV-84 : le demandeur tant que la demande est « Reçue », le gestionnaire et le responsable toujours, l'ouvrier jamais. Plafonds par entité (DV-83) : 5 pièces, 10 Mo, photos et PDF, dans Réglages de l'entité. Journal sans nom de fichier.
- **Formulaire.** Bloc « Photos et documents » sous la description : « Ajouter une photo ou un document » (appareil photo ou galerie sur téléphone), photos réduites à 1 600 pixels dans le navigateur, consigne (DV-66), compteur, vignettes, « Retirer » avec confirmation. L'invite de reprise du brouillon dit que « Recommencer à zéro » efface aussi les pièces.
- **Fiche.** Ligne « Pièces jointes » dans « Mes demandes » et « Demandes de l'entité » : vignettes avec aperçu, PDF à télécharger, « Retirer » quand le serveur l'autorise (`peut_retirer`).
- **MCP.** `list_pieces_brouillon`, `get_piece`, `delete_piece` (deux appels) ; dépôt et téléchargement hors MCP (E-17, quatre routes).
- **Aide et note de version.** Rubriques Nouvelle demande et Réglages de l'entité, questions « Qui voit les photos de ma demande ? » et « J'ai envoyé une mauvaise photo. Puis-je la retirer ? », réponse de l'assistant ; une ligne pour tous, une de plus pour le responsable.

Migration `007_pieces_jointes` (une table, ajout seulement). Dépendance nouvelle : `multer` ^2.5.0. `nginx.conf` (11 Mo sur la seule route de dépôt des pièces) et `backup.sh` (dossier `pieces`) changent ; Dockerfile, compose, `.env`, `.gitignore` et `ci.yml` inchangés. Les deux images se reconstruisent.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_8_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_8_0.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_8_0.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_8_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées), N sauvegardes de la base conservées.` (le script de la 0.7.5 tourne encore ici : la mention des pièces jointes n'apparaît qu'à la sauvegarde suivante).

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_8_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend frontend
```

Attendu : le contenu des deux dossiers (`Dockerfile`, `package.json`, `src`… et `dist` dans `frontend`).

```
sudo docker compose build
```

Attendu, après quelques minutes (la dépendance nouvelle `multer` est téléchargée) : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web` (ou `Image … Built`), sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[DB] Migration 007_pieces_jointes appliquée`, puis `[APP] API 0.8.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.8.0"},"meta":{"envelope":1,"version":"0.8.0"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_7_5.tar.gz`, sans restaurer la base : la 0.7.5 démarre sur une base passée en 0.8.0 et ignore les pièces jointes (essayé dans le bac à sable) ; elles restent en base et sur le disque.

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5. Préparer sur le PC une photo (JPEG) et un PDF quelconque, sans personne ni plaque lisible.

1. **Version et note.** Avec `agent.ac` : la fenêtre « Nouveautés » montre la 0.8.0 en une ligne (photos) ; le bas du menu montre `v0.8.0`. Avec `responsable.ac` : deux lignes.
2. **Bloc du formulaire.** Avec `agent.ac`, « Nouvelle demande » : sous la description, « Photos et documents (facultatif) », le bouton « Ajouter une photo ou un document », « 0 sur 5 » et la consigne « Ne photographiez ni personne… ». Ajouter la photo et le PDF ensemble : deux vignettes (la photo, l'icône du PDF), « 2 sur 5 ».
3. **Brouillon.** Taper quelques mots dans la description, attendre « Brouillon enregistré à … », aller sur l'accueil, revenir à « Nouvelle demande » : l'invite dit « « Recommencer à zéro » efface aussi les pièces jointes déjà ajoutées (2). » ; « Reprendre » : les deux vignettes sont là.
4. **Envoi et fiche.** Choisir le lieu et la catégorie, envoyer : l'écran dit « Pièces jointes : 2 ». « Mes demandes », ouvrir la demande : ligne « Pièces jointes » ; un clic sur la photo l'agrandit ; un clic sur le PDF le télécharge.
5. **Retirer.** Sur la fiche, « Retirer » sous le PDF, confirmer : il disparaît, « Pièce jointe retirée. ».
6. **Service technique.** Avec `gestionnaire.ac`, « Demandes de l'entité », même demande : la photo est visible, avec « Retirer ». Avec un autre agent qui clique « Moi aussi » sur cette demande : sa fiche ne montre pas les pièces.
7. **Réglages.** Avec `responsable.ac`, Réglages de l'entité, groupe « Pièces jointes des demandes » : mettre le nombre à 0, « Enregistrer » ; avec `agent.ac`, le bloc a disparu du formulaire. Revenir à la valeur livrée.
8. **Journal d'audit.** Avec le compte administrateur : « Pièce jointe ajoutée au brouillon » et « Pièce jointe supprimée », sans nom de fichier ; la demande déposée montre « Pièces jointes : 2 ».
9. **Néerlandais.** En NL, le contrôle 2 montre « Foto's en documenten (optioneel) » et « Fotografeer geen personen… ».
10. **Sauvegarde.** Dans la session SSH, `sudo bash backup.sh` : `… (photos copiées, pièces jointes copiées) …`.

Les contrôles sur iPhone et Samsung (appareil photo, galerie) restent pour la fin du projet (DV-80).

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : `multer` est dans la section 4 ; génération 2.x décidée par Renaud (E-16), sections 4.2 et 10.2 à aligner par lui |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché (`Button`, `Image`, `Popconfirm`, `Alert`) |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : `list_pieces_brouillon`, `get_piece`, `delete_piece` ; fichier hors MCP (E-17) |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché : ajout et suppression contrôlés (droit, auteur, entité, état) et journalisés |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : `007_pieces_jointes` (ajout) ; corps `multipart/form-data` déclaré |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 347/347, interface 149/149 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **oui**. Photos et PDF joints par le demandeur (ils peuvent montrer un lieu de travail, exceptionnellement une personne), avec leur nom affiché, leur taille et leurs dimensions. Minimisation : consigne à l'écran (ni personne, ni plaque lisible, ni dispositif de sécurité), photos réduites et sans métadonnées (EXIF, position), pièces facultatives, plafonnées par entité. Limite : les métadonnées d'un PDF restent (E-34).
2. Finalité nouvelle : **non** (montrer le problème au service technique, même finalité que la demande).
3. Destinataire nouveau : **non** (demandeur, bénéficiaire et service technique, qui lisent déjà la demande ; pas les personnes qui suivent seulement). Conservation : avec la demande ; suppression réelle à l'écran ; pièces d'un brouillon abandonné effacées après 30 jours ; sauvegardes gardées 30 jours.

## Simulé ou incomplet

Rien de simulé. GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.20.2. Images Docker non reconstruites dans le bac à sable ; `nginx.conf` contrôlé par `nginx -t` et mesuré hors conteneur. Contrôles sur téléphone reportés (DV-80).

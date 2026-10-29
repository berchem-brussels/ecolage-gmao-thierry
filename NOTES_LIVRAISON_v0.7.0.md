# Notes de livraison 0.7.0

28/10/2026 · GMAO communale · Étape 7 du planning (lot L1), faite avant l'étape 6 (DV-54) : formulaire de demande complet

## Périmètre

Livré en neuf points (DV-22), sur quatre archives de travail (`gmao-v0_7_0-travail-p4`, `p5`, `p6`, `p6bis`, qui ne sont pas des livraisons) :

- **Point 0, contrôle DV-09.** Archive 0.5.2 conforme ; serveur 238/238, interface 95/95 sur trois lancements. Au début de la séance du 28/10/2026, archive de travail p4 conforme (2 112 711 octets, 337 entrées, SHA-256 `b5419fb4…63820`) ; serveur 266/266, interface 111/111 sur trois lancements ; construction et accessibilité 0 erreur.
- **Point 1, demandes du même bâtiment et « Moi aussi » (DEM-04).** Sous le lieu choisi, les demandes ouvertes de l'entité dans le même bâtiment (bâtiment du lieu et tous ses locaux ; le site si le lieu n'est dans aucun bâtiment), même local puis même catégorie puis plus récentes, cinq au plus puis « Voir les autres (N) » ; catégorie, lieu, état, date, début de la description, sans nom ni numéro. « Moi aussi » associe la personne à la demande ; son texte part comme remarque lue par le seul service technique ; « Vous suivez aussi cette demande » dans « Mes demandes ».
- **Point 2, danger (DEM-06).** Case en tête du formulaire ; numéro à appeler (urgence de l'entité, sinon service, sinon « prévenez votre responsable ») ; P1 ; « traitée en priorité absolue » sans heure pour le demandeur.
- **Point 3, « Pour », date et créneau (DEM-07, DEM-08).** Collègue de l'entité (il lit la demande, « Faite pour vous ») ou service ou personne sans compte ; date souhaitée d'aujourd'hui à un an ; moment à respecter.
- **Point 4, brouillon (DEM-11).** Enregistré tout seul sur le serveur, un par personne et par entité, 30 jours ; « Reprendre » ou « Recommencer à zéro » ; hors journal d'audit (écart E-27, à soumettre à Renaud).
- **Point 5, questions propres à la catégorie (DEM-05).** Réglées par le responsable sur un domaine ou une nature (« Oui ou non » ou un choix parmi 2 à 6 réponses, FR et NL, « Obligatoire » au besoin, dix actives au plus) ; en boutons dans le formulaire, domaine d'abord ; contrôle serveur ; réponses sur la fiche ; trois questions livrées par entité (plomberie, prises, chauffage).
- **Point 6, mentions RGPD et consigne (RGPD-10, DEM-16).** Ligne courte au-dessus du bouton d'envoi, « En savoir plus », rubrique « Protection de vos données » de l'aide ; textes FR et NL et contact du DPO par entité, dans Réglages de l'entité, groupe « Protection des données » (écart mineur E-28) ; l'aide de la description rappelle de ne citer personne ; consigne photo à l'étape 6.
- **Point 6 bis, rouge des erreurs (E-26, accord de Renaud).** 4,5:1 au moins en clair et en sombre, contrôlé par un test.
- **Point 7.** Numéro 0.7.0, note de version, aide (rubriques et questions 20 à 24), réponses de l'assistant, documentation FR, NL et EN, fiches fonctionnelles, fichiers de suivi.

Migration **`006_demandes_formulaire`** : tables `demande_suiveurs`, `brouillons`, `questions_categorie`, `demande_reponses` ; colonnes `danger`, `beneficiaire_id`, `beneficiaire_texte`, `date_souhaitee`, `creneau` de `demandes`. Tables et colonnes ajoutées seulement. Onze routes nouvelles et leurs outils MCP. Aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh` et `.env` inchangés.

Toujours ouvert : E-24 (`body-parser`, `fast-uri`, et `qs` publié depuis la 0.5.2), sans accord de Renaud, avant la production ; jamais `npm audit fix`. E-27 (brouillons hors journal), à soumettre. DV-50 et DV-53, hors 0.7.0.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_7_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_7_0.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_7_0.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_7_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées), N sauvegardes de la base conservées.` **Noter le nom de la sauvegarde** (`gmao-AAAAMMJJ-HHMM.db`) : c'est elle qui servirait au retour arrière, la migration ne se défaisant pas.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_7_0.tar.gz --strip-components=1
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

Attendu : `[DB] Migration 006_demandes_formulaire appliquée` puis `[APP] API 0.7.0 sur le port 3001`. Sans la ligne de migration, s'arrêter et coller la sortie.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.7.0"},"meta":{"envelope":1,"version":"0.7.0"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière vers la 0.5.2 : mêmes commandes avec `gmao-v0_5_2.tar.gz`, puis restauration de la sauvegarde notée ci-dessus (`docs/fr/EXPLOITATION.md`, Restauration : `sudo docker compose stop api`, `sudo docker cp <sauvegarde>.db gmao-api:/app/data/app.db`, `sudo docker compose run --rm --no-deps --user root --entrypoint "" api chown 10001:10001 /app/data/app.db`, `sudo docker compose up -d`). Les demandes déposées sous la 0.7.0 seraient perdues.

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5 (sur téléphone : fermer l'onglet et le rouvrir). Comptes de démonstration (`@demo.invalid`, mot de passe commun).

1. **Note de version**, avec `agent.ac` : la fenêtre « Nouveautés de la version 0.7.0 » montre trois lignes ; « J'ai lu » la ferme ; le bas du menu montre `v0.7.0`. Avec `responsable.ac` : cinq lignes.
2. **Réglages**, avec `responsable.ac` : Réglages du service, Réglages de l'entité. Saisir un téléphone d'urgence (bloc Urgence), « Enregistrer ». Bloc « Protection des données » : saisir le contact du DPO, « Enregistrer » ; les mentions livrées sont affichées, avec « Variables permises : {entite}, {dpo} ».
3. **Questions**, toujours `responsable.ac` : Catégories et délais, cliquer sur Plomberie et sanitaires : « Questions du formulaire » montre « Y a-t-il de l'eau au sol ? ». « Ajouter une question », par exemple « D'où vient l'eau ? » / « Waar komt het water vandaan? », « Un choix parmi 2 à 6 réponses », deux réponses en FR et en NL, « Enregistrer ». Dans l'aperçu, ouvrir Plomberie et sanitaires puis Fuite d'eau : les deux questions apparaissent en boutons.
4. **Formulaire**, avec `agent.ac` (sur téléphone si possible) : « Nouvelle demande ». Cocher « Danger pour les personnes ou les biens » : le numéro réglé au contrôle 2 s'affiche ; décocher. Choisir Plomberie et sanitaires, Fuite d'eau : les questions apparaissent ; répondre. Ouvrir « Pour quelqu'un d'autre ? » et « Une date ou un moment à respecter ? ». « En savoir plus » au-dessus du bouton d'envoi déplie la mention avec le contact du DPO.
5. **Brouillon** : taper une description, attendre « Brouillon enregistré à … », quitter (Accueil), revenir sur « Nouvelle demande » : « Reprendre » remet tout, réponses comprises. Envoyer : numéro, délai indicatif et réponses sur l'écran de confirmation.
6. **Moi aussi**, avec `gestionnaire.ac` (qui a aussi le rôle de demandeur) : « Nouvelle demande », choisir le même lieu que la demande du contrôle 5 : le bloc des demandes déjà ouvertes du bâtiment la montre, sans nom. « Moi aussi », taper une remarque, confirmer : écran « Vous suivez cette demande ». Puis « Demandes de l'entité », ouvrir la demande : « Précisions » (réponses), « Suivie aussi par » avec la remarque.
7. **Erreurs** : sous un champ obligatoire vidé (par exemple la description faite d'espaces), « Ce champ est obligatoire » est d'un rouge plus foncé qu'avant ; en thème sombre (lune en haut), lisible aussi.
8. **Aide** : Mode d'emploi et FAQ : rubrique « Protection de vos données » avec la mention et le DPO ; questions 20 à 24 dans la FAQ.
9. Facultatif, en néerlandais sur l'iPhone ou un Samsung : contrôles 4 et 5 ; rien ne déborde sur le côté.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` ; aucune dépendance nouvelle | Coché |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue (rouge d'erreur modifié sur décision de Renaud, E-26) | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché (onze routes, onze outils, parité vérifiée) |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché, sauf brouillon hors journal (E-27, à soumettre) |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché (`006_demandes_formulaire`, ajouts seulement ; contrat généré des routes) |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché (tests de portabilité et de parité ; mentions livrées génériques, `{entite}`) |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec ; tests avec cas de refus ; parcours 360 et 1280 px, iPhone 13, Galaxy S9+ | Coché |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | **Non** : serveur 1 haute (`body-parser`) et 2 modérées (`fast-uri`, `qs`), verrou inchangé ; E-24 ouvert avant la production, décision de Renaud |
| Aucun appel sortant nouveau ; trois questions RGPD | Coché (ci-dessous) |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **oui**. Bénéficiaire d'une demande (collègue désigné ou texte libre), date souhaitée et moment, remarque du « Moi aussi » (lue par le seul service technique), brouillon du formulaire (lu par la personne seule, effacé au plus tard après 30 jours), réponses aux questions de la catégorie. Minimisation : ni nom ni numéro dans la liste des demandes du même bâtiment ; nom du demandeur caché à qui suit seulement ; journal sans texte libre.
2. Finalité nouvelle : **non** (traiter et suivre les demandes d'intervention).
3. Destinataire nouveau : **oui**, le collègue pour qui la demande est faite, qui la lit dans « Mes demandes ». À porter au registre et à l'analyse d'impact (DPO). Les mentions d'information livrées (base légale : mission d'intérêt public, art. 6.1.e) et le contact du DPO de chaque entité sont à faire valider par le DPO.

## Simulé ou incomplet

Rien de simulé. Contrôle visuel avec le moteur de Chrome (gabarits iPhone 13 et Galaxy S9+) ; Safari et Samsung réels à confirmer à la recette. Migration jouée sur une base neuve et sur une base 0.3.1 par le test de migration (004 à 006) ; images Docker non reconstruites dans le bac à sable (aucun fichier de l'image changé) ; retour arrière par restauration de la sauvegarde, procédure déjà jouée (`docs/fr/EXPLOITATION.md`), sans nouvel essai faute de l'archive 0.5.2 dans la séance. Alerte de la garde (danger) et courriels au bénéficiaire et aux personnes qui suivent : étapes 13 et 17.

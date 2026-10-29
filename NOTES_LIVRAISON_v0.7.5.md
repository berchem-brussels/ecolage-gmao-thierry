# Notes de livraison 0.7.5

29/10/2026 · GMAO communale · Lieux récents, bandeau de connexion, journal d'audit plus lisible (DV-74, DV-53, DV-76)

## Périmètre

Améliorations de la recette de la 0.7.4, regroupées en une version (DV-76).

- **Vos lieux récents (DV-74).** En tête du choix d'un lieu (« Où ? » de « Nouvelle demande » et « Mon lieu de travail »), les derniers lieux distincts des demandes de la personne dans l'entité active, en boutons, cinq au plus, sans le lieu déjà choisi ; masqués pendant une recherche. Tirés des demandes déjà en base : rien de nouveau n'est enregistré. Le profil rend `lieux_recents`, par l'API comme par le MCP (`get_profile`).
- **Connexion (DV-53).** Le bandeau « Identifiants incorrects » s'efface dès que l'adresse change, et quand un nouvel essai est arrêté par le contrôle du formulaire. Cause : le bandeau n'était effacé qu'au départ d'un nouvel envoi au serveur ; un essai arrêté par le formulaire ne partait pas et laissait l'ancien message à côté du nouveau.
- **Journal d'audit.** Une case à cocher s'affiche « Oui » ou « Non » au lieu de 1 ou 0 ; un champ vide n'est plus montré, sauf « Avant » et « Après », où le vide se dit « aucun ». Cause : le détail affichait la valeur brute enregistrée.
- **Aide et note de version.** Rubriques Nouvelle demande et Journal d'audit complétées ; deux lignes pour tous, une de plus pour l'administrateur.

Aucune migration, aucune route, aucun outil MCP, aucune dépendance nouvelles. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `.gitignore` et `ci.yml` inchangés. Les deux images se reconstruisent (code du serveur, `frontend/dist/`).

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_7_5.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_7_5.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_7_5.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_7_5.tar.gz
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
sudo tar xzf gmao-v0_7_5.tar.gz --strip-components=1
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

Attendu : `[APP] API 0.7.5 sur le port 3001`, sans ligne `[DB] Migration` (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.7.5"},"meta":{"envelope":1,"version":"0.7.5"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_7_4.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. **Version et note.** Avec `agent.ac` : la fenêtre « Nouveautés » montre la 0.7.5 en deux lignes (lieux récents, connexion) ; le bas du menu montre `v0.7.5`. Avec le compte administrateur : trois lignes.
2. **Lieux récents.** Avec `agent.ac`, « Nouvelle demande », « Changer de lieu » : « Vos lieux récents » montre en boutons les autres lieux de ses demandes (s'il n'en a qu'un, la liste n'apparaît pas : déposer une demande sur un autre lieu, puis revenir). Un clic choisit le lieu. Taper dans la recherche masque la liste. Même chose dans « Mon lieu de travail ».
3. **Connexion.** Se déconnecter ; essayer `agent.ac@demo.invalid` avec un mauvais mot de passe : « Identifiants incorrects. » ; modifier une lettre de l'adresse : le bandeau disparaît. Recommencer, puis vider le mot de passe et cliquer sur « Se connecter » : le bandeau disparaît, « Ce champ est obligatoire » sous le mot de passe.
4. **Journal d'audit.** Administration, Journal d'audit, « Demande d'intervention déposée », ligne de `AC-DI-2026-00004` : « Danger signalé : Non », « Bénéficiaire en texte libre : Non » ; plus de ligne vide (« Bénéficiaire (identifiant) », « Date souhaitée »). « Lieu de travail habituel choisi » : « Avant : aucun ».
5. **Néerlandais.** En NL, le contrôle 2 montre « Uw recente plaatsen », et le contrôle 4 « Ja » ou « Nee ».

Puis reprendre la recette en cours : contrôles 2 et 3 de la 0.7.1, puis contrôles 5 à 9 de la 0.7.0.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` ; aucune dépendance nouvelle | Coché |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché (boutons de résultats existants, `Form` d'Ant Design) |
| Toute ressource nouvelle a ses routes et ses outils MCP | Sans objet ; `get_profile` rend `lieux_recents` comme l'API |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Sans objet : aucune écriture nouvelle ; lieux récents limités à la personne et à l'entité active, testés |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Sans objet (aucune migration ; aucune route ni schéma changés) |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 309/309, interface 132/132 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **non** (les lieux récents sont lus dans les demandes de la personne, déjà enregistrées, et ne sont montrés qu'à elle).
2. Finalité nouvelle : **non** (raccourci du formulaire de demande).
3. Destinataire nouveau : **non**.

## Simulé ou incomplet

Rien de simulé. GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.20.2. Images Docker non reconstruites dans le bac à sable.

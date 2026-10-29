# Notes de livraison 0.5.1

26/10/2026 · GMAO communale · Correctif de la recette du 26/10/2026 (DV-04), avant l'étape 6

## Périmètre

Livré en cinq points (DV-22) :

- **Point 0, contrôle DV-09.** Archive 0.5.0 conforme à `ETAT.md` ; serveur 236/236, interface 81/81 sur trois lancements, construction et accessibilité 0 erreur. Aucun test instable.
- **Point 1, liste des bâtiments.** Dans « Changer de lieu », « Parcourir la liste des bâtiments » ouvre et referme la liste ; la liste a un bouton « Masquer la liste », qui rend le curseur au bouton d'ouverture ; « Annuler » apparaît dès qu'une recherche ou la liste est ouverte, même sans lieu choisi. Une entité sans lieu actif affiche un message au lieu d'une liste vide.
- **Point 2, bouton en double.** « Mes demandes » n'a plus son propre bouton « Nouvelle demande » ; restent celui du haut de l'écran et celui du menu.
- **Point 3, champs obligatoires.** Un champ obligatoire vide, ou fait seulement d'espaces, affiche « Ce champ est obligatoire » (« Dit veld is verplicht ») sous le champ, avant l'envoi, dans tous les formulaires : lieux, valeurs de liste, catégories, priorités, calendrier, réglages, paramètres, utilisateurs, entités, installation, mot de passe, simulateur ; aussi sous les motifs de désactivation et sous la description d'une demande. Le serveur refuse toujours ces valeurs (DV-37). Les mots de passe gardent leurs espaces. L'interface n'existe qu'en français et en néerlandais : le message n'a pas de version anglaise.
- **Point 4.** Note de version (deux lignes pour tous), aide (« Masquer la liste »), documentation FR, NL et EN, fiche fonctionnelle `docs/fonctionnel/demandes.md` (règles 13 à 15).

Aucune migration, aucune route, aucune dépendance nouvelles. Serveur inchangé hors note de version et numéro. Dockerfile, compose, `nginx.conf`, `backup.sh` et `.env` inchangés.

Retiré de la version : la mise à jour ciblée du verrou du serveur (`body-parser`, `fast-uri`), faute d'accord de Renaud (E-24, ouvert avant la production). Jamais `npm audit fix`.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_5_1.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_5_1.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_5_1.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_5_1.tar.gz
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
sudo tar xzf gmao-v0_5_1.tar.gz --strip-components=1
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

Attendu : `[APP] API 0.5.1 sur le port 3001`, sans ligne `[DB] Migration` (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.5.1"},"meta":{"envelope":1,"version":"0.5.1"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_5_0.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5 (sur téléphone : fermer l'onglet et le rouvrir). Comptes de démonstration (`@demo.invalid`, mot de passe commun).

1. Connexion avec `agent.ac` : la fenêtre « Nouveautés de la version 0.5.1 » montre deux lignes ; « J'ai lu » la ferme. Le bas du menu montre `v0.5.1`.
2. **Liste des bâtiments** : « Nouvelle demande », « Changer de lieu », « Parcourir la liste des bâtiments » : la liste s'ouvre, une flèche vers le haut à côté du lien. « Masquer la liste » (en haut à droite de la liste) la referme. « Parcourir… » la rouvre, un second clic la referme. « Annuler » referme la recherche et revient au lieu proposé.
3. **Bouton unique** : « Mes demandes » : plus de bouton « Nouvelle demande » sous le titre ; celui du haut de l'écran et celui du menu sont là.
4. **Champ obligatoire** : dans « Nouvelle demande », taper seulement des espaces dans la description : « Ce champ est obligatoire » s'affiche en rouge sous le champ ; taper une phrase : le message disparaît.
5. **Contrôle 5 de la 0.5.0, sur un iPhone (Safari) et un téléphone Samsung (Chrome), en néerlandais** (avatar en haut à droite, langue NL) : bouton « + » en haut, « Andere plaats », « De lijst van de gebouwen doorlopen » puis « Lijst verbergen », tuiles sur deux colonnes, une demande envoyée, rien ne déborde sur le côté.
6. Avec `responsable.cpas` : Réglages du service, Listes de valeurs, « Créer » : libellé en français fait de deux espaces, « Enregistrer » : « Ce champ est obligatoire » sous le champ, pas de « Données invalides ». « Annuler ».
7. Toujours avec `responsable.cpas`, ouvrir la valeur « Essai » (désactivée) ou une autre valeur active : dans « Motif de la désactivation », taper seulement des espaces : le message s'affiche sous le motif et le bouton de désactivation reste grisé. Ne pas désactiver ; fermer.
8. Avec le compte administrateur : Administration, Utilisateurs et rôles, « Créer » : prénom fait d'espaces : « Ce champ est obligatoire » sous le champ. Fermer sans enregistrer.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` ; aucune dépendance nouvelle | Coché |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Sans objet : aucune ressource nouvelle |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché (inchangés) |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Sans objet : aucune migration, aucune route |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché (tests de portabilité et de parité) |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec ; tests avec cas de refus ; parcours FR, NL, 360 et 1280 px, iPhone 13, Galaxy S9+ | Coché |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | **Non** : serveur 1 haute (`body-parser`) et 1 modérée (`fast-uri`), inchangées ; correctif retiré faute d'accord de Renaud ; E-24 ouvert avant la production |
| Aucun appel sortant nouveau ; trois questions RGPD | Coché (ci-dessous) |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **non**.
2. Finalité nouvelle : **non**.
3. Destinataire nouveau : **non**.

## Simulé ou incomplet

Rien de simulé. Contrôle visuel avec le moteur de Chrome (gabarits iPhone 13 et Galaxy S9+) ; Safari sur un vrai iPhone et Chrome sur un vrai Samsung se vérifient à la recette (contrôle 5). Image Docker non reconstruite dans le bac à sable : aucun fichier de l'image ni migration changés. Écart nouveau : E-26 (contraste du rouge d'erreur d'Ant Design, 3,3:1, décision de Renaud). Remarque gardée pour plus tard : le détail du journal d'audit montre `lieu_id` et `categorie_id` au lieu des noms.

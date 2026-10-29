# Notes de livraison 0.7.4

29/10/2026 · GMAO communale · Noms du lieu et de la catégorie dans le détail du journal d'audit (DV-50)

## Périmètre

- **Journal d'audit lisible.** Dans le détail d'une ligne, un lieu ou une catégorie désigné par son identifiant s'affiche par son code et son nom, dans la langue de l'écran, l'identifiant entre parenthèses (« MC-A-12 — Bureau 12 (#12) ») : lieu et catégorie d'une demande déposée ; lieu de travail habituel choisi par l'agent ou réglé par l'administrateur ; lieu ou domaine de rattachement d'un lieu ou d'une catégorie déplacé. Une fiche qui n'existe plus est signalée « fiche introuvable ».
- **Rien de plus n'est enregistré.** Les noms sont trouvés à la lecture (`noms` de `GET /api/audit`, `GET /api/audit/:id`, `list_audit`, `get_audit`) ; le journal ne change pas, les lignes anciennes en profitent aussi. Le bénéficiaire d'une demande reste un identifiant (DV-73). Toujours réservé à l'administrateur.
- **Valeurs composées.** « Avant » et « Après » s'affichent champ par champ, avec leurs libellés, au lieu du texte JSON ; libellés FR et NL des champs des demandes.
- **Aide et note de version.** Rubrique Journal d'audit complétée ; une ligne pour l'administrateur seulement.

Aucune migration, aucune route, aucun outil MCP, aucune dépendance nouvelles. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `.gitignore` et `ci.yml` inchangés. Les deux images se reconstruisent (code du serveur, `frontend/dist/`).

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_7_4.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_7_4.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_7_4.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_7_4.tar.gz
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
sudo tar xzf gmao-v0_7_4.tar.gz --strip-components=1
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

Attendu : `[APP] API 0.7.4 sur le port 3001`, sans ligne `[DB] Migration` (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.7.4"},"meta":{"envelope":1,"version":"0.7.4"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_7_3.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. **Version.** Avec `agent.ac` : aucune fenêtre « Nouveautés » ; le bas du menu montre `v0.7.4`.
2. **Note de l'administrateur.** Avec le compte administrateur : la fenêtre « Nouveautés » montre la 0.7.4 (une ligne sur le journal d'audit) ; « J'ai lu » la ferme.
3. **Demande déposée.** Administration, Journal d'audit, filtre « Demande d'intervention déposée » ; déplier la ligne de `AC-DI-2026-00004` : « Lieu » et « Catégorie » montrent un code et un nom suivis de l'identifiant entre parenthèses ; plus de `lieu_id` ni de `categorie_id`.
4. **Lieu habituel.** Même écran, filtre « Lieu de travail habituel choisi » (s'il y a une ligne) : « Après » montre le code et le nom du lieu.
5. **Néerlandais.** Passer l'écran en NL : les mêmes lignes nomment le lieu et la catégorie en néerlandais.

Puis reprendre la recette en cours : contrôles 2 et 3 de la 0.7.1, puis contrôles 5 à 9 de la 0.7.0.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` ; aucune dépendance nouvelle | Coché |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché (`Descriptions` d'Ant Design, requêtes SQL écrites) |
| Toute ressource nouvelle a ses routes et ses outils MCP | Sans objet ; `list_audit` et `get_audit` rendent `noms` comme l'API |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Sans objet : aucune écriture nouvelle ; lecture du journal réservée à l'administrateur, testée |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Sans objet (aucune migration ; aucune route ni schéma changés) |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 300/300, interface 129/129 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **non** (les noms des lieux et des catégories ne sont pas des données personnelles ; le bénéficiaire reste un identifiant).
2. Finalité nouvelle : **non**.
3. Destinataire nouveau : **non** (journal toujours réservé à l'administrateur).

## Simulé ou incomplet

Rien de simulé. GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.20.2. Images Docker non reconstruites dans le bac à sable.

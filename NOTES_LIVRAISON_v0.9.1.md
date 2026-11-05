# Notes de livraison 0.9.1

03/11/2026 · GMAO communale · Correctif de la 0.9.0 (R1 et R2, DV-94), première version de l'étape 8 bis (DV-95)

## Périmètre

Deux défauts mineurs relevés à la recette de la 0.9.0 le 03/11/2026, corrigés avant le lot du standard v3.3.

- **R1, compteurs du tableau de bord.** Sur « Demandes de l'entité », après une qualification, la liste se mettait à jour mais pas les quatre compteurs au-dessus. Cause racine : le composant `TableauBord` chargeait ses compteurs à son affichage et au changement d'entité seulement ; la page rechargeait la liste sans le prévenir. Correction : la page lui passe un compteur `rafraichir`, augmenté après chaque qualification ; les nombres restent affichés pendant le rechargement et ne repassent à « … » qu'au changement d'entité.
- **R2, état dans le journal d'audit.** Le détail d'une qualification montrait l'état par son code (`a_qualifier`, `qualifiee`) dans « Avant » et « Après ». Cause racine : l'écran du journal traduisait les cases à cocher et les noms trouvés par le serveur, mais rendait tout autre texte tel quel. Correction : une table fixe relie le champ `etat` aux libellés du service technique (« À qualifier », « Qualifiée », en FR et en NL) ; un code sans libellé reste affiché tel quel. Le journal enregistré ne change pas ; l'outil MCP du journal rend toujours le code.
- **Tests de non-régression.** Un test pour R1 (le compteur passe de 4 à 3 après la qualification, un seul rechargement), deux pour R2 (FR et NL, avec un code inconnu) ; chacun échoue sans la correction (`docs/fr/SECURITE.md`, section 0.9.1).
- **Standard v3.3.** La copie de `STANDARD.md` publiée avec le code passe en v3.3, avec les valeurs d'exemple ; E-16, E-26, E-27, E-31 et E-32 fermés ou constatés alignés ; E-36 à E-38 relevés sur le gabarit 1.3.0 (`ECARTS-CDC.md`).
- **Note de version.** Une ligne pour le service technique (compteurs), une pour l'administrateur (journal) ; rien pour le demandeur.

Aucune migration, aucune dépendance nouvelle, aucune route nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `.gitignore` et `ci.yml` inchangés. L'image de l'interface change (`frontend/dist/`) ; celle du serveur se reconstruit pour le numéro de version et la note.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_9_1.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_9_1.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_9_1.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_9_1.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.`

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_9_1.tar.gz --strip-components=1
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

Attendu : `[APP] API 0.9.1 sur le port 3001`, sans ligne `[DB] Migration`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.9.1"},"meta":{"envelope":1,"version":"0.9.1"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_9_0.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. **Version et note.** Avec `responsable.ac` : la fenêtre « Nouveautés » montre la 0.9.1 en une ligne (compteurs du tableau de bord) ; le bas du menu montre `v0.9.1`. Avec `agent.ac` : aucune fenêtre « Nouveautés ».
2. **R1, compteurs après une qualification.** Avec `gestionnaire.ac`, « Demandes de l'entité » : noter le nombre « À qualifier ». Ouvrir une demande « À qualifier » (par exemple `AC-DI-2026-00006`), « Qualifier », garder la priorité proposée, « Qualifier » : « Demande qualifiée ». Sans recharger la page, le compteur « À qualifier » a baissé de 1 ; la demande est « Qualifiée » dans la liste.
3. **Contrôle 3 de la 0.9.0.** Cliquer sur le compteur « En retard » : la liste s'ouvre avec « En retard » choisi, triée par échéance ; le nombre sous les filtres égale le compteur.
4. **Contrôle 7 de la 0.9.0.** Ouvrir `AC-DI-2026-00007`, « Modifier la qualification », choisir une autre priorité : le champ « Motif du changement de priorité » apparaît ; « Qualifier » sans motif : « Indiquez pourquoi vous changez la priorité proposée. ». Écrire un motif, « Qualifier » : « Demande qualifiée », nouvelle priorité et motif sur la fiche.
5. **R2 et contrôle 10 de la 0.9.0.** Avec le compte administrateur, Journal d'audit, famille « Demandes » : ligne « Demande qualifiée » du contrôle 2, déplier : « Avant » contient « État : À qualifier », « Après » contient « État : Qualifiée » ; aucune trace de `a_qualifier` ni de `qualifiee`. « Consignes à l'ouvrier » reste « Oui » ou « Non », sans le texte.
6. **Néerlandais.** Même ligne en NL : « Status: Te kwalificeren » puis « Status: Gekwalificeerd » ; compteur « Te kwalificeren » sur le dashboard.

Les contrôles sur iPhone et Samsung restent pour la fin du projet (DV-80).

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : aucune dépendance nouvelle |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Sans objet : aucune ressource nouvelle |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Sans objet : aucune écriture nouvelle |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Sans objet : aucune migration, aucune route nouvelle |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché (test de portabilité vert ; note de version FR et NL) |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 372/372, interface 164/164 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | En partie : les deux écrans touchés sont rendus et contrôlés en FR et en NL par les tests d'écran (axe-core) ; aucun changement de mise en page ; navigateur réel non joué pour ce correctif, vérifié par la recette sur NIXUS (contrôles 2 à 6) |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché (copie de `STANDARD.md` v3.3 avec les valeurs d'exemple) |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, intentions, note de version | Coché : règles ajoutées aux fiches `service-technique.md` (7) et `administration.md` (15) ; note de version ; mode d'emploi, FAQ et intentions inchangés (comportement attendu, déjà décrit) |

## Questions RGPD

1. Données personnelles nouvelles : **non**.
2. Finalité nouvelle : **non**.
3. Destinataire nouveau : **non**.

## Simulé ou incomplet

Rien de simulé. GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20. Images Docker non reconstruites dans le bac à sable. Essai dans un navigateur réel non joué (correctif de deux composants couverts par les tests d'écran) : la recette sur NIXUS en tient lieu.

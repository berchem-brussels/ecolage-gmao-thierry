# Notes de livraison 0.7.3

29/10/2026 · GMAO communale · Correctif de sécurité des dépendances du serveur, sans changement fonctionnel

## Périmètre

- **Verrou du serveur mis à jour, sur accord de Renaud (E-24, E-30), donné pour l'écolage ; la pratique suivie et les questions pour le standard sont en E-31.** Trois paquets seulement, dans la même génération, sans changer `package.json` : `body-parser` 1.20.8 → 1.20.9 (haute, GHSA-27r3-jxmh-p828, déni de service par un corps compressé), `fast-uri` 3.1.8 → 3.1.9 (modérée), `qs` 6.16.0 → 6.16.2 (modérée). Commande : `npm update body-parser qs fast-uri --no-save` ; jamais `npm audit fix`. Express reste en 4.22.3.
- **Audit.** `npm audit --omit=dev` du serveur : 0 vulnérabilité. L'étape d'audit du travail `tests` de GitHub passe : la coche sera verte.
- **Test nouveau.** `dependances.test.js` : le verrou ne redescend jamais sous les versions corrigées ; Express reste en version 4.
- **Note de version.** Une ligne pour l'administrateur seulement (exigée par le test du catalogue) ; aucune fenêtre ne s'ouvre pour les autres comptes.

Aucune migration, aucune route, aucun outil MCP, aucune dépendance nouvelles. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `.gitignore` et `ci.yml` inchangés ; `frontend/dist/` identique à celui de la 0.7.2. L'image du serveur se reconstruit (nouveau verrou).

La 0.7.3 s'installe directement sur la 0.7.1 : la 0.7.2 n'a rien changé à l'écran et peut être sautée sur l'hôte d'acceptance.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_7_3.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_7_3.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_7_3.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_7_3.tar.gz
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
sudo tar xzf gmao-v0_7_3.tar.gz --strip-components=1
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

Attendu : `[APP] API 0.7.3 sur le port 3001`, sans ligne `[DB] Migration` (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.7.3"},"meta":{"envelope":1,"version":"0.7.3"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_7_1.tar.gz` ou `gmao-v0_7_2.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. **Version.** Avec `agent.ac` : aucune fenêtre « Nouveautés » ; le bas du menu montre `v0.7.3`.
2. **Note de l'administrateur.** Avec le compte administrateur : la fenêtre « Nouveautés » montre la 0.7.3 (correctif de sécurité, une ligne) et, si elle n'a pas encore été lue, la 0.7.2 (code publié sous licence libre) ; « J'ai lu » la ferme.
3. **Demande.** Avec `agent.ac` : déposer une demande courte ; le numéro s'affiche (les corps JSON sont lus par le composant mis à jour).

Puis reprendre la recette en cours sur la 0.7.3 : contrôles 2 et 3 de la 0.7.1, puis contrôles 5 à 9 de la 0.7.0.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` ; aucune dépendance nouvelle | Coché (mise à jour ciblée du verrou, accord de Renaud) |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché (test `dependances.test.js` pour Express) |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché (aucun écran changé) |
| Toute ressource nouvelle a ses routes et ses outils MCP | Sans objet |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Sans objet : aucune écriture nouvelle ; E-27 inchangé |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Sans objet |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 293/293, interface 127/127 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **non**.
2. Finalité nouvelle : **non**.
3. Destinataire nouveau : **non**.

## Simulé ou incomplet

Rien de simulé. GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.20.2. Image Docker non reconstruite dans le bac à sable.

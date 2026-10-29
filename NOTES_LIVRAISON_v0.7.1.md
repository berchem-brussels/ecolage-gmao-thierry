# Notes de livraison 0.7.1

28/10/2026 · GMAO communale · Correctif de la recette de la 0.7.0 du 28/10/2026 (DV-04), avant la suite de la recette

## Périmètre

- **Brouillon (DEM-11).** Avec le lieu proposé d'office (lieu de travail habituel ou lieu de la dernière demande), aucun brouillon ne s'enregistrait : le profil rend ce lieu avec sa nature, champ que le contrôle du serveur refusait, et l'écran n'affichait rien. Le formulaire n'envoie plus que les champs connus du lieu, et le serveur accepte la nature. Constaté au contrôle 5 de la recette de la 0.7.0.
- **Mention complète livrée (RGPD-10).** « Administration communale traite… » et « fixées par Administration communale » (nom sans article) deviennent « Responsable du traitement : Administration communale. Les données de cette demande servent… » et « fixées par le responsable du traitement » ; même tournure en néerlandais (« Verwerkingsverantwoordelijke: … »). Seul le texte livré change : un texte modifié par un responsable reste tel quel. Constaté au contrôle 4.
- Note de version : une ligne pour tous, une pour le responsable. Documentation FR, NL et EN ; fiches fonctionnelles `demandes.md` (règle 28) et `administration.md` (règle 11).

Aucune migration, aucune route, aucun outil MCP, aucune dépendance nouvelles. Dockerfile, compose, `nginx.conf`, `backup.sh` et `.env` inchangés.

Toujours ouvert : E-24 (`body-parser`, `fast-uri`, `qs`), sans accord de Renaud, avant la production ; jamais `npm audit fix`. E-27 (brouillons hors journal), à soumettre.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_7_1.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_7_1.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_7_1.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_7_1.tar.gz
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
sudo tar xzf gmao-v0_7_1.tar.gz --strip-components=1
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

Attendu : `[APP] API 0.7.1 sur le port 3001`, sans ligne `[DB] Migration` (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.7.1"},"meta":{"envelope":1,"version":"0.7.1"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_7_0.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5 (sur téléphone : fermer l'onglet et le rouvrir). Comptes de démonstration (`@demo.invalid`, mot de passe commun).

1. **Note de version**, avec `agent.ac` : la fenêtre « Nouveautés de la version 0.7.1 » montre une ligne ; « J'ai lu » la ferme ; le bas du menu montre `v0.7.1`. Avec `responsable.ac` : deux lignes.
2. **Brouillon avec le lieu proposé**, avec `agent.ac` : « Nouvelle demande », sans toucher au lieu proposé ; choisir Plomberie et sanitaires, Fuite d'eau, répondre aux questions ; taper une description d'au moins 10 caractères. Sous le bouton « Envoyer la demande » : « Brouillon enregistré à … ». Ne pas envoyer.
3. **Mention**, sur le même écran : « En savoir plus » commence par « Responsable du traitement : Administration communale. » ; la fin donne le contact du DPO réglé à la recette de la 0.7.0.

Puis reprendre la liste de la 0.7.0 (`NOTES_LIVRAISON_v0.7.0.md`) au contrôle 5, avec le formulaire du contrôle 2 : quitter (Accueil), revenir, « Reprendre », envoyer ; puis contrôles 6 à 9.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` ; aucune dépendance nouvelle | Coché |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Sans objet : aucune ressource nouvelle ; `save_brouillon` suit le schéma corrigé |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché, sauf brouillon hors journal (E-27, à soumettre), inchangé |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Sans objet : aucune migration ; schéma du brouillon élargi d'un champ, contrat généré depuis les schémas |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché (tests de portabilité et de parité) |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec ; tests avec cas de refus ; parcours sur téléphone | Coché (serveur 289/289, interface 127/127 sur trois lancements ; gabarit iPhone 13) |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | **Non** : serveur 1 haute (`body-parser`) et 2 modérées (`fast-uri`, `qs`), inchangées ; E-24 ouvert avant la production, décision de Renaud |
| Aucun appel sortant nouveau ; trois questions RGPD | Coché (ci-dessous) |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **non**. Le brouillon garde la nature du lieu, qui n'est pas une donnée personnelle.
2. Finalité nouvelle : **non**. La mention complète livrée est reformulée sans changer de sens ; elle reste à faire valider par le DPO.
3. Destinataire nouveau : **non**.

## Simulé ou incomplet

Rien de simulé. Contrôle visuel avec le moteur de Chrome (gabarit iPhone 13) sur l'interface construite et l'API réelle. Image Docker non reconstruite dans le bac à sable : aucun fichier de l'image ni migration changés.

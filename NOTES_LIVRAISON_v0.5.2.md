# Notes de livraison 0.5.2

27/10/2026 · GMAO communale · Correctif de la recette du 27/10/2026 (DV-04), avant l'étape 6

## Périmètre

Livré en cinq points (DV-22) :

- **Point 0, contrôle DV-09.** Archive 0.5.1 conforme à `ETAT.md` ; serveur 237/237, interface 89/89 sur trois lancements, construction et accessibilité 0 erreur. Aucun test instable.
- **Point 1, boutons de suite.** Après l'envoi d'une demande, « Mes demandes » et « Faire une autre demande » gardent 12 px d'écart quand ils passent l'un sous l'autre sur téléphone ; côte à côte et centrés sur grand écran.
- **Point 2, champs sur téléphone.** Jusqu'à 768 px de large, le texte saisi dans les champs (texte, recherche, description, listes, dates, nombres) est en 16 px : l'iPhone n'agrandit plus la page au toucher d'un champ. Libellés, boutons et en-tête gardent leur taille ; l'écran d'ordinateur reste à 14 px. Le zoom à deux doigts reste permis (WCAG 1.4.4).
- **Point 3, adresse e-mail.** Vide ou faite d'espaces : « Ce champ est obligatoire » seul. Mal formée : « Adresse e-mail non valide » (« Ongeldig e-mailadres ») au lieu de « La valeur du champ Adresse e-mail n'est pas valide pour le type email ». Dans Utilisateurs et rôles, l'assistant d'installation, la connexion et le contact des réglages de l'entité (même texte partout, DV-52). Interface en FR et NL seulement.
- **Point 4.** Note de version (deux lignes pour tous), documentation FR, NL et EN, fiche fonctionnelle `docs/fonctionnel/demandes.md` (règles 16 et 17).

Aucune migration, aucune route, aucune dépendance nouvelles. Serveur inchangé hors note de version et numéro. Dockerfile, compose, `nginx.conf`, `backup.sh` et `.env` inchangés.

Toujours ouvert : E-24 (`body-parser`, `fast-uri`), sans accord de Renaud, avant la production ; jamais `npm audit fix`. E-26 (rouge d'erreur à 3,3:1), décision de Renaud. DV-50 (noms au lieu de `lieu_id` et `categorie_id` dans le détail du journal), hors 0.5.2.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_5_2.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_5_2.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_5_2.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_5_2.tar.gz
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
sudo tar xzf gmao-v0_5_2.tar.gz --strip-components=1
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

Attendu : `[APP] API 0.5.2 sur le port 3001`, sans ligne `[DB] Migration` (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.5.2"},"meta":{"envelope":1,"version":"0.5.2"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_5_1.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5 (sur téléphone : fermer l'onglet et le rouvrir). Comptes de démonstration (`@demo.invalid`, mot de passe commun).

1. Connexion avec `agent.ac` : la fenêtre « Nouveautés de la version 0.5.2 » montre deux lignes ; « J'ai lu » la ferme. Le bas du menu montre `v0.5.2`.
2. **Boutons de suite**, sur téléphone (iPhone ou Samsung), avec `agent.ac` : « Nouvelle demande », une catégorie, une description, « Envoyer la demande ». Sous le numéro, « Mes demandes » et « Faire une autre demande » l'un sous l'autre, avec un espace entre eux.
3. **Agrandissement**, sur l'iPhone : « Faire une autre demande », toucher la recherche du lieu (« Changer de lieu »), puis la description : la page ne s'agrandit pas. Écarter deux doigts sur l'écran : la page s'agrandit, puis revient en pinçant. Ne pas envoyer.
4. **Adresse e-mail, Utilisateurs et rôles**, avec le compte administrateur : Administration, Utilisateurs et rôles, « Créer », « Enregistrer » sans rien remplir : sous Adresse e-mail, un seul message, « Ce champ est obligatoire ». Taper `jean.dupont` : « Adresse e-mail non valide ». Fermer sans enregistrer.
5. **Adresse e-mail, connexion** : se déconnecter ; taper `agent.ac` (sans `@demo.invalid`) et un mot de passe, « Se connecter » : « Adresse e-mail non valide » sous le champ, aucun message d'échec de connexion. Puis se connecter normalement.
6. **Adresse e-mail, réglages** : avec `responsable.ac`, Réglages du service, Réglages de l'entité, « Adresse électronique du service » : taper `abc` : « Adresse e-mail non valide » sous le champ. Remettre la valeur d'avant (ou vider le champ) sans cliquer « Enregistrer ».
7. Facultatif, avec un agent qui a un Samsung (Chrome), en néerlandais (avatar en haut à droite, langue NL) : contrôles 2 et 3 (« Nog een aanvraag indienen »), puis une demande envoyée ; rien ne déborde sur le côté.

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
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec ; tests avec cas de refus ; parcours 360 et 1280 px, iPhone 13, Galaxy S9+ | Coché |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | **Non** : serveur 1 haute (`body-parser`) et 1 modérée (`fast-uri`), inchangées ; E-24 ouvert avant la production, décision de Renaud |
| Aucun appel sortant nouveau ; trois questions RGPD | Coché (ci-dessous) |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **non**.
2. Finalité nouvelle : **non**.
3. Destinataire nouveau : **non**.

## Simulé ou incomplet

Rien de simulé. Contrôle visuel avec le moteur de Chrome (gabarits iPhone 13 et Galaxy S9+) : la taille des champs est mesurée, mais l'agrandissement de Safari ne se reproduit pas dans Chromium ; il se vérifie sur un vrai iPhone (contrôle 3). Samsung réel avec un agent (contrôle 7). Image Docker non reconstruite dans le bac à sable : aucun fichier de l'image ni migration changés.

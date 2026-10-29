# Notes de livraison 0.3.1

22/10/2026 · GMAO communale · Correctif de la 0.3.0, relevé pendant la recette du 22/10/2026

## Périmètre

Livré :

- La question de la FAQ sur l'appareil photo devient « L'appareil photo reste noir ou ne s'ouvre pas quand j'ajoute une photo. Que faire ? », en FR et en NL. La réponse explique le réglage des téléphones Android, Samsung compris, dans Chrome (navigateur des téléphones Samsung des agents) : Paramètres, Applications, Chrome, Autorisations, Appareil photo, « Autoriser seulement pendant l'utilisation de l'application », puis, si besoin, l'autorisation du site par l'icône à gauche de l'adresse. Le réglage de l'iPhone reste expliqué. Dans tous les cas, une photo déjà prise peut être choisie dans la galerie ou la photothèque.
- L'assistant mène à cette réponse pour « appareil photo », « Android », « Samsung » et « galerie », en FR et en NL.
- Note de version 0.3.1, une ligne pour tous les agents.

Aucune migration, aucune route nouvelle, aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf` et `.env` inchangés. Les noms des menus d'Android peuvent varier selon la version du téléphone : la réponse le dit.

## Commandes de mise à jour

**Dans le cmd du PC** (pas dans la session SSH). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_3_1.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : `gmao-v0_3_1.tar.gz 100% …` (le message « Could not chdir to home directory » est sans effet).

```
ssh admin@192.0.2.10
```

Attendu : l'invite `admin@nas:/$`.

**Dans la session SSH du NAS**, une commande à la fois :

```
cd /volume1/docker/monapp
```

Attendu : aucune sortie.

```
sudo mv /tmp/gmao-v0_3_1.tar.gz .
```

Attendu : aucune sortie.

```
ls -l gmao-v0_3_1.tar.gz
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
sudo tar xzf gmao-v0_3_1.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend frontend
```

Attendu : le contenu des deux dossiers.

```
sudo docker compose build
```

Attendu : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web`, sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[APP] API 0.3.1 sur le port 3001`, sans ligne de migration nouvelle.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.3.1"},"meta":{"envelope":1,"version":"0.3.1"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_3_0.tar.gz`, sans restaurer la base.

## Liste de contrôle à l'écran

1. Connexion : la fenêtre « Nouveautés de la version 0.3.1 » s'affiche avec une ligne ; « J'ai lu » la ferme. Le bas du menu montre `v0.3.1`.
2. Aide, Questions fréquentes : la dernière question est « L'appareil photo reste noir ou ne s'ouvre pas quand j'ajoute une photo. Que faire ? » ; la réponse explique Android (Chrome) puis l'iPhone. En NL, même chose.
3. Assistant (bouton rond en bas à droite) : « appareil photo Samsung » donne la réponse courte et le bouton « Ouvrir l'écran » mène à la FAQ.
4. Si un agent a un téléphone Samsung sous la main : vérifier que les menus Paramètres, Applications, Chrome, Autorisations, Appareil photo correspondent à son téléphone.

## Questions RGPD

1. Données personnelles nouvelles : aucune.
2. Finalité nouvelle : aucune.
3. Destinataire nouveau : aucun.

## Simulé ou incomplet

Rien de simulé. Le chemin des menus d'Android n'a pas été vérifié sur un téléphone Samsung réel par Claude : contrôle 4 ci-dessus. Points ouverts inchangés : E-09, E-16, E-18, E-19 (Renaud), tâche DSM de sauvegarde, cause de l'arrêt de Container Manager, confirmation des contrôles 6 et 7 de la recette 0.3.0.

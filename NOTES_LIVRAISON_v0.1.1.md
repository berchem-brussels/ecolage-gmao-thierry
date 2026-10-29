# Notes de livraison 0.1.1

15/10/2026 · GMAO communale · Correctif de l'étape 1

## Périmètre

Corrigé : l'écran Utilisateurs et rôles dépassait la largeur de l'écran ; les colonnes Accès à l'administration, Actif et Actions étaient coupées et ne s'atteignaient qu'en faisant défiler le tableau, sans signe visible. Cause racine : six colonnes de largeur libre, dont un groupe de boutons et des étiquettes de rôles qui ne passaient pas à la ligne. Le contrôle visuel de la 0.1.0 ne mesurait pas la largeur du tableau ; il la mesure désormais à 360, 1280 et 1920 px.

Changé :

- Colonne « Personne » : nom, étiquettes « Administrateur » et « Démonstration », adresse en dessous.
- Colonne Actions fixée à droite ; colonne Actif en mode Complet seulement ; en mode Simple, comptes actifs seulement.
- Accès à l'administration réglé dans le panneau Rôles.
- Sous 768 px : une seule colonne empilée (personne, rôles, actions) ; panneau Rôles en plein écran.
- Port HTTPS de NIXUS : 18443 (écart E-14).

Aucune migration, aucune dépendance nouvelle, serveur inchangé hors numéro de version.

## Commandes de mise à jour

**Sur ton PC**, dans une fenêtre `cmd` (pas dans la session SSH) :

```
scp -O C:\gmao\gmao-v0_1_1.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : `gmao-v0_1_1.tar.gz 100% …`. Le fichier doit d'abord être enregistré dans `C:\gmao`.

**Sur le NAS**, dans la session SSH (`admin@nas`), une commande à la fois :

```
cd /volume1/docker/monapp
```

```
sudo mv /tmp/gmao-v0_1_1.tar.gz .
```

```
ls -l gmao-v0_1_1.tar.gz
```

Attendu : le fichier listé. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée, N sauvegardes conservées.`

```
sudo rm -rf backend frontend docs
```

```
sudo tar xzf gmao-v0_1_1.tar.gz --strip-components=1
```

```
ls backend frontend
```

Attendu : le contenu des deux dossiers (`Dockerfile`, `package.json`, `src`… et `dist` dans `frontend`).

```
sudo docker compose build
```

Attendu : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web`, sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.1.1"},"meta":{"envelope":1,"version":"0.1.1"}}`

Le `.env`, la base et les comptes de démonstration sont conservés.

## Liste de contrôle à l'écran

1. Recharger la page (Ctrl+F5) : la version affichée en bas du menu est v0.1.1.
2. Utilisateurs et rôles, écran large : colonnes Personne, Rôles par entité, Actions ; rien n'est coupé à droite ; l'administrateur porte l'étiquette « Administrateur ».
3. Bouton « Rôles » : le panneau commence par « Accès à l'administration » (Non ou Administrateur), puis une carte par entité.
4. Passer en mode Complet : la colonne Actif apparaît et les comptes désactivés sont listés.
5. Sur un téléphone : une seule colonne, boutons Rôles et Désactiver sous chaque personne.

## Questions RGPD

Aucune donnée nouvelle, aucune finalité nouvelle, aucun destinataire nouveau.

## Simulé ou incomplet

Rien de simulé. La mesure de largeur est faite par script dans le bac à sable de Claude et n'est pas une suite automatique (jsdom ne calcule pas les largeurs). Les points ouverts de la 0.1.0 restent ouverts (E-07, E-09).

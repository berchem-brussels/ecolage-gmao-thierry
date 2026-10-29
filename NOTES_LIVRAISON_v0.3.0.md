# Notes de livraison 0.3.0

22/10/2026 · GMAO communale · Étape 3 du planning : paramètres, modules, réglages par entité, journal d'audit, notes de version

## Périmètre

Livré :

- Administration, Paramètres, onglet Identité et affichage (ADM-01) : nom de l'application et du pouvoir local en FR et en NL, contact du support, langue et niveau de détail par défaut. Chaque réglage porte son explication FR et NL, s'applique sans redémarrage, s'inscrit au journal avec l'ancienne et la nouvelle valeur, et peut revenir à la valeur livrée. Le nom du pouvoir local mal saisi à l'installation se corrige ici.
- Administration, Paramètres, onglet Modules (ADM-02) : onze modules déclarés pour toute l'instance ; noyau toujours actif ; Patrimoine se règle ; neuf modules « À venir » avec leur étape. Patrimoine éteint : écritures des lieux et photos refusées (403 `MODULE_DISABLED`) par l'API et le MCP, lecture ouverte, écran retiré du menu, de l'aide et de l'assistant. Contrôle placé après le rôle (API-04).
- Réglages du service, Réglages de l'entité (ADM-03, structure) : contact du service technique, téléphone d'urgence, délai de réouverture (7 jours), une valeur par entité, réglés par le responsable du service technique. Le contact s'affiche dans Aide, Contact.
- Administration, Journal d'audit : lecture seule par l'administrateur, filtres par action ou famille, personne, entité, période et canal, détail dépliable, actions traduites en FR et en NL, vue en une colonne sur téléphone. L'entité est notée sur les actions d'une entité.
- Note de version à la première connexion après une mise à jour (E-07), filtrée selon le rôle ; « J'ai lu » la ferme pour de bon ; Aide, Nouveautés garde toutes les notes. Un compte nouveau ne voit pas la note en cours.
- Assistant d'installation avec la langue par défaut et les modules (E-08), pour une installation neuve.
- Aide : rubriques du mode d'emploi pour chaque écran nouveau, quatre questions de FAQ nouvelles et la question sur l'appareil photo de l'iPhone (Réglages, navigateur, Appareil photo) ; intentions de l'assistant ; liens de l'assistant vers un écran d'administration montrés à l'administrateur seulement.
- Liens à la couleur principale de l'institution dans tout l'écran clair (le bleu par défaut d'Ant Design n'atteignait pas 4,5:1 sur fond blanc).
- API et MCP pour toutes les routes nouvelles, parité vérifiée par test.
- Migration `003_parametres`, sans perte.

Non livré, comme prévu : couleurs, logo et icône de l'institution, courriel, connexion Microsoft, export de la configuration, écran « Mon affichage ». La proposition de 0.2.1 (mot de passe de démonstration choisi, adresses courtes) est abandonnée le 22/10/2026 : la commande de démonstration change toujours le mot de passe commun à chaque relance.

Dépendances : aucune nouvelle. Dockerfile, compose, `nginx.conf` et `.env` inchangés.

## Commandes de mise à jour

**Dans le cmd du PC** (pas dans la session SSH). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_3_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : `gmao-v0_3_0.tar.gz 100% …`.

```
ssh admin@192.0.2.10
```

Attendu : l'invite `admin@nas:~$`.

**Dans la session SSH du NAS**, une commande à la fois :

```
cd /volume1/docker/monapp
```

Attendu : aucune sortie.

```
sudo mv /tmp/gmao-v0_3_0.tar.gz .
```

Attendu : aucune sortie.

```
ls -l gmao-v0_3_0.tar.gz
```

Attendu : le fichier listé. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées), N sauvegardes de la base conservées.`

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_3_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend frontend
```

Attendu : le contenu des deux dossiers (`Dockerfile`, `package.json`, `src`, `config`… et `dist` dans `frontend`).

```
sudo docker compose build
```

Attendu : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web` (ou `Image … Built`), sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[DB] Migration 003_parametres appliquée` puis `[APP] API 0.3.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)` après une minute.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.3.0"},"meta":{"envelope":1,"version":"0.3.0"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_2_0.tar.gz`, toujours dans le dossier. La base n'a pas besoin d'être restaurée : la 0.2.0 démarre sur une base passée en 0.3.0 (essayé dans le bac à sable).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. Connexion avec ton compte administrateur : la fenêtre « Nouveautés de la version 0.3.0 » s'affiche ; « J'ai lu » la ferme. Après déconnexion et reconnexion, elle ne revient pas.
2. Le bas du menu montre `v0.3.0`.
3. Administration, Paramètres : corriger « Nom du pouvoir local en français » (et en néerlandais si besoin), « Enregistrer ». Le nom change aussitôt sous le nom de l'application ; la page de connexion le montre aussi.
4. Onglet Modules : éteindre Patrimoine (la fenêtre dit ce qui se ferme), vérifier que Patrimoine a quitté le menu ; l'adresse `https://192.0.2.10:18443/patrimoine` renvoie à l'accueil. Rallumer Patrimoine.
5. Administration, Journal d'audit : les lignes « Paramètre de l'instance modifié », « Module éteint » et « Module activé » à ton nom ; déplier la première montre l'ancien et le nouveau nom.
6. Avec un compte de démonstration responsable du service technique (`responsable.ac@demo.invalid`) : Réglages du service, Réglages de l'entité, saisir le nom et le téléphone du service, « Enregistrer ».
7. Avec un compte demandeur de l'AC (`agent.ac@demo.invalid`) : la note de version s'affiche avec deux lignes ; Aide, Contact montre le service saisi au point 6 ; Aide, Questions fréquentes contient la question sur l'appareil photo de l'iPhone.
8. Avec le compte `multi-entites@demo.invalid`, passer au CPAS : Aide, Contact dit qu'aucun contact n'est encore renseigné pour cette entité.
9. Sur un téléphone : Paramètres et Journal d'audit (administrateur) s'affichent sans débordement ; en néerlandais, les écrans nouveaux sont traduits.

Les comptes de démonstration ont le mot de passe commun de la dernière relance de `demo.js` (22/10/2026).

## Questions RGPD

1. Données personnelles nouvelles : aucune donnée de personne dans les paramètres ; le contact du service technique est celui d'un service, l'écran le rappelle. Le journal d'audit, tenu depuis la 0.1.0, note en plus l'entité concernée ; sa lecture est réservée à l'administrateur. La dernière note de version lue est notée sur chaque compte.
2. Finalité nouvelle : aucune. Le journal d'audit sert la traçabilité déjà prévue ; sa durée de conservation sera fixée avec les autres (D-09, étape 41).
3. Destinataire nouveau : aucun. Aucun appel sortant.

## Simulé ou incomplet

Rien de simulé. Le téléphone d'urgence et le délai de réouverture sont enregistrés mais ne servent qu'aux étapes 7 et 9. Seul le module Patrimoine se règle ; les autres ne sont pas encore livrés. L'assistant d'installation ne s'affiche plus sur NIXUS, déjà installé : la langue et les modules s'y règlent dans Paramètres. Les catalogues des paramètres, des modules et des notes sont fermés : pas de `POST` (E-19). Points ouverts inchangés : E-09, E-16, E-18 (décisions de Renaud), tâche DSM de sauvegarde, cause de l'arrêt de Container Manager du 22/10/2026.

# Notes de livraison 0.4.0

22/10/2026 · GMAO communale · Étape 4 du planning (lot L1) : catégories, priorités, délais et calendrier par entité

## Périmètre

Livré :

- **Écran Catégories et délais** (Réglages du service), réservé au responsable du service technique de l'entité active, en quatre onglets :
  - **Catégories** : arbre domaine puis nature, libellés FR et NL, pictogramme, priorité proposée, circuit (envoi direct ou validation du chef de service), délai propre facultatif, « Comme le domaine » pour une nature, désactivation avec motif, et aperçu des tuiles du demandeur.
  - **Priorités et délais** : P1 à P4, libellés, couleur, décompte (heures calendaires, heures ouvrables, jours ouvrables), prise en charge, fin ou « Date convenue », retour aux valeurs livrées.
  - **Calendrier** : horaire jour par jour, jours fériés légaux de l'année, congés répétés chaque année et fermetures par période.
  - **Simulateur** : priorité ou catégorie et moment de réception, puis la prise en charge et la fin.
- **Valeurs livrées** à chaque entité active au premier démarrage (D-11, décisions DV-25 à DV-30 du 22/10/2026) :
  - 8 domaines et 27 natures ;
  - P1 Sécurité 1 h et 4 h calendaires ; P2 Urgente 1 et 2 jours ouvrables ; P3 Normale 2 et 10 ; P4 Planifiable 5 et date convenue ;
  - horaire des ouvriers : AC du lundi au jeudi 07:45-16:15, le vendredi 07:45-12:00 ; CPAS du lundi au vendredi 08:00-16:30 ;
  - congés : 8 mai, 27 septembre, 2 novembre, 15 novembre, 26 décembre.
- **Règles de l'échéance** : reçue hors horaire, elle compte dès l'ouverture suivante ; N jours ouvrables à la même heure ; au plus tard à l'heure de fermeture du jour d'arrivée ; P1 jour et nuit. Calcul à l'heure de Bruxelles.
- **Aide** : rubrique « Délais des demandes » pour tous, rubrique du responsable, trois questions de FAQ, trois réponses de l'assistant, note de version 0.4.0.
- **API et MCP** : `/api/categories`, `/api/priorites`, `/api/horaires`, `/api/jours-non-ouvres`, `/api/jours-feries`, `/api/echeances/simulation`, et 25 outils MCP exposés de plus.

Migration `004_referentiel_demandes` : quatre tables ajoutées, rien d'autre changé. Aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `.env` et `backup.sh` inchangés.

## Commandes de mise à jour

**Dans le cmd du PC** (pas dans la session SSH). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_4_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : `gmao-v0_4_0.tar.gz 100% …`.

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
sudo mv /tmp/gmao-v0_4_0.tar.gz .
```

Attendu : aucune sortie.

```
ls -l gmao-v0_4_0.tar.gz
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
sudo tar xzf gmao-v0_4_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/config
```

Attendu : la liste contient `calendrier.json`, `categories.json` et `priorites.json`.

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

Attendu : `[DB] Migration 004_referentiel_demandes appliquée` puis `[APP] API 0.4.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.4.0"},"meta":{"envelope":1,"version":"0.4.0"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_3_1.tar.gz`, sans restaurer la base ; la 0.3.1 ignore les quatre tables ajoutées (essayé dans le bac à sable).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. Connexion avec un compte existant : la fenêtre « Nouveautés de la version 0.4.0 » s'affiche. Un demandeur voit une ligne ; un responsable du service technique en voit trois. Le bas du menu montre `v0.4.0`.
2. Avec un compte responsable du service technique dans l'AC : le menu Réglages du service propose « Catégories et délais ». Un gestionnaire ou un demandeur ne le voit pas.
3. Onglet Catégories : huit domaines ; l'aperçu des tuiles s'ouvre sur un domaine, par exemple Plomberie et sanitaires, puis montre ses quatre natures. La fiche de « Fuite d'eau » montre P2 ; « Déménagement de bureau » le circuit « Validation du chef de service ».
4. Onglet Priorités et délais : P1 en heures calendaires (1 et 4), P4 avec « Date convenue » cochée.
5. Onglet Calendrier, entité AC : vendredi de 07:45 à 12:00, samedi et dimanche fermés ; cinq congés ; dix jours fériés pour l'année.
6. Onglet Simulateur : P3 reçue le vendredi 23/10/2026 à 13:00 donne un début du décompte le lundi 26 octobre à 07:45 et une prise en charge le mercredi 28 octobre à 07:45.
7. Passer au CPAS dans l'en-tête, avec un compte qui y a le rôle de responsable : vendredi de 08:00 à 16:30. Un changement dans l'AC ne se voit pas au CPAS.
8. Changer un libellé, puis vérifier dans Administration, Journal d'audit, avec un compte administrateur : « Catégorie d'intervention modifiée », avec l'entité.
9. En néerlandais : l'écran s'appelle « Categorieën en termijnen » ; les tuiles et les jours fériés sont en néerlandais.
10. Sur un téléphone, Android ou iPhone : l'écran se lit sans défilement horizontal, et les tuiles passent sur deux colonnes.
11. Aide, Mode d'emploi : la rubrique « Délais des demandes » est visible pour tous. L'assistant répond à « délai » et à « jour férié ».

## Questions RGPD

1. Données personnelles nouvelles : aucune. Catégories, priorités, horaires, congés et fermetures sont des réglages de service ; seul l'auteur de chaque réglage est noté, comme pour les autres réglages.
2. Finalité nouvelle : aucune.
3. Destinataire nouveau : aucun.

## Simulé ou incomplet

Rien de simulé.

- Les valeurs livrées sont les défauts du cahier des charges en attendant l'atelier métier (D-11) ; le responsable les ajuste à l'écran.
- La règle de validation est enregistrée par catégorie, mais elle ne s'applique qu'à l'étape 11.
- L'échéance s'affichera sur les fiches à l'étape 8.
- Les horaires des équipes et la garde viendront aux étapes 15 et 17.
- L'horaire livré est choisi par le code de l'entité (`AC`, `CPAS`) : à vérifier au contrôle 5.

Points ouverts inchangés : E-09, E-16, E-18 et E-19, étendu (Renaud) ; tâche DSM de sauvegarde ; cause de l'arrêt de Container Manager ; confirmations de la recette 0.3.0 ; vérification de la FAQ sur un Samsung.

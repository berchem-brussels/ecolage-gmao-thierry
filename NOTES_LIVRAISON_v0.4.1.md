# Notes de livraison 0.4.1

23/10/2026 · GMAO communale · Correctif de la 0.4.0, décidé à la recette du 23/10/2026 (DV-04), avant l'étape 5

## Périmètre

Livré, en quatre points (DV-22) :

- **Point 0, test instable.** Le test d'écran « catégories : la fiche d'une nature propose « Comme le domaine » et les pictogrammes en boutons » dépassait parfois sa limite de 5 secondes sur une machine lente. Il reçoit la limite de 30 secondes de ses voisins, sans changer ses vérifications (écart E-20). Suite de l'interface : 5 lancements consécutifs sans échec.
- **Point 1, simulateur.** La date de l'échéance (en gras) et son délai (en gris) s'affichent l'un sous l'autre, pour la prise en charge comme pour la fin ; on lisait « 08:522 jours ouvrables ». Sous 576 px de large (téléphones, iPhone et Android), les libellés du résultat passent au-dessus des valeurs (DV-33). Au-delà, la disposition est inchangée.
- **Point 2, journal d'audit.** La modification d'une catégorie, d'un congé, d'une fermeture, et aussi d'un lieu, d'une valeur de liste ou d'une entité (DV-35), ne note plus que les champs changés, avec l'ancienne valeur (« avant ») et la nouvelle (« après »), et de quoi reconnaître la fiche (code, ou nature et date). Un enregistrement sans changement n'écrit rien et n'ajoute aucune ligne. Les modifications par l'assistant (MCP) suivent la même règle.
- **Point 3, mention de modification.** Chaque catégorie, priorité, jour de l'horaire, congé et fermeture porte une ligne grise : « Modifié le JJ/MM/AAAA à HH:MM par <nom> » ; « Créé le … par … » pour une fiche ajoutée et jamais modifiée ; « Valeur livrée, rétablie le … par … » après « Revenir aux valeurs livrées » ; « Valeur livrée » si personne n'y a touché (DV-34). Heure de Bruxelles. Le nom n'est rendu qu'aux personnes qui ont un rôle dans l'entité de la fiche ; sinon la date seule. L'API ne rend plus les identifiants internes des auteurs.
- Aide : rubriques « Catégories et délais » et « Journal d'audit » complétées, question 15 de la FAQ (responsable), réponse de l'assistant à « qui a modifié ». Note de version 0.4.1 : deux lignes pour le responsable du service technique, une pour l'administrateur ; aucune pour le demandeur, qui ne voit donc pas de fenêtre.

Aucune migration : les colonnes d'auteur et de date existent depuis la 0.4.0. Aucune route nouvelle, aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf` et `.env` inchangés. Les fiches modifiées sous la 0.4.0 (par exemple « Mobilier de bureau » au CPAS) affichent déjà « Modifié le … par … » avec l'auteur et la date en base.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_4_1.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_4_1.tar.gz 100% …` (le message « Could not chdir to home directory » est sans effet).

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
sudo mv /tmp/gmao-v0_4_1.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_4_1.tar.gz
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
sudo tar xzf gmao-v0_4_1.tar.gz --strip-components=1
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

Attendu : `[APP] API 0.4.1 sur le port 3001`, sans ligne de migration nouvelle.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.4.1"},"meta":{"envelope":1,"version":"0.4.1"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_4_0.tar.gz`, sans restaurer la base (aucune migration ; essayé dans le bac à sable).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. Connexion avec `responsable.ac` : la fenêtre « Nouveautés de la version 0.4.1 » montre deux lignes (mention de modification, simulateur) ; « J'ai lu » la ferme. Le bas du menu montre `v0.4.1`. Avec `agent.ac` : aucune fenêtre.
2. Réglages du service, Catégories et délais, onglet Simulateur, « Calculer » : sous « Prise en charge » et « Fin des travaux », la date en gras, puis le délai en gris sur la ligne suivante (« 2 jours ouvrables »). En NL, même chose (« 2 werkdagen »).
3. Le même écran sur un iPhone et sur un téléphone Samsung (Chrome) : les libellés sont au-dessus des valeurs, rien ne déborde, pas de défilement de côté.
4. Onglet Priorités et délais : au bas de chaque carte, « Valeur livrée ». Changer un libellé de P3, « Enregistrer » : « Modifié le JJ/MM/AAAA à HH:MM par » suivi du nom du compte. « Revenir aux valeurs livrées » : « Valeur livrée, rétablie le … par … ».
5. Onglet Calendrier : sous chaque jour de l'horaire, la mention ; ajouter une fermeture et l'ouvrir : « Créé le … par … ». Ouvrir un congé livré : « Valeur livrée ».
6. Onglet Catégories, avec `responsable.cpas` : ouvrir « Mobilier de bureau » : « Modifié le 23/10/2026 à … par … » (modification de la recette). Remettre le libellé « Mobilier », « Enregistrer » : la date et l'heure changent.
7. Avec le compte administrateur : Administration, Journal d'audit, dernière ligne `categorie.update`, « + » : seulement `code`, puis `avant` `{"libelle_fr":"Mobilier de bureau"}` et `apres` `{"libelle_fr":"Mobilier"}`, sans le reste du formulaire.
8. Rouvrir « Mobilier » et « Enregistrer » sans rien changer : aucune nouvelle ligne au journal.
9. Aide, Questions fréquentes (compte responsable) : question 15 « Comment savoir qui a changé une catégorie, un délai ou un jour de l'horaire ? ».

## Questions RGPD

1. Données personnelles nouvelles : aucune. Le nom de la personne qui modifie une fiche était déjà en base depuis la 0.4.0 (colonnes d'auteur) et dans le journal d'audit. Le journal en note moins : seuls les champs changés.
2. Finalité nouvelle : aucune ; traçabilité des réglages du référentiel, déjà servie par le journal d'audit.
3. Destinataire nouveau : **oui**. Le prénom et le nom de la dernière personne qui a modifié une fiche du référentiel sont désormais visibles par les personnes qui ont un rôle dans l'entité, à l'écran et par l'API, et non plus par l'administrateur seul. C'est le contenu validé à la recette (« nom rendu aux seules personnes de l'entité »). À porter au registre et à l'analyse d'impact menés en parallèle (hors du périmètre de Claude).

## Simulé ou incomplet

Rien de simulé. Le contrôle visuel a été fait avec le moteur de Chrome (gabarits iPhone 13 et Galaxy S9+) ; Safari sur iPhone reste à confirmer à la recette (contrôle 3). Points ouverts inchangés : D-11, D-14 (bloque l'étape 5), E-09, E-16, E-18, E-19 (Renaud), tâche DSM de sauvegarde, cause de l'arrêt de Container Manager, vérification de la FAQ par un agent qui a un Samsung, vue du demandeur AC et contact CPAS de la 0.3.0.

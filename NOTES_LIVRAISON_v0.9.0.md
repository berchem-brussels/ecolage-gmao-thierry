# Notes de livraison 0.9.0

02/11/2026 · GMAO communale · Étape 8 : tableau de bord, liste et qualification du service technique (DV-86 à DV-93)

## Périmètre

Étape 8 du planning, seule (DV-87), avec la correction du contrôle 7 de la recette de la 0.8.0 (DV-86).

- **Échéances et retard (PRI-03).** Chaque demande garde ses deux échéances, « prise en charge avant » et « fin des travaux avant », calculées au dépôt depuis la réception, recalculées à chaque qualification depuis la même réception. La migration `008_qualification` les calcule pour les demandes déjà en base ; au démarrage, une demande qui n'en a pas en reçoit (cas d'un retour arrière). L'échéance qui compte est la prise en charge tant que la demande est « À qualifier », puis la fin ; « En retard » quand elle est passée, en rouge et en mots.
- **Tableau de bord (GES-01).** À l'accueil du service technique et en tête de « Demandes de l'entité » : à qualifier, en retard, P1 et P2 ouvertes, échéance dans les deux jours ouvrés. Un clic ouvre la liste filtrée, triée par échéance, avec le même total.
- **Liste du service (GES-02).** « Demandes de l'entité » remplace la liste en lecture de la 0.5.0 : en cours ou toutes, échéance, états (libellés du service : « À qualifier », « Qualifiée »…), priorités, catégorie (un domaine compte ses natures), site ou bâtiment (avec ce qu'il contient), source, danger ; recherche aussi sur le demandeur ; tri par numéro, priorité, échéance, dépôt ; filtres dans l'adresse de la page, repliés sur téléphone. Vues enregistrées par personne et par entité (vingt au plus).
- **Qualification (GES-04, PRI-01).** Bouton « Qualifier » sur la fiche (gestionnaire et responsable, permission nouvelle `demandes:qualifier`) : catégorie, priorité en boutons avec la priorité proposée rappelée (celle de la catégorie, P1 si danger), motif obligatoire si elle change, lieu précisé, durée estimée, date convenue pour une priorité sans délai de fin, consignes à l'ouvrier, photos du service visibles ou non par le demandeur. « À qualifier » devient « Qualifiée » ; le demandeur lit « Prise en charge » et le délai mis à jour, jamais les consignes ni le motif. Journal sans texte libre.
- **Contrôle 7 de la 0.8.0.** Le groupe « Pièces jointes des demandes » apparaît dans Réglages de l'entité ; toutes les familles d'actions du journal ont leur nom (Pièces jointes, Demandes, Catégories, Priorités et délais, Horaire, Congés et fermetures, Système, Vues enregistrées). Deux tests empêchent le retour du défaut.
- **MCP.** `get_tableau_bord`, `qualifier_demande`, cinq outils des vues ; `list_demandes` prend les filtres du service.
- **Aide et note de version.** Rubriques Demandes de l'entité et Délais des demandes, questions 27 et 28, deux réponses de l'assistant, fiche fonctionnelle `docs/fonctionnel/service-technique.md` ; note : une ligne pour tous, deux pour le service technique, une pour le responsable.

Migration `008_qualification` (dix colonnes de `demandes`, un index, table `vues_demandes` ; ajout seulement). Aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `.gitignore` et `ci.yml` inchangés. Les deux images se reconstruisent.

Hors de cette version (E-35) : compteurs « en attente » et « à clôturer », suspension du délai pendant « En attente » (étape 9) ; courriel de retard (étape 13) ; corps de métier, équipes, filtres par équipe et par ouvrier (étapes 15 et 16) ; tâches (étape 21).

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_9_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_9_0.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_9_0.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_9_0.tar.gz
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
sudo tar xzf gmao-v0_9_0.tar.gz --strip-components=1
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

Attendu : `[DB] Migration 008_qualification appliquée`, puis `[APP] API 0.9.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.9.0"},"meta":{"envelope":1,"version":"0.9.0"}}`

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_8_0.tar.gz`, sans restaurer la base : la 0.8.0 démarre sur une base passée en 0.9.0 et ignore les colonnes et la table nouvelles (essayé dans le bac à sable) ; à la remontée en 0.9.0, les demandes déposées entre-temps reçoivent leurs échéances (`[DB] Échéances calculées pour N demande(s)`).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443`, recharger avec Ctrl+F5.

1. **Version et note.** Avec `agent.ac` : la fenêtre « Nouveautés » montre la 0.9.0 en une ligne (« Prise en charge ») ; le bas du menu montre `v0.9.0`. Avec `responsable.ac` : quatre lignes.
2. **Tableau de bord.** Avec `gestionnaire.ac`, accueil : bloc « Tableau de bord du service technique », quatre compteurs (À qualifier, En retard, P1 et P2 ouvertes, Échéance dans les 2 jours ouvrés). Les demandes de recette anciennes (`AC-DI-2026-00001`…) sont probablement « En retard ».
3. **Compteur vers la liste.** Cliquer sur « En retard » : « Demandes de l'entité » s'ouvre avec « En retard » choisi, triée par échéance ; le nombre de demandes sous les filtres égale le compteur ; chaque ligne montre « En retard » en rouge.
4. **Filtres et tri.** Choisir « Toutes échéances », puis la catégorie « Éclairage » dans « Catégorie » : seules les demandes d'éclairage restent. Cliquer sur le titre « Priorité » : la liste se trie. Copier l'adresse de la page dans un nouvel onglet : mêmes filtres.
5. **Vue enregistrée.** « Enregistrer la vue », nom « Éclairage », « Enregistrer » ; « Effacer les filtres » ; choisir « Éclairage » dans « Vues enregistrées » : les filtres reviennent. Puis « Supprimer la vue », confirmer.
6. **Fiche du service.** Ouvrir `AC-DI-2026-00007` : état « À qualifier », ligne « Échéances » (prise en charge avant…, fin des travaux avant…), bouton « Qualifier » en haut à droite.
7. **Qualifier avec motif.** « Qualifier » : « Priorité proposée : … » sous les boutons. Choisir une autre priorité : le champ « Motif du changement de priorité » apparaît ; cliquer « Qualifier » sans motif : « Indiquez pourquoi vous changez la priorité proposée. ». Écrire un motif, une durée de 1,5 heure et une consigne, « Qualifier » : « Demande qualifiée », état « Qualifiée », motif, durée « 1 h 30 », consignes et « Qualifiée le … » sur la fiche ; le bouton devient « Modifier la qualification ».
8. **Vue du demandeur.** Avec le compte qui a déposé `AC-DI-2026-00007`, « Mes demandes » : état « Prise en charge », délai annoncé selon la nouvelle priorité ; ni consignes, ni motif, ni échéances du service.
9. **Droits.** Avec `agent.ac` : pas de « Demandes de l'entité » dans le menu ; l'adresse `/demandes-entite` renvoie à l'accueil.
10. **Journal d'audit.** Avec le compte administrateur, famille « Demandes » du filtre : « Demande qualifiée », détail avec « Avant » et « Après » (priorité, état), « Consignes à l'ouvrier : Oui » sans le texte.
11. **Contrôle 7 de la 0.8.0.** Avec `responsable.ac`, Réglages de l'entité : groupe « Pièces jointes des demandes » (nombre, taille, formats). Journal d'audit : la famille s'appelle « Pièces jointes (toutes) » et non « piece (toutes) ».
12. **Néerlandais.** En NL, `gestionnaire.ac` : « Dashboard van de technische dienst », « Te laat », « Kwalificeren ».

Les contrôles sur iPhone et Samsung restent pour la fin du projet (DV-80).

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : aucune dépendance nouvelle |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché (`Card`, `Table`, `Select`, `TreeSelect`, `Radio.Group` en boutons, `Drawer`, `Form`, `Modal`, `Collapse`) |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : vues (cinq routes, cinq outils), qualification, tableau de bord |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché : qualification et vues contrôlées (droit, entité, personne) et journalisées |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : `008_qualification` (ajout) ; routes nouvelles dans `/api/openapi.json` |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 371/371, interface 161/161 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | Coché (Chromium, aucune page plus large que l'écran) |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, intentions, note de version | Coché |

## Questions RGPD

1. Données personnelles nouvelles : **oui, internes au service**. Nom de la personne qui qualifie et date ; consignes à l'ouvrier et motif d'un changement de priorité (textes libres, consigne : décrire le travail, pas les personnes). Aucune donnée nouvelle sur le demandeur. Les vues enregistrées ne contiennent que des filtres.
2. Finalité nouvelle : **non** (organiser l'intervention, même finalité que la demande).
3. Destinataire nouveau : **non** (gestionnaire et responsable de l'entité, qui lisent déjà la demande ; consignes et motif jamais rendus au demandeur, au bénéficiaire ni à qui suit). Conservation : avec la demande ; journal sans texte libre.

## Simulé ou incomplet

Rien de simulé. GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.20.2. Images Docker non reconstruites dans le bac à sable. Couverture partielle de GES-01, GES-02, GES-04 et PRI-03, complétée aux étapes suivantes (E-35). Contrôles sur téléphone reportés (DV-80).

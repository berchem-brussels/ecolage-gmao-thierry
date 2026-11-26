# Notes de livraison 0.21.5

26/11/2026 · GMAO communale · Retours du test orienté utilisateur sur la 0.21.4 (R1, R2, R6) et écarts de l'audit (E-56, E-57, E-51, E-37)

## Périmètre

Version de correctif et d'adaptations, après le test orienté utilisateur du 26/11/2026 et la réponse de Renaud au mail groupé (DV-190), avant l'étape 18 (DV-200). Aucune migration, aucune dépendance nouvelle, aucune permission nouvelle, aucun réglage nouveau, aucun outil MCP nouveau (deux outils rendent des champs de plus).

- **R1, contour rouge gardé** : une date ou une heure refusée gardait son message et son blocage, mais perdait son contour rouge quand on revenait dans la fenêtre (le champ se réaffichait). Le contour rouge est maintenant tenu par l'écran lui-même : il reste jusqu'à la correction ou au choix au calendrier.
- **R2, lieu à confirmer (DV-201)** : le lieu proposé d'office (lieu habituel, brouillon, dernière demande) ne part plus sans qu'on l'ait vu. Il s'affiche dans un cadre orange avec la question « Est-ce bien l'endroit du problème ? » et deux boutons, « Oui, c'est ici » et « Changer de lieu » ; « Envoyer » reste grisé (« Confirmez le lieu ») jusqu'au choix. Un lieu choisi soi-même (liste, recherche, lieux récents) ne demande rien de plus. Les demandes déjà ouvertes dans le bâtiment s'affichent après la confirmation.
- **R6, demandes proches d'abord (DV-202)** : au lieu de « 20 demandes déjà ouvertes dans ce bâtiment », l'écran montre d'abord celles du même local ou de la même catégorie (cinq au plus, puis « Voir les autres ») ; le reste du bâtiment est replié derrière « Autres demandes du bâtiment (N) ». API et MCP : `proches`, `meme_categorie`, `proche` (ajouts seulement).
- **E-56, dernière activité** : « Mes demandes » montre la dernière activité de chaque demande (dépôt, changement d'état, message du fil ou complément ; jamais une note interne du service) : colonne sur ordinateur, ligne sous la date de dépôt sur téléphone. API et MCP : `derniere_activite`.
- **E-57, tablette et bureau** : `npm run mobile:check` contrôle aussi une tablette (768 px) et un écran de bureau (1280 px). Deux défauts du livré trouvés ainsi et corrigés (DV-203) : en-tête plus large que l'écran de 768 à environ 1100 px (en dessous de 1200 px, les boutons de l'en-tête gardent leur icône seule, avec leur nom en infobulle, et le mode, la langue et le thème passent dans le menu de la personne) ; panneau de la visite guidée hors de l'écran ou collé au bord sur tablette et bureau.
- **E-51** : `permissions: contents: read` en tête de `.github/workflows/ci.yml` (alerte CodeQL n° 11) ; écart à `GITHUB.md`, section 7, inscrit (DV-196).
- **E-37** : minimum de `@playwright/test` relevé à ^1.61.1 (standard, section 4.3) ; version installée inchangée (1.65.0) ; outillage seulement, absent des images.
- Test instable corrigé dans le test seul (`heures-taches.test.js`, deux horloges lues à des secondes différentes).
- Aide : « Nouvelle demande » (confirmation du lieu, demandes proches), « Mes demandes » (dernière activité), Accueil (en-tête sur tablette) ; deux captures refaites en FR et en NL.
- Note de version : trois lignes pour tous.
- Tests : serveur 705 (702 en 0.21.4), interface 421 (409 en 0.21.4) ; preuves d'échec dans `docs/fr/SECURITE.md`, section 0.21.5.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.21.5 s'installe sur la 0.21.4. **Pas de relance de `demo.js`** : le mot de passe de démonstration du 19/11/2026 reste valable.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_21_5.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_21_5.tar.gz 100% …` (environ 14 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_21_5.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_21_5.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.` Noter le nom de la sauvegarde du jour.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_21_5.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls NOTES_LIVRAISON_v0.21.5.md frontend/src/components/demandes/LieuPicker.tsx
```

Attendu : les deux chemins affichés, sans « No such file ».

```
sudo docker compose build
```

Attendu, après une à cinq minutes : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web` (ou `Image … Built`), sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[APP] API 0.21.5 sur le port 3001`, aucune ligne `[DB] Migration`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : saisie visible du mot de passe commun de démonstration (celui du 19/11/2026, inchangé), « Mot de passe reçu : N caractère(s). », neuf lignes `OK`, puis `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : la 0.21.4 sert la même base (aucune migration) ; mêmes commandes avec `gmao-v0_21_4.tar.gz`, sans restaurer la base. La sauvegarde du jour reste prise par précaution.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, recharger avec Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | C | `agent.ac` : trois lignes 0.21.5, FR et NL |
| 2 | Lieu à confirmer | C | `agent.ac`, « Nouvelle demande » : lieu proposé dans un cadre orange, « Oui, c'est ici » et « Changer de lieu » ; « Envoyer » grisé avec « Confirmez le lieu » ; après « Oui, c'est ici », le cadre disparaît et les demandes du bâtiment s'affichent ; rien n'est envoyé (« Recommencer à zéro ») |
| 3 | Demandes proches | C | Même écran, lieu et catégorie d'une demande ouverte : celle-ci en tête ; « Autres demandes du bâtiment (N) » replié, s'ouvre au clic |
| 4 | Dernière activité | C | `agent.ac`, « Mes demandes » : colonne « Dernière activité » ; une demande avec un message récent porte la date du message |
| 5 | Contour rouge (R1) | C | Affectation d'une tâche : `99/99/2026` puis Tab, passer à une autre fenêtre et revenir : le champ reste en rouge ; « Annuler » |
| 6 | Tablette et fenêtre réduite | C | Fenêtre de Chrome réduite (environ 1000 px) : en-tête sans débordement, boutons en icônes avec leur nom au survol ; mode, langue et thème dans le menu des initiales ; Aide › « Revoir la visite guidée » : panneau dans l'écran |
| 7 | Téléphone | T | Émulation de Chrome (F12 puis Ctrl+Maj+M), iPhone et Android : « Nouvelle demande », « Oui, c'est ici » au doigt ; « Mes demandes » avec la ligne « Dernière activité » |
| 8 | GitHub | T | Travail `tests` vert ; alerte CodeQL n° 11 fermée après la fusion |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Inchangée ; demandes proches et dernière activité calculées dans la requête de l'entité active ; `cloison.test.js` vert |
| Bilinguisme | Note, aide, boutons, messages en FR et en NL (`notes-version.test.js`, `help:check`, `i18n.test.ts`) |
| Accessibilité | Boutons de confirmation dans un groupe nommé ; boutons d'icône avec leur nom accessible ; `npm run a11y` 0 |
| API et MCP | Champs ajoutés à `list_demandes_voisines` et `list_demandes`, descriptions FR et NL ; parité inchangée |
| Journal d'audit | Inchangé (lecture seule) |
| Aide | Trois fiches et deux captures FR et NL ; `help:check` 11/11 |
| Téléphones, tablette, bureau | `mobile:check` complet à huit appareils : voir `ETAT.md`, section 2 |
| Tests | Serveur 705, interface 421 (+1) ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; E-50 et E-09 acceptés pour l'écolage (DV-192, DV-193) |

## Questions RGPD

- Aucune donnée personnelle nouvelle, aucune finalité nouvelle, aucun destinataire nouveau. La dernière activité est calculée à la lecture à partir de données déjà montrées au demandeur ; une note interne du service n'est jamais comptée. Les demandes proches ne montrent ni nom ni numéro (DV-56).

## Simulé ou incomplet

- R1 vérifié dans Chromium et WebKit de Playwright (perte de focus de la page) et par les tests ; un vrai passage d'une fenêtre à l'autre se rejoue au contrôle 5 dans Chrome.
- Tablette et bureau contrôlés dans Chromium seulement (pas de Safari sur iPad) ; pas de vrai iPhone ni de vrai Android (décision du 23/11/2026 : émulation de Chrome).
- Le dépôt GitHub garde `ci.yml` modifié par rapport à `GITHUB.md`, section 7 (E-51, DV-196) : suggestion à Renaud, non bloquante, de mettre `GITHUB.md` à jour.

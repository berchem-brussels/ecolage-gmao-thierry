# Notes de livraison 0.20.0

19/11/2026 · GMAO communale · Étape 16 : tâches d'une demande, affectation, « Planifiée », suggestion d'affectation, filtres par équipe et par ouvrier ; remarques de la recette de la 0.19.0 (DV-159 à DV-163)

## Périmètre

Migration `017_taches` (deux tables ; table des passages refaite à l'identique pour admettre l'affectation) ; aucune dépendance nouvelle ; aucun réglage nouveau ; aucune permission nouvelle (lecture `demandes:entite`, écriture `demandes:traiter`). Neuf passages nouveaux depuis « Planifiée » (42 passages).

- **Remarques de la recette de la 0.19.0** (DV-159) : la visite guidée ne bloque plus le menu sur téléphone (le calque transparent du composant laissait passer aucun toucher ; la visite se ferme à l'ouverture du menu) ; cadre à la couleur de l'institution et titre plus visible ; « Demandes de l'entité (n à qualifier) » de l'accueil compte comme le tableau de bord, rouvertes comprises ; une liste vide n'est plus affichée sans valeur au journal.
- **Tâches d'une demande** (CYC-03, DV-160) : section « Tâches » de la fiche du service technique ; titre, consignes à l'ouvrier, corps de métier (celui de la demande proposé), durée estimée ; à faire, en cours, terminée, annulée avec un motif ; une tâche démarrée fait passer la demande « En cours », la dernière tâche finie « Travaux terminés » (par la table des passages) ; « Travaux terminés » refusé tant qu'une tâche est ouverte ; une demande fermée annule ses tâches ouvertes. Le demandeur ne voit jamais les tâches.
- **Affectation et « Planifiée »** (PLA-01, DV-161, qui remplace DV-118 pour cet état) : une tâche se confie à une équipe ou à un à dix ouvriers, avec une date, une heure de début et une durée ; une date fait passer la demande « Planifiée », plus aucune date la ramène « Qualifiée » ; jamais à la main. Le demandeur lit « Intervention prévue le … », jamais le nom des ouvriers.
- **Ouvriers proposés** (PLA-02, DV-162) : dans le formulaire d'affectation, les ouvriers de l'entité triés par même corps de métier, travail ce jour (horaire de l'équipe ou de l'entité, jours fériés et fermetures), charge du jour ; « Choisir » ajoute l'ouvrier. Les absences viendront avec le planning (étape 17).
- **Filtres « Équipe » et « Ouvrier »** (GES-02, E-35, DV-163) : Demandes de l'entité, vues enregistrées, export et MCP ; équipe : tâche non annulée confiée à l'équipe ou à l'un de ses membres ; ouvrier : à lui ou à une de ses équipes.
- **Téléphones** : panneau du calendrier centré sous 480 px (il sortait de l'écran à 320 px, vu par `mobile:check`) ; bouton « Choisir » toujours à droite dans la liste des ouvriers proposés.
- MCP : sept outils (`list_taches_demande`, `create_tache`, `get_tache`, `update_tache`, `change_etat_tache` en deux appels, `affecter_tache`, `suggerer_affectation_tache`) ; `list_demandes` reçoit `equipe_id` et `ouvrier_id` ; 174 outils. Plafond de 60 appels par minute désormais testé.
- Aide : trois procédures et deux questions dans « Demandes de l'entité », une question dans « Mes demandes » ; captures `demandes-entite-filtre-equipe`, `demandes-entite-taches`, `demandes-entite-affecter` en FR et NL.
- `mobile:check` : 61 écrans (visite et menu, tâches, affectation avec le calendrier ouvert, liste filtrée par équipe). `recette.sh` : contrôle 3 (capture des tâches en néerlandais), contrôle 5 (`017_taches`, neuf tables, deux passages par l'affectation), contrôle 6 (tâches refusées sans session).
- Note de version : quatre lignes (tous ; trois pour le service technique).
- Tests : serveur 667 (637 en 0.19.0), interface 370 (359) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md`.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.20.0 s'installe sur la 0.19.0. **Pas de relance de `demo.js`** : le mot de passe de démonstration du 19/11/2026 reste valable.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_20_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_20_0.tar.gz 100% …` (environ 13 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_20_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_20_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.` **Noter le nom de la sauvegarde du jour** : un retour arrière la restaure.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_20_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/src/services/taches.js NOTES_LIVRAISON_v0.20.0.md
```

Attendu : les deux chemins affichés, sans « No such file ».

```
sudo docker compose build
```

Attendu, après une à quatre minutes : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web` (ou `Image … Built`), sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[DB] Migration 017_taches appliquée`, puis `[APP] API 0.20.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : saisie visible du mot de passe de démonstration du 19/11/2026, « Mot de passe reçu : 16 caractère(s). », neuf lignes `OK` (le contrôle 3 cite la capture des tâches, le contrôle 5 `017_taches, 9 table(s) sur 9, 2 passage(s) par l'affectation sur 2`, le contrôle 6 treize refus sans session dont les tâches), puis `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : mêmes commandes avec `gmao-v0_19_0.tar.gz`, puis **restauration de la sauvegarde du jour, obligatoire** (`docs/fr/EXPLOITATION.md`, Restauration). Essayé le 19/11/2026 sur la copie locale : la 0.19.0 démarre sur une base passée en 0.20.0 (connexion, liste, fiche ; `/api/taches` absent), mais elle ne connaît pas les passages « via l'affectation » et les montrerait comme des boutons « Planifiée » et « Qualifiée » : sans restauration, une demande pourrait être planifiée à la main, sans tâche.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, après Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | C | `agent.ac` : une ligne (menu et visite, date prévue) ; `gestionnaire.ac` : quatre lignes, FR et NL ; bas du menu `v0.20.0` |
| 2 | Accueil | C | `gestionnaire.ac` : « Demandes de l'entité (n à qualifier) » égal au compteur « À qualifier » du tableau de bord |
| 3 | Tâches | C | Une demande « Qualifiée » : deux tâches ajoutées (corps de métier proposé), une démarrée → demande « En cours » ; « Travaux terminés » absent tant qu'une tâche est ouverte ; les deux terminées → « Travaux terminés » ; journal sans le texte des tâches |
| 4 | Affectation | C | Une tâche confiée à deux ouvriers avec une date → demande « Planifiée » ; « Ouvriers proposés » (corps de métier en vert, « Travaille ce jour ») ; date retirée → « Qualifiée » ; « Planifiée » jamais proposé comme bouton |
| 5 | Demandeur | C | `agent.ac`, sa demande planifiée : « Intervention prévue le … », ni tâche ni nom d'ouvrier |
| 6 | Filtres | C | Demandes de l'entité, filtre « Équipe » AC-BAT puis « Ouvrier » : demandes attendues ; vue enregistrée retrouvée ; export Excel avec le filtre |
| 7 | Cloison | C | `gestionnaire.cpas` : aucune tâche de l'AC, filtre sur une équipe de l'AC vide |
| 8 | Journal | C | Administrateur, Journal d'audit : « Tâche affectée » avec les ouvriers et l'équipe nommés ; aucune liste vide affichée sans valeur |
| 9 | Aide | C | « Demandes de l'entité » : trois procédures nouvelles avec leurs captures, FR et NL |
| 10 | iPhone (Edge, moteur WebKit) | T | Visite guidée ouverte (Aide › « Revoir »), puis le menu : il s'ouvre et la visite se ferme ; affectation d'une tâche : le calendrier tient dans l'écran, un jour se choisit |
| 11 | Android | — | Couvert par l'émulation de Chrome de `mobile:check` (360 et 412 px, parcours au doigt, DV-152) ; vrai téléphone avant l'utilisation réelle |
| 12 | Métier | T | Atelier : découpage en tâches, règle « Planifiée » par la date, ouvriers proposés, chef d'équipe sans droit d'affecter pour l'instant |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Tâches, affectation, suggestion et filtres de l'entité seulement, par l'API et le MCP (`taches.test.js`, `cloison.test.js`) |
| Bilinguisme | Écran, messages d'erreur, note de version, aide et captures en FR et en NL (`i18n.test.ts`, `help.test.ts`) |
| Journal d'audit | `tache.create`, `tache.update`, `tache.etat`, `tache.affecter` ; textes jamais au journal ; ouvriers et équipe nommés à la lecture ; passage automatique noté `auto` |
| Aide | Trois procédures, trois questions, trois captures nouvelles par langue ; `help:check` 11/11 |
| Téléphones | `mobile:check` 61 écrans, six appareils (Chromium et WebKit), FR et NL, parcours complets sur les deux moteurs ; un défaut trouvé et corrigé (calendrier à 320 px) |
| Tests | Serveur 667 (637 en 0.19.0), interface 370 (359) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; audit serveur 2 modérées (`uuid`, E-50), interface 3 modérées (E-09) |
| MCP | Sept outils nouveaux (174) ; aucune route hors MCP nouvelle (E-17 : neuf routes) ; parité testée |
| Migration | `017_taches` sur une base 0.19.0 (test et copie locale) ; passage désactivé gardé désactivé ; retour arrière essayé, avec restauration obligatoire |

## Questions RGPD

- Données nouvelles : tâches d'une demande (titre, consignes, durée), ouvriers ou équipe à qui elles sont confiées, date et heure prévues ; charge du jour d'un ouvrier calculée à la lecture, jamais gardée.
- Destinataires : le service technique de l'entité (gestionnaire, responsable) ; le demandeur ne lit que la date prévue ; journal d'audit : administrateur.
- Minimisation : textes des tâches et motif d'annulation jamais au journal ; aucune cause d'absence (les absences viendront à l'étape 17, sans leur motif, PLA-04).

## Simulé ou incomplet

- Heures réalisées et clôture par l'ouvrier sur son téléphone : étape 18. Le gestionnaire fait passer les tâches lui-même en attendant.
- Planning par semaine, absences, conflits de charge (PLA-03 à PLA-06) : étape 17 ; la suggestion ne connaît pas encore les absences.
- Le chef d'équipe ne peut pas encore affecter ni répartir les tâches de son équipe dans l'application (étape 19).
- WebKit de Playwright reste une émulation : le contrôle 10 sur l'iPhone reste nécessaire ; Android réel non testé (DV-152).
- Images Docker non reconstruites dans le bac à sable ; travail `tests` de GitHub non rejoué sous Node 20.

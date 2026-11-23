# Notes de livraison 0.21.0

20/11/2026 · GMAO communale · Étape 17 : heures réelles des tâches, indisponibilités des ouvriers, planning semaine et jour, tâches non planifiées, conflits, date annoncée au demandeur ; remarques de la recette de la 0.20.0 (DV-164 à DV-172)

## Périmètre

Migration `018_planning` (une table, deux colonnes des tâches, trois colonnes des demandes) ; aucune dépendance nouvelle ; aucun réglage nouveau ; une permission nouvelle : `indisponibilites:gerer` (gestionnaire, responsable). Un avis nouveau (`demande.date_prevue`) et son modèle de courriel. La garde (PLA-09) est reportée à l'étape 21 (DV-166).

- **Remarques de la recette de la 0.20.0** (DV-164, DV-168) : une date tapée au clavier n'est plus perdue et Entrée n'envoie plus le formulaire ; sur téléphone, le champ de date ouvre le calendrier sans le clavier (R1) ; « Modifier la qualification » sur une demande qualifiée comme sur une planifiée (R3) ; journal : dates en jj/mm/aaaa, « Date prévue : aucune » (R4). R2 : le rôle de Renaud Ziegler est voulu.
- **Heures réelles** (R5, DV-169) : « Démarrer » est mis en avant et note l'heure de début ; « Terminer » note l'heure de fin ; une tâche terminée sans avoir été démarrée demande son début et sa fin (préremplis à maintenant, fin après début, jamais dans le futur). La tâche dit « Réalisée du … au … (durée) » ; une tâche terminée avant la 0.21.0 dit « Terminée sans heures notées ».
- **Absences des ouvriers** (PLA-04, DV-170) : section « Indisponibilités » de la fiche d'un ouvrier (Équipes et prestataires, onglet Ouvriers) : du, au, journée ou demi-journée, motif congé, formation ou autre absence ; le motif n'est vu que du gestionnaire et du responsable, jamais au journal ; « Indisponible ce jour » dans les ouvriers proposés. Saisie à la main : aucune lecture de SAGA (brique à soumettre à Renaud).
- **Planning** (PLA-03, PLA-05, PLA-06, DV-171) : écran « Planning » au menu du service technique ; semaine ou jour, par ouvrier ou par équipe, charge du jour, absences sans cause, jours non travaillés grisés ; glisser-déposer sur ordinateur, « Déplacer » partout ; tâches non planifiées au-dessus de la grille, « Planifier » ; conflits « Absent », « Jour non travaillé », « Trop chargé », jamais bloquants, aussi après une affectation. Sur téléphone : vue du jour.
- **Date annoncée au demandeur** (SUI-03, DV-172) : quand la date de l'intervention change, la fiche du demandeur dit « Date modifiée le … (prévue auparavant le …) » ; demandeur, bénéficiaire et personnes qui suivent sont prévenus par la cloche et par courriel (en mode test sur NIXUS).
- MCP : six outils (`list_indisponibilites`, `get_indisponibilite`, `create_indisponibilite`, `update_indisponibilite`, `delete_indisponibilite` en deux appels, `get_planning`) ; 180 outils.
- Aide : fiche « Planning » ; procédure « Noter une absence d'un ouvrier » ; heures, absences et conflits dans « Demandes de l'entité » ; « Date modifiée » dans « Mes demandes » ; trois captures nouvelles et deux refaites, FR et NL. Assistant : quatre sujets nouveaux.
- `mobile:check` : 66 écrans. `recette.sh` : contrôle 3 (capture du planning en néerlandais), contrôle 5 (`018_planning`, dix tables, cinq colonnes), contrôle 6 (planning et indisponibilités refusés sans session).
- Note de version : quatre lignes (tous ; planning ; absences ; heures et saisie des dates).
- Tests : serveur 696 (667 en 0.20.0), interface 389 (370) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md`.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.21.0 s'installe sur la 0.20.0. **Pas de relance de `demo.js`** : le mot de passe de démonstration du 19/11/2026 reste valable.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_21_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_21_0.tar.gz 100% …` (environ 14 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_21_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_21_0.tar.gz
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
sudo tar xzf gmao-v0_21_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/src/services/planning.js NOTES_LIVRAISON_v0.21.0.md
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

Attendu : `[DB] Migration 018_planning appliquée`, puis `[APP] API 0.21.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : saisie visible du mot de passe de démonstration du 19/11/2026, « Mot de passe reçu : 16 caractère(s). », neuf lignes `OK` (le contrôle 3 cite la capture du planning, le contrôle 5 `018_planning, 10 table(s) sur 10, 5 colonne(s) nouvelle(s) sur 5, 2 passage(s) par l'affectation sur 2`, le contrôle 6 seize refus sans session dont le planning et les indisponibilités), puis `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : mêmes commandes avec `gmao-v0_20_0.tar.gz`, puis restauration de la sauvegarde du jour, recommandée (`docs/fr/EXPLOITATION.md`, Restauration). Essayé le 20/11/2026 sur la copie locale : la 0.20.0 démarre sur une base passée en 0.21.0 et l'ignore (liste, fiche, tableau de bord, ouvriers proposés, création, affectation, démarrage et fin d'une tâche, équipes, journal), puis la 0.21.0 y remonte sans nouvelle migration. Sans restauration, les absences restent en base, invisibles ; les tâches terminées sous la 0.20.0 n'ont pas d'heures, et un changement de date fait sous la 0.20.0 ne serait pas annoncé.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, après Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | C | `agent.ac` : une ligne (date modifiée) ; `gestionnaire.ac` : quatre lignes, FR et NL ; bas du menu `v0.21.0` |
| 2 | Saisie des dates (R1) | C | Affectation d'une tâche : date tapée au clavier puis Entrée : rien n'est envoyé, la date reste ; « Enregistrer » la garde |
| 3 | Heures réelles | C | Tâche à faire, « Terminer » : fenêtre « Terminer la tâche » avec début et fin préremplis ; fin avant début refusée ; « Réalisée du … au … » ; tâche démarrée puis terminée : début et fin notés |
| 4 | Absences | C | `gestionnaire.ac`, Équipes et prestataires, onglet Ouvriers, fiche d'un ouvrier : absence d'un jour (congé) ; « Indisponible ce jour » dans les ouvriers proposés de ce jour ; `chef-equipe.ac` voit le jour sans le motif |
| 5 | Planning | C | Menu « Planning » : semaine en cours, charge, case grisée le week-end, absence sans cause ; glisser une tâche vers un autre jour ; « Déplacer » ; tâches non planifiées et « Planifier » ; conflit « Absent » ou « Trop chargé » |
| 6 | Date annoncée | C | Date d'une tâche planifiée changée : `agent.ac` lit « Date modifiée le … (prévue auparavant le …) », cloche ; courriel retenu dans le journal des courriels (mode test) |
| 7 | Cloison | C | `gestionnaire.cpas` : planning sans ouvrier ni tâche de l'AC, absences de l'AC invisibles |
| 8 | Journal | C | Administrateur, Journal d'audit : « Tâche » avec heures de début et de fin, absence sans motif, « Date prévue changée » ; dates en jj/mm/aaaa, « aucune » |
| 9 | Aide | C | Fiche « Planning » avec ses captures ; « Noter une absence » ; FR et NL |
| 10 | iPhone (Edge, moteur WebKit) | T | Planning : vue du jour, « Déplacer » ; affectation : le champ de date ouvre le calendrier sans clavier ; « Terminer » une tâche à faire : la fenêtre des heures tient dans l'écran |
| 11 | Android | — | Couvert par l'émulation de Chrome de `mobile:check` (360 et 412 px, parcours au doigt, DV-152) ; vrai téléphone avant l'utilisation réelle |
| 12 | Métier | T | Atelier : planning de la semaine, absences sans cause, capacité « du début à la fin du créneau » (pause comprise, E-52), conflits non bloquants |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Indisponibilités, planning, conflits et ouvriers proposés de l'entité seulement, par l'API et le MCP ; absence d'un ouvrier des deux entités notée dans l'autre sans effet (`indisponibilites.test.js`, `planning.test.js`, `cloison.test.js`) |
| Bilinguisme | Écrans, messages d'erreur, note de version, avis, aide et captures en FR et en NL (`i18n.test.ts`, `help.test.ts`) |
| Journal d'audit | `tache.etat` avec heures ; `indisponibilite.create`, `.update`, `.delete` sans motif ; `demande.date_prevue` ; jamais de texte libre |
| Aide | Fiche « Planning », trois procédures, quatre questions, trois captures nouvelles par langue ; `help:check` 11/11 |
| Téléphones | `mobile:check` 66 écrans, six appareils (Chromium et WebKit), FR et NL, parcours complets sur les deux moteurs, sans défaut |
| Tests | Serveur 696 (667 en 0.20.0), interface 389 (370) et un contrôle des captures ; parcours `ci.yml` rejoué sous Node 20 ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; audit serveur 2 modérées (`uuid`, E-50), interface 3 modérées (E-09) |
| MCP | Six outils nouveaux (180) ; aucune route hors MCP nouvelle (E-17 : neuf routes) ; parité testée |
| Migration | `018_planning` sur une base 0.20.0 (test et copie locale) ; retour arrière essayé |

## Questions RGPD

- Données nouvelles : heures réelles de début et de fin d'une tâche (ouvriers) ; absences des ouvriers (dates, demi-journée, motif dans une liste fermée : congé, formation, autre absence) ; date annoncée au demandeur et date d'avant.
- Destinataires : service technique de l'entité ; motif d'une absence au gestionnaire et au responsable seulement ; demandeur, bénéficiaire et personnes qui suivent : la date seulement, jamais les ouvriers ; journal d'audit : administrateur.
- Minimisation : aucun texte libre sur une absence, aucune cause de santé (« Autre absence » ne dit pas laquelle) ; motif jamais au journal ; registre dans `docs/fonctionnel/taches-planning.md`.

## Simulé ou incomplet

- Garde (PLA-09) : étape 21 (DV-166).
- Absences saisies à la main ; lecture dans SAGA à soumettre à Renaud (brique hors stack).
- Capacité d'un ouvrier comptée du début à la fin du créneau, pause comprise (E-52).
- Volumétrie : hypothèse TEC-08 gardée pour la démonstration (DV-165) ; chiffres réels avant la production.
- Heures réalisées et clôture par l'ouvrier sur son téléphone : étape 18. Le chef d'équipe consulte le planning sans déplacer (étape 19).
- WebKit de Playwright reste une émulation : le contrôle 10 sur l'iPhone reste nécessaire ; Android réel non testé (DV-152).
- Images Docker non reconstruites dans le bac à sable.

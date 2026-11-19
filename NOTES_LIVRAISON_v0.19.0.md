# Notes de livraison 0.19.0

18/11/2026 · GMAO communale · Étape 15 : équipes, corps de métier, compétences, prestataires ; correctifs de la recette de la 0.18.0 (DV-152 à DV-157)

## Périmètre

Migration `016_equipes_prestataires` (sept tables, deux colonnes) ; aucune dépendance nouvelle ; aucun réglage nouveau. Permissions nouvelles : `equipes:lire` (chef d'équipe, gestionnaire, responsable), `equipes:gerer` (responsable), `equipes:diriger` (chef d'équipe), `prestataires:lire` (gestionnaire, responsable), `prestataires:gerer` (responsable), `interventions:realiser` (ouvrier, chef d'équipe). Le filtre par équipe de la liste du service est reporté à la 0.20.0 avec le filtre par ouvrier (DV-153, E-35).

- **Correctifs de la recette de la 0.18.0** (DV-152) : l'export Excel des tickets ne donne plus d'erreur 500 (mise en forme de la colonne « Description » seulement quand elle existe ; un test exporte chaque liste dans chaque format) ; la visite guidée tient sur un téléphone (compteur « n / total » au lieu des points, libellés courts, panneau à 12 px des bords) ; `mobile:check` mesure chaque étape de la visite et signale un écran renvoyé ailleurs faute de droit.
- **Corps de métier et compétences** (ROL-05, DV-154) : deux listes de valeurs par entité, réglées par le responsable (Listes de valeurs) ; onze corps de métier et onze compétences livrés (BA4, BA5, VCA, nacelle, permis C…), à revoir en atelier.
- **Équipes** (ROL-05, DV-155) : écran « Équipes et prestataires » ; une équipe a un code, des noms FR et NL, un chef (rôle « Chef d'équipe »), des membres (« Ouvrier » ou « Chef d'équipe »), et l'horaire de l'entité ou le sien, un créneau par jour du lundi au dimanche (équipe du week-end, DV-28) ; il ne change pas le calcul des délais. Onglet Ouvriers : corps de métier, compétences et équipes de chaque ouvrier, filtre par équipe.
- **Prestataires** (REF-07, EXT-03, DV-156) : onglet Prestataires ; nom, numéro d'entreprise facultatif (dix chiffres, clé modulo 97, unique dans l'entité), langue, corps de métier, référence du marché ou du contrat, contact ; recherche et filtre par corps de métier ; désactivation avec motif.
- **Corps de métier des catégories et à la qualification** (REF-06, GES-04, DV-157) : chaque domaine et chaque nature livrés portent un corps de métier (une nature hérite de son domaine) ; à la qualification, la catégorie le propose et le gestionnaire le garde ou le change ; il n'est jamais montré au demandeur.
- **MCP** : treize outils nouveaux (équipes, ouvriers, prestataires), 167 en tout ; parité testée.
- **Aide** : fiche « Équipes et prestataires », Listes de valeurs, Catégories et délais, Demandes de l'entité (qualification) ; trois intentions de l'assistant ; six captures refaites ou nouvelles par langue (36).
- **Données de démonstration** : `demo.js` ajoute deux ouvriers par entité (`ouvrier-2`, `ouvrier-3`), deux équipes par entité (Bâtiment ; Propreté du week-end, samedi et dimanche de 07:00 à 13:00), les profils des ouvriers et deux prestataires fictifs par entité, sans numéro d'entreprise ; **à relancer après la mise à jour**, ce qui change le mot de passe commun.
- **Téléphones** : `mobile:check` 57 écrans (huit nouveaux : équipes, ouvriers, prestataires et leurs fiches, qualification, catégorie), six appareils, FR et NL, parcours complets sur les deux moteurs ; défaut ancien corrigé : la fiche d'une catégorie débordait à 320 px.
- Note de version : quatre lignes (tous : visite et export des tickets ; équipes ; prestataires ; corps de métier à la qualification).

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.19.0 s'installe sur la 0.18.0. **Elle demande de relancer `demo.js` avant `recette.sh`** : le mot de passe de démonstration change.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_19_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_19_0.tar.gz 100% …` (environ 12 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_19_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_19_0.tar.gz
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
sudo tar xzf gmao-v0_19_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/src/services/equipes.js NOTES_LIVRAISON_v0.19.0.md
```

Attendu : les deux chemins affichés, sans « No such file ».

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

Attendu : `[DB] Migration 016_equipes_prestataires appliquée`, puis `[APP] API 0.19.0 sur le port 3001`.

```
sudo docker compose stop api
```

Attendu : `Container gmao-api Stopped`.

```
sudo docker compose run --rm api node src/demo.js
```

Attendu : `[DEMO] 25 comptes de démonstration prêts.`, la liste des adresses en `@demo.invalid`, `[DEMO] 0 lieu(x)…`, `[DEMO] 0 service(s)…`, `[DEMO] 4 équipe(s) de démonstration créée(s) …`, `[DEMO] 4 prestataire(s) de démonstration créé(s), sans numéro d'entreprise.`, puis le **nouveau mot de passe commun**, affiché une seule fois : le noter.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Running`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : saisie visible du **nouveau** mot de passe de démonstration, « Mot de passe reçu : 16 caractère(s). », neuf lignes `OK` (le contrôle 3 cite la capture des équipes, le contrôle 5 `016_equipes_prestataires, 7 table(s) sur 7, 0 entité(s) sans corps de métier`, le contrôle 6 dix refus sans session dont les équipes, les ouvriers et les prestataires), puis `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : mêmes commandes avec `gmao-v0_18_0.tar.gz`, puis **restauration de la sauvegarde du jour** par précaution (`docs/fr/EXPLOITATION.md`, Restauration). Essayé le 18/11/2026 sur la copie locale : la 0.18.0 démarre sur une base passée en 0.19.0 et l'ignore (connexion, liste, fiche, catégories, qualification ; écran des équipes absent) ; la remontée en 0.19.0 se fait sans nouvelle migration. Sans restauration, les équipes, les ouvriers, les prestataires et les corps de métier resteraient en base, invisibles, et reviendraient avec la 0.19.0.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, après Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | C | `agent.ac` : une ligne (visite guidée sur téléphone, export des tickets) ; `responsable.ac` : quatre lignes, FR et NL ; bas du menu `v0.19.0` |
| 2 | Export des tickets | C | `agent.ac`, Tickets › « Exporter » › Excel : fichier téléchargé, plus d'erreur |
| 3 | Équipes | C | `responsable.ac`, « Équipes et prestataires » : AC-BAT (chef `chef-equipe`, deux membres, horaire de l'entité) et AC-PROP (samedi et dimanche 07:00–13:00) ; fiche, modification d'un membre, refus d'un chef sans le rôle ; `gestionnaire.ac` : lecture seule |
| 4 | Ouvriers | C | Onglet Ouvriers : corps de métier et compétences ; filtre par équipe ; fiche d'un ouvrier modifiée par le responsable ; administrateur, Journal d'audit : lignes nommées (équipe, ouvrier, corps de métier) |
| 5 | Prestataires | C | Onglet Prestataires : deux prestataires de démonstration ; ajout avec un numéro d'entreprise faux (refusé, message clair) puis valide ; désactivation avec motif ; `chef-equipe.ac` : pas d'onglet Prestataires |
| 6 | Listes et catégories | C | `responsable.ac`, Listes de valeurs : « Corps de métier » et « Compétences » ; Catégories et délais (mode Complet) : colonne « Corps de métier », fiche d'une nature « Comme le domaine » |
| 7 | Qualification | C | `gestionnaire.ac`, une demande « À qualifier » : corps de métier proposé par la catégorie, changé, enregistré ; fiche du service ; `agent.ac` ne voit pas le corps de métier |
| 8 | Cloison | C | `responsable.cpas` : équipes, ouvriers et prestataires du CPAS seulement |
| 9 | Aide et assistant | C | Fiche « Équipes et prestataires » avec ses captures, FR et NL ; assistant « prestataire », « équipe du week-end » |
| 10 | iPhone (Edge, moteur WebKit) | T | Visite guidée (Aide › « Revoir ») : panneau dans l'écran, compteur sur une ligne jusqu'à la dernière étape ; écran Équipes et prestataires avec `responsable.ac` ; qualification avec le corps de métier |
| 11 | Android | — | Couvert par l'émulation de Chrome de `mobile:check` (360 et 412 px, parcours au doigt, DV-152) ; vrai téléphone avant l'utilisation réelle |
| 12 | Métier | T | Atelier : corps de métier, compétences et corps des catégories livrés (DV-154) ; équipes réelles et horaire de la propreté du week-end |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Équipes, ouvriers, prestataires et valeurs de liste de l'entité seulement, par l'API et le MCP (`equipes.test.js`, `prestataires.test.js`, `corps-categories.test.js`, `cloison.test.js`) |
| Bilinguisme | Écran, fiches, listes livrées, messages d'erreur, note de version et aide en FR et en NL (`i18n.test.ts`) |
| Journal d'audit | `equipe.*`, `ouvrier.update`, `prestataire.*` ; membres, chef, corps de métier et compétences nommés à la lecture ; jamais les coordonnées du contact à la création |
| Aide | Fiche nouvelle, quatre fiches mises à jour, six captures refaites ou nouvelles par langue ; `help:check` 11/11 |
| Téléphones | `mobile:check` 57 écrans, six appareils (Chromium et WebKit), FR et NL, parcours complets sur les deux moteurs : voir `ETAT.md` |
| Tests | Serveur 637 (605 en 0.18.0), interface 359 (349) et un contrôle des captures ; dix-neuf preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; audit serveur 2 modérées (`uuid`, E-50), interface 3 modérées (E-09) |
| MCP | Treize outils nouveaux (167) ; aucune route hors MCP nouvelle (E-17 : neuf routes) ; parité testée |
| Migration | `016_equipes_prestataires` sur une base 0.18.0 (test et copie locale) ; retour arrière essayé |

## Questions RGPD

- Données nouvelles : appartenance d'un ouvrier à une équipe, chef d'équipe ; corps de métier et compétences d'un ouvrier (habilitations professionnelles, sans date ni pièce) ; nom, téléphone et courriel de la personne de contact d'un prestataire. Registre : `docs/fonctionnel/equipes-prestataires.md`, section « Données personnelles ».
- Destinataires : le service technique de l'entité (responsable, gestionnaire ; chefs d'équipe pour les équipes et les ouvriers) ; journal d'audit : administrateur. Aucun destinataire extérieur.
- Minimisation : aucune donnée de santé ni d'évaluation ; le corps de métier d'une demande n'est pas rendu au demandeur ; les coordonnées d'un contact ne sont jamais copiées au journal à la création ; démonstration sans numéro d'entreprise ni adresse réelle.

## Simulé ou incomplet

- Filtre par équipe et par ouvrier de la liste du service, affectation et suggestion selon le corps de métier : 0.20.0 (DV-153, E-35).
- Envoi d'une demande à un prestataire (EXT-02), état « Confiée à un prestataire » : étapes suivantes.
- L'horaire d'une équipe n'entre pas dans le calcul des délais ; la garde viendra avec le planning.
- WebKit de Playwright reste une émulation : le contrôle 10 sur l'iPhone reste nécessaire ; Android réel non testé (DV-152).
- Images Docker non reconstruites dans le bac à sable ; travail `tests` de GitHub non rejoué sous Node 20.

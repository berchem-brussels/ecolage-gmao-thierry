# Notes de livraison 0.18.0

18/11/2026 · GMAO communale · Étape 14 : recherche globale, exports Excel et CSV, assistant, visite guidée, aide du lot, protocole de la recette d'usage (DV-147 à DV-151)

## Périmètre

Aucune migration, aucune permission nouvelle, aucun réglage nouveau. Dépendance nouvelle côté serveur : `exceljs` ^4.4.0, dans le stack (TEC-03) ; `npm audit --omit=dev` du serveur signale deux failles modérées de `uuid` 8.3.2 sous `exceljs`, sur un chemin que `exceljs` n'emprunte pas (écart E-50 ; un forçage de version attend l'accord de Renaud).

- **Recherche globale** (ERG-04) : une loupe dans l'en-tête de chaque écran (sur un téléphone de moins de 360 px, « Rechercher » en tête du menu) ; 2 caractères au moins ; numéro, même partiel, lieu ou mot de la description ; résultats groupés (Mes demandes, Demandes de l'entité pour le service technique, Patrimoine), cinq par groupe ; un résultat ouvre la fiche, Entrée ouvre le premier. Aucune route nouvelle : les listes existantes, avec les droits de la personne (DV-148).
- **Exports Excel et CSV** (IMP-03) : bouton « Exporter » sur Mes demandes, Demandes de l'entité, Demandes à valider et Tickets, avec les filtres affichés. Excel : titres en gras, ligne figée, filtre automatique ; CSV : UTF-8, séparateur « ; », formule neutralisée. 5 000 lignes au plus (au-delà : « affinez les filtres »). Chaque export est noté au journal d'audit (famille « Exports »), sans son contenu (DV-149).
- **Assistant** (AID-02, AID-03) : « où en est ma demande » montre les trois demandes ouvertes les plus récentes de la personne, ou celle dont elle donne le numéro, avec un lien vers la fiche ; une question sans réponse prévue propose jusqu'à trois fiches du mode d'emploi ; « Ouvrir l'écran » seulement vers un écran que la personne peut ouvrir. Toujours sans modèle de langage ni appel sortant (DV-150).
- **Visite guidée** (ERG-07) : à la première ouverture, après « Nouveautés » : accueil, une étape par rôle (demandeur, service technique, chef de service, administrateur), puis les boutons de l'en-tête ; une fois par personne et par appareil, de nouveau quand un rôle s'ajoute ; « Revoir la visite guidée » dans l'Aide (DV-151).
- **Aide** : recherche (Accueil), export (quatre listes), assistant et visite guidée (Mode d'emploi), trois questions ; captures refaites en entier sur une base de démonstration propre (trois nouvelles). Fiche fonctionnelle `docs/fonctionnel/recherche-exports-assistant.md`.
- **Recette d'usage** (REC-03, ERG-02) : protocole chronométré avec cinq agents par entité, consignes FR et NL, grille et seuils proposés dans `docs/fr/RECETTE-USAGE.md` ; à jouer en atelier, après confirmation des seuils.
- **Téléphones** : `mobile:check` ajoute la recherche, l'assistant et la visite guidée (49 écrans) et trois parcours au doigt (recherche et fiche, export téléchargé, assistant et fiche) ; une instabilité du contrôle lui-même (double ouverture d'écran, vue dans WebKit) est corrigée.
- Note de version : quatre lignes pour tous (recherche, assistant, visite guidée, exports).

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.18.0 s'installe sur la 0.17.0 ; pas de relance de `demo.js`, le mot de passe de démonstration ne change pas.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_18_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_18_0.tar.gz 100% …` (environ 12 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_18_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_18_0.tar.gz
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
sudo tar xzf gmao-v0_18_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/src/services/exports.js NOTES_LIVRAISON_v0.18.0.md
```

Attendu : les deux chemins affichés, sans « No such file ».

```
sudo docker compose build
```

Attendu, après une à cinq minutes (l'image `api` télécharge `exceljs`) : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web` (ou `Image … Built`), sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[APP] API 0.18.0 sur le port 3001`, sans ligne « Migration » (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : saisie visible du mot de passe commun de démonstration (celui du 14/11/2026, inchangé), « Mot de passe reçu : N caractère(s). », neuf lignes `OK` (le contrôle 3 cite la capture de la recherche, le contrôle 5 `015_notifications`, le contrôle 6 dix refus sans session dont les trois exports), puis `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : mêmes commandes avec `gmao-v0_17_0.tar.gz`, **sans restaurer la base** (aucune migration ; essayé le 18/11/2026 sur la copie locale : la 0.17.0 démarre sur la base utilisée par la 0.18.0, connexion, liste et fiche). La loupe, les exports, l'assistant enrichi et la visite guidée disparaissent et reviennent avec la 0.18.0. La sauvegarde du jour reste prise par précaution.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, après Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | C | `agent.ac` : quatre lignes 0.18.0 (loupe, assistant, visite guidée, exports) en FR et en NL ; bas du menu `v0.18.0` |
| 2 | Visite guidée | C | Dans une fenêtre de navigation privée, `agent.ac` puis `gestionnaire.ac` : la visite s'ouvre après « Nouveautés » ; étape de son rôle (« Vos demandes », « Service technique ») ; Terminer ; au rechargement, plus rien ; Aide › « Revoir la visite guidée » la rouvre |
| 3 | Recherche | C | `gestionnaire.ac` : loupe, « 00020 » : la demande dans « Demandes de l'entité », ouverte au clic ; « Accueil » : un lieu du patrimoine ; `agent.ac` : seulement ses demandes |
| 4 | Exports | C, T | `gestionnaire.ac`, Demandes de l'entité, filtre « En cours » : « Exporter » › Excel puis CSV ; T ouvre les deux fichiers dans Excel sur le PC (accents, colonnes séparées, une ligne par demande) ; administrateur, Journal d'audit : deux lignes « Liste exportée » avec la liste, le format et le nombre de lignes |
| 5 | Exports, droits | C | `agent.ac` : « Exporter » sur Mes demandes et Tickets, pas de liste de l'entité dans le menu ; `valideur.ac` : export de « Demandes à valider » |
| 6 | Assistant | C | `agent.ac` : « où en est ma demande » montre ses demandes ouvertes avec leur état, un clic ouvre la fiche ; « qualifier une demande » : réponse sans bouton « Ouvrir l'écran » ; « imprimer » : fiches du mode d'emploi proposées |
| 7 | Cloison | C | `responsable.cpas` : la recherche et l'export ne rendent que des demandes du CPAS |
| 8 | Aide | C | Fiches Accueil (« Retrouver une demande ou un lieu »), Demandes de l'entité (« Exporter la liste… », capture du menu), Mode d'emploi (« Demander à l'assistant… », « Revoir la visite guidée ») en FR et en NL |
| 9 | iPhone (Edge, moteur WebKit) | T | Loupe dans l'en-tête, recherche d'un numéro et ouverture de la fiche ; assistant « où en est ma demande » ; visite guidée lisible (panneau dans l'écran) ; export Excel ouvert depuis Fichiers |
| 10 | Android (Chrome) | T, avec un agent | Mêmes contrôles qu'au 9, si un téléphone Android est disponible ; sinon reporté (DV-80), avec les contrôles 11 de la 0.16.1 et de la 0.17.0 |
| 11 | Métier | T | Confirmer en atelier les seuils de la recette d'usage (`docs/fr/RECETTE-USAGE.md`, section 5) et fixer la date du test avec cinq agents par entité |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Exports par les fonctions de liste existantes : BB n'exporte rien de AA ; recherche et assistant par les listes existantes (`exports.test.js`, `pages.test.tsx`) |
| Bilinguisme | Loupe, exports (colonnes dans la langue de la personne), assistant, visite guidée, aide en FR et en NL (`i18n.test.ts`, `exports.test.js`) |
| Journal d'audit | `export.liste` : liste, format, nombre de lignes, jamais le contenu ; libellés à l'écran (`pages.test.tsx`) |
| Aide | Six fiches mises à jour, trois captures nouvelles, toutes les captures refaites ; `help:check` 11/11 |
| Téléphones | `mobile:check` 49 écrans, six appareils (Chromium et WebKit), FR et NL, parcours complets sur les deux moteurs : voir `ETAT.md` |
| Tests | Serveur 605 (594 en 0.17.0), interface 349 (332) et un contrôle des captures ; quatorze preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | `exceljs` 4.4.0 (stack) ; audit serveur 2 modérées (`uuid`, E-50), interface 3 modérées (E-09) |
| MCP | Aucun outil nouveau ; trois routes d'export hors MCP (E-17 étendu, neuf routes) ; parité testée |

## Questions RGPD

- Données nouvelles : aucune en base. Une ligne au journal d'audit par export (liste, format, nombre de lignes). La visite guidée garde « déjà vue » dans le navigateur de la personne.
- Destinataires : aucun nouveau. Un fichier exporté quitte l'application avec ce que la liste affiche (dont la description et, pour le service technique et le chef de service, le nom du demandeur) ; il se garde et se transmet selon les règles de l'entité.
- Minimisation : l'export reprend les colonnes de la liste, rien de plus ; le fichier n'est jamais gardé sur le serveur ; l'application ne mesure ni temps ni clics des agents (la recette d'usage se mesure à la main).

## Simulé ou incomplet

- Fichiers Excel relus par `exceljs` et par Playwright (téléchargement réel sur Chromium et WebKit), pas encore ouverts dans Excel : contrôle 4.
- WebKit de Playwright reste une émulation : le contrôle 9 sur l'iPhone reste nécessaire ; Android réel non testé.
- Versions imprimables des listes (IMP-03), export du patrimoine et du journal : pas dans cette version. Intentions « réserver une salle » et « emprunter des chaises » (AID-02) : avec leurs modules.
- La recette d'usage elle-même n'est pas jouée : elle demande cinq agents par entité en atelier.
- Images Docker non reconstruites dans le bac à sable (l'image `api` change de dépendances).

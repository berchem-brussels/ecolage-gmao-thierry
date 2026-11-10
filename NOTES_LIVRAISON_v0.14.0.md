# Notes de livraison 0.14.0

08/11/2026 · GMAO communale · Cycle de vie des demandes (étape 9 ; DV-117 à DV-119)

## Périmètre

Une demande suit désormais tout son cycle, de la réception à l'avis du demandeur. Le service technique la fait avancer depuis sa fiche ; le demandeur voit chaque étape, complète, annule, donne son avis ou rouvre. Tout est vérifié aux largeurs de téléphone de 320 à 412 px, en FR et en NL (DV-102).

- **Passages d'un état à l'autre, en données** (CYC-01) : 26 passages livrés dans `backend/config/cycle-de-vie.json`, copiés en base (`demande_transitions`) ; tout passage absent est refusé. Le gestionnaire démarre (« En cours »), met en attente avec un motif, reprend, termine, clôture avec la cause de la panne et un compte rendu interne, refuse avec un motif, annule. « Planifiée » et « Confiée à un prestataire » restent fermés jusqu'à leurs étapes (DV-118). La qualification reste le seul passage vers « Qualifiée ».
- **Historique** (CYC-02) : chaque passage s'inscrit avec son auteur, son canal, son motif et son commentaire ; le service voit tout, le demandeur voit la ligne du temps sans les notes internes.
- **Demandeur** (SUI-02, SUI-05, SUI-06 ; E-21 fermé) : « Compléter ma demande » (texte ajouté sous la description, photos ajoutées dans le plafond de l'entité) tant qu'elle est ouverte ; « Annuler ma demande » avec un motif tant que les travaux n'ont pas commencé ; avis en cinq niveaux à la clôture, un par clôture ; « Rouvrir ma demande » dans le délai de l'entité (date dite à l'écran). Le bénéficiaire (« Pour ») a les mêmes boutons ; qui suit seulement (« Moi aussi ») ne les a pas.
- **Suspension du délai** (PRI-03 ; DV-119) : une attente pour un motif coché dans Réglages de l'entité (par défaut « Réponse du demandeur attendue » et « Accès impossible ») suspend le délai ; à la reprise, l'échéance est repoussée du temps suspendu (minutes ouvrables, ou calendaires pour P1). « Délai suspendu » à la place du retard.
- **Tableau de bord** (GES-01 ; E-35 en partie fermé) : six compteurs, dont « En attente depuis plus de N jours ouvrés » (N réglé par l'entité, 5 par défaut) et « À clôturer » ; une demande rouverte revient dans « À qualifier ».
- **Libellés des états par entité** (CYC-04) : onglet « États des demandes » de Catégories et délais (responsable) : texte vu par le demandeur et texte envoyé à la GRC, FR et NL, retour aux libellés livrés.
- **Listes de valeurs** : motifs d'attente (5), motifs de refus (4), causes de panne (7), réglables par le responsable.
- **`recette.sh`** (DV-117) : mot de passe de démonstration saisi de façon visible, ligne effacée à Entrée, nombre de caractères reçus affiché ; un refus dit « mot de passe refusé, vérifiez la saisie » au lieu de « HTTP 401 ». Le contrôle 5 lit la migration `012_cycle_de_vie`.

**Migration `012_cycle_de_vie`** (tables et colonnes ajoutées seulement) : tables `demande_transitions`, `demande_etats`, `demande_historique`, `demande_complements`, `demande_avis` ; sept colonnes de `demandes` (`etat_depuis`, `cause_id`, `compte_rendu`, `attente_suspend`, `suspendu_ouvrable_min`, `suspendu_calendaire_min`, `decompte_depuis`). Elle remplit l'historique des demandes déjà en base (réception, qualification) et copie les passages et les libellés livrés pour chaque entité. Permission nouvelle `demandes:traiter` (gestionnaire, responsable). Aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env` et `ci.yml` inchangés. Les deux images changent.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_14_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_14_0.tar.gz 100% …` (environ 8 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_14_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_14_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.` Noter le nom de la sauvegarde du jour : c'est elle qu'un retour arrière restaurerait.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_14_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/config/cycle-de-vie.json backend/tests/cycle.test.js frontend/src/components/demandes/ChangerEtat.tsx frontend/src/components/referentiel/EtatsTab.tsx
```

Attendu : les quatre chemins affichés, sans « No such file ».

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

Attendu : `[DB] Migration 012_cycle_de_vie appliquée` puis `[APP] API 0.14.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : « Compte de démonstration : multi-entites@demo.invalid (le mot de passe reste visible pendant la saisie, la ligne s'efface à Entrée) », puis « Mot de passe : » ; taper le mot de passe commun des comptes de démonstration (il s'affiche pendant la frappe, c'est voulu), Entrée ; la ligne s'efface et « Mot de passe reçu : N caractère(s). » s'affiche. Ensuite neuf lignes `OK`, dont « 5. migration 012_cycle_de_vie appliquée, historique des demandes et table des passages présents », et `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation. Si le contrôle 7 dit « mot de passe refusé, vérifiez la saisie (N caractère(s) reçu(s)) », comparer N à la longueur du mot de passe attendu.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : la 0.13.0 démarre sur une base passée en 0.14.0 et ignore les tables nouvelles (essayé dans le bac à sable le 08/11/2026 : connexion, liste et fiches des demandes, tableau de bord ; remontée en 0.14.0 sans nouvelle migration, historique retrouvé). Mais les demandes passées entre-temps « En cours », « En attente », « Terminée », « Refusée », « Annulée » ou « Rouverte » ne se traitent plus en 0.13.0, et une demande déposée pendant le retour n'aura pas sa ligne de réception dans l'historique. Retour recommandé : mêmes commandes avec `gmao-v0_13_0.tar.gz`, puis restauration de la sauvegarde du jour (`docs/fr/EXPLOITATION.md`, Restauration ; `chown 10001`).

## Liste de contrôle à l'écran

Dans Chrome (extension Claude connectée, certificat de NIXUS accepté), à l'adresse `https://192.0.2.10:18443`. **C** : contrôle fait par Claude dans l'onglet qu'il ouvre ; **T** : contrôle de Thierry. Thierry tape toujours lui-même les mots de passe ; Claude n'écrit qu'après l'accord de Thierry.

1. **T** Connexion avec le compte administrateur.
2. **C** Fenêtre « Nouveautés » : la 0.14.0 en deux lignes pour tous (ligne du temps, compléter, annuler ; avis et réouverture) ; bas du menu `v0.14.0`.
3. **T** puis **C** Connexion de `responsable.ac` (Thierry) : note de la 0.14.0 en cinq lignes ; tableau de bord à six compteurs (« En attente depuis plus de 5 jours ouvrés », « À clôturer (travaux terminés) ») ; chaque compteur ouvre une liste du même total.
4. **C** Avec l'accord de Thierry, sur une demande de recette « Qualifiée » de l'AC : « Démarrer les travaux » ; « Mettre en attente » avec le motif « Accès impossible » (échéance « Délai suspendu ») ; « Reprendre les travaux » (échéance repoussée) ; « Travaux terminés » ; « Clôturer » avec une cause de panne et un compte rendu ; historique complet dans le volet, chaque étape avec son auteur.
5. **C** Journal d'audit (administrateur) : lignes « Changement d'état d'une demande » avec l'état avant et après, le motif nommé, « Commentaire donné : Oui » ou « Non », jamais le texte, en FR et en NL.
6. **T** Connexion d'un compte qui a déposé une demande (par exemple `agent.ac`, ou une demande déposée pour la recette) : ligne du temps sur la fiche ; « Compléter ma demande » avec une précision et une photo prise au téléphone ; sur une autre demande « Reçue », « Annuler ma demande » avec un motif : elle reste, « Annulée ».
7. **T** Même compte, sur la demande clôturée au contrôle 4 : avis en un clic (« Satisfait »), commentaire facultatif ; puis « Rouvrir ma demande » avec ce qui ne va pas, avant la date dite. **C** côté `responsable.ac` : la demande « Rouverte » compte dans « À qualifier ».
8. **C** Catégories et délais, onglet « États des demandes » : neuf cartes ; un libellé changé apparaît chez le demandeur ; « Revenir aux libellés livrés ».
9. **C** Réglages de l'entité : « Motifs d'attente qui suspendent le délai » (cases) et « Attente longue (jours ouvrables) » (5) ; Listes de valeurs : motifs d'attente, motifs de refus, causes de panne.
10. **C** Lecture par le MCP depuis la page de `responsable.ac` : `get_historique_demande`, `list_transitions_demande` ; `prepare_change_etat_demande` décrit l'effet sans rien changer ; depuis la page de `responsable.cpas`, l'historique d'une demande de l'AC est refusé (403).
11. **T** iPhone (Safari) et Android (Chrome) : fiche d'une demande en volet, boutons « Compléter », « Annuler », avis en boutons, photo ajoutée depuis l'appareil photo ; fiche du service avec ses boutons d'action ; rien ne dépasse de l'écran (DV-102).
12. **T** Jugement sur l'ergonomie et le métier : libellés des états, motifs d'attente et de refus, causes de panne (à revoir en atelier, D-11) ; utilité de la suspension.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : aucune dépendance nouvelle |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : neuf routes, huit outils MCP ; la photo ajoutée à une demande envoyée est une route de fichier hors MCP (E-17, cinq routes) ; parité testée |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché : schémas `ajv`, permission `demandes:traiter` ou demandeur et bénéficiaire, cloison testée, journal sans texte libre |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : `012_cycle_de_vie` ajoute seulement ; contrat généré depuis les routes |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché : passages, libellés et listes dans `backend/config/` ; test de portabilité vert |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 473/473, interface 262 sur trois lancements, `help:check` 10/10) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | Coché dans Chromium : `mobile:check` à 320, 360, 390 et 412 px, FR et NL, volets compris ; 1280 px par les captures |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché, avec les preuves d'échec |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, note de version | Coché : `demandes.md`, `service-technique.md`, `referentiel-demandes.md`, `administration.md`, `aide.md` ; cinq fiches d'aide ; intentions de l'assistant ; note de version |
| Aide par écran : fiche, captures, explication de chaque champ, contrôles bloquants | Coché : six captures refaites ou nouvelles par langue (20 par langue), « ? » sur chaque champ nouveau, `help:check` 10/10 |

## Questions RGPD

1. Données personnelles nouvelles : **oui, peu**. Le complément tapé par le demandeur, le motif d'une annulation ou d'une réouverture, la note (1 à 5) et le commentaire de l'avis, le commentaire d'un passage et le compte rendu de clôture, l'auteur et l'heure de chaque passage (historique). Ce sont des textes libres : l'aide rappelle de décrire le problème, pas les personnes. Le journal d'audit n'en garde aucun texte (`commentaire_donne`, `compte_rendu_donne` : 0 ou 1).
2. Finalité nouvelle : **non** : traiter la demande et en rendre compte au demandeur ; l'avis sert à mesurer la qualité du service (statistiques, étape 36).
3. Destinataire nouveau : **non** : le service technique de l'entité et le demandeur ou le bénéficiaire, qui voyaient déjà la demande ; un commentaire interne et le compte rendu ne sont jamais montrés au demandeur ; rien n'est visible de l'autre entité. Durées de conservation à fixer avec celles des demandes (D-09, étape 41).

## Simulé ou incomplet

- `mobile:check` et les contrôles d'écran ont tourné dans le Chromium du bac à sable (iPhone SE, iPhone 13, Galaxy S9+, Pixel 7 émulés) ; l'appareil photo et l'agrandissement de Safari se vérifient sur de vrais téléphones (contrôle 11).
- GitHub Actions n'a pas tourné ; les suites ont tourné sous Node 22.23.4 (parcours `ci.yml` sous Node 20 non rejoué).
- Images Docker non reconstruites dans le bac à sable ; la migration a tourné sur des bases jetables (neuve et de démonstration) et par les tests.
- Les courriels au demandeur à chaque étape arrivent à l'étape 13 ; l'interface des ouvriers (« En cours » et « Terminée » par l'ouvrier) à l'étape 18 (DV-118).

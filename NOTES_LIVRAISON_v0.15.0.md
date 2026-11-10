# Notes de livraison 0.15.0

09/11/2026 · GMAO communale · Fil de messages, notes internes avec mention, modèles de réponse, abonnement (étape 10 ; DV-123 à DV-126)

## Périmètre

Le demandeur et le service technique s'écrivent désormais sous la fiche de chaque demande. Le service y écrit aussi ses notes internes, prévient un collègue et répond avec des modèles. Les remarques R1 à R3 de la recette de la 0.14.0 sont corrigées. Tout est vérifié aux largeurs de téléphone de 320 à 412 px, en FR et en NL (DV-102).

- **Fil de messages** (SUI-04, SEC-02 ; DV-124) : bloc « Messages » sous la fiche d'une demande, côté demandeur et côté service. Le texte compte 4 000 caractères au plus ; les photos et les PDF passent par le bouton habituel, appareil photo du téléphone compris, dans les plafonds de l'entité. Une photo seule suffit.
  - Le demandeur et le bénéficiaire (« Pour ») lisent et écrivent ; ils voient « Service technique », jamais le nom de l'agent.
  - Le service lit tout et écrit par `demandes:traiter`.
  - Qui suit seulement (« Moi aussi », abonnement) ne lit pas le fil : il voit l'état et la ligne du temps.
  - On écrit seulement sur une demande ouverte. Aucun message ne se modifie ni ne s'efface.
- **Non lu** : repère « Nouveaux messages » dans le fil ; étiquette « n nouveaux messages » dans « Mes demandes », dans la liste du service et sur l'accueil (« n demandes ont un nouveau message », avec un lien vers la liste filtrée). Compteur « Messages à lire » et filtre « Messages » dans la liste du service.
- **Notes internes avec mention** (GES-08 ; DV-125) : le service choisit « Réponse au demandeur » ou « Note interne au service ». La note interne est encadrée et marquée, jamais montrée au demandeur, ni par le MCP d'un demandeur, ni plus tard à la GRC. « Prévenir un collègue » mentionne de un à dix collègues du service de l'entité. Le collègue voit « Vous êtes mentionné », le compteur « Notes où vous êtes mentionné » (accueil et liste) et le filtre « Mentions », jusqu'à la cloche des notifications de la 0.17.0.
- **Modèles de réponse** (GES-09 ; DV-126) : onglet « Modèles de réponse » de Catégories et délais.
  - Le responsable écrit, modifie, désactive et réactive les modèles ; le gestionnaire les lit.
  - Titre et texte en FR et en NL. Variables `{numero}`, `{lieu}`, `{etat}`, `{prenom}` ; toute autre est refusée avec son nom.
  - Quatre modèles livrés par entité, à revoir en atelier (D-11) : « Demande prise en charge », « Précision demandée », « Accès au local », « Travaux terminés ».
  - Dans le fil, « Insérer un modèle » met le texte dans la langue de la demande, variables remplacées, à relire avant l'envoi.
- **Abonnement** (SUI-09 ; DV-126) : « Suivre cette demande » pour qui voit une demande ouverte sans en être le demandeur ni le bénéficiaire ; la demande arrive dans « Mes demandes », sans remarque. « Ne plus suivre », avec confirmation, efface aussi la remarque d'un « Moi aussi ». La liste des personnes qui suivent (service) dit « Moi aussi » ou « suit la demande ». Les notifications aux personnes qui suivent viendront avec la 0.17.0.
- **Remarques de la recette de la 0.14.0** (DV-122) :
  - R1 : au retour sur un onglet, le profil est relu ; si une autre personne s'est connectée entre-temps, l'onglet revient à l'accueil.
  - R2 : plus aucun numéro d'étape dans les textes montrés ; un test l'empêche.
  - R3 : plus de délai annoncé sur une demande fermée ; le formulaire de réouverture dit « Après le {date}, faites une nouvelle demande. ».
  - Le nombre de passages du cycle de vie cité dans les notes et la documentation de la 0.14.0 est contrôlé par un test.
- **Aide et assistant** : fiches « Mes demandes », « Demandes de l'entité » et « Catégories et délais » complétées ; trois captures nouvelles par langue (23 par langue) ; quatre réponses de l'assistant (messages, notes internes et mentions, modèles, suivre une demande).
- **`recette.sh`** : le contrôle 5 lit la migration `013_messages`, les quatre tables du fil et les modèles livrés de chaque entité.

**Migration `013_messages`** (ajouts seulement) :

- tables `demande_messages`, `demande_messages_lus` (dernier message lu, par personne et par demande), `demande_mentions` et `modeles_reponse` ;
- colonnes `pieces_jointes.message_id` et `pieces_jointes.attente_message`, `demande_suiveurs.source` (les suivis déjà en base deviennent des « Moi aussi ») ;
- les quatre modèles livrés sont créés pour chaque entité au démarrage.

Aucune permission nouvelle, aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env` et `ci.yml` sont inchangés ; les deux images changent.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_15_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_15_0.tar.gz 100% …` (environ 8 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_15_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_15_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.` Noter le nom de la sauvegarde du jour : un retour arrière la restaure obligatoirement.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_15_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/config/modeles-reponse.json backend/src/services/messages.js frontend/src/components/demandes/FilMessages.tsx frontend/src/components/referentiel/ModelesTab.tsx
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

Attendu : `[DB] Migration 013_messages appliquée` puis `[APP] API 0.15.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu :

1. « Compte de démonstration : multi-entites@demo.invalid (le mot de passe reste visible pendant la saisie, la ligne s'efface à Entrée) », puis « Mot de passe : ».
2. Taper le mot de passe commun des comptes de démonstration (il s'affiche pendant la frappe, c'est voulu), puis Entrée.
3. La ligne s'efface et « Mot de passe reçu : N caractère(s). » s'affiche.
4. Neuf lignes `OK`, dont « 5. migration 013_messages appliquée, tables du fil présentes, modèles de réponse livrés dans chaque entité ».
5. `BILAN : 9 contrôle(s) OK, 0 en échec.`

Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : la 0.14.0 démarre sur une base passée en 0.15.0. Essai du 09/11/2026 dans le bac à sable : connexion, liste, fiche, tableau de bord et historique répondent, et les messages restent en base. Mais la 0.14.0 ignore la colonne `message_id` : elle listerait les pièces des messages parmi les pièces de la demande, celles des notes internes comprises, au demandeur aussi. Le retour se fait donc **toujours** en deux temps :

1. mêmes commandes avec `gmao-v0_14_0.tar.gz` ;
2. restauration de la sauvegarde du jour et des pièces jointes (`docs/fr/EXPLOITATION.md`, Restauration ; `chown 10001`).

Les messages écrits depuis la mise à jour sont alors perdus.

## Liste de contrôle à l'écran

Dans Chrome (extension Claude connectée, certificat de NIXUS accepté), à l'adresse `https://192.0.2.10:18443`.

- **C** : contrôle fait par Claude dans l'onglet qu'il ouvre.
- **T** : contrôle de Thierry.

Thierry tape toujours lui-même les mots de passe ; Claude n'écrit qu'après l'accord de Thierry.

1. **T** Connexion avec le compte administrateur.
2. **C** Fenêtre « Nouveautés » : la 0.15.0 en deux lignes pour tous (messages ; suivre une demande) ; bas du menu `v0.15.0`.
3. **T** puis **C** Connexion de `responsable.ac` (Thierry) : note de la 0.15.0 en quatre lignes ; tableau de bord avec « Messages à lire » et « Notes où vous êtes mentionné » ; Catégories et délais, onglet « Modèles de réponse » : quatre modèles. Un modèle avec `{signature}` est refusé avec le nom de la variable ; rien n'est enregistré.
4. **C** Avec l'accord de Thierry, sur une demande ouverte de l'AC déposée par `agent.ac` :
   - « Insérer un modèle » (« Précision demandée ») : texte dans la langue de la demande, numéro et prénom remplacés ; envoi en « Réponse au demandeur ».
   - Puis une « Note interne au service » qui prévient `gestionnaire.ac`.
5. **T** Connexion de `agent.ac` :
   - accueil « 1 demande a un nouveau message », lien vers la liste filtrée ;
   - le fil montre la réponse signée « Service technique », jamais la note interne ;
   - réponse avec une photo prise au téléphone, sans texte ;
   - après lecture, l'étiquette « nouveau message » disparaît.
6. **C** Côté `gestionnaire.ac` (Thierry se connecte) : compteur « Notes où vous êtes mentionné » à 1, « Vous êtes mentionné » sur la note ; compteur « Messages à lire » avec la réponse de l'agent ; après lecture du fil, les deux compteurs baissent.
7. **C** Avec `responsable.ac`, sur une demande de l'AC dont il n'est ni demandeur ni bénéficiaire : « Suivre cette demande », la demande arrive dans « Mes demandes » ; « Ne plus suivre » avec confirmation.
8. **T** Avec un compte qui a fait « Moi aussi » sur une demande, « Ne plus suivre » :
   - la confirmation dit que la remarque sera effacée ;
   - la fiche se ferme et la demande quitte « Mes demandes » ;
   - le compte ne voit jamais le fil de cette demande.
9. **C** Journal d'audit (administrateur), en FR et en NL :
   - « Message ajouté au fil de la demande » avec « Commentaire interne au service : Oui » ou « Non », la longueur du texte et les nombres de pièces et de mentions, jamais le texte ;
   - « Demande suivie (« Moi aussi » ou abonnement) » et « Demande plus suivie » avec la source ;
   - création ou modification d'un modèle avec les seuls champs changés.
10. **C** Lecture par le MCP :
    - depuis la page de `responsable.ac` : `list_messages_demande` (note interne présente), `list_modeles_reponse`, et `prepare_ne_plus_suivre_demande`, qui décrit l'effet sans rien changer ;
    - depuis la page de `responsable.cpas` : le fil d'une demande de l'AC est refusé (403).
11. **T** Remarques de la 0.14.0 et téléphones :
    - R1 : deux onglets ; se déconnecter dans l'un et entrer avec un autre compte, puis revenir sur le premier : il revient à l'accueil du second compte.
    - R3 : une demande clôturée n'annonce plus de délai ; « Rouvrir ma demande » dit la date limite.
    - iPhone (Safari) et Android (Chrome) : fil lisible, photo envoyée depuis l'appareil photo, note interne et choix d'un collègue, onglet des modèles ; rien ne dépasse de l'écran (DV-102).
12. **T** Jugement sur l'ergonomie et le métier : textes des quatre modèles livrés, intérêt des mentions avant la cloche de la 0.17.0, place du fil sur la fiche (à revoir en atelier, D-11).

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : aucune dépendance nouvelle |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : douze routes et onze outils MCP. Le dépôt d'une pièce d'un message est une route de fichier hors MCP (E-17, six routes). Parité testée. |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché : schémas `ajv`, demandeur, bénéficiaire ou `demandes:traiter`, `parametres:gerer` pour les modèles, cloison testée, journal sans texte libre |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : `013_messages` ajoute seulement ; contrat généré depuis les routes |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché : modèles livrés dans `backend/config/modeles-reponse.json` ; test de portabilité vert |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (chiffres dans `MANIFESTE.md`) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | Coché dans Chromium : `mobile:check` à 320, 360, 390 et 412 px, FR et NL, volets et fil compris ; 1280 px par les captures |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché, avec les preuves d'échec |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, note de version | Coché : `demandes.md`, `service-technique.md`, `referentiel-demandes.md`, `aide.md` ; trois fiches d'aide ; intentions de l'assistant ; note de version |
| Aide par écran : fiche, captures, explication de chaque champ, contrôles bloquants | Coché : trois captures nouvelles par langue (23 par langue), « ? » sur chaque champ nouveau, `help:check` 11/11 |

## Questions RGPD

1. Données personnelles nouvelles : **oui**.
   - Le texte des messages et des notes internes, avec leur auteur et leur heure, et les photos et documents joints.
   - Le repère de lecture de chaque personne (dernier message lu, avec l'heure), et les collègues mentionnés dans une note.
   - La source d'un suivi (« Moi aussi » ou abonnement).
   - Ce sont des textes libres : l'aide rappelle de décrire le problème, pas les personnes.
   - Le journal d'audit ne garde aucun texte : seulement la longueur, `interne`, les nombres de pièces et de mentions, jamais les noms mentionnés.
   - Repères de lecture et mentions s'effacent avec le compte ; une pièce déposée mais jamais envoyée s'efface après 30 jours.
2. Finalité nouvelle : **non**. Il s'agit toujours de traiter la demande et d'en rendre compte au demandeur. Le repère de lecture sert seulement à signaler ce qui est nouveau à la personne elle-même ; personne d'autre ne le voit.
3. Destinataires nouveaux : **non**.
   - Le service technique de l'entité, le demandeur et le bénéficiaire voyaient déjà la demande.
   - Une note interne et ses pièces ne sont jamais montrées au demandeur ni au bénéficiaire ; le nom des agents leur est caché (SUI-07).
   - Qui suit seulement ne lit pas le fil.
   - Rien n'est visible de l'autre entité.
   - Durées de conservation à fixer avec celles des demandes (D-09, étape 41).

## Simulé ou incomplet

- `mobile:check` et les contrôles d'écran ont tourné dans le Chromium du bac à sable (iPhone SE, iPhone 13, Galaxy S9+ et Pixel 7 émulés). L'appareil photo et l'agrandissement de Safari se vérifient sur de vrais téléphones (contrôle 11).
- GitHub Actions n'a pas tourné ; les suites ont tourné sous Node 22.23.4 (parcours `ci.yml` sous Node 20 non rejoué).
- Images Docker non reconstruites dans le bac à sable. La migration a tourné sur des bases jetables (0.14.0 de démonstration, puis neuve) et par les tests. Le retour vers la 0.14.0 a été essayé sur la base de démonstration passée en 0.15.0.
- Les courriels et la cloche des notifications (nouveau message, mention, personnes qui suivent) arrivent avec la 0.17.0 (étape 13). L'envoi à la GRC d'un message public arrive avec l'étape 38.

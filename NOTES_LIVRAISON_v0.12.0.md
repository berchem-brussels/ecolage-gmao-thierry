# Notes de livraison 0.12.0

06/11/2026 · GMAO communale · Aide par écran, FAQ locale et remarques de la recette de la 0.11.0 (étape 8 bis, DV-100, DV-109, DV-110 ; standard v3.3, section 13.1)

## Périmètre

Chaque écran a son bouton « Aide » et sa fiche, chaque champ son « ? » ; le service technique et l'administrateur tiennent une FAQ locale par entité, où une question métier résolue peut entrer d'un clic. Les anciennes 0.12.0 et 0.12.1 sont regroupées (DV-110).

- **Remarques de la recette de la 0.11.0 (DV-109).**
  - R1 : « (valeur par défaut) » en texte discret à côté du libellé, plus en étiquette.
  - R2 : un réglage refusé nomme le réglage et la valeur fautive, en FR ou en NL, sous le champ (« Valeur refusée pour « … » : rôle inconnu « Chef » ; codes connus : … »), par l'écran comme par l'assistant.
  - R3 : codes de rôle des files acceptés en majuscules ou en minuscules (`Admin` devient `admin`) ; l'explication du réglage le dit.
  - R4 : détail du journal sans clé ni code brut (mode, annuaire, identifiant, adresse publique, secret « masqué », champs modifiés d'un ticket, type, méthode de connexion, motif d'un refus de Microsoft).
  - R5 : lecture des tickets par Claude par Claude in Chrome (`docs/fr/MCP.md`).
  - R6 : la page Tickets ne demande plus les compteurs à un agent qui ne traite aucune file (plus de refus joint comme « dernière erreur »).
- **FAQ locale** (migration `011_faq`, E-44) : questions communes aux deux entités (administrateur) ou propres à l'entité active (gestionnaire, responsable) ; cloison entre entités ; recherche ; retrait avec motif et rétablissement ; « Ajouter à la FAQ » dans une question métier résolue ou close ; six outils MCP.
- **Aide par écran** (E-45) : bouton « Aide » dans l'en-tête, à côté de « Signaler » ; seize fiches FR et NL (demandeur, service technique, administration, aide) avec 18 captures annotées par langue ; centre « Mode d'emploi et FAQ » avec recherche sans accents et impression ; « ? » à côté de chaque champ ; contrôles bloquants dans les tests.
- **Contrôles automatiques** : `recette.sh`, neuf contrôles en lecture seule après l'installation (DV-110).

Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env` et `ci.yml` inchangés. Les deux images changent. Dépendance de développement `@playwright/test` (captures de l'aide), absente des images.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_12_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_12_0.tar.gz 100% …` (environ 7 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_12_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_12_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.` Cette sauvegarde est celle d'avant la migration.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_12_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls recette.sh backend/src/services/faq.js frontend/dist/aide-captures/fr/accueil-overview.jpg
```

Attendu : les trois chemins affichés, sans « No such file ».

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

Attendu : `[DB] Migration 011_faq appliquée` puis `[APP] API 0.12.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : la demande du mot de passe de démonstration de `multi-entites@demo.invalid` ; le taper (rien ne s'affiche), Entrée ; puis neuf lignes `OK` et `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_11_0.tar.gz`, sans restaurer la base : la 0.11.0 ignore la table `help_faq` (essayé dans le bac à sable : connexion, comptes, demandes et tickets en 0.11.0, puis remontée en 0.12.0 avec la FAQ).

## Liste de contrôle à l'écran

Dans Chrome (extension Claude connectée, certificat de NIXUS accepté), à l'adresse `https://192.0.2.10:18443`. **C** : contrôle fait par Claude dans l'onglet qu'il ouvre ; **T** : contrôle de Thierry. Thierry tape toujours lui-même les mots de passe ; Claude ne clique sur un bouton qui écrit qu'après l'accord de Thierry.

1. **T** Connexion avec le compte administrateur (Microsoft ou mot de passe).
2. **C** Fenêtre « Nouveautés » : la 0.12.0 en quatre lignes (deux pour tous, deux pour l'administrateur) ; « J'ai lu ». Bas du menu `v0.12.0`.
3. **C** Bouton « Aide » sur chaque écran du menu de l'administrateur, en FR puis en NL : le panneau montre la fiche de l'écran (titre, à qui il sert, capture annotée qui s'affiche, procédures) ; « Mode d'emploi complet » mène à la fiche dans le centre d'aide. « Signaler » nomme l'écran par le titre de sa fiche.
4. **C** Aide, « Mode d'emploi et FAQ » : groupes de fiches ; recherche « delai » (sans accent) puis « afdrukken » en NL ; « ? » à côté des champs de Paramètres et d'Entités (infobulle).
5. **T** « Imprimer le mode d'emploi » : une page s'ouvre tout dépliée et la fenêtre d'impression s'ouvre (Claude ne la déclenche pas : elle bloquerait l'extension) ; annuler l'impression.
6. **C** Paramètres, onglet « Tickets » : « (valeur par défaut) » en texte discret (R1) ; avec l'accord de Thierry, « admin, Chef » dans la file IT puis « Enregistrer » : refus sous le champ qui nomme « Chef » (R2), rien n'est changé ; « Admin » : enregistré « admin », sans ligne de plus au journal (R3).
7. **C** Journal d'audit, famille « Réglages de connexion » et « Tickets » : détail sans clé ni code brut (R4) ; famille « FAQ » après le contrôle 9.
8. **T** puis **C** Connexion de `agent.ac` (Thierry) ; Claude ouvre Aide, Tickets et vérifie qu'aucun appel des compteurs ne part (R6) ; « Aide » sur Nouvelle demande et Mes demandes : procédures du demandeur, aucune procédure du service technique.
9. **T** puis **C** Connexion de `responsable.ac` (Thierry). Avec l'accord de Thierry, Claude ouvre le ticket `TCK-2026-00001` (question métier, close) : « Ajouter à la FAQ », question et réponse préremplies, NL complété, écran choisi, « Enregistrer » ; puis Aide, Questions fréquentes : l'entrée avec l'entité AC et la référence du ticket ; « Retirer » avec un motif puis « Voir aussi les questions retirées » et « Rétablir ».
10. **C** Lecture par le MCP depuis la page de `responsable.ac` : `list_faq` rend l'entrée du contrôle 9 ; `get_profile` rend `files_tickets` = `business`.
11. **C** Largeur 360 px : en-tête sur une ligne sans défilement horizontal, bouton « Aide » en icône, panneau d'aide en plein écran.
12. **T** Jugement sur l'ergonomie : lisibilité des fiches et des captures, clarté des « ? », place du bouton « Aide ».

Les contrôles sur iPhone et Samsung restent pour la fin du projet (DV-80).

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : `@playwright/test` ^1.56.1 en développement, version du gabarit (E-37) |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : six routes, six outils ; parité vérifiée |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché : schémas ; `faq:gerer` et cloison par entité ; `faq.*` au journal avec l'entité |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : `011_faq` ; retour arrière essayé |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché : test de portabilité vert |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 427/427, interface 217/217 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | Coché dans Chromium (1280 et 360 px) ; FR et NL par les tests d'écran et les captures |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché, avec les preuves d'échec |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, note de version | Coché : `docs/fonctionnel/aide.md`, seize fiches, note de version |
| Aide par écran (section 13.1) : une fiche par écran, captures, explication de chaque champ, contrôles bloquants | Coché : `help.test.ts` ; captures produites dans le bac à sable (`npm run help:capture`), contrôlées par `npm run help:check` |

## Questions RGPD

1. Données personnelles nouvelles : **non** par conception. Les questions de la FAQ ne doivent contenir aucune donnée personnelle (consigne à l'écran et dans l'explication des champs) ; une entrée née d'un ticket ne copie que le titre et la résolution, à réécrire. Le journal garde l'auteur de chaque action, comme ailleurs.
2. Finalité nouvelle : **non** : l'aide et la FAQ servent l'usage de l'application.
3. Destinataire nouveau : **non** : une entrée d'une entité n'est lue que dans cette entité ; une entrée commune par les agents des deux entités.

## Simulé ou incomplet

- Captures produites dans le bac à sable sur une base de démonstration ; `npm run help:capture` n'a pas tourné sur le poste de Thierry (il y demande `npx playwright install chromium`) : contrôle noté « non joué » sur le poste (DV-96).
- `recette.sh` joué dans le bac à sable contre une base jetable, avec un faux `docker` ; sur NIXUS pour la première fois à cette installation.
- GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.
- Images Docker non reconstruites dans le bac à sable.

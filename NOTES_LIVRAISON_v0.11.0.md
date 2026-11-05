# Notes de livraison 0.11.0

05/11/2026 · GMAO communale · Tickets et remarques de la recette de la 0.10.0 (étape 8 bis, DV-96 ; standard v3.3, section 13.5)

## Périmètre

Tout agent signale un incident, un bug, une question sur l'application ou un souhait sans quitter son écran ; le service technique de son entité traite les questions métier, l'administrateur traite le reste. Modules des tickets du gabarit 1.3.0 repris et adaptés aux rôles par entité de la GMAO (DV-97, DV-107).

- **Repris du gabarit 1.3.0.** `backend/src/services/tickets.js`, `routes/tickets.js`, schémas `ticketList`, `ticketCreate`, `ticketUpdate`, `ticketStatus`, `ticketMessage`, neuf outils MCP, tables `tickets` et `ticket_messages`, sept tests ; interface `ReportTicketModal.tsx`, `TicketsPage.tsx`, `TicketDrawer.tsx`, `PageHeader.tsx`, dernière erreur de l'API (`getLastApiError`).
- **Adaptations à la GMAO.**
  - Migration `010_tickets` : tables du gabarit, plus `entite_id` (entité active du demandeur au signalement).
  - Files : une question métier va au responsable et au gestionnaire du service technique de l'entité du ticket, dans leur entité active ; incident, bug et souhait à l'administrateur, pour toutes les entités. Chacun lit toujours ses propres tickets.
  - Affectation à une personne qui ne traite pas la file dans l'entité du ticket refusée (`ASSIGNEE_INVALIDE`) ; question métier sans entité active refusée (`NO_ENTITE`) ; transfert vers une file que la personne ne traite pas : confirmation sans le contenu (le gabarit répondait 403 alors que le transfert était fait).
  - Réglages des files et des délais dans les paramètres de l'instance, onglet « Tickets », contrôlés (rôles connus, 1 à 365 jours, délais P1 à P4), jamais servis sans session (E-41).
  - Capture réduite et sans métadonnées dans le navigateur, nettoyée une seconde fois par le serveur (`cleanPhoto`), lisible sur iPhone et Android.
  - Écran nommé par son libellé du menu jusqu'aux fiches d'aide (0.12.0) ; filtre du type en boutons ; dates à l'heure locale ; contexte technique en mode Complet (E-43).
- **Remarques de la recette de la 0.10.0 (DV-106).**
  - « Secret client » : « copiez la colonne Valeur, jamais l'ID du secret » ; une valeur à la forme d'un identifiant est refusée à l'écran, par l'API et dès le premier appel du MCP (`SECRET_IS_ID`).
  - Journal : le refus `OIDC_EXCHANGE` garde le code de Microsoft (`microsoft_code`, par exemple `AADSTS7000215`), sans le reste du message (E-40).
  - Onglet « Connexion Microsoft » : « Enregistré le JJ/MM/AAAA à HH:MM par <nom> », lu dans le journal d'audit.
  - Fenêtre « Nouveautés » : défaut confirmé dans Chromium. Cause racine : un clic sur le sélecteur de langue de l'en-tête tombait sur le fond de la fenêtre, qui se fermait en marquant les notes lues, sans changer la langue. La fenêtre ne se ferme plus par un clic à côté et porte ses propres boutons FR et NL.
- **Lecture des tickets par Claude.** Sur le réseau interne, par le navigateur de la personne et sa session (DV-108) ; procédure dans `docs/fr/MCP.md`.
- **Aide et note de version.** Rubrique Tickets, questions 29 et 30, réponse de l'assistant ; note : deux lignes pour tous, une pour le service technique, deux pour l'administrateur.

Aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `.gitignore` et `ci.yml` inchangés. Les deux images changent.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_11_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_11_0.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_11_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_11_0.tar.gz
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
sudo tar xzf gmao-v0_11_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/src/services/tickets.js frontend/dist/index.html
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

Attendu : `[DB] Migration 010_tickets appliquée` puis `[APP] API 0.11.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.11.0"},"meta":{"envelope":1,"version":"0.11.0"}}`

```
curl -sk https://localhost:18443/api/settings/public | grep -c tickets
```

Attendu : `0` (les réglages des tickets ne sont jamais servis sans session).

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_10_0.tar.gz`, sans restaurer la base : la 0.10.0 ignore les deux tables nouvelles (essayé dans le bac à sable : connexion, comptes, puis remontée en 0.11.0 avec les tickets).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443` dans une fenêtre de navigation privée (Ctrl+F5 si la page reste blanche).

1. **Version, note et nouveautés.** Avec `agent.ac` : la fenêtre « Nouveautés » montre la 0.11.0 en deux lignes ; un clic à côté de la fenêtre ne la ferme pas ; « NL » dans la fenêtre passe le texte en néerlandais sans la fermer ; « Gelezen » la ferme. Bas du menu `v0.11.0`. Avec `responsable.ac` : trois lignes. Avec le compte administrateur : quatre lignes.
2. **Signaler une question.** Avec `agent.ac`, sur « Mes demandes », « Signaler » : « Écran joint automatiquement : Mes demandes » ; type « Question métier » (« Traité par le service technique de votre entité. ») ; un titre ; une capture d'écran en PNG ou JPEG (aperçu affiché) ; « Envoyer » : `Ticket envoyé : TCK-2026-00001`.
3. **File de l'autre entité.** Avec `responsable.cpas`, Aide, Tickets : la question de l'AC n'apparaît pas.
4. **Traitement par le service technique.** Avec `responsable.ac`, Aide, Tickets : compteurs, la question listée avec l'entité AC. L'ouvrir : « Voir la capture » ouvre l'image ; « Prendre en charge » ; un message ; une note interne (case « Note interne ») ; « Résoudre » avec un motif.
5. **Suivi par le demandeur.** Avec `agent.ac`, Aide, Tickets : le ticket est « Résolu » ; le message et le motif sont lus, la note interne n'apparaît pas ; « Clore ».
6. **Incident pour l'administrateur.** Avec `agent.ac`, « Signaler », type « Bug » : « Ce que j'attendais » et « Ce qui s'est passé » apparaissent, « Traité par l'administrateur de l'application. ». Avec le compte administrateur, Aide, Tickets : le bug est là, la question métier de l'AC n'y est pas.
7. **Paramètres, onglet « Tickets ».** Les quatre réglages et leurs explications ; « responsable,chef_inconnu » dans les rôles de la file métier : refusé ; rien n'est changé.
8. **Connexion Microsoft.** Paramètres, onglet « Connexion Microsoft » : « Enregistré le … à … par … » sous l'introduction ; le texte sous « Secret client » parle de la colonne Valeur ; un identifiant de la forme `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` collé dans le secret puis « Enregistrer » : « Cette valeur est l'ID du secret. Copiez la colonne Valeur. », rien n'est envoyé. Vider le champ ensuite (le secret enregistré reste).
9. **Journal d'audit.** Famille « Tickets » : « Ticket signalé », « Ticket pris en charge », « Ticket résolu », avec l'entité, sans le titre. En NL : « Melden » dans l'en-tête, « Help, Tickets ».
10. **Lecture par Claude (DV-108).** Dans l'application Claude, conversation Cowork liée au PC : ouvrir la GMAO dans le navigateur de l'application Claude avec le compte administrateur, puis demander « Liste les tickets à traiter de la GMAO ouverte dans le navigateur » : le bug du point 6 est listé avec son contexte.

Les contrôles sur iPhone et Samsung restent pour la fin du projet (DV-80) ; la capture passe par le choix de fichier du téléphone (DV-102).

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : aucune dépendance nouvelle |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché ; choix exclusif en boutons (E-43) |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : huit routes, neuf outils ; parité vérifiée |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché : schémas du gabarit ; files par entité ; `ticket.*` au journal avec l'entité |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : `010_tickets` ; retour arrière essayé |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché : test de portabilité vert |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 410/410, interface 181/181 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | Coché pour le signalement, le traitement et le suivi dans Chromium (1280 et 360 px) ; FR et NL par les tests d'écran |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, intentions, note de version | Coché : `docs/fonctionnel/tickets.md`, rubrique Tickets, questions 29 et 30, réponse de l'assistant, note de version |

## Questions RGPD

1. Données personnelles nouvelles : **oui**, le nom du demandeur et de la personne qui traite, les textes du ticket et ses messages, la capture (réduite, sans métadonnées), le navigateur utilisé. Consigne affichée sous la capture : éviter qu'on y lise le nom d'une personne.
2. Finalité nouvelle : **oui**, le support de l'application (signalement et traitement des incidents, questions et souhaits). À porter au registre ; conservation à fixer à l'étape 41 (D-09).
3. Destinataire nouveau : **oui**, internes seulement : le service technique de l'entité pour une question métier, l'administrateur de l'application pour le reste. Aucun destinataire externe ; l'assistant Claude ne lit les tickets que par le navigateur de la personne, avec ses droits.

## Simulé ou incomplet

- Microsoft est simulé dans les tests du code `AADSTS` (faux Microsoft de la suite).
- GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.
- Images Docker non reconstruites dans le bac à sable.
- Pas de courriel à la création ni à la réponse d'un ticket (étape 13) ; question résolue pas encore transformable en entrée de FAQ (0.12.0).

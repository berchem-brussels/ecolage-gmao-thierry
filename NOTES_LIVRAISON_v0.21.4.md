# Notes de livraison 0.21.4

25/11/2026 · GMAO communale · Correctif de la recette de la 0.21.3 : date refusée puis champ quitté (contrôle 7, DV-183) ; note de la 0.21.2 corrigée (R1)

## Périmètre

Version de correctif, après la recette de la 0.21.3 sur NIXUS et avant le test orienté utilisateur. Aucune migration, aucune dépendance nouvelle, aucune permission nouvelle, aucun réglage nouveau, aucun outil MCP nouveau ; le serveur ne change que par son numéro de version et sa note.

- **Date refusée puis champ quitté (contrôle 7)** : une date ou une heure tapée que le champ refuse (par exemple `99/99/2026`), puis quittée par Tab, par un clic ailleurs ou parce que la fenêtre passe à l'arrière-plan, était remplacée en silence par l'ancienne valeur ; « Enregistrer » envoyait ensuite celle-ci. Désormais, dès la sortie du champ, le champ est entouré de rouge et « Date ou heure non retenue : rien n'est enregistré… » s'affiche ; l'enregistrement reste bloqué tant que le texte n'est pas corrigé ou qu'une date n'est pas choisie au calendrier. Vaut pour tous les champs de date, d'heure et de période.
- **Faux refus trouvé en corrigeant** : une date valable retapée moins de deux secondes après un clic, puis quittée par Tab, était refusée à tort. Corrigé.
- **R1** : la note de la 0.21.2 disait « icône à droite » ; elle dit maintenant « icône du champ (à gauche depuis la 0.21.3) », en FR et en NL.
- Aide : Accueil, « Comment saisir une date ou une heure ? » (signalé dès la sortie du champ).
- Note de version : une ligne pour tous.
- Tests : serveur 702 (701 en 0.21.3), interface 409 (404 en 0.21.3) ; preuves d'échec dans `docs/fr/SECURITE.md`, section 0.21.4.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.21.4 s'installe sur la 0.21.3. **Pas de relance de `demo.js`** : le mot de passe de démonstration du 19/11/2026 reste valable.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_21_4.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_21_4.tar.gz 100% …` (environ 14 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_21_4.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_21_4.tar.gz
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
sudo tar xzf gmao-v0_21_4.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls NOTES_LIVRAISON_v0.21.4.md frontend/src/saisieDate.ts
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

Attendu : `[APP] API 0.21.4 sur le port 3001`, aucune ligne `[DB] Migration`.

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

**Retour arrière** : la 0.21.3 sert la même base (aucune migration) ; mêmes commandes avec `gmao-v0_21_3.tar.gz`, sans restaurer la base. La sauvegarde du jour reste prise par précaution.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, recharger avec Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry. Les contrôles 2 à 4 se terminent par « Annuler » : rien n'est écrit.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | T | Une ligne 0.21.4 pour tous ; Aide › Nouveautés, note de la 0.21.2 : « à gauche depuis la 0.21.3 » ; FR et NL |
| 2 | Date refusée, Tab | C | Affectation d'une tâche : taper `99/99/2026` dans la date, puis Tab : champ en rouge et « Date ou heure non retenue » tout de suite ; « Enregistrer » n'envoie rien ; « Annuler » |
| 3 | Date refusée, fenêtre à l'arrière-plan | C | Même geste, puis passer à une autre fenêtre et revenir : même message ; « Enregistrer » n'envoie rien ; « Annuler » |
| 4 | Date valable | C | Taper une date valable puis Tab : aucun message ; l'écran garde la date tapée ; « Annuler » |
| 5 | Contrôles non joués en 0.21.3 | C | Une demande « Rouverte » dont la dernière tâche se termine passe « Travaux terminés » (avec l'accord de Thierry pour l'écriture) ; aide en NL (« Hoe geef ik een datum of uur in? ») |
| 6 | Téléphone | C | Émulation de Chrome (iPhone, Android) : toucher un champ de date ouvre le calendrier ; aucun message parasite |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Inchangée ; `cloison.test.js` vert |
| Bilinguisme | Note, aide et message en FR et en NL (`notes-version.test.js`, `help:check`, `i18n.test.ts`) |
| Accessibilité | Champ refusé marqué `aria-invalid` dès la sortie ; `npm run a11y` 0 |
| Journal d'audit | Inchangé (rien n'est envoyé au serveur) |
| Aide | Accueil, FR et NL ; `help:check` vert |
| Téléphones | `mobile:check` complet rejoué : voir `ETAT.md` |
| Tests | Serveur 702, interface 409 (404 en 0.21.3) ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; E-50 et E-09 inchangés |

## Questions RGPD

- Aucune donnée personnelle nouvelle, aucune finalité nouvelle, aucun destinataire nouveau : le contrôle se fait dans le navigateur, rien de plus n'est envoyé ni conservé.

## Simulé ou incomplet

- Vérifié sur une copie locale (API en production, interface construite servie en HTTPS), dans Chromium et WebKit de Playwright, avec de vrais claviers et de vraies souris : affectation (date invalide quittée par clic direct, Tab, sortie du champ, fenêtre à l'arrière-plan ; date valable par Tab et par clic ; invalide puis retapée valable ; refus puis choix au calendrier), heure 99:99 puis Tab, « Terminer la tâche » (fin 99:99 puis Tab). Les autres formulaires reposent sur la même règle commune (`installerSaisieDate`), couverte par les tests, sans essai à l'écran pour chacun.
- La fenêtre à l'arrière-plan est simulée par la perte de focus de la page (Playwright), pas par une vraie autre fenêtre ; à rejouer au contrôle 3 dans Chrome.
- Pas de vrai iPhone ni de vrai Android (décision du 23/11/2026 : émulation de Chrome).

# Notes de livraison 0.21.2

24/11/2026 · GMAO communale · Correctif de la recette de la 0.21.1 : calendrier par l'icône sur ordinateur, « Terminer la tâche » en un clic (DV-177)

## Périmètre

Version de correctif, toujours avant l'audit du cahier des charges (DV-174), qui se fera sur cette archive. Aucune migration, aucune dépendance nouvelle, aucune permission nouvelle, aucun réglage nouveau, aucun outil MCP nouveau ; le serveur ne change que par son numéro de version et sa note.

- **Défaut constaté à la recette de la 0.21.1 sur NIXUS**, cause probable de l'anomalie du 23/11/2026 : sur un PC, le calendrier s'ouvrait dès qu'on touchait un champ de date et recouvrait ce qui suit. Dans « Terminer la tâche », le calendrier du début cachait le champ « Fin du travail » et le bouton « Terminer » : un clic sur la fin tombait dans les heures du calendrier du début et changeait le début sans qu'on le voie (copie locale : 08:00 tapé, 12:00 retenu) ; la fin tapée n'allait nulle part ; un clic sur « Terminer » ne faisait rien.
- **Correctif pour tous les champs de date, d'heure et de période** (`frontend/src/components/ChampDate.tsx`) : sur PC, on tape la date dans le champ, aucun calendrier ne s'affiche ; le calendrier s'ouvre par l'icône à droite du champ (« Ouvrir le calendrier », « Choisir l'heure ») ou par Alt+Flèche bas, et se ferme par Échap (sans fermer la fenêtre), par un clic à côté ou quand une date est choisie. Sur téléphone : comme avant, calendrier au toucher, sans clavier. Écrans concernés : heures d'une tâche, affectation, absences, qualification, compléments, planning, services, horaire et congés, simulateur, journal.
- **Second défaut trouvé en corrigeant** : un vrai clic de souris retire le focus du champ dès l'appui du bouton, avant le clic ; la règle de la 0.21.1 (date tapée retenue avant l'envoi) ne jouait que pour les clics pilotés, et le premier clic sur « Terminer » était refusé en silence. Elle joue maintenant dès l'appui.
- Aide : « Accueil », question « Comment saisir une date ou une heure ? » ; « Demandes de l'entité », « Date ou heure non retenue » cite l'icône du calendrier.
- Note de version : une ligne pour tous (calendrier par l'icône), une pour le service technique (« Terminer la tâche » en un clic).
- Tests : serveur 698 (697 en 0.21.1 : note 0.21.2), interface 397 (394) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md`, section 0.21.2.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.21.2 s'installe sur la 0.21.1. **Pas de relance de `demo.js`** : le mot de passe de démonstration du 19/11/2026 reste valable.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_21_2.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_21_2.tar.gz 100% …` (environ 14 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_21_2.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_21_2.tar.gz
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
sudo tar xzf gmao-v0_21_2.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls frontend/src/components/ChampDate.tsx NOTES_LIVRAISON_v0.21.2.md
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

Attendu : `[APP] API 0.21.2 sur le port 3001`, aucune ligne `[DB] Migration` (aucune migration dans cette version).

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

**Retour arrière** : la 0.21.1 sert la même base (aucune migration) ; mêmes commandes avec `gmao-v0_21_1.tar.gz`, sans restaurer la base. La sauvegarde du jour reste prise par précaution.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, recharger avec Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry. Tous les clics se font à la souris, à l'endroit réel des éléments, sans clic ailleurs entre deux champs.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | T | `responsable.ac` : deux lignes 0.21.2 ; `agent.ac` : une ligne (calendrier par l'icône) ; FR et NL. Et pour la 0.21.1 non vue le 24/11 : administrateur, la ligne de la règle commune |
| 2 | « Terminer la tâche », comme un vrai utilisateur | T | Sur une tâche « À faire » : clic dans « Début du travail », heure tapée ; clic directement dans « Fin du travail », heure tapée ; clic directement sur « Terminer » : aucun calendrier ne s'ouvre, un seul clic suffit, la tâche dit « Réalisée du … au … » avec exactement les heures tapées |
| 3 | Texte non valable | C | Même geste avec une fin `99:99` : « Date ou heure non retenue », rien n'est enregistré |
| 4 | Calendrier par l'icône | C | Icône à droite d'un champ : le calendrier s'ouvre ; Échap le ferme, la fenêtre reste ouverte ; Alt+Flèche bas l'ouvre au clavier |
| 5 | Autres champs | C | Affectation (date et heure tapées, clic direct sur « Enregistrer ») ; absence d'un ouvrier (du, au tapés) ; « Déplacer » du planning ; Entrée n'envoie aucun formulaire |
| 6 | Téléphone | C | Émulation de Chrome (iPhone, Android) : toucher un champ de date ouvre le calendrier, sans clavier |
| 7 | Aide | C | Accueil, « Comment saisir une date ou une heure ? » en FR et en NL |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Serveur inchangé ; `cloison.test.js` vert |
| Bilinguisme | Libellés nouveaux, question d'aide et note en FR et en NL (`i18n.test.ts`, `help:check`) |
| Accessibilité | Icône du calendrier nommée (« Ouvrir le calendrier ») ; au clavier, la date se tape ou Alt+Flèche bas ouvre le calendrier ; `npm run a11y` 0 |
| Journal d'audit | Inchangé |
| Aide | Une question dans Accueil, une ligne revue dans Demandes de l'entité ; `help:check` 11/11 |
| Téléphones | `mobile:check` complet rejoué : voir `ETAT.md` |
| Tests | Serveur 698, interface 397 (+1) ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; E-50 et E-09 inchangés |

## Questions RGPD

- Aucune donnée personnelle nouvelle, aucune finalité nouvelle, aucun destinataire nouveau.

## Simulé ou incomplet

- Vérifié sur la copie locale dans Chromium et WebKit de Playwright avec de vrais clics de souris aux positions réelles (heures d'une tâche, heure impossible, affectation, absence, calendrier par l'icône, Échap, Alt+Flèche bas), et par les tests de l'interface (jsdom). Pas de vrai iPhone ni de vrai Android (décision du 23/11/2026 : émulation de Chrome).
- Un calendrier ouvert volontairement par l'icône recouvre encore ce qui est dessous tant qu'il est ouvert : c'est voulu, il se ferme par Échap, un clic à côté ou le choix d'une date.
- Les autres formulaires que « Terminer la tâche » n'ont toujours pas le contrôle du texte non retenu (DV-176, à décider) : un texte non valable y est remis à l'ancienne valeur par le composant.
- Images Docker non reconstruites dans le bac à sable : seule l'image de l'interface change réellement ; celle du serveur se reconstruit pour le numéro de version et la note.

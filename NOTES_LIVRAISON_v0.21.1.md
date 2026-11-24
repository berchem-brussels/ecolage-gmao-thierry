# Notes de livraison 0.21.1

24/11/2026 · GMAO communale · Correctif de l'anomalie de la recette de la 0.21.0 : heures de « Terminer la tâche » (DV-173, DV-174)

## Périmètre

Version de correctif, avant l'audit du cahier des charges demandé le 24/11/2026 et avant l'étape 18 (DV-174). Aucune migration, aucune dépendance nouvelle, aucune permission nouvelle, aucun réglage nouveau, aucun outil MCP nouveau ; le serveur ne change que par son numéro de version et sa note.

- **Anomalie relevée à la recette de la 0.21.0** : dans la fenêtre « Terminer la tâche », le début changé puis la fin tapée sans Entrée donnaient le refus « La fin doit venir après le début ». Reproduite sur la copie locale, dans Chromium et WebKit, elle était plus grave que relevée : quand le bouton « Terminer » est activé sans que le champ perde d'abord le focus (clic piloté par la page, assistance, certains claviers), l'heure tapée et affichée n'était pas celle envoyée ; l'heure préremplie (maintenant) était enregistrée sans erreur (fin affichée 09:00, enregistrée 09:55). Cause : le composant de date d'Ant Design (rc-picker) ne retient le texte tapé qu'à Entrée ou deux images après la perte du focus, donc après la lecture des valeurs par le formulaire.
- **Correctif pour toute l'application** (`frontend/src/saisieDate.ts`, posé une fois dans `main.tsx`) : avant tout clic et tout envoi de formulaire venus d'ailleurs que du champ, le champ de date ou d'heure qui a encore le focus reçoit Entrée (un texte valide est retenu tout de suite), puis perd le focus. Vaut pour tous les champs de date et d'heure : heures d'une tâche, affectation, absences d'un ouvrier, services et valideurs, qualification, compléments, planning, horaires.
- **« Terminer la tâche »** : si le texte affiché au moment du clic n'est pas la valeur retenue (format faux, heure impossible, date future refusée par le calendrier), rien n'est enregistré et le champ dit « Date ou heure non retenue : tapez-la au format JJ/MM/AAAA HH:MM, jamais dans le futur, ou choisissez-la dans le calendrier. » Une ligne de plus dans l'aide de « Demandes de l'entité » (problèmes fréquents).
- Note de version : une ligne pour le service technique (heures de « Terminer la tâche »), une pour l'administrateur (règle commune des dates).
- Tests : serveur 697 (696 en 0.21.0 : note 0.21.1), interface 394 (389) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md`, section 0.21.1.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.21.1 s'installe sur la 0.21.0. **Pas de relance de `demo.js`** : le mot de passe de démonstration du 19/11/2026 reste valable.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_21_1.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_21_1.tar.gz 100% …` (environ 14 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_21_1.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_21_1.tar.gz
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
sudo tar xzf gmao-v0_21_1.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls frontend/src/saisieDate.ts NOTES_LIVRAISON_v0.21.1.md
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

Attendu : `[APP] API 0.21.1 sur le port 3001`, aucune ligne `[DB] Migration` (aucune migration dans cette version).

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

**Retour arrière** : la 0.21.0 sert la même base (aucune migration) ; mêmes commandes avec `gmao-v0_21_0.tar.gz`, sans restaurer la base. La sauvegarde du jour reste prise par précaution.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, recharger avec Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | C | `responsable.ac` : une ligne 0.21.1 (« Terminer la tâche ») ; administrateur : la ligne de la règle commune ; `agent.ac` : rien ; FR et NL |
| 2 | Heure tapée sans Entrée | C | Une tâche « À faire » d'une demande de recette, « Terminer » : début tapé avec Entrée, fin tapée sans Entrée, « Terminer » : la tâche dit « Réalisée du … au … » avec exactement les heures affichées |
| 3 | Scénario de la recette du 23/11/2026 | T | Même fenêtre, à la souris et au clavier comme le 23/11/2026 (début changé, fin tapée sans Entrée, clic sur « Terminer ») : heures enregistrées = heures affichées, ou message « Date ou heure non retenue » si le texte n'est pas valable ; jamais d'heure différente de celle affichée |
| 4 | Texte non valable | C | Fin `24/11/2026 99:99`, « Terminer » : « Date ou heure non retenue », rien n'est enregistré (la tâche reste « À faire ») |
| 5 | Pas de régression des dates | C | Affectation : date tapée puis Entrée sans envoi (R1 de la 0.21.0) ; absence d'un ouvrier enregistrée avec ses dates ; « Déplacer » du planning |
| 6 | Téléphone | C | Par l'émulation de Chrome (décision du 23/11/2026) : fenêtre « Terminer la tâche » dans l'écran, calendrier utilisable |
| 7 | Aide | C | « Demandes de l'entité », problèmes fréquents : « Date ou heure non retenue » en FR et en NL |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Serveur inchangé ; `cloison.test.js` vert |
| Bilinguisme | Message nouveau et ligne d'aide en FR et en NL (`i18n.test.ts`, `help:check`) |
| Journal d'audit | Inchangé (heures réelles déjà au journal du passage, sans texte libre) |
| Aide | « Demandes de l'entité » : une ligne de problème fréquent ; `help:check` 11/11 |
| Téléphones | `mobile:check` complet rejoué : voir `ETAT.md` |
| Tests | Serveur 697, interface 394 (+1) ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; E-50 et E-09 inchangés |

## Questions RGPD

- Aucune donnée personnelle nouvelle, aucune finalité nouvelle, aucun destinataire nouveau.
- Effet favorable : les heures réelles d'une tâche enregistrées sont celles que la personne a vues à l'écran.

## Simulé ou incomplet

- Vérifié dans Chromium et WebKit de Playwright sur la copie locale, et par les tests de l'interface (jsdom). Pas de vrai iPhone ni de vrai Android (décision du 23/11/2026 : émulation de Chrome).
- Dans WebKit de Playwright, une frappe automatique dans un champ de date masqué (format JJ/MM/AAAA HH:MM) est parfois mélangée par le contrôle lui-même (Ctrl+A non pris) : le texte affiché est alors refusé ou remis à l'ancien, comme il se doit ; ce n'est pas une frappe réelle.
- Les autres formulaires que « Terminer la tâche » profitent de la règle commune (texte valide retenu avant l'envoi) mais n'ont pas le contrôle du texte non retenu : un texte non valable y est remis à l'ancienne valeur par le composant, comme avant la 0.21.1.
- Images Docker non reconstruites dans le bac à sable : seule l'image de l'interface change réellement ; celle du serveur se reconstruit pour le numéro de version et la note.

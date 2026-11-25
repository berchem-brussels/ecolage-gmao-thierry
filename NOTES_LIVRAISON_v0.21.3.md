# Notes de livraison 0.21.3

25/11/2026 · GMAO communale · Correctif issu de l'audit du cahier des charges : fin des tâches, avis au service technique, champs de date (DV-176, DV-179 à DV-182)

## Périmètre

Version de correctif, après l'audit du cahier des charges sur la 0.21.2 (`claude/AUDIT-CDC-0.21.2.md`, manques M-01 à M-04) et avant le test orienté utilisateur et l'étape 18. Aucune migration, aucune dépendance nouvelle, aucune permission nouvelle, aucun réglage nouveau, aucun outil MCP nouveau.

- **Fin des tâches (CYC-03, D-0.21.2-2, DV-181)** : une demande « Rouverte » ou « En attente » passe « Travaux terminés » quand sa dernière tâche ouverte se termine (avant : elle restait dans son état). Le gestionnaire peut aussi faire ce passage à la main, une fois les tâches finies. Sur une demande « À qualifier », une tâche se prépare, s'affecte et s'annule, mais ne démarre ni ne se termine : « Qualifiez d'abord la demande ». Les deux passages nouveaux sont ajoutés tout seuls au démarrage du serveur (44 au catalogue).
- **Avis au service technique (DEM-06, NOT-01, DV-180)** : le gestionnaire et le responsable de l'entité reçoivent un avis (cloche et courriel) pour chaque demande qui arrive au service technique : dépôt direct, danger, encodage par un collègue, validation par le chef de service. Un danger est annoncé « DANGER signalé : demande …, priorité absolue ». L'auteur de l'action n'est pas averti de sa propre demande ; le demandeur et le chef non plus. Le courriel ne porte que le numéro, le lieu, le délai et le lien.
- **Champs de date (D-0.21.2-1, DV-182)** : Alt+Flèche bas rouvre le calendrier après Échap (avant : sans effet). Défaut trouvé en corrigeant, présent depuis la 0.21.2 : sur un champ rempli, la croix d'effacement prenait la place de l'icône au survol, et un clic pour ouvrir le calendrier effaçait la date. L'icône du calendrier est maintenant à gauche du champ ; la croix reste seule à droite.
- **Date ou heure non retenue (DV-176, M-04)** : dans tout formulaire qui enregistre une date ou une heure, un texte que le champ n'a pas retenu (format faux, date impossible) bloque l'enregistrement : « Date ou heure non retenue : rien n'est enregistré… », le champ est entouré de rouge et reprend le focus. Avant : l'ancienne valeur était enregistrée en silence. Formulaires : absences, nouvelle demande (date souhaitée), affectation, qualification (date convenue), horaire, congés et fermetures, simulateur, planning (« Déplacer », « Planifier »), services (suppléant) ; « Terminer la tâche » garde son contrôle de la 0.21.1. Le filtre de période du journal d'audit n'enregistre rien et n'est pas concerné. Un champ obligatoire vidé par un texte refusé affiche « Ce champ est obligatoire », comme avant.
- Aide : Accueil (« Comment saisir une date ou une heure ? », la cloche) ; Demandes de l'entité (tâches, « Qualifiez d'abord la demande », icône à gauche). Captures refaites : planning (vue d'ensemble et « Déplacer »), absences d'un ouvrier, journal d'audit, en FR et en NL.
- Note de version : une ligne pour tous, deux pour le service technique.
- Tests : serveur 701 (698 en 0.21.2), interface 404 (397) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md`, section 0.21.3.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.21.3 s'installe sur la 0.21.2. **Pas de relance de `demo.js`** : le mot de passe de démonstration du 19/11/2026 reste valable.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_21_3.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_21_3.tar.gz 100% …` (environ 14 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_21_3.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_21_3.tar.gz
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
sudo tar xzf gmao-v0_21_3.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls NOTES_LIVRAISON_v0.21.3.md backend/config/notifications.json
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

Attendu : `[APP] API 0.21.3 sur le port 3001`, aucune ligne `[DB] Migration` (aucune migration ; les deux passages nouveaux sont ajoutés sans ligne au journal du conteneur).

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

**Retour arrière** : la 0.21.2 sert la même base (aucune migration) ; mêmes commandes avec `gmao-v0_21_2.tar.gz`, sans restaurer la base. Les deux passages ajoutés restent en base : la 0.21.2 les montre comme des boutons manuels (« Travaux terminés » depuis « Rouverte » et « En attente »). La sauvegarde du jour reste prise par précaution.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, recharger avec Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry. Tous les clics se font à la souris, à l'endroit réel des éléments.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | T | `agent.ac` : une ligne 0.21.3 ; `responsable.ac` : trois lignes ; FR et NL |
| 2 | Avis d'une demande nouvelle | C | `agent.ac` dépose une demande, puis une avec « Danger » : chez `gestionnaire.ac` et `responsable.ac`, la cloche montre « Nouvelle demande … à qualifier » et « Danger signalé : demande …, priorité absolue » ; journal des courriels (administrateur, Paramètres › Courriel) : les deux courriels retenus en mode test, sans description ; rien chez `agent.ac` ni `valideur.ac` |
| 3 | Fin des tâches | C | Sur `AC-DI-2026-00006` (« Rouverte » depuis la recette de la 0.21.2) : terminer sa dernière tâche ouverte, ou en ajouter une et la terminer : la demande passe « Travaux terminés » |
| 4 | Tâche d'une demande à qualifier | C | Sur la demande déposée au contrôle 2 : ajouter une tâche ; ni « Démarrer » ni « Terminer », bandeau « Qualifiez d'abord la demande » ; après « Qualifier », « Démarrer » revient |
| 5 | Icône à gauche | T | Un champ de date rempli (affectation) : l'icône du calendrier est à gauche ; un clic dessus ouvre le calendrier et garde la date ; la croix à droite efface |
| 6 | Alt+Flèche bas | C | Dans un champ de date : Alt+Flèche bas ouvre, Échap ferme, Alt+Flèche bas rouvre |
| 7 | Date non retenue | T | Affectation : taper `99/99/2026` dans la date puis cliquer sur « Enregistrer » : message « Date ou heure non retenue : rien n'est enregistré », champ en rouge ; la date d'avant reste ; même geste dans « Déplacer » du planning |
| 8 | Téléphone | C | Émulation de Chrome (iPhone, Android) : toucher un champ de date ouvre le calendrier, sans clavier ; l'icône est à gauche |
| 9 | Aide | C | Accueil, « Comment saisir une date ou une heure ? » et la cloche ; Demandes de l'entité, « Qualifiez d'abord la demande » ; FR et NL |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | L'avis nouveau va au seul service de l'entité de la demande ; `cloison.test.js` et `avis.test.js` verts |
| Bilinguisme | Libellés, événement, modèles de courriel, aide et note en FR et en NL (`i18n.test.ts`, `notifications.test.js`, `help:check`) |
| Accessibilité | Champ refusé marqué `aria-invalid` et repris au focus ; icône du calendrier nommée ; `npm run a11y` 0 |
| Journal d'audit | Passages automatiques notés comme avant (`auto` = `taches`) ; aucune action nouvelle |
| Aide | Accueil et Demandes de l'entité ; quatre captures par langue refaites ; `help:check` 11/11 |
| Téléphones | `mobile:check` complet rejoué : voir `ETAT.md` |
| Tests | Serveur 701, interface 404 (+1) ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; E-50 et E-09 inchangés |

## Questions RGPD

- Aucune donnée personnelle nouvelle, aucune finalité nouvelle. Destinataire : le gestionnaire et le responsable du service technique reçoivent désormais un avis de chaque demande de leur entité (numéro, lieu, délai, lien), alors qu'ils lisaient déjà ces demandes dans « Demandes de l'entité » : aucun destinataire nouveau au sens du registre.

## Simulé ou incomplet

- Vérifié sur une copie locale (API en production, interface construite servie en HTTPS), dans Chromium et WebKit de Playwright, avec de vrais claviers et de vrais clics aux positions réelles : affectation (date refusée puis acceptée), « Déplacer » du planning (date refusée), absence d'un ouvrier (texte refusé : « Ce champ est obligatoire », rien d'enregistré), tâche d'une demande à qualifier (bandeau, pas de « Démarrer »), icône à gauche ; et sur une page d'essai (date, heure, période : Alt+Flèche bas, Échap, croix, saisie refusée). Les autres formulaires (qualification, horaire, congés, simulateur, services) sont couverts par l'inventaire des tests et la règle commune, pas par un essai à l'écran.
- Courriels en mode test : rien n'est envoyé pour de vrai (E-48).
- Pas de vrai iPhone ni de vrai Android (décision du 23/11/2026 : émulation de Chrome).

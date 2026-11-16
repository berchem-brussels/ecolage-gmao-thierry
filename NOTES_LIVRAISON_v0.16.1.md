# Notes de livraison 0.16.1

16/11/2026 · GMAO communale · Correctifs de la recette de la 0.16.0 (R1 à R5), danger sans validation, contrôle des téléphones sur le moteur de Safari (DV-134 à DV-136)

## Périmètre

Version de correctif, avant l'étape 13 (0.17.0, notifications). Aucune migration, aucune dépendance nouvelle, aucune permission nouvelle, aucun réglage nouveau.

- **R5 (bloquant pour le chef de service)** : le chef de service ouvre les photos et documents joints aux demandes qu'il doit valider. La fiche les listait, l'ouverture répondait 403 : `pieces.charger()` ne connaissait pas le valideur. Une seule règle du valideur (`valideurDe` de `services/services.js`) sert désormais la lecture d'une demande, ses passages et ses pièces ; les deux copies de la 0.16.0 sont retirées. Restent refusés : le chef d'un autre service, le chef de l'autre entité, le suppléant hors de sa période, la pièce d'une note interne.
- **R1** : après l'envoi d'une demande qui attend l'accord du chef de service, l'écran dit « Votre chef de service (Service : …) doit d'abord donner son accord. Le délai du service technique comptera à partir de cet accord. » et « … vous y verrez la décision de votre chef de service. », sans délai indicatif ni « Le service technique l'a reçue ». À l'encodage par le service technique : « La demande attend l'accord du chef de service de la personne (Service : …). »
- **R4** : dans le journal d'audit, la ligne « Demande regroupée avec une autre » traduit l'état de départ (« À qualifier ») et nomme la demande principale une seule fois (« Demande principale »). Affichage seulement : les lignes déjà écrites en profitent.
- **R2** : fil de messages vide d'une demande fermée : « Aucun message. » suivi de « La demande est fermée : … » ; l'invitation « Écrivez ici au service technique… » ne s'affiche qu'à qui peut écrire.
- **R3** : à l'encodage par le service technique, l'écran de confirmation dit « Numéro de la demande : » au lieu de « Votre numéro de demande : ».
- **Danger sans validation** (décision A de Thierry du 16/11/2026, DV-135) : une demande « Danger pour les personnes ou les biens » d'une catégorie à valider part tout de suite au service technique en P1, sans attendre le chef ; le journal note « Validation du chef de service : Sautée pour danger : envoyée au service technique ». La FAQ « Ma demande est en attente de l'accord de votre chef de service » le dit.
- **Contrôle des téléphones** (`npm run mobile:check`, méthode convenue le 14/11/2026, DV-136) : moteur WebKit (Safari et Edge sur iPhone) à 320 et 390 px en plus de Chromium à quatre largeurs ; image qui ne s'affiche pas signalée ; attente de la fin des animations avant la mesure ; parcours complets au doigt sur chaque moteur (`MOBILE_PARCOURS=1`, `mobile-check/parcours.mjs` : dépôt avec photo, photo vue et validation par le chef, regroupement, découpage, « Déplacer »), refusés hors d'une copie locale.
- Note de version : une ligne pour tous (danger), une pour le chef de service (pièces jointes).

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.16.1 s'installe sur la 0.16.0 ; pas de relance de `demo.js`, le mot de passe de démonstration ne change pas.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_16_1.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_16_1.tar.gz 100% …` (environ 10 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_16_1.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_16_1.tar.gz
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
sudo tar xzf gmao-v0_16_1.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls frontend/mobile-check/parcours.mjs NOTES_LIVRAISON_v0.16.1.md
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

Attendu : `[APP] API 0.16.1 sur le port 3001`, aucune ligne `[DB] Migration` (aucune migration dans cette version).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : saisie visible du mot de passe commun de démonstration (celui du 14/11/2026, inchangé), « Mot de passe reçu : N caractère(s). », neuf lignes `OK`, puis `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : la 0.16.0 sert la même base (aucune migration) ; mêmes commandes avec `gmao-v0_16_0.tar.gz`. Une demande « Danger » déposée en 0.16.1 dans une catégorie à valider reste « À qualifier ». La sauvegarde du jour reste prise par précaution.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | C | `agent.ac` : une ligne 0.16.1 (danger) ; `valideur.ac` : deux lignes (danger, pièces jointes) ; FR et NL |
| 2 | R1 | C | `agent.ac` dépose « Aménagement d'un local » avec une photo : « Votre chef de service (Service : …) doit d'abord donner son accord… », aucun « Délai indicatif » ni « Le service technique l'a reçue » |
| 3 | R5 | C | `valideur.ac`, « Demandes à valider », la demande du contrôle 2 : la vignette de la photo s'affiche et s'ouvre ; console sans 403 |
| 4 | Danger | C | `agent.ac` dépose « Achat de matériel » avec « Danger pour les personnes ou les biens » : « À qualifier » en P1, absente des demandes à valider de `valideur.ac`, présente pour `responsable.ac` ; journal : « Validation du chef de service : Sautée pour danger : envoyée au service technique » |
| 5 | R3 | C | `responsable.ac` encode une demande reçue par téléphone : « Numéro de la demande : » |
| 6 | R4 | C | Journal (administrateur), ligne « Demande regroupée avec une autre » de la recette de la 0.16.0 : « État de départ : À qualifier », « Demande principale » une seule fois, aucun code brut ; FR et NL |
| 7 | R2 | C | Fiche d'une demande fermée sans message (annulée ou regroupée) côté demandeur : « Aucun message. », pas d'« Écrivez ici » |
| 8 | Validation de la demande du contrôle 2 | C | `valideur.ac` valide : la demande passe « À qualifier » chez le service technique |
| 9 | Pas de régression | C | « Demandes de l'entité » en colonnes, « Déplacer », regroupement et découpage s'ouvrent comme en 0.16.0 |
| 10 | iPhone (Edge, moteur WebKit) | T | Contrôles 2, 3 et 4 au doigt : photo visible chez le chef, écran de confirmation, case « Danger » |
| 11 | Android (Chrome) | T, avec un agent | Mêmes contrôles qu'au 10, si un téléphone Android est disponible ; sinon reporté (DV-80) |
| 12 | Métier | T | Règle du danger sans validation acceptable pour le service technique et les chefs de service |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Chef de l'autre entité refusé sur les pièces (`validation.test.js`) ; `cloison.test.js` inchangé et vert |
| Bilinguisme | Tout texte nouveau en FR et en NL (`i18n.test.ts`) |
| Journal d'audit | `validation: danger` traduit ; aucun texte libre |
| Aide | FAQ de « Mes demandes » à jour ; `help:check` 11/11 |
| Téléphones | `mobile:check` 41 écrans, six appareils (Chromium et WebKit), FR et NL, parcours complets sur les deux moteurs : aucun défaut |
| Tests | Serveur 544 (541 en 0.16.0), interface 320 (314) et un contrôle des captures ; preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | Aucune nouvelle ; audit serveur 0, interface 3 modérées (E-09) |

## Questions RGPD

- Aucune donnée personnelle nouvelle, aucun traitement nouveau.
- Le chef de service lit les pièces jointes des demandes qu'il lit déjà depuis la 0.16.0 : destinataire inchangé, déjà à porter au registre avec la 0.16.0. Une pièce peut montrer des personnes : la consigne photo (DV-12, DV-66) reste affichée sous le bouton.
- La règle du danger ne change pas qui lit la demande : le service technique la reçoit plus tôt.

## Simulé ou incomplet

- WebKit de Playwright reste une émulation : ni le vrai Safari ou Edge d'un iPhone, ni le vrai tactile. Le contrôle 10 sur l'iPhone reste nécessaire ; Android réel non testé.
- Une erreur « Importing a module script failed » vue une fois dans WebKit, pendant un essai juste après un redémarrage du serveur local, n'est pas revenue en trois passages complets : non expliquée, à surveiller.
- Images Docker non reconstruites dans le bac à sable (les deux changent).

# Notes de livraison 0.17.0

17/11/2026 · GMAO communale · Étape 13 : notifications (cloche, courriel, modèles de courriel, avis, alertes d'échéance), avec les remarques de la recette de la 0.16.1 (DV-137 ; DV-138 à DV-144)

## Périmètre

Migration `015_notifications` (quatre tables : `notifications`, `courriels`, `modeles_courriel`, `demande_alertes` ; rien n'est retiré). Dépendance nouvelle côté serveur : `nodemailer` 10.6.0 (écart E-48, accord de Renaud à obtenir avant la production). Aucune permission nouvelle, aucun réglage de l'entité nouveau ; réglages de l'instance `mail.*` (administrateur).

- **Remarques de DV-137** : la croix du volet pendant « Regrouper », « Découper », « Qualifier », un passage, « Valider et transmettre » ou « Refuser » ramène à la fiche (« Revenir à la fiche »), au lieu de fermer la fiche. La fiche que lit le chef de service dit « En attente de l'accord du chef de service » et « compté à partir de l'accord du chef de service » ; le demandeur garde « votre chef de service ». L'API et le MCP rendent encore au chef le libellé du demandeur (E-49).
- **Cloche** dans l'en-tête, pour tout le monde : nombre d'avis non lus, volet avec « Toutes » et « Non lues », « Tout marquer comme lu » ; toucher un avis l'ouvre (fiche de la demande, « Demandes à valider », fiche du service ou ticket). Les avis suivent l'entité active ; le compteur dit s'il y en a dans l'autre entité. Sur téléphone, le choix de l'entité d'une personne de deux entités passe en tête du menu.
- **Avis** : accusé de dépôt (déjà lu dans la cloche, envoyé par courriel, DEM-12) ; demande faite pour vous ; demande qui attend l'accord du chef (au chef et au suppléant en période) ; demande « Danger » partie sans le chef (au chef) ; validée, refusée ; prise en charge, planifiée, en attente, confiée à un prestataire, terminée, clôturée, refusée, annulée, regroupée (au demandeur, au bénéficiaire, aux personnes qui suivent) ; message du demandeur (à la personne qui a qualifié, sinon au service) ; réponse du service (au demandeur et au bénéficiaire) ; note interne (aux seuls collègues mentionnés) ; ticket créé et réponse. Jamais d'avis de sa propre action, sauf l'accusé par courriel. Aucun texte libre dans un avis ni dans un courriel (ni description, ni commentaire, ni motif, ni nom : NOT-06).
- **Alertes d'échéance** : toutes les 15 minutes, échéance proche (demande à qualifier : tout le service technique) et retard (demande qualifiée : la personne qui l'a qualifiée, sinon le service technique) ; une alerte par échéance ; les retards déjà là au passage en 0.17.0 sont notés sans avis, pour ne pas inonder la cloche.
- **Courriel** (Paramètres, onglet « Courriel », administrateur) : livré **en mode test** (décision de Thierry du 16/11/2026) : rien ne part, chaque courriel se lit dans « Journal des courriels », marqué « Simulé ». Mode SMTP : serveur, port, sécurité, compte, mot de passe chiffré, expéditeur ; courriel d'essai avec son résultat. File d'envoi dans l'API, trois essais espacés, journal gardé 90 jours. Une adresse en `.invalid` (comptes de démonstration) ne part jamais en mode SMTP.
- **Modèles de courriel** (même onglet) : quinze modèles FR et NL, variables contrôlées, `{numero}` exigé, aperçu avant d'enregistrer, « Rétablir le texte livré ». Chaque courriel part dans la langue du destinataire.
- **MCP** : seize outils (six pour les notifications, cinq pour le courriel, cinq pour les modèles).
- **Téléphones** : `mobile:check` ouvre la cloche (service technique, chef de service) et la fiche d'un modèle (administrateur) : 45 écrans ; dans les parcours, le chef puis l'agent ouvrent la demande depuis la cloche.
- Aide : Paramètres (courriel, modèles, « Les agents ne reçoivent aucun courriel »), Accueil (« À quoi sert la cloche ? »), Mes demandes (« Comment suis-je prévenu de l'avancement ? »). Fiche fonctionnelle `docs/fonctionnel/notifications.md`.
- Note de version : deux lignes pour tous (cloche, entité sur téléphone), une pour le chef de service, une pour le service technique, une pour l'administrateur.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante. La 0.17.0 s'installe sur la 0.16.1 ; pas de relance de `demo.js`, le mot de passe de démonstration ne change pas.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_17_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_17_0.tar.gz 100% …` (environ 10 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_17_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_17_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.` Noter le nom de la sauvegarde du jour : elle sert au retour arrière.

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_17_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/src/services/avis.js NOTES_LIVRAISON_v0.17.0.md
```

Attendu : les deux chemins affichés, sans « No such file ».

```
sudo docker compose build
```

Attendu, après une à cinq minutes (l'image `api` télécharge `nodemailer`) : `naming to docker.io/library/gmao-api` et `naming to docker.io/library/gmao-web` (ou `Image … Built`), sans erreur.

```
sudo docker compose up -d
```

Attendu : `Container gmao-api Healthy` puis `Container gmao-web Started`.

```
sudo docker logs gmao-api --tail 30
```

Attendu : `[DB] Migration 015_notifications appliquée` puis `[APP] API 0.17.0 sur le port 3001` ; quelques secondes plus tard, éventuellement `[ALERTES] N alerte(s) d'échéance` (échéances proches des demandes de recette).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : saisie visible du mot de passe commun de démonstration (celui du 14/11/2026, inchangé), « Mot de passe reçu : N caractère(s). », neuf lignes `OK` (le contrôle 5 cite `015_notifications` et ses quatre tables), puis `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

**Retour arrière** : mêmes commandes avec `gmao-v0_16_1.tar.gz`, **sans restaurer la base** (essayé le 17/11/2026 : la 0.16.1 démarre sur la base passée en 0.17.0 et ignore les quatre tables nouvelles) ; la cloche et les courriels disparaissent de l'écran et reviennent avec la 0.17.0. La sauvegarde du jour reste prise par précaution.

## Liste de contrôle à l'écran

À l'adresse `https://192.0.2.10:18443`, après Ctrl+F5. C : fait par Claude dans Chrome (écritures après l'accord de Thierry) ; T : Thierry.

| N° | Contrôle | Qui | Attendu |
| --- | --- | --- | --- |
| 1 | Nouveautés | C | `agent.ac` : deux lignes 0.17.0 ; `valideur.ac` : trois ; `gestionnaire.ac` : trois ; administrateur : trois ; FR et NL ; bas du menu `v0.17.0` |
| 2 | Accusé et cloche du demandeur | C | `agent.ac` dépose une demande simple : la cloche ne s'allume pas (accusé né lu) ; dans le volet, « Toutes » montre l'accusé, « Non lues » rien |
| 3 | Chef de service | C | `agent.ac` dépose « Aménagement d'un local » : chez `valideur.ac`, cloche à 1, l'avis « attend votre accord » ouvre « Demandes à valider » sur la demande ; la fiche dit « … du chef de service » |
| 4 | Décision et retour au demandeur | C | `valideur.ac` valide : chez `agent.ac`, l'avis « a validé la demande » ouvre sa fiche ; « Tout marquer comme lu » éteint la cloche |
| 5 | Fil | C | `agent.ac` écrit un message sur la demande du contrôle 4 après sa qualification par `gestionnaire.ac` : cloche chez `gestionnaire.ac` ; sa réponse allume la cloche de `agent.ac` |
| 6 | Courriel en mode test | C | Administrateur, Paramètres › Courriel : « Mode test » ; « Journal des courriels » liste les courriels des contrôles 2 à 5, marqués « Simulé », sans description ni nom ; courriel d'essai retenu |
| 7 | Modèles de courriel | C | Ouvrir « Demande reçue » : aperçu FR et NL ; une variable inconnue `{nom}` est refusée en la nommant ; rien d'enregistré |
| 8 | Croix du volet | C | Fiche d'une demande, « Regrouper » puis la croix : retour à la fiche, pas à la liste |
| 9 | Cloison et MCP | C | `responsable.cpas` : aucun avis de l'AC ; `list_notifications` par le MCP rend la même liste que la cloche |
| 10 | iPhone (Edge, moteur WebKit) | T | Cloche visible dans l'en-tête à côté du menu, volet lisible, toucher un avis ouvre la demande ; contrôles 3 et 4 au doigt |
| 11 | Android (Chrome) | T, avec un agent | Mêmes contrôles qu'au 10, si un téléphone Android est disponible ; sinon reporté (DV-80), avec le contrôle 11 de la 0.16.1 |
| 12 | Métier | T | Avis utiles et pas trop nombreux pour le demandeur, le chef et le service technique ; textes des quinze modèles de courriel à revoir en atelier (D-11) ; mode test gardé jusqu'à la décision d'envoyer pour de vrai |

## Liste de contrôle du standard

| Point | État |
| --- | --- |
| Cloison AC et CPAS | Routes `/api/notifications/:id` et `/:id/lue` dans `cloison.test.js` ; autre entité 403, autre personne 404 (`notifications.test.js`) |
| Bilinguisme | Avis, courriels et modèles en FR et en NL, langue du destinataire (`i18n.test.ts`, `modeles-courriel.test.js`) |
| Journal d'audit | Réglages du courriel (mot de passe masqué), essai, modèles (sans texte) ; lecture d'une notification non journalisée (préférence d'affichage) |
| Aide | Trois écrans mis à jour ; `help:check` 11/11 ; aucune capture nouvelle |
| Téléphones | `mobile:check` 45 écrans, six appareils (Chromium et WebKit), FR et NL, parcours complets sur les deux moteurs : voir `ETAT.md` |
| Tests | Serveur 594 (544 en 0.16.1), interface 332 (320) et un contrôle des captures ; seize preuves d'échec dans `docs/fr/SECURITE.md` |
| Dépendances | `nodemailer` 10.6.0 (E-48) ; audit serveur 0, interface 3 modérées (E-09) |
| MCP | Seize outils, parité route et outil testée ; réglage du courriel et retour d'un modèle en deux appels |

Correctif avant la fusion : le travail `tests` de GitHub (demande #18) a trouvé une violation d'accessibilité sur « Services et valideurs » (choix de l'entité nommé mais sans rôle, pendant le chargement) ; corrigée dans cette archive, avec un test qui la reproduit à coup sûr.

## Questions RGPD

- Données nouvelles : les avis (destinataire, événement, numéro, lien, date de lecture), la file des courriels (adresse du destinataire, sujet et texte composé, résultat de l'envoi) et les alertes d'échéance. Aucun texte libre ; conservation : avis lus 90 jours, non lus 365 jours, courriels 90 jours.
- Destinataires : les personnes averties lisaient déjà la demande ou le ticket ; aucun destinataire nouveau. En mode SMTP, le serveur de courriel de l'organisation devient un sous-traitant de l'envoi (à porter au registre quand l'envoi réel sera activé).
- Minimisation : le courriel ne porte que le numéro, le lieu, l'état, le délai et un lien ; la personne doit se connecter pour lire le reste.

## Simulé ou incomplet

- Aucun courriel réel n'est parti : mode test sur NIXUS ; l'envoi SMTP est testé contre un serveur factice local (`tests/smtp-factice.js`), pas contre le serveur de l'AC.
- WebKit de Playwright reste une émulation : le contrôle 10 sur l'iPhone reste nécessaire ; Android réel non testé.
- L'API et le MCP rendent au chef de service le libellé de l'état écrit pour le demandeur (E-49).
- Images Docker non reconstruites dans le bac à sable (l'image `api` change de dépendances).

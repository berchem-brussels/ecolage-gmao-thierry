# Notes de livraison 0.13.0

08/11/2026 · GMAO communale · Photo de l'endroit et filtre « Sans photo » (étape 8 ter, DV-101), défauts du contrôle complet de la 0.12.0 (DV-113, DV-114) et remarques M1 à M5 de sa recette (DV-112)

## Périmètre

Le service technique reconnaît l'endroit d'une demande sur sa photo ; Patrimoine montre les lieux qu'il reste à photographier. Le contrôle complet de la 0.12.0 (DV-113) a trouvé dix défauts, tous corrigés ici avec les cinq remarques de sa recette. Tout est vérifié sur iPhone et Android aux largeurs de 320 à 412 px (DV-102).

- **Photo de l'endroit** : sur la fiche d'une demande du service technique, sous « Où ? », et en tête de la qualification ; photo du lieu, sinon du plus proche lieu au-dessus (niveau, bâtiment, site), dite comme telle ; agrandie au toucher ; jamais montrée au demandeur.
- **Patrimoine, « Sans photo (n) »** : l'arbre ne garde que les lieux actifs sans photo, avec leurs parents ; filtre gardé dans l'adresse ; aussi par l'API et l'assistant (`has_photo`).
- **Téléphones (D1)** : l'en-tête tient sur les plus petits écrans ; la langue passe dans le menu des initiales sous 768 px. Contrôle `npm run mobile:check`.
- **Aide** : « Voir aussi » ouvre la bonne fiche (D4) ; impression plus rapide, captures comprises (M1) ; « Ajouter à la FAQ » reprend la réponse du service (M2) ; questions d'un écran aussi dans l'onglet Questions fréquentes (M3) ; « Entité AC seulement » (M4).
- **Journal d'audit sans code brut (D2, D3, D9, M5)** ; motif d'un ticket plus recopié au journal (D8, E-46).
- **Textes** : singulier des délais (D5), explication du téléphone d'urgence (D6), motif de retrait d'un rôle sous le champ (D7), texte discret plus contrasté (D10).

Aucune migration, aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env` et `ci.yml` inchangés. Les deux images changent.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_13_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_13_0.tar.gz 100% …` (environ 7 Mo). Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_13_0.tar.gz .
```

Attendu : demande du mot de passe, puis aucune sortie.

```
ls -l gmao-v0_13_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.`

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_13_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/tests/photo-lieu-demande.test.js frontend/src/components/demandes/PhotoLieu.tsx frontend/mobile-check/verifier-mobile.mjs
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

Attendu : `[APP] API 0.13.0 sur le port 3001`, sans ligne `[DB] Migration` (aucune migration).

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
sudo bash recette.sh
```

Attendu : la demande du mot de passe de démonstration de `multi-entites@demo.invalid` ; le taper (rien ne s'affiche), Entrée ; puis neuf lignes `OK` (le contrôle 5 lit toujours `011_faq`, dernière migration) et `BILAN : 9 contrôle(s) OK, 0 en échec.` Coller toute la sortie dans la conversation.

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_12_0.tar.gz`, sans restaurer la base (aucune migration).

## Liste de contrôle à l'écran

Dans Chrome (extension Claude connectée, certificat de NIXUS accepté), à l'adresse `https://192.0.2.10:18443`. **C** : contrôle fait par Claude dans l'onglet qu'il ouvre ; **T** : contrôle de Thierry. Thierry tape toujours lui-même les mots de passe ; Claude n'écrit qu'après l'accord de Thierry.

1. **T** Connexion avec le compte administrateur.
2. **C** Fenêtre « Nouveautés » : la 0.13.0 en trois lignes pour l'administrateur (deux pour tous, une pour le journal) ; bas du menu `v0.13.0`.
3. **C** Journal d'audit : catégorie modifiée, réglage de l'instance et de l'entité, pièce ajoutée, question de la FAQ, ticket résolu : plus aucune clé ni aucun code brut, en FR et en NL ; mode Complet, colonne Objet nommée (D2, D3, D9, M5).
4. **C** Mode d'emploi : depuis la fiche Journal d'audit, « Voir aussi » Paramètres ouvre la fiche Paramètres (D4) ; onglet Questions fréquentes : la question « Comment annuler une demande ? » avec « Écran : Mes demandes » (M3) et « Entité AC seulement » (M4).
5. **T** « Imprimer le mode d'emploi » : l'aperçu arrive vite et montre les captures (M1) ; annuler l'impression.
6. **T** puis **C** Connexion de `responsable.ac` (Thierry) : note de la 0.13.0 en trois lignes ; fiche d'une demande de « Demandes de l'entité » avec la photo de l'endroit et sa légende ; un clic l'agrandit ; « Qualifier » montre la photo en tête (sans enregistrer).
7. **C** Patrimoine : case « Sans photo (n) » ; cochée, seuls les lieux sans photo, marqués ; l'adresse contient `photo=sans` ; un lieu choisi garde le filtre.
8. **T** Avec l'accord de Thierry, pose des photos de démonstration dans Patrimoine (photo de la salle de projection sur CPAS-B1-L03 et autres photos disponibles, DV-115) ; le nombre de « Sans photo » baisse.
9. **C** Catégories et délais : « 1 heure calendaire », « 1 jour ouvrable » (D5) ; Réglages de l'entité : explication du téléphone d'urgence (D6) ; « (valeur par défaut) » plus foncé (D10).
10. **C** Lecture par le MCP depuis la page de `responsable.ac` : `get_demande` rend `photo_lieu` ; `list_lieux` avec `has_photo` 0 rend les lieux sans photo.
11. **T** iPhone (Safari) et Android (Chrome) : en-tête sur une ligne, langue dans le menu des initiales, photo de l'endroit agrandie au toucher (DV-102 ; contrôle 11 de la 0.12.0 compris).
12. **T** Jugement sur l'ergonomie : taille de la photo sur la fiche, utilité du filtre.

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : aucune dépendance nouvelle |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : `photo_lieu` et `has_photo` par l'API et par le MCP, parité testée |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché : aucune écriture nouvelle ; lecture réservée au service technique et cloisonnée |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : aucune migration ; contrat généré depuis les routes |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché : test de portabilité vert |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 437/437, interface 238 sur trois lancements, `help:check` 10/10) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | Coché dans Chromium : `mobile:check` à 320, 360, 390 et 412 px, FR et NL ; 1280 px par les captures |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché, avec les preuves d'échec |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, note de version | Coché : `patrimoine.md`, `service-technique.md`, `aide.md` ; trois fiches d'aide ; note de version |
| Aide par écran : fiche, captures, explication de chaque champ, contrôles bloquants | Coché : capture de Patrimoine refaite, `help:check` 10/10 |

## Questions RGPD

1. Données personnelles nouvelles : **non**. La photo de l'endroit est une photo de lieu déjà en base, sans personne ni plaque lisible (DV-12) ; rien n'est enregistré de plus. Le journal d'audit en garde moins : le motif libre d'un ticket n'y est plus recopié (E-46).
2. Finalité nouvelle : **non** : reconnaître le lieu d'une intervention.
3. Destinataire nouveau : **non** : la photo est montrée au service technique de l'entité, qui voyait déjà les lieux dans Patrimoine ; jamais au demandeur ni à l'autre entité.

## Simulé ou incomplet

- `mobile:check` et les contrôles d'écran ont tourné dans le Chromium du bac à sable (iPhone SE, iPhone 13, Galaxy S9+, Pixel 7 émulés) ; l'agrandissement de Safari et le geste de retour d'Android se vérifient sur de vrais téléphones (contrôle 11).
- GitHub Actions n'a pas tourné ; les suites ont tourné sous Node 22.23.4 (parcours `ci.yml` sous Node 20 non rejoué cette fois).
- Images Docker non reconstruites dans le bac à sable.

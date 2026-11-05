# Notes de livraison 0.10.0

05/11/2026 · GMAO communale · Connexion Microsoft compatible avec Portal (étape 8 bis, DV-96 ; standard v3.3, section 8.6)

## Périmètre

Un agent connecté à Portal avec Microsoft 365 ouvre la GMAO et arrive sur l'écran demandé sans nouvelle saisie (`SSO-COMPATIBLE-PORTAL.md`, version 1.0). Modules du gabarit 1.3.0 repris sans réécriture (DV-99) et adaptés à la GMAO.

- **Repris tels quels du gabarit 1.3.0.** `backend/src/oidc.js` (code d'autorisation avec PKCE S256, aucun paramètre `prompt` ni `max_age`, jeton d'identité vérifié : RS256 seul, clé publiée par Microsoft, émetteur du locataire, audience, expiration, `nonce` ; règle `safeNext`), `backend/src/settings.js` (réglages en base, secret chiffré en AES-256-GCM, jamais rendu), `backend/src/routes/sso.js` (`/api/auth/config`, `/api/auth/sso/start`, `/api/auth/callback`, `/api/settings/auth`), `backend/tests/sso.test.js` (faux Microsoft lancé par la suite de tests).
- **Adaptations à la GMAO.**
  - Migration `009_sso` : la partie connexion de la migration `003_sso_tickets_aide` du gabarit (colonnes `users.oid` et `users.is_admin_local`, table `auth_pending`) ; les tickets attendent la 0.11.0. Le premier administrateur réel (hors démonstration) reçoit l'accès de secours, comme l'assistant d'installation du gabarit.
  - `auth.js` : `appendCookie` du gabarit ; `openSession` et `closeSession` ajoutent leur cookie au lieu de remplacer les autres, sinon le cookie d'état n'était pas effacé au retour de Microsoft.
  - Réglages de la connexion sortis de `routes/sso.js` dans `services/connexion.js`, logique inchangée, pour que l'outil MCP appelle la même fonction (DV-104).
  - Connexion par mot de passe refusée en mode `sso`, sauf accès de secours (`LOCAL_LOGIN_DISABLED`).
  - En mode `sso`, le dernier administrateur joignable ne perd pas son accès de secours (`SSO_NO_ADMIN`).
- **Interface.**
  - Page de connexion : bouton « Se connecter avec Microsoft », départ automatique en mode `sso`, sans clic, sauf après « Se déconnecter » (`?deconnecte=1`), après une erreur (`?erreur=<code>`, message traduit) et pour l'accès de secours (`?local=1`, aucun lien visible).
  - Un écran ouvert sans session passe par `/login?next=<écran>` ; après un mot de passe, retour à cet écran s'il est sûr ; après Microsoft, le serveur y ramène.
  - « Se déconnecter » mène à « Vous êtes déconnecté » ; Portal et Microsoft restent ouverts.
  - Paramètres, onglet « Connexion Microsoft » : mode, annuaire, application, secret, adresse publique, domaines ; adresse de retour à copier dans Entra ID.
  - Utilisateurs, « Rôles » : case « Accès de secours par mot de passe » ; étiquettes « Microsoft » (compte déjà rattaché) et « Accès de secours ».
  - Textes en FR et en NL ; trois actions du journal d'audit nommées.
- **MCP.** `get_auth_settings` et `update_auth_settings` (en deux appels : `prepare_*`, `confirm_*`), administrateur seulement, secret jamais rendu.
- **Note de version.** Deux lignes pour l'administrateur ; rien pour le demandeur ni pour le service technique.

Aucune dépendance nouvelle. Dockerfile, compose, `nginx.conf`, `backup.sh`, `.env`, `.gitignore` et `ci.yml` inchangés. Les deux images changent.

## Commandes de mise à jour

Une commande à la fois ; on attend le résultat avant la suivante.

**Dans le cmd du PC** (invite `C:\Users\…>`, jamais dans la session SSH du NAS). Enregistrer d'abord l'archive dans `C:\gmao`.

```
scp -O C:\gmao\gmao-v0_10_0.tar.gz admin@192.0.2.10:/tmp/
```

Attendu : demande du mot de passe, puis `gmao-v0_10_0.tar.gz 100% …`. Si « Connection timed out » sur le port 22, relancer la même commande.

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
sudo mv /tmp/gmao-v0_10_0.tar.gz .
```

Attendu : demande du mot de passe (la première fois), puis aucune sortie.

```
ls -l gmao-v0_10_0.tar.gz
```

Attendu : le fichier listé avec la taille donnée dans le message de livraison. Sinon, s'arrêter : rien n'a été modifié.

```
sudo bash backup.sh
```

Attendu : `[gmao] … : sauvegarde terminée (photos copiées, pièces jointes copiées), N sauvegardes de la base conservées.` Cette sauvegarde est celle d'avant la migration : noter son nom (`ls -t backups | head -1` si besoin).

```
sudo rm -rf backend frontend docs
```

Attendu : aucune sortie.

```
sudo tar xzf gmao-v0_10_0.tar.gz --strip-components=1
```

Attendu : aucune sortie.

```
ls backend/src/oidc.js frontend/dist/index.html
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

Attendu : `[DB] Migration 009_sso appliquée` puis `[APP] API 0.10.0 sur le port 3001`.

```
sudo docker compose ps
```

Attendu : `gmao-api` et `gmao-web` en `Up (healthy)`.

```
curl -sk https://localhost:18443/api/version
```

Attendu : `{"data":{"version":"0.10.0"},"meta":{"envelope":1,"version":"0.10.0"}}`

```
curl -sk https://localhost:18443/api/auth/config
```

Attendu : `{"data":{"mode":"local","microsoft":false,"installed":true},"meta":{"envelope":1,"resource":"auth"}}` (mode local tant que rien n'est réglé).

```
exit
```

Attendu : retour à l'invite du cmd du PC.

Retour arrière : mêmes commandes avec `gmao-v0_9_1.tar.gz`, sans restaurer la base : la 0.9.1 ignore les colonnes, la table et les réglages nouveaux (essayé dans le bac à sable : connexion par mot de passe, comptes, puis remontée en 0.10.0).

## Réglage de la connexion Microsoft (une fois)

Les identifiants Entra se saisissent dans l'écran, jamais dans une conversation ni dans un fichier.

1. **Entra ID**, dans le centre d'administration Microsoft Entra, Inscriptions d'applications, Nouvelle inscription :
   - nom « GMAO (acceptance) » ;
   - comptes de cet annuaire uniquement ;
   - URI de redirection de type Web : `https://192.0.2.10:18443/api/auth/callback`.

   Puis : noter l'ID d'application (client) et l'ID de l'annuaire (locataire) ; dans Certificats et secrets, Nouveau secret client, copier sa valeur ; dans Autorisations d'API, garder `openid`, `profile` et `email` (Microsoft Graph, déléguées), puis « Accorder un consentement d'administrateur ». Une inscription propre à la GMAO, jamais celle de Portal. Si Entra refuse l'adresse de retour, s'arrêter et le signaler.
2. **GMAO**, avec le compte administrateur, Paramètres, onglet « Connexion Microsoft » :
   - mode « Microsoft facultatif » (DV-98) ;
   - annuaire, application et secret de l'étape 1 ;
   - adresse publique `https://192.0.2.10:18443` ;
   - domaines acceptés vides ;
   - « Enregistrer ».

   L'adresse de retour affichée doit être identique à celle de l'étape 1.
3. **Compte réel**, dans Utilisateurs : créer le compte de l'agent à son adresse Microsoft 365, rôle d'instance Administrateur, entité AC (sur l'acceptance seulement, jamais dans le dépôt).

## Liste de contrôle à l'écran

Ouvrir `https://192.0.2.10:18443` dans une fenêtre de navigation privée, accepter l'avertissement du certificat.

1. **Version et note.** Avec le compte administrateur (mot de passe) : la fenêtre « Nouveautés » montre la 0.10.0 en deux lignes ; le bas du menu montre `v0.10.0`. Avec `agent.ac` : aucune fenêtre « Nouveautés ». Page de connexion : bouton « Se connecter avec Microsoft » au-dessus du mot de passe (mode facultatif).
2. **Depuis Portal, sans saisie** (section 8.6, point 1). Nouvelle fenêtre privée : se connecter à Portal avec Microsoft, puis cliquer sur la tuile de la GMAO, ou ouvrir l'adresse de la GMAO dans la même fenêtre, puis « Se connecter avec Microsoft » : l'accueil de la GMAO s'affiche sans aucune saisie, au nom du compte réel. En mode facultatif, le clic sur le bouton est attendu ; le départ automatique se contrôle au point 8.
3. **Écran précis** (point 2). Dans la même fenêtre, se déconnecter, puis ouvrir `https://192.0.2.10:18443/demandes-entite` : la page de connexion s'ouvre ; « Se connecter avec Microsoft » : c'est « Demandes de l'entité » qui s'affiche, sans saisie.
4. **Ouverture directe** (point 3). Nouvelle fenêtre privée, sans Portal : ouvrir la GMAO, « Se connecter avec Microsoft » : Microsoft demande l'adresse et le mot de passe une seule fois, puis l'accueil s'affiche.
5. **Déconnexion** (point 4). « Se déconnecter » : « Vous êtes déconnecté », sans retour automatique chez Microsoft ; Portal, dans un autre onglet de la même fenêtre, reste connecté.
6. **Retour vers un autre site refusé** (point 5). Dans la même fenêtre, ouvrir `https://192.0.2.10:18443/api/auth/sso/start?next=https://exemple.com` : retour sur l'accueil de la GMAO, jamais sur `exemple.com`.
7. **Paramètre interdit absent** (point 7). Outils du navigateur (F12), onglet Réseau, « Conserver le journal » coché ; « Se connecter avec Microsoft » ; ligne `authorize` vers `login.microsoftonline.com` : l'adresse contient `code_challenge_method=S256`, `state`, `nonce`, et ni `prompt` ni `max_age`.
8. **Mode obligatoire et accès de secours.**
   - Utilisateurs : l'étiquette « Microsoft » est sur le compte réel.
   - Paramètres, « Microsoft obligatoire », « Enregistrer » : accepté (le compte réel est rattaché à Microsoft, le premier administrateur a l'accès de secours).
   - Nouvelle fenêtre privée, ouvrir la GMAO : départ vers Microsoft sans clic.
   - Ouvrir `/login?local=1` : formulaire par mot de passe ; `agent.ac` y est refusé (« Connexion par mot de passe désactivée »), l'administrateur à accès de secours entre.
   - Remettre « Microsoft facultatif ».
9. **Compte désactivé** (point 6). Avec le compte administrateur par mot de passe, Utilisateurs : désactiver le compte réel. Nouvelle fenêtre privée, « Se connecter avec Microsoft » : « Aucun compte actif ne correspond à votre compte Microsoft. Contactez l'administrateur de l'application. ». Réactiver ensuite le compte réel.
10. **Journal et néerlandais.**
    - Journal d'audit, famille « Réglages de connexion » : « Réglages de la connexion Microsoft modifiés », secret masqué (`***`).
    - Famille « Connexions » : « Connexion » avec la méthode `sso`.
    - En NL : bouton « Aanmelden met Microsoft », onglet « Microsoft-aanmelding ».

Les contrôles sur iPhone et Samsung restent pour la fin du projet (DV-80) ; la connexion Microsoft y passe par le même navigateur (DV-102).

## Liste de contrôle du standard

| Case | État |
| --- | --- |
| Aucune dépendance hors de la section 4, aucun `npm audit fix` | Coché : aucune dépendance nouvelle ; vérification du jeton sans `jwks-rsa`, comme le gabarit (E-36) |
| Versions majeures inchangées (Express 4, React 18, Vite 5, Ant Design 5, TypeScript 5, Node 20) | Coché |
| Composants d'Ant Design ; aucun ORM ; identité visuelle tenue | Coché |
| Toute ressource nouvelle a ses routes et ses outils MCP | Coché : `/api/settings/auth` et ses deux outils ; les trois routes libres de connexion n'ont pas d'outil (navigation du navigateur) |
| Schéma, contrôle de rôle, de propriété et journal sur toute écriture | Coché (`authSettings`, `userUpdate.is_admin_local` ; administrateur ; `settings.auth`, `user.update`, `sso.refused`, `sso.unknown_account`, `login.success`) |
| Migration numérotée sans perte ; contrat OpenAPI à jour | Coché : `009_sso`, testée sur une base 0.9.1 ; contrat généré des routes |
| Aucune valeur propre à un pouvoir local dans le code ; textes FR et NL | Coché : locataire, application, secret et adresse saisis à l'écran ; test de portabilité vert |
| `npm run build` et `npm run a11y` à 0 erreur ; `npm test` entiers à 0 échec | Coché (serveur 386/386, interface 174/174 sur trois lancements ; parcours `ci.yml` rejoué sous Node 20) |
| Parcours en FR, en NL, à 360, 768 et 1280 px | En partie : page de connexion, onglet de connexion et fiche des rôles contrôlés en FR et en NL par les tests d'écran (axe-core) ; navigateur réel non joué, recette sur NIXUS |
| Grille de sécurité rejouée, `docs/fr/SECURITE.md` rempli | Coché |
| `npm audit --omit=dev` sans haute ni critique | Coché : serveur 0 ; interface 3 modérées (E-09) |
| Aucune valeur de la section 6 de `GITHUB.md` dans l'archive ; `.gitignore` et `ci.yml` à jour | Coché |
| `CHANGELOG.md`, `MANIFESTE.md`, `ETAT.md`, `ECARTS-CDC.md`, notes de livraison | Coché |
| Fiche fonctionnelle, mode d'emploi, FAQ, intentions, note de version | Coché : règles 16 à 19 de `administration.md`, `socle.md` ; note de version ; aide par écran en 0.12.0 (DV-100) |

## Questions RGPD

1. Données personnelles nouvelles : **oui**, l'identifiant Microsoft de l'agent (`oid`), gardé sur sa fiche au premier passage pour le reconnaître, jamais rendu par l'API ni affiché (seulement « rattaché à Microsoft : oui ou non »). Aucune autre donnée de Microsoft n'est gardée : ni jeton, ni nom, ni photo. Le journal note une connexion refusée sans adresse.
2. Finalité nouvelle : **non**, authentification des agents, déjà portée au registre.
3. Destinataire nouveau : **oui**, Microsoft (Entra ID) reçoit la demande de connexion de l'agent, sous-traitant déjà retenu par l'AC et le CPAS pour Microsoft 365 et Portal. À porter au registre et à l'analyse d'impact par le DPO.

## Simulé ou incomplet

- Microsoft est simulé dans les tests automatiques : un faux Microsoft lancé par la suite signe ses jetons ; le vrai Entra ID n'a pas été joint depuis le bac à sable.
- Recette à faire sur NIXUS avec l'inscription réelle :
  - acceptation d'une adresse de retour en adresse IP par Entra ID ;
  - comportement du certificat auto-signé au retour de Microsoft.
- GitHub Actions n'a pas tourné : son parcours a été rejoué à la main sous Node 20.
- Images Docker non reconstruites dans le bac à sable.

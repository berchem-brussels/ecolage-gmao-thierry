# Administration : paramètres, modules, réglages de l'entité, journal d'audit et nouveautés

Version 0.14.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Régler l'application sans toucher au code et savoir qui a fait quoi (cahier des charges ADM-01, ADM-02, ADM-03 pour la structure, API-04 ; standard, sections 11, 13.1 et 17.3). L'administrateur règle l'instance : identité, langue et affichage par défaut, modules, connexion Microsoft (0.10.0). Le responsable du service technique règle son entité : contact de son service, téléphone d'urgence, délai de réouverture. Tout le monde voit les nouveautés d'une version à la première connexion qui suit la mise à jour.

## Pour qui

| Rôle | Ce qu'il fait |
| --- | --- |
| Administrateur de l'application | Règle les paramètres de l'instance et les modules ; lit le journal d'audit ; choisit la langue et les modules à l'installation |
| Responsable du service technique | Règle les réglages de son entité active |
| Toute personne connectée | Lit le contact du service technique de son entité dans Aide, Contact ; lit les nouveautés à la première connexion et dans Aide, Nouveautés |

## Règles

| N° | Règle | Source |
| --- | --- | --- |
| 1 | Les modules valent pour toute l'instance, pour toutes les entités | Décision du 22/10/2026 ; standard, section 17.3 |
| 2 | Le module des demandes fait partie du noyau et ne s'éteint pas ; un module pas encore livré se montre « À venir », sans réglage | ADM-02 |
| 3 | Patrimoine éteint : l'écran quitte le menu, l'aide et l'assistant ; la création, la modification, la désactivation des lieux et les photos sont refusées ; la lecture des lieux reste ouverte pour les demandes ; les listes de valeurs restent | Décision du 22/10/2026 |
| 4 | Un module éteint est refusé par le serveur, par l'écran comme par l'assistant (MCP), après le contrôle du rôle | Standard, section 6.2 ; API-04 |
| 5 | Chaque entité a ses propres réglages ; à défaut, la valeur livrée s'applique | ADM-03 |
| 6 | Le contact et le téléphone d'urgence sont ceux du service, jamais d'une personne | Standard, section 13.1 |
| 7 | Le journal d'audit se lit et ne se modifie pas ; il est réservé à l'administrateur parce qu'il contient des données personnelles | Décision du 22/10/2026 ; standard, section 9.2 |
| 8 | La note de version s'affiche une fois par personne, à la première connexion après la mise à jour ; un compte nouveau ne voit pas la note de la version en cours | Décision du 22/10/2026 ; standard, section 13.1 |
| 9 | Chaque réglage s'applique sans redémarrage et s'inscrit au journal avec son auteur, l'ancienne et la nouvelle valeur | Standard, section 17.3 |
| 10 | La modification d'une catégorie, d'un congé, d'une fermeture, d'un lieu, d'une valeur de liste ou d'une entité ne note que les champs changés, avec l'ancienne (« avant ») et la nouvelle (« après ») valeur, et de quoi reconnaître la fiche ; un enregistrement sans changement n'ajoute aucune ligne (0.4.1) | DV-04, DV-35 |
| 11 | Les mentions d'information RGPD et le contact du DPO se règlent par entité dans Réglages de l'entité, groupe « Protection des données » ; seules les variables `{entite}` et `{dpo}` sont permises ; sans DPO, la mention renvoie au responsable (0.7.0) ; la mention complète livrée commence par « Responsable du traitement : » suivi du nom de l'entité (0.7.1) | RGPD-10, DV-65, écart E-28 |
| 12 | Dans le détail du journal, un lieu ou une catégorie désigné par son identifiant s'affiche par son code et son nom actuels, dans la langue de l'écran, l'identifiant entre parenthèses ; les noms sont lus à l'affichage, le journal enregistré ne change pas ; le bénéficiaire d'une demande reste un identifiant (0.7.4) ; une case à cocher s'affiche « Oui » ou « Non », un champ vide est masqué sauf « Avant » et « Après », où il se dit « aucun » (0.7.5) | DV-50, DV-73, DV-76 |
| 13 | Les pièces jointes des demandes se règlent par entité dans Réglages de l'entité, groupe « Pièces jointes des demandes » : nombre par demande (0 à 10, 5 livré ; 0 retire le bloc du formulaire), taille d'un fichier (1 à 10 Mo, 10 livré), formats (photos et PDF, ou photos seulement) ; un changement vaut pour les pièces ajoutées ensuite. Le journal d'audit note l'ajout, la suppression et l'effacement automatique d'une pièce, sans nom de fichier (0.8.0) | DV-83, DV-84 |
| 14 | Dans le filtre du journal, chaque famille d'actions a son nom en FR et en NL (Pièces jointes, Demandes, Catégories, Priorités et délais, Horaire, Congés et fermetures, Système, Vues enregistrées) ; Réglages de l'entité montre tous les groupes du catalogue, « Pièces jointes des demandes » compris (0.9.0, contrôle 7 de la recette de la 0.8.0) | DV-86 |
| 15 | Dans le détail d'une ligne du journal, l'état d'une demande (« Avant », « Après ») s'affiche par son libellé du service technique dans la langue de l'écran (« À qualifier », « Qualifiée ») ; un code inconnu reste affiché tel quel (0.9.1) | DV-94 |
| 16 | Trois modes de connexion : comptes locaux (mot de passe seul), Microsoft facultatif (les deux), Microsoft obligatoire (départ automatique vers Microsoft, mot de passe pour l'accès de secours seulement). Un agent venu de Portal entre sans nouvelle saisie ; après « Se déconnecter », après une erreur de connexion et par l'accès de secours, aucun départ automatique (0.10.0) | Standard, section 8.6 ; DV-96, DV-98 |
| 17 | Un compte se reconnaît d'abord par son identifiant Microsoft, gardé au premier passage, puis par son adresse ; un compte inconnu ou désactivé est refusé avec « Contactez l'administrateur de l'application » ; un compte désactivé perd sa session tout de suite (0.10.0) | Standard, section 8.6 |
| 18 | Le mode Microsoft obligatoire est refusé tant qu'aucun administrateur actif ne peut se connecter (accès de secours ou compte rattaché à Microsoft) ; en mode obligatoire, le dernier accès de secours d'un tel administrateur ne se retire pas. Le premier administrateur créé à l'installation reçoit l'accès de secours (0.10.0) | Standard, section 8.6 |
| 19 | L'annuaire, l'application, le secret et l'adresse publique se saisissent à l'écran, jamais dans le code ; le secret est chiffré, jamais réaffiché ni écrit en clair au journal (`***`) ; une inscription Entra ID propre à l'application, jamais celle de Portal (0.10.0) | Standard, sections 5 et 8.6 |

## Écrans

| Écran | Contenu | Actions | Messages |
| --- | --- | --- | --- |
| Administration, Paramètres, onglet Identité et affichage | Nom de l'application et du pouvoir local en FR et NL, contact du support ; langue et niveau de détail par défaut, en boutons. Pour chaque réglage : explication, mention « Valeur par défaut » ou valeur livrée | « Enregistrer » par bloc ; « Revenir à la valeur livrée » | « Enregistré », « Aucun changement à enregistrer », « Ce réglage est obligatoire » |
| Administration, Paramètres, onglet Connexion Microsoft (0.10.0) | Mode en boutons (Comptes locaux, Microsoft facultatif, Microsoft obligatoire) ; annuaire (locataire), identifiant de l'application, secret client (vide, « Un secret est enregistré » s'il l'est), adresse publique, domaines acceptés ; adresse de retour à déclarer dans Entra ID, à copier | « Enregistrer » | « Enregistré » ; « Mode Microsoft obligatoire refusé : aucun administrateur actif ne pourrait encore se connecter. » |
| Utilisateurs, « Rôles » (0.10.0) | Case « Accès de secours par mot de passe » sous le rôle d'instance d'un administrateur ; étiquettes « Microsoft » (compte rattaché) et « Accès de secours » dans la liste | « Enregistrer » | Même refus en mode obligatoire |
| Page de connexion (0.10.0) | « Se connecter avec Microsoft » ; mot de passe en mode local et facultatif, ou par l'accès de secours ; en mode obligatoire, « Connexion avec votre compte Microsoft… » puis départ | | « Vous êtes déconnecté. » ; erreurs de connexion Microsoft traduites (configuration, délai, refus, réponse non vérifiée, domaine, compte inconnu) ; « Connexion par mot de passe désactivée : utilisez votre compte Microsoft. » |
| Administration, Paramètres, onglet Modules | Onze modules : nom, description, état (Noyau, Actif, Éteint, À venir avec l'étape prévue) | Interrupteur ; extinction confirmée avec ce qui se ferme | « Module éteint », « Module activé » |
| Réglages du service, Réglages de l'entité | Code de l'entité active ; contact du service technique (nom FR et NL, téléphone, adresse électronique) ; téléphone d'urgence ; délai de réouverture en jours ; pièces jointes des demandes (nombre, taille, formats, 0.8.0) | « Enregistrer » par bloc ; « Revenir à la valeur livrée » | « Numéro de téléphone invalide », « Adresse électronique invalide » |
| Administration, Journal d'audit | Date à l'heure locale, personne ou « Système », action en clair, entité ; en mode Complet, objet et canal | Filtres action ou famille, personne, entité, période, canal ; « Effacer les filtres » ; déplier une ligne pour son détail ; un lieu ou une catégorie y est nommé par son code et son nom, l'identifiant entre parenthèses, « fiche introuvable » s'il n'existe plus (0.7.4) | « Aucune ligne pour ces filtres » |
| Fenêtre « Nouveautés de la version » | Lignes de la note pour la personne | « J'ai lu » | |
| Aide, onglets Nouveautés et Contact | Toutes les notes ; contact du service technique de l'entité active et support informatique | | « Le responsable du service technique n'a pas encore renseigné de contact pour cette entité » |
| Assistant d'installation | Langue par défaut, modules disponibles cochés par défaut | | |

## Paramètres et défauts

| Réglage | Défaut livré | Fichier |
| --- | --- | --- |
| Nom de l'application FR et NL | Gestion technique, Technisch beheer | `backend/config/instance.defaut.json` |
| Nom du pouvoir local FR et NL | Saisi à l'installation | idem |
| Contact du support | Service IT | idem |
| Langue par défaut | Français | idem |
| Niveau de détail par défaut | Simple | idem |
| Modules | Tous actifs sauf le portail public | `backend/config/modules.json` |
| Contact du service technique, téléphone d'urgence | Vides | `backend/config/parametres-entite.json` |
| Délai de réouverture | 7 jours (0 à 90), comptés depuis la clôture (0.14.0) | idem |
| Motifs d'attente qui suspendent le délai (0.14.0) | « Réponse du demandeur attendue », « Accès impossible » (cases parmi les motifs d'attente actifs de l'entité) | idem |
| Attente longue (0.14.0) | 5 jours ouvrables (1 à 60) | idem |
| Contact du DPO, mentions d'information courte et complète FR et NL (0.7.0, RGPD-10) | DPO vide ; textes livrés (mission d'intérêt public, art. 6.1.e), variables `{entite}` et `{dpo}` ; un texte vidé revient au texte livré | idem, groupe `rgpd` |
| Notes de version | Une note par version | `backend/config/notes-version.json` |
| Connexion (0.10.0) | Comptes locaux ; annuaire, application, secret, adresse et domaines vides | En base (`app_settings`, clés `auth.*`), saisis à l'écran ; défauts dans `backend/src/settings.js` |

## Données et conservation

Aucune donnée personnelle nouvelle dans les paramètres : le contact est celui d'un service. Le journal d'audit, déjà tenu depuis la 0.1.0, note en plus l'entité concernée ; il contient le nom des personnes et l'heure de leurs actions et connexions. Sa durée de conservation sera fixée avec les autres durées (D-09, étape 41). La dernière note de version lue est notée sur chaque compte. Depuis la 0.10.0 : identifiant Microsoft de l'agent (`oid`), gardé sur sa fiche au premier passage, jamais rendu ni affiché ; état d'une connexion Microsoft en cours (aléas, chemin de retour), effacé au retour ou après 15 minutes ; aucun jeton Microsoft gardé.

## Échanges

| Canal | Contenu |
| --- | --- |
| API | `/api/parametres`, `/api/modules`, `/api/parametres-entite`, `/api/audit` (lecture), `/api/notes-version`, `PUT /api/auth/nouveautes` ; `/api/settings/auth` (0.10.0) ; routes libres `/api/auth/config`, `/api/auth/sso/start`, `/api/auth/callback` |
| MCP | Un outil par route ; retours à la valeur livrée en deux appels ; outils d'un module éteint retirés ; `get_auth_settings`, `update_auth_settings` en deux appels (0.10.0) |
| Microsoft Entra ID (0.10.0) | Demande de connexion de l'agent (OpenID Connect, code d'autorisation avec PKCE) ; retour du jeton d'identité, vérifié puis oublié |
| Webhooks, imports, exports | Aucun dans cette version |

## Limites

- Couleurs, logo et icône de l'institution ne se règlent pas encore à l'écran.
- Courriel, export de la configuration et écran « Mon affichage » arrivent à leurs étapes. Lecture de l'annuaire Microsoft (création des comptes, lot L6) et OAuth 2.1 du MCP (E-10) à venir : un agent doit avoir un compte dans la GMAO pour entrer avec Microsoft.
- Le téléphone d'urgence sert depuis la 0.7.0 (case « Danger ») ; le délai de réouverture, les motifs suspensifs et l'attente longue depuis la 0.14.0.
- Seul le module Patrimoine se règle : les autres modules ne sont pas encore livrés.

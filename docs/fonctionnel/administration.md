# Administration : paramètres, modules, réglages de l'entité, journal d'audit et nouveautés

Version 0.7.1 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Régler l'application sans toucher au code et savoir qui a fait quoi (cahier des charges ADM-01, ADM-02, ADM-03 pour la structure, API-04 ; standard, sections 11, 13.1 et 17.3). L'administrateur règle l'instance : identité, langue et affichage par défaut, modules. Le responsable du service technique règle son entité : contact de son service, téléphone d'urgence, délai de réouverture. Tout le monde voit les nouveautés d'une version à la première connexion qui suit la mise à jour.

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

## Écrans

| Écran | Contenu | Actions | Messages |
| --- | --- | --- | --- |
| Administration, Paramètres, onglet Identité et affichage | Nom de l'application et du pouvoir local en FR et NL, contact du support ; langue et niveau de détail par défaut, en boutons. Pour chaque réglage : explication, mention « Valeur par défaut » ou valeur livrée | « Enregistrer » par bloc ; « Revenir à la valeur livrée » | « Enregistré », « Aucun changement à enregistrer », « Ce réglage est obligatoire » |
| Administration, Paramètres, onglet Modules | Onze modules : nom, description, état (Noyau, Actif, Éteint, À venir avec l'étape prévue) | Interrupteur ; extinction confirmée avec ce qui se ferme | « Module éteint », « Module activé » |
| Réglages du service, Réglages de l'entité | Code de l'entité active ; contact du service technique (nom FR et NL, téléphone, adresse électronique) ; téléphone d'urgence ; délai de réouverture en jours | « Enregistrer » par bloc ; « Revenir à la valeur livrée » | « Numéro de téléphone invalide », « Adresse électronique invalide » |
| Administration, Journal d'audit | Date à l'heure locale, personne ou « Système », action en clair, entité ; en mode Complet, objet et canal | Filtres action ou famille, personne, entité, période, canal ; « Effacer les filtres » ; déplier une ligne pour son détail | « Aucune ligne pour ces filtres » |
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
| Délai de réouverture | 7 jours (0 à 90) | idem |
| Contact du DPO, mentions d'information courte et complète FR et NL (0.7.0, RGPD-10) | DPO vide ; textes livrés (mission d'intérêt public, art. 6.1.e), variables `{entite}` et `{dpo}` ; un texte vidé revient au texte livré | idem, groupe `rgpd` |
| Notes de version | Une note par version | `backend/config/notes-version.json` |

## Données et conservation

Aucune donnée personnelle nouvelle dans les paramètres : le contact est celui d'un service. Le journal d'audit, déjà tenu depuis la 0.1.0, note en plus l'entité concernée ; il contient le nom des personnes et l'heure de leurs actions et connexions. Sa durée de conservation sera fixée avec les autres durées (D-09, étape 41). La dernière note de version lue est notée sur chaque compte.

## Échanges

| Canal | Contenu |
| --- | --- |
| API | `/api/parametres`, `/api/modules`, `/api/parametres-entite`, `/api/audit` (lecture), `/api/notes-version`, `PUT /api/auth/nouveautes` |
| MCP | Un outil par route ; retours à la valeur livrée en deux appels ; outils d'un module éteint retirés |
| Webhooks, imports, exports | Aucun dans cette version |

## Limites

- Couleurs, logo et icône de l'institution ne se règlent pas encore à l'écran.
- Courriel, connexion Microsoft, export de la configuration et écran « Mon affichage » arrivent à leurs étapes.
- Le téléphone d'urgence et le délai de réouverture sont enregistrés mais ne servent qu'aux étapes 7 et 9.
- Seul le module Patrimoine se règle : les autres modules ne sont pas encore livrés.

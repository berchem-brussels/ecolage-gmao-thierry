# Référentiel des demandes : catégories, priorités, délais et calendrier

Version 0.7.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Préparer ce dont la demande d'intervention aura besoin dès l'étape 5 : les catégories que le demandeur choisira en tuiles, la priorité qu'elles proposent, les délais de chaque priorité et le calendrier qui sert à les compter (cahier des charges REF-06, PRI-01 pour la priorité proposée, PRI-02, ADM-03 ; décision D-11 : défauts du cahier des charges en attendant l'atelier métier). Chaque entité a son référentiel, réglé par le responsable de son service technique.

## Pour qui

| Rôle | Ce qu'il fait |
| --- | --- |
| Responsable du service technique | Règle les catégories, les priorités et leurs délais, l'horaire, les congés et les fermetures de son entité active ; calcule une échéance avec le simulateur |
| Toute personne qui a un rôle dans l'entité | Lit les catégories, les priorités, l'horaire et les jours non ouvrés (les demandeurs verront les tuiles et le délai annoncé à partir de l'étape 5) ; lit dans l'aide comment un délai est compté |
| Administrateur de l'application | Aucun accès métier d'office ; voit les changements au journal d'audit |

## Règles

| N° | Règle | Source |
| --- | --- | --- |
| 1 | Deux niveaux de catégories : un domaine, puis ses natures. Une nature se range sous un domaine actif de la même entité et peut en changer | REF-06 |
| 2 | Un domaine porte toujours sa priorité par défaut et son circuit (envoi direct ou validation du chef de service). Une nature les reprend de son domaine, ainsi que le délai propre, quand elle n'en a pas | REF-06, DEM-15 |
| 3 | Un domaine qui a des natures actives ne se désactive pas ; une nature ne se réactive pas sous un domaine désactivé. Une catégorie désactivée n'est plus proposée ; les demandes qui la portent la gardent | REF-08 |
| 4 | Arbre livré : 8 domaines, 27 natures, le même pour l'AC et le CPAS | Décision du 22/10/2026 |
| 5 | P1 compte en heures calendaires, nuit et week-end compris ; P2 à P4 en jours ouvrables de l'entité | Décision du 22/10/2026 |
| 6 | L'horaire qui fait foi pour les délais est celui des ouvriers du service technique. AC : du lundi au jeudi 07:45-16:15, le vendredi 07:45-12:00. CPAS : du lundi au vendredi 08:00-16:30. Le week-end ne compte pas | Décision du 22/10/2026 |
| 7 | La garde et les horaires des équipes (dont les balayeurs, qui travaillent le week-end) ne jouent pas sur les délais de cette version ; ils viennent aux étapes 15 et 17 | Décision du 22/10/2026 |
| 8 | Jours non ouvrés : les dix jours fériés légaux, calculés chaque année ; les congés de l'entité, répétés chaque année (livrés : 8 mai, 27 septembre, 2 novembre, 15 novembre, 26 décembre) ; les fermetures, d'un an au plus | Décision du 22/10/2026 |
| 9 | Une demande reçue hors des heures ouvrables commence à compter à l'ouverture suivante | Décision du 22/10/2026 |
| 10 | N jours ouvrables tombent à la même heure, N jours ouvrés plus tard ; si cette heure dépasse la fermeture du jour d'arrivée, l'échéance est l'heure de fermeture | Décision du 22/10/2026 |
| 11 | Les heures ouvrables ne comptent que le temps d'ouverture ; les heures calendaires comptent tout | Décision du 22/10/2026 |
| 12 | Le délai propre d'une catégorie remplace le délai de fin d'une priorité comptée en jours ouvrables ; il est ignoré pour une priorité comptée en heures | REF-06, PRI-02 |
| 13 | La fin d'une priorité sans délai de fin se fixe à une date convenue avec le demandeur (P4 livrée ainsi) | Cahier des charges, section 8.2 |
| 14 | Toutes les heures sont celles de Bruxelles, heure d'été comprise | PRI-02 |
| 15 | Chaque changement s'applique aussitôt et s'inscrit au journal d'audit avec l'entité ; un retour aux valeurs livrées est possible pour une priorité et pour l'horaire d'un jour | Standard, section 17.3 |
| 16 | Le journal ne note que les champs changés, avec l'ancienne et la nouvelle valeur ; un enregistrement sans changement n'écrit rien (0.4.1) | DV-04, recette du 23/10/2026 |
| 17 | Chaque fiche (catégorie, priorité, jour de l'horaire, congé, fermeture) porte « Modifié le JJ/MM/AAAA à HH:MM par <nom> », « Créé le … » pour une fiche ajoutée et jamais modifiée, « Valeur livrée, rétablie le … » après un retour aux valeurs livrées, ou « Valeur livrée ». Le nom n'est rendu qu'aux personnes de l'entité ; sinon la date seule (0.4.1) | DV-34, recette du 23/10/2026 |
| 18 | Questions du formulaire (0.7.0) : sur la fiche d'un domaine ou d'une nature, « Oui ou non » ou un choix parmi 2 à 6 réponses, FR et NL, facultatives sauf « Obligatoire », dix actives au plus, rangées par flèches, désactivées avec un motif ; une nature pose d'abord celles de son domaine ; l'aperçu des tuiles les montre ; trois questions livrées (plomberie, prises, chauffage), à adapter en atelier | DEM-05, DV-62, D-11 |

## Écrans

| Écran | Contenu | Actions | Messages |
| --- | --- | --- | --- |
| Réglages du service, Catégories et délais, onglet Catégories | Arbre en tableau dépliable : pictogramme, libellé, priorité en vigueur ; en mode Complet, circuit, délai propre, code. Aperçu des tuiles du demandeur : domaines, puis natures du domaine choisi | « Nouveau domaine » ; fiche : libellés FR et NL, pictogramme, priorité, circuit, délai propre, domaine (nature), « Nouvelle nature », désactivation avec motif, réactivation ; « Afficher les catégories désactivées » | « Ce code est déjà utilisé… », « Ce domaine contient encore des natures actives… », « Le domaine est désactivé… » |
| Onglet Priorités et délais | Une carte par priorité : libellés et descriptions FR et NL, décompte en boutons, prise en charge, fin, « Date convenue », couleur, valeurs livrées | « Enregistrer », « Revenir aux valeurs livrées » | « Délais incohérents… » |
| Onglet Calendrier | Horaire des sept jours ; jours fériés de l'année précédente, en cours et suivante ; congés et fermetures avec leur date en toutes lettres | Interrupteur « Ouvré », heures de début et de fin, « Enregistrer » ; « Créer » un congé ou une fermeture ; désactivation avec motif, réactivation | « Horaire invalide… », « Ce congé existe déjà… » |
| Onglet Simulateur | Priorité ou catégorie, date et heure de réception | « Calculer » : début du décompte, prise en charge, fin ou date convenue, origine du délai | « Aucun jour ouvré dans le calendrier de l'entité… » |
| Aide, Mode d'emploi et FAQ | Rubrique « Délais des demandes » pour tous, rubrique « Catégories et délais » pour le responsable ; quatre questions (la quinzième, sur la mention « Modifié le … par … », en 0.4.1) | | |

## Paramètres et défauts

| Réglage | Défaut livré | Fichier |
| --- | --- | --- |
| Catégories et pictogrammes | 8 domaines, 27 natures, 29 pictogrammes | `backend/config/categories.json` |
| Priorités | P1 Sécurité 1 h et 4 h calendaires ; P2 Urgente 1 et 2 jours ouvrables ; P3 Normale 2 et 10 ; P4 Planifiable 5 et date convenue | `backend/config/priorites.json` |
| Horaire | AC et CPAS selon la règle 6 ; autre entité : du lundi au vendredi 08:00-16:30 | `backend/config/calendrier.json` |
| Jours fériés et congés | Règle 8 | idem |

## Données et conservation

Aucune donnée personnelle nouvelle : catégories, priorités, horaires et jours non ouvrés sont des réglages de service. L'auteur de chaque réglage est noté sur la ligne et au journal d'audit, déjà tenu. Pas de durée de conservation propre.

## Échanges

| Canal | Contenu |
| --- | --- |
| API | `/api/categories` (et `/arbre`, `/:id/questions`), `/api/questions-categorie/:id`, `/api/priorites`, `/api/horaires`, `/api/jours-non-ouvres`, `/api/jours-feries`, `GET /api/echeances/simulation` |
| MCP | Un outil par route (25 outils exposés en 0.4.0, plus six pour les questions en 0.7.0) ; désactivation et retour aux valeurs livrées en deux appels ; `simuler_echeance` en lecture |
| Webhooks, imports, exports | Aucun dans cette version ; la GRC lira les catégories à l'étape 38 |

## Limites

- Le circuit de validation est enregistré ; la validation par le chef de service s'applique à l'étape 11.
- L'échéance s'affichera sur les fiches à l'étape 8 ; la suspension du décompte pendant une attente (PRI-03) aussi.
- Le corps de métier par défaut (REF-06) vient avec l'étape 15 ; les questions par catégorie (DEM-05) sont livrées en 0.7.0.
- Les valeurs livrées sont celles du cahier des charges en attendant l'atelier métier (D-11).

# Service technique : tableau de bord, liste et qualification des demandes

Version 0.9.1 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Donner au gestionnaire technique et au responsable du service technique de chaque entité une file de tri : voir d'un coup d'œil ce qui presse, retrouver une demande par ses filtres et la qualifier sur un seul écran (cahier des charges GES-01, GES-02, GES-04, PRI-01, PRI-03).

## Pour qui

| Rôle | Ce qu'il fait |
| --- | --- |
| Gestionnaire technique, responsable du service technique | Lit le tableau de bord, filtre et trie la liste, enregistre ses vues, qualifie les demandes de l'entité active |
| Demandeur, bénéficiaire, personne qui suit | Voit l'état « Prise en charge » et le délai mis à jour ; ne voit ni les consignes, ni le motif, ni l'échéance de prise en charge |
| Administrateur de l'application | Voit les qualifications au journal d'audit |

## Parcours

1. À l'accueil, le tableau de bord compte les demandes à qualifier, en retard, P1 et P2 ouvertes, et celles dont l'échéance tombe dans les deux jours ouvrés. Un clic ouvre « Demandes de l'entité » avec le filtre correspondant, triée par échéance.
2. La liste se filtre par échéance, état, priorité, catégorie, site ou bâtiment, source et danger ; la recherche porte sur le numéro, la description, le lieu et le demandeur. Un clic sur un titre de colonne trie. Les filtres restent dans l'adresse de la page ; « Enregistrer la vue » les garde sous un nom.
3. Un clic sur un numéro ouvre la fiche : échéances de prise en charge et de fin, « En retard » en rouge et en mots.
4. « Qualifier » : catégorie et lieu vérifiés ou précisés, priorité proposée confirmée ou changée avec un motif, durée estimée, date convenue pour une priorité sans délai de fin, consignes à l'ouvrier, photos du service visibles ou non par le demandeur. La demande passe à « Qualifiée » ; ses échéances sont recalculées.

## Règles

| N° | Règle | Origine |
| --- | --- | --- |
| 1 | Échéances enregistrées sur chaque demande au dépôt et recalculées à chaque qualification, toujours depuis la réception, selon le calendrier de l'entité | DV-88, PRI-03 |
| 2 | L'échéance qui compte est la prise en charge tant que la demande est « À qualifier », puis la fin des travaux ; en retard quand elle est passée et que la demande est en cours (ni fermée, ni « Terminée ») | DV-89, PRI-03 |
| 3 | Qualifier demande la permission du gestionnaire ou du responsable ; une demande « À qualifier » passe « Qualifiée » ; une demande « Qualifiée » se qualifie de nouveau ; les autres états attendent le cycle de vie (étape 9) | DV-90, GES-04 |
| 4 | Priorité proposée : celle de la catégorie, ou P1 si un danger est signalé ; la changer exige un motif, gardé sur la fiche ; revenir à la priorité proposée efface le motif | DV-91, PRI-01 |
| 5 | Date convenue seulement pour une priorité sans délai de fin (P4 livrée), d'aujourd'hui à deux ans ; elle devient l'échéance de fin | DV-90 |
| 6 | Consignes, motif, durée et auteur de la qualification sont internes au service technique ; le journal note un changement de consignes ou de motif sans leur texte | DV-90, RGPD-07 |
| 7 | Tableau de bord : quatre compteurs, chacun égal au total de la liste filtrée qu'il ouvre ; « dans les deux jours ouvrés » suit le calendrier de l'entité ; sur « Demandes de l'entité », les compteurs se rechargent après chaque qualification, sans recharger la page (0.9.1) | DV-92, DV-94, GES-01 |
| 8 | Vues enregistrées : à chaque personne dans chaque entité, vingt au plus, noms distincts ; personne d'autre ne les voit ; la suppression d'une vue ne touche aucune demande | DV-93, GES-02 |

## Écrans

| Écran | Contenu | Actions | Messages |
| --- | --- | --- | --- |
| Accueil (service technique) | Tableau de bord, quatre compteurs | Un clic ouvre la liste filtrée | |
| Demandes de l'entité | Tableau de bord ; filtres et vues (repliés sur téléphone) ; colonnes numéro, priorité, état, échéance, quoi, où, demandeur, date de dépôt | Filtrer, trier, enregistrer, remplacer ou supprimer une vue, ouvrir une fiche | « Aucune demande pour ces filtres. » |
| Fiche d'une demande (service) | État du service, priorité et motif, échéances, description, pièces jointes, demandeur, durée estimée, consignes, qualifiée le … par … | « Qualifier » ou « Modifier la qualification » | |
| Qualifier la demande | Catégorie, priorité en boutons avec la proposition, motif, lieu, durée, date convenue, consignes, photos visibles | « Qualifier » ou « Enregistrer », « Annuler » | « Vous changez la priorité proposée : indiquez le motif. », « Demande qualifiée » |

## Données personnelles

Aucune donnée personnelle nouvelle sur le demandeur. La qualification ajoute le nom de la personne qui qualifie (lu par le service technique), les consignes à l'ouvrier et le motif d'un changement de priorité (consigne : décrire le travail, pas les personnes). Les vues enregistrées ne contiennent que des filtres. Rien n'est envoyé hors de l'application.

## Ce qui vient ensuite

Compteurs « en attente depuis N jours » et « à clôturer », suspension du délai pendant « En attente », refus, clôture (étape 9) ; commentaires internes et modèles de réponse (étape 10) ; création par le gestionnaire, fusion, vue en colonnes (étape 12) ; alerte de retard par courriel (étape 13) ; corps de métier et équipes, filtres par équipe et par ouvrier (étapes 15 et 16) ; affectation et planning (étapes 16 et 17) ; tâches (étape 21).

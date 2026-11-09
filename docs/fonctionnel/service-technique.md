# Service technique : tableau de bord, liste, qualification et cycle de vie des demandes

Version 0.14.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

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
5. Depuis la 0.14.0, la fiche porte les boutons des passages permis : « Démarrer les travaux », « Mettre en attente » (motif), « Sortir de l'attente » ou « Reprendre les travaux », « Travaux terminés », « Clôturer » (cause de la panne, compte rendu interne), « Refuser » (motif), « Annuler la demande » ; puis l'historique complet.

## Règles

| N° | Règle | Origine |
| --- | --- | --- |
| 1 | Échéances enregistrées sur chaque demande au dépôt et recalculées à chaque qualification, toujours depuis la réception, selon le calendrier de l'entité | DV-88, PRI-03 |
| 2 | L'échéance qui compte est la prise en charge tant que la demande est « À qualifier », puis la fin des travaux ; en retard quand elle est passée et que la demande est en cours (ni fermée, ni « Terminée ») | DV-89, PRI-03 |
| 3 | Qualifier demande la permission du gestionnaire ou du responsable ; une demande « À qualifier » ou « Rouverte » passe « Qualifiée » ; une demande « Qualifiée » se qualifie de nouveau (0.14.0 : seule voie vers « Qualifiée ») | DV-90, GES-04 |
| 4 | Priorité proposée : celle de la catégorie, ou P1 si un danger est signalé ; la changer exige un motif, gardé sur la fiche ; revenir à la priorité proposée efface le motif | DV-91, PRI-01 |
| 5 | Date convenue seulement pour une priorité sans délai de fin (P4 livrée), d'aujourd'hui à deux ans ; elle devient l'échéance de fin | DV-90 |
| 6 | Consignes, motif, durée et auteur de la qualification sont internes au service technique ; le journal note un changement de consignes ou de motif sans leur texte | DV-90, RGPD-07 |
| 7 | Tableau de bord : quatre compteurs (six depuis la 0.14.0), chacun égal au total de la liste filtrée qu'il ouvre ; « dans les deux jours ouvrés » suit le calendrier de l'entité ; sur « Demandes de l'entité », les compteurs se rechargent après chaque qualification, sans recharger la page (0.9.1) | DV-92, DV-94, GES-01 |
| 8 | Vues enregistrées : à chaque personne dans chaque entité, vingt au plus, noms distincts ; personne d'autre ne les voit ; la suppression d'une vue ne touche aucune demande | DV-93, GES-02 |
| 9 | Passages d'un état à l'autre en données (`config/cycle-de-vie.json`), permission `demandes:traiter` (gestionnaire, responsable) ; tout passage absent est refusé ; « Planifiée » et « Confiée à un prestataire » restent fermés jusqu'aux étapes 15, 17 et 21 ; jusqu'à l'interface des ouvriers (étape 18), le gestionnaire passe lui-même « En cours » et « Terminée » (0.14.0) | CYC-01, DV-118 |
| 10 | Motif exigé pour une attente (motifs d'attente), un refus (motifs de refus) et la clôture (cause de la panne) ; commentaire selon le passage, lu par le demandeur seulement quand le passage le dit ; compte rendu de clôture interne ; le journal note qu'un commentaire ou un compte rendu a été donné, jamais son texte (0.14.0) | CYC-01, CLO-01, RGPD-07 |
| 11 | Historique de chaque passage (de, vers, qui, quand, canal, motif, commentaire), jamais modifié ni effacé (0.14.0) | CYC-02, CYC-05 |
| 12 | Une attente pour un motif coché dans Réglages de l'entité suspend le délai (« Délai suspendu », jamais « En retard ») ; à la sortie, l'échéance de fin est repoussée du temps suspendu, en temps ouvrable (calendaire pour P1) ; une date convenue ne bouge pas (0.14.0) | PRI-03, DV-119 |
| 13 | Compteurs « En attente depuis plus de N jours ouvrés » (N réglé par l'entité, 5 livré) et « À clôturer (travaux terminés) », chacun égal au total de la liste filtrée ; « À qualifier » compte aussi les demandes rouvertes (0.14.0) | GES-01, DV-92 |
| 14 | Une demande rouverte par le demandeur revient « Rouverte », à requalifier ; ses délais repartent de la réouverture et son temps suspendu est remis à zéro ; le service ne rouvre pas à la place du demandeur (0.14.0) | SUI-06 |

## Écrans

| Écran | Contenu | Actions | Messages |
| --- | --- | --- | --- |
| Accueil (service technique) | Tableau de bord, quatre compteurs | Un clic ouvre la liste filtrée | |
| Demandes de l'entité | Tableau de bord ; filtres et vues (repliés sur téléphone) ; colonnes numéro, priorité, état, échéance, quoi, où, demandeur, date de dépôt | Filtrer, trier, enregistrer, remplacer ou supprimer une vue, ouvrir une fiche | « Aucune demande pour ces filtres. » |
| Fiche d'une demande (service) | État du service, priorité et motif, échéances, lieu et, sous lui, la photo de l'endroit (0.13.0 : celle du lieu ; à défaut, celle du plus proche lieu au-dessus, dite comme telle ; agrandie au toucher), description, pièces jointes, demandeur, durée estimée, consignes, qualifiée le … par … | « Qualifier » ou « Modifier la qualification » | |
| Qualifier la demande | Photo de l'endroit en tête (0.13.0), catégorie, priorité en boutons avec la proposition, motif, lieu, durée, date convenue, consignes, photos visibles | « Qualifier » ou « Enregistrer », « Annuler » | « Vous changez la priorité proposée : indiquez le motif. », « Demande qualifiée » |
| Volet d'une demande, actions et historique (0.14.0) | Boutons des passages permis ; formulaire du passage (motif en liste, commentaire, case « Lu par le demandeur » selon le passage, compte rendu à la clôture) ; compléments et avis du demandeur ; historique | Passer à l'état choisi | Refus du serveur affiché, saisie gardée |

## Données personnelles

Aucune donnée personnelle nouvelle sur le demandeur. La qualification ajoute le nom de la personne qui qualifie (lu par le service technique), les consignes à l'ouvrier et le motif d'un changement de priorité (consigne : décrire le travail, pas les personnes). Les vues enregistrées ne contiennent que des filtres. La photo de l'endroit (0.13.0) est une photo de lieu déjà en base, sans personne (DV-12), montrée au seul service technique. Depuis la 0.14.0 : auteur et heure de chaque passage, commentaire et compte rendu (textes libres : décrire le travail, pas les personnes), lus par le service ; le demandeur lit les seuls commentaires qui lui sont destinés. Rien n'est envoyé hors de l'application.

## Ce qui vient ensuite

Compteurs « en attente » et « à clôturer », suspension, refus, clôture : faits en 0.14.0 ; commentaires internes et modèles de réponse (étape 10) ; création par le gestionnaire, fusion, vue en colonnes (étape 12) ; alerte de retard par courriel (étape 13) ; corps de métier et équipes, filtres par équipe et par ouvrier (étapes 15 et 16) ; affectation et planning (étapes 16 et 17) ; tâches (étape 21).

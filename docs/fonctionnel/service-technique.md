# Service technique : tableau de bord, liste, qualification et cycle de vie des demandes

Version 0.16.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

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
| 15 | Fil de messages (0.15.0) : le service (« demandes:traiter ») répond au demandeur ou écrit une note interne, jamais montrée au demandeur, à la GRC ni par l'assistant au demandeur ; les noms des agents ne sont lus que par le service ; écriture seulement sur une demande ouverte ; une photo envoyée dans le fil ne se retire que par le service | SUI-04, GES-08, SEC-02 |
| 16 | Mentions (0.15.0) : une note interne prévient de 1 à 10 collègues du service de l'entité ; la mention reste « à voir » jusqu'à la lecture du fil ; compteur « Notes où vous êtes mentionné » et filtre « Mentions » (même total) ; la cloche et le courriel viennent à l'étape 13 | GES-08 |
| 17 | Compteur « Messages à lire » (demandes dont le fil a un message que la personne n'a pas lu, demandes fermées comprises) et filtre « Messages », même total ; chaque personne a son propre repère de lecture (0.15.0) | SUI-04, GES-01 |
| 18 | Modèles de réponse (0.15.0) : dans une réponse au demandeur, « Insérer un modèle » met le texte dans la langue de la demande, numéro, lieu, état et prénom remplis ; on le relit avant l'envoi | GES-09 |
| 19 | « Suivre cette demande » depuis la fiche du service ; la fiche dit, pour chaque personne qui suit, « Moi aussi » ou « suit la demande » (0.15.0) | SUI-09 |
| 20 | Encoder une demande reçue (0.16.0) : le gestionnaire ou le responsable dépose, pour un agent de l'entité active, une demande reçue par téléphone ou par courriel ; elle suit le circuit du service de l'agent ; ni brouillon, ni pièce jointe, ni « Moi aussi » | GES-05, DV-129 |
| 21 | Regrouper (0.16.0) : une demande ouverte (À qualifier, Qualifiée, En attente, Rouverte) se regroupe dans une demande principale ouverte de l'entité ; elle passe « Fusionnée » et renvoie vers la principale ; personnes qui suivent, demandeur et bénéficiaire reportés ; rien n'est supprimé ; une demande en validation ne se regroupe pas | GES-06, DV-130 |
| 22 | Découper (0.16.0) : une demande ouverte (sauf « Terminée ») se découpe en une à cinq demandes nouvelles (problème, catégorie et lieu facultatifs), au nom du même demandeur, « À qualifier », délais depuis la réception de l'origine ; l'origine garde son premier problème ; tout ou rien | GES-06, DV-131 |
| 23 | Colonnes par état (0.16.0) : six colonnes (À qualifier, Qualifiée, En attente, En cours, Travaux terminés, Rouverte), filtres de la liste appliqués, 200 demandes au plus ; une carte ne se déplace que vers un état permis depuis le sien pour la personne ; déplacer ouvre la fiche sur le formulaire du passage, rien ne change sans confirmation ; sur téléphone, une colonne à la fois et le bouton « Déplacer » | GES-03, DV-132 |
| 24 | Une demande « En validation » attend le chef de service : le service technique la voit, mais ne la qualifie, ne la regroupe ni ne la valide à sa place | DEM-15, DV-128 |

## Écrans

| Écran | Contenu | Actions | Messages |
| --- | --- | --- | --- |
| Accueil (service technique) | Tableau de bord, quatre compteurs | Un clic ouvre la liste filtrée | |
| Demandes de l'entité | Tableau de bord ; filtres et vues (repliés sur téléphone) ; colonnes numéro, priorité, état, échéance, quoi, où, demandeur, date de dépôt | Filtrer, trier, enregistrer, remplacer ou supprimer une vue, ouvrir une fiche | « Aucune demande pour ces filtres. » |
| Fiche d'une demande (service) | État du service, priorité et motif, échéances, lieu et, sous lui, la photo de l'endroit (0.13.0 : celle du lieu ; à défaut, celle du plus proche lieu au-dessus, dite comme telle ; agrandie au toucher), description, pièces jointes, demandeur, durée estimée, consignes, qualifiée le … par … | « Qualifier » ou « Modifier la qualification » | |
| Qualifier la demande | Photo de l'endroit en tête (0.13.0), catégorie, priorité en boutons avec la proposition, motif, lieu, durée, date convenue, consignes, photos visibles | « Qualifier » ou « Enregistrer », « Annuler » | « Vous changez la priorité proposée : indiquez le motif. », « Demande qualifiée » |
| Volet d'une demande, fil de messages (0.15.0) | Messages du demandeur et du service, notes internes encadrées, mentions (@Prénom Nom), repère « Nouveaux messages » ; destinataire (réponse au demandeur, note interne), « Prévenir un collègue », « Insérer un modèle », texte, photos et documents | « Envoyer » ou « Enregistrer la note », « Suivre cette demande », « Ne plus suivre » | « Écrivez un message ou joignez une photo ou un document. », « Cette demande est déjà terminée… » |
| Volet d'une demande, actions et historique (0.14.0) | Boutons des passages permis ; formulaire du passage (motif en liste, commentaire, case « Lu par le demandeur » selon le passage, compte rendu à la clôture) ; compléments et avis du demandeur ; historique | Passer à l'état choisi | Refus du serveur affiché, saisie gardée |
| Encoder une demande reçue (0.16.0) | Bloc « Demande reçue » (Téléphone ou Courriel, recherche de la personne par son nom), puis le formulaire du dépôt | « Envoyer la demande » ; ensuite « Demandes de l'entité » ou « Encoder une autre demande » | « Pour envoyer, il manque : comment la demande est arrivée, qui demande » |
| Volet d'une demande, regrouper (0.16.0) | Demandes ouvertes au même endroit, recherche, ce qui va se passer, commentaire lu par le demandeur | « Regrouper dans … », « Choisir une autre demande », « Annuler » | Refus du serveur en clair, saisie gardée |
| Volet d'une demande, découper (0.16.0) | Une carte par demande nouvelle (problème, catégorie, lieu « Comme la demande d'origine »), commentaire | « Ajouter une demande nouvelle », « Créer les n demandes », « Annuler » | « 10 caractères au moins » |
| Demandes de l'entité, Colonnes par état (0.16.0) | Choix « Liste » ou « Colonnes par état » ; une colonne par état avec son nombre ; cartes (numéro, priorité, danger, messages, catégorie, lieu, échéance) | Glisser-déposer sur grand écran, « Déplacer » partout | « Plus de 200 demandes : seules les 200 premières sont montrées. Affinez les filtres. » |

## Données personnelles

Aucune donnée personnelle nouvelle sur le demandeur. La qualification ajoute le nom de la personne qui qualifie (lu par le service technique), les consignes à l'ouvrier et le motif d'un changement de priorité (consigne : décrire le travail, pas les personnes). Les vues enregistrées ne contiennent que des filtres. La photo de l'endroit (0.13.0) est une photo de lieu déjà en base, sans personne (DV-12), montrée au seul service technique. Depuis la 0.14.0 : auteur et heure de chaque passage, commentaire et compte rendu (textes libres : décrire le travail, pas les personnes), lus par le service ; le demandeur lit les seuls commentaires qui lui sont destinés. Depuis la 0.15.0 : messages et notes internes du fil (textes libres : décrire le problème et le travail, pas les personnes), collègues mentionnés, repère de lecture de chaque personne ; le journal garde le nombre de mentions, jamais leurs noms ni les textes. Depuis la 0.16.0 : personne qui a encodé une demande, canal (téléphone, courriel), commentaire d'un regroupement ou d'un découpage (lu par le demandeur), textes des demandes nouvelles d'un découpage ; le journal garde les numéros, jamais les textes. Rien n'est envoyé hors de l'application.

## Ce qui vient ensuite

Compteurs « en attente » et « à clôturer », suspension, refus, clôture : faits en 0.14.0 ; commentaires internes, mentions, modèles de réponse et abonnement : faits en 0.15.0 ; création par le gestionnaire, regroupement, découpage, vue en colonnes : faits en 0.16.0 ; alerte de retard par courriel (étape 13) ; corps de métier et équipes, filtres par équipe et par ouvrier (étapes 15 et 16) ; affectation et planning (étapes 16 et 17) ; tâches (étape 21).

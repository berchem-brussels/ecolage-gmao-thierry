# Tâches, affectation, absences et planning

Version 0.21.3 · Fiche fonctionnelle (modèle du standard, section 17.8). Couvre les étapes 16 (0.20.0, tâches et affectation, fiche qui manquait) et 17 (0.21.0, heures réelles, absences, planning, tâches non planifiées, conflits, date annoncée au demandeur).

## Objet

Découper une demande d'intervention en tâches, les confier à des ouvriers ou à une équipe à une date, voir la semaine du service technique, noter les absences des ouvriers et prévenir le demandeur quand la date de l'intervention change (cahier des charges CYC-03, GES-04, PLA-01 à PLA-06, SUI-03 ; décisions DV-160 à DV-166). La garde (PLA-09) est reportée à l'étape 21 (DV-166).

## Pour qui

| Rôle | Ce qu'il fait |
| --- | --- |
| Gestionnaire technique, responsable du service technique | Crée les tâches, les affecte, les déplace dans le planning, les démarre et les termine (avec les heures réelles), note les absences des ouvriers et leur motif |
| Chef d'équipe | Consulte le planning et les jours d'absence des ouvriers, sans le motif |
| Ouvrier | Reçoit les tâches ; leur consultation sur téléphone vient à l'étape 18 |
| Demandeur, bénéficiaire, personnes qui suivent la demande | Lisent « Intervention prévue le … » et, quand elle change, « Date modifiée le … (prévue auparavant le …) » ; jamais le nom des ouvriers ni les tâches |
| Administrateur de l'application | Lit le journal d'audit |

## Parcours

1. Le gestionnaire qualifie la demande puis ajoute une ou plusieurs tâches (titre, consignes, corps de métier, durée estimée).
2. Il affecte chaque tâche à des ouvriers (dix au plus) ou à une équipe, avec une date et, si besoin, une heure. Les ouvriers proposés sont classés par métier, disponibilité et charge ; un ouvrier absent est signalé. Après l'enregistrement, un avertissement dit s'il y a un conflit (absent, jour non travaillé, trop chargé), sans bloquer.
3. La demande passe « Planifiée » ; le demandeur lit la date. Si la date change ensuite, il est prévenu (cloche et courriel) et sa fiche dit l'ancienne date.
4. Dans « Planning », le gestionnaire voit la semaine ou le jour, par ouvrier ou par équipe ; il glisse une tâche (ordinateur) ou utilise « Déplacer » (partout) ; les tâches sans date sont listées au-dessus de la grille, les plus urgentes d'abord, et se planifient de la même façon.
5. Le jour venu : « Démarrer » note l'heure de début, « Terminer » l'heure de fin ; une tâche terminée sans avoir été démarrée demande ses deux heures, préremplies à maintenant.
6. Les absences (congé, formation, autre) se notent dans la fiche de l'ouvrier, écran « Équipes et prestataires », onglet Ouvriers.

## Règles

| N° | Règle |
| --- | --- |
| 1 | Droits : lecture des tâches `demandes:entite` ; écriture `demandes:traiter` ; planning `equipes:lire` ou `demandes:traiter` ; absences : saisie `indisponibilites:gerer` (gestionnaire, responsable), lecture aussi `equipes:lire`. Cloison : entité active, contrôlée côté serveur et testée |
| 2 | Une tâche : à faire, en cours, terminée, annulée (motif obligatoire) ; jamais supprimée. Les tâches se modifient tant que la demande n'est pas « Travaux terminés » ou fermée |
| 3 | Affectation : une équipe ou un à dix ouvriers, jamais les deux ; une date nouvelle n'est jamais passée ; une heure demande une date |
| 4 | Heures réelles : fin après début, aucune dans le futur (une minute de tolérance) ; refusées pour un autre passage que « Terminer » ; remettre à faire efface le début, rouvrir efface les deux. Depuis la 0.21.1, l'heure enregistrée est celle affichée : une heure tapée est retenue avant l'envoi, même sans Entrée, et une heure que le champ n'accepte pas bloque l'envoi (« Date ou heure non retenue ») Depuis la 0.21.2, sur ordinateur, le calendrier ne s'ouvre que par l'icône du champ : il ne cache plus le champ de fin ni le bouton « Terminer » |
| 5 | Absence : du, au (un an au plus), journée, matin ou après-midi (demi-journée sur un seul jour), motif dans une liste fermée, aucun texte libre ; pas de chevauchement pour un même ouvrier ; une absence saisie par erreur se supprime |
| 6 | Le motif d'une absence n'est rendu qu'au gestionnaire et au responsable ; le planning, les ouvriers proposés et les conflits disent seulement « indisponible » |
| 7 | Capacité d'un ouvrier un jour : durée du créneau de son équipe à horaire propre, ou de l'horaire de l'entité ; moitié pour une demi-journée d'absence ; zéro un jour non travaillé. Conflits jamais bloquants |
| 8 | Tâches non planifiées : à faire ou en cours, sans date, triées par priorité puis échéance de la demande, 200 au plus |
| 9 | Date annoncée au demandeur : première date des tâches ouvertes ; un changement garde l'ancienne date et le jour du changement, et prévient demandeur, bénéficiaire et personnes qui suivent ; la première date passe par l'avis « Planifiée » |
| 10 | Journal : création, champs changés, passages, affectation, absences et changement de date ; jamais de texte libre (titre en longueur, motif d'absence jamais) |
| 11 | Effet des tâches sur la demande (0.21.3, CYC-03) : la demande passe « Travaux terminés » quand sa dernière tâche ouverte se termine, qu'elle soit qualifiée, planifiée, en cours, en attente ou rouverte ; sur une demande « À qualifier », une tâche se prépare et s'affecte mais ne démarre ni ne se termine (« Qualifiez d'abord la demande ») |
| 12 | Dates et heures (0.21.3) : sur ordinateur, calendrier par l'icône à gauche du champ ou Alt+Flèche bas ; une date ou une heure tapée et non retenue bloque l'enregistrement de tout formulaire (« Date ou heure non retenue ») |

## Écrans

| Écran | Contenu | Actions | Messages |
| --- | --- | --- | --- |
| Fiche d'une demande (service), section « Tâches » | Tâches, état, corps de métier, durée, affectation, heures réelles | « Ajouter une tâche », « Démarrer », « Terminer », « Affecter », « Modifier », « Annuler la tâche », « Remettre à faire », « Rouvrir » | « La fin doit venir après le début. », « Cette heure est dans le futur. », avertissement « Attention : … » après une affectation en conflit |
| Fenêtre « Terminer la tâche » | Début et fin du travail, préremplis à maintenant | « Terminer », « Annuler » | Idem |
| Planning | Période, vue semaine ou jour, par ouvrier ou par équipe ; tâches non planifiées ; grille avec charge, absences et conflits | Glisser-déposer (ordinateur), « Déplacer », « Planifier », flèches, « Cette semaine » | « Toutes les tâches ouvertes ont une date. », refus d'une tâche d'équipe déplacée vers un ouvrier hors de l'équipe |
| Fiche d'un ouvrier, section « Indisponibilités » | Absences récentes et à venir, avec le motif pour qui gère | « Ajouter », « Enregistrer », « Supprimer » | « La fin doit être le jour du début ou après. », chevauchement refusé |
| Fiche du demandeur | « Intervention prévue le … », « Date modifiée le … (prévue auparavant le …) » | — | — |

## Données personnelles

Registre des traitements (à reprendre par le DPO) :

| Donnée | Personnes | Finalité | Accès | Conservation |
| --- | --- | --- | --- | --- |
| Affectation d'une tâche (ouvriers, équipe, date, heure) | Ouvriers | Organiser le travail du service technique | Service technique de l'entité ; journal : administrateur | Avec la demande ; historique au journal d'audit |
| Heures réelles de début et de fin d'une tâche | Ouvriers | Suivre le travail réalisé ; base des heures réalisées (étape 18) et des statistiques (étape 36) | Service technique de l'entité, API et MCP sous les mêmes droits | Avec la demande |
| Absence d'un ouvrier (dates, demi-journée, motif congé / formation / autre) | Ouvriers et chefs d'équipe | Ne pas confier de travail à une personne absente | Dates : service technique de l'entité ; motif : gestionnaire et responsable seulement | Absences récentes et à venir affichées ; une absence erronée se supprime ; journal sans motif |
| Date prévue et date d'avant | Demandeur, bénéficiaire | Informer de l'avancement (SUI-03) | Demandeur, bénéficiaire, personnes qui suivent, service technique | Avec la demande |

Aucune cause de santé : le motif « Autre absence » ne dit pas laquelle, et aucun texte libre n'est admis. Le nom des ouvriers n'est jamais montré au demandeur. La lecture des absences depuis SAGA n'est pas faite (brique à soumettre à Renaud).

## Ce qui vient ensuite

Interface des ouvriers sur téléphone : leurs tâches du jour, photos et commentaires, clôture (étape 18) ; garde (PLA-09, étape 21) ; statistiques de charge et de temps passé (étape 36).

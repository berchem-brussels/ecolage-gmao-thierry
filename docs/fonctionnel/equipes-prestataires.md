# Équipes, ouvriers et prestataires

Version 0.19.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Décrire le service technique de chaque entité : ses équipes (chef, membres, horaire, week-end compris), le métier et les compétences de chaque ouvrier, et les prestataires externes à qui il confie des travaux (cahier des charges ROL-05, REF-07, EXT-03 ; DV-28). Ces données serviront à l'affectation des interventions (étape suivante) et au planning.

## Pour qui

| Rôle | Ce qu'il fait |
| --- | --- |
| Responsable du service technique | Crée et modifie les équipes, leur chef, leurs membres et leur horaire ; note le corps de métier et les compétences des ouvriers ; tient la liste des prestataires ; règle les listes « Corps de métier » et « Compétences » |
| Gestionnaire technique | Consulte les équipes, les ouvriers et les prestataires |
| Chef d'équipe | Consulte les équipes et les ouvriers (pas les prestataires) ; peut être désigné chef d'une équipe |
| Ouvrier | Peut être membre d'une ou de plusieurs équipes ; n'ouvre pas l'écran |
| Administrateur de l'application | Donne les rôles « Ouvrier » et « Chef d'équipe » ; lit le journal d'audit |

## Parcours

1. L'administrateur donne le rôle « Ouvrier » ou « Chef d'équipe » aux personnes, dans leur entité (Utilisateurs et rôles).
2. Le responsable ouvre « Équipes et prestataires », crée une équipe (code, noms FR et NL), choisit son chef et ses membres, garde l'horaire de l'entité ou coche les jours travaillés et leurs heures.
3. Onglet Ouvriers : il note le corps de métier et les compétences de chacun ; le filtre par équipe retrouve les membres d'une équipe.
4. Onglet Prestataires : il ajoute les sociétés extérieures (nom, numéro d'entreprise, langue, métiers, référence du marché ou du contrat, contact).

## Règles

| N° | Règle | Origine |
| --- | --- | --- |
| 1 | Équipes, ouvriers et prestataires sont propres à chaque entité ; une donnée de l'autre entité n'est ni lue ni modifiée (contrôle du serveur, testé) | ARB, SEC-01 |
| 2 | Le chef d'une équipe a le rôle « Chef d'équipe » dans l'entité ; un membre a le rôle « Ouvrier » ou « Chef d'équipe » ; un ouvrier peut être membre de plusieurs équipes | ROL-05, DV-155 |
| 3 | Horaire d'une équipe : un créneau par jour au plus, du lundi au dimanche ; aucun créneau = horaire des ouvriers de l'entité. Il ne change pas le calcul des délais | DV-28, DV-155 |
| 4 | Corps de métier et compétences d'un ouvrier : valeurs actives des listes de l'entité ; une valeur désactivée reste à qui l'a déjà | ROL-05, DV-154 |
| 5 | Numéro d'entreprise d'un prestataire : facultatif ; dix chiffres commençant par 0 ou 1, clé de contrôle vérifiée ; unique dans l'entité | REF-07, DV-156 |
| 6 | Référence du marché ou du contrat saisie librement ; aucun échange avec 3P Procura | EXT-03 |
| 7 | Rien ne se supprime : une équipe ou un prestataire se désactive avec un motif et se réactive | STD |
| 8 | Chaque création, modification et désactivation s'inscrit au journal d'audit | STD |

## Écrans

| Écran | Contenu | Actions | Messages |
| --- | --- | --- | --- |
| Équipes et prestataires, onglet Équipes | Équipe, chef, membres, horaire ; « Démonstration », « Désactivée » | « Nouvelle équipe » (responsable), ouvrir une fiche | « Aucune équipe pour cette entité. » |
| Fiche d'une équipe | Code, noms FR et NL, chef, membres, horaire de l'entité ou propre (jour, début, fin) | « Enregistrer », « Désactiver l'équipe », « Réactiver l'équipe » ; lecture seule hors responsable | Refus du serveur en clair, saisie gardée ; « Horaire invalide : … » |
| Onglet Ouvriers | Ouvrier, corps de métier, compétences, équipes (et « chef ») ; filtre par équipe | Ouvrir la fiche d'un ouvrier | « Aucun ouvrier : donnez le rôle « Ouvrier » … » |
| Onglet Prestataires | Nom, numéro, langue, métiers, contact, marché ou contrat ; recherche, filtre par corps de métier | « Nouveau prestataire » (responsable), fiche, désactivation | « Numéro d'entreprise invalide … », « Un prestataire de cette entité a déjà ce numéro … » |

## Données personnelles

Registre des traitements (à reprendre par le DPO) :

| Donnée | Personnes | Finalité | Accès | Conservation |
| --- | --- | --- | --- | --- |
| Appartenance à une équipe, chef d'équipe | Ouvriers et chefs d'équipe | Organiser et répartir le travail du service technique | Service technique de l'entité (responsable, gestionnaire, chefs d'équipe) ; journal : administrateur | Tant que la personne a son rôle ; historique au journal d'audit |
| Corps de métier, compétences (habilitations BA4, BA5, VCA, nacelle, permis C…) | Ouvriers | Confier une intervention à une personne habilitée (sécurité au travail) | Service technique de l'entité | Idem ; aucune date d'expiration ni pièce justificative gardée |
| Nom, téléphone et courriel de la personne de contact d'un prestataire | Contacts des sociétés extérieures | Joindre le prestataire pour une intervention | Responsable et gestionnaire de l'entité | Tant que le prestataire est utilisé ; jamais copiés au journal à la création |

Aucune donnée de santé ni d'évaluation. Les compétences sont des faits professionnels déclarés par le service, sans pièce jointe.

## Ce qui vient ensuite

Affectation des tâches à un ouvrier, à plusieurs ou à une équipe, suggestion selon le corps de métier, filtres par équipe et par ouvrier de la liste du service (étape suivante, 0.20.0) ; planning et garde ensuite ; envoi d'une demande au prestataire par courriel (EXT-02) plus tard.

# Tickets : signaler un problème, poser une question, proposer une amélioration

Version 0.11.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Permettre à tout agent de signaler un incident ou un bug de l'application, de poser une question sur son fonctionnement ou de proposer une amélioration sans quitter l'écran où il se trouve, et faire traiter ces signalements par la bonne personne selon ITIL (standard, section 13.5 ; décisions DV-96, DV-97, DV-107, DV-108). Un ticket concerne l'application ; une panne dans un bâtiment reste une demande d'intervention.

## Pour qui

| Rôle | Ce qu'il fait |
| --- | --- |
| Tout agent | Signale par « Signaler » ; suit ses tickets dans Aide, Tickets ; répond, annule avec un motif, rouvre un ticket résolu pendant le délai réglé |
| Responsable et gestionnaire du service technique | Traitent les questions sur l'application posées par les agents de leur entité active (file métier) |
| Administrateur | Traite les incidents, bugs et souhaits des deux entités (file IT) ; règle les files et les délais dans Paramètres, onglet « Tickets » |

## Parcours

1. L'agent clique sur « Signaler » en haut de n'importe quel écran.
2. Il choisit le type (incident, bug, question métier, souhait), donne un titre et décrit ce qu'il faisait ; pour un incident ou un bug, ce qu'il attendait et ce qui s'est passé ; qui est touché (moi seul, mon service, toute l'institution) et la gravité (bloquant, gênant, confort).
3. Il joint s'il le souhaite une capture d'écran ou une photo.
4. Il envoie : la référence `TCK-2026-00001` s'affiche.
5. La personne qui traite la file ouvre le ticket dans Aide, Tickets, le prend en charge, répond, demande une précision, résout, rejette ou transfère vers l'autre file, avec un motif quand il est exigé.
6. L'agent lit la réponse dans le fil du ticket ; il clôt le ticket résolu ou le rouvre avec un motif.

## Règles

1. Une question métier va au responsable et au gestionnaire du service technique de l'entité active du demandeur au moment du signalement ; un incident, un bug ou un souhait va à l'administrateur, pour toutes les entités (DV-97). Les rôles de chaque file se règlent dans Paramètres, onglet « Tickets ».
2. Une personne qui a un rôle dans les deux entités traite les questions de l'entité active seulement ; elle passe de l'une à l'autre par le sélecteur de l'en-tête (DV-107).
3. Chacun lit toujours ses propres tickets, quelle que soit l'entité active.
4. Une question métier exige une entité active.
5. L'écran, la version, la langue, le navigateur, la date et la dernière erreur de l'application sont joints sans saisie.
6. La capture, en PNG ou en JPEG, est réduite et débarrassée de ses informations cachées (lieu, appareil) avant l'envoi, puis contrôlée et nettoyée une seconde fois par le serveur. Elle ne s'ouvre qu'avec une session, pour le demandeur et la personne qui traite la file.
7. Priorité ITIL : qui est touché croisé avec la gravité donne P1 à P4 ; la personne qui traite peut imposer une autre priorité avec un motif. Délais de prise en charge et de résolution par priorité, en heures calendaires, réglés par l'administrateur (par défaut P1 1 h et 8 h, P2 4 h et 24 h, P3 8 h et 72 h, P4 24 h et 240 h) ; un délai dépassé est signalé.
8. États : nouveau, pris en charge, en attente du demandeur, résolu, rejeté, annulé, clos. Motif obligatoire pour l'attente, la résolution, le rejet, l'annulation, la réouverture, le changement de priorité et le transfert de file. Un ticket fermé n'accepte plus ni modification ni message.
9. Le demandeur peut corriger le titre et la description tant que le ticket est nouveau ; sa réponse à une demande de précision remet le ticket « pris en charge ».
10. Note interne : invisible du demandeur, réservée à qui traite la file.
11. L'affectation ne vise qu'une personne qui traite la file dans l'entité du ticket.
12. Rien n'est supprimé ; chaque action écrit un événement dans le fil et une ligne au journal d'audit, sans le texte du ticket.

## Écrans

| Écran | Contenu |
| --- | --- |
| Bouton « Signaler » de l'en-tête | Formulaire : type, titre, ce que je faisais, ce que j'attendais et ce qui s'est passé (incident et bug), qui est touché, gravité, capture ; l'écran joint est rappelé en tête |
| Aide, Tickets | Compteurs (en cours, délai dépassé, sans responsable, résolus en 30 jours) pour qui traite une file ; recherche, type en boutons, « En cours seulement » ; liste avec référence, titre, type, priorité, état, entité, demandeur, date |
| Panneau du ticket | État, type, priorité, file, entité, date, textes, capture ; actions selon l'état et le rôle ; fil d'échanges ; contexte technique en mode Complet |
| Paramètres, onglet « Tickets » | Rôles de la file métier et de la file IT, délai de réouverture, délais par priorité |

## Données personnelles

Nouvelles données : nom du demandeur, textes et capture du ticket, contexte technique (navigateur), messages, nom de la personne qui traite. Finalité : support de l'application. Destinataires internes : service technique de l'entité pour une question métier, administrateur de l'application pour le reste. Aucun destinataire externe ; l'assistant Claude ne lit les tickets que par le navigateur de la personne, avec ses droits (DV-108). Conservation : à fixer avec la conservation RGPD de l'étape 41 (D-09) ; d'ici là, rien n'est supprimé.

## Échanges

API : `GET`, `POST /api/tickets`, `GET`, `PUT /api/tickets/:id`, `GET /api/tickets/:id/screenshot`, `POST /api/tickets/:id/status`, `POST /api/tickets/:id/messages`, `GET /api/tickets/stats`, `GET /api/tickets/to-handle`. MCP : neuf outils, dont `list_tickets_to_handle` et `change_ticket_status` en deux appels (`docs/fr/MCP.md`).

## Limites

Pas de courriel à la création ni à la réponse (notifications, étape 13) ; pas encore de transformation d'une question résolue en entrée de la FAQ locale (aide par écran, 0.12.0) ; écran nommé par son libellé du menu jusqu'aux fiches d'aide (0.12.0) ; pas d'export de la liste (étape 14).

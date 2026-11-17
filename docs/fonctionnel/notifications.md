# Notifications : la cloche et le courriel

Version 0.17.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Prévenir chaque personne de ce qui la concerne, au bon moment, sans qu'elle ait à ouvrir l'application pour vérifier : sa demande reçue, validée ou prise en charge, une demande à valider, un nouveau message, une échéance proche, la réponse à un signalement (cahier des charges NOT-01, NOT-02 sans Teams, NOT-04, NOT-06, DEM-04, DEM-07, DEM-12, LNG-05, PRI-03 ; écart E-35 ; décisions de Thierry des 16 et 17/11/2026).

## Pour qui

| Rôle | Ce qu'il reçoit |
| --- | --- |
| Tout agent (demandeur, bénéficiaire, personne qui suit) | Accusé de réception, accord ou refus du chef de service, changements d'état de ses demandes et de celles qu'il suit, réponses du service, accusé et réponse de ses signalements |
| Chef de service et suppléant en période | Demande à valider ; demande partie sans son accord pour danger |
| Service technique | Message d'un demandeur, mention dans une note interne, échéance proche, demande en retard, signalement à traiter |
| Administrateur | Règle le courriel et ses modèles dans Paramètres, onglet « Courriel » ; lit le journal des courriels |

## Parcours

1. Une action a lieu (dépôt, décision, changement d'état, message, signalement) ; dans la même opération, l'application crée l'avis de chaque personne concernée et met son courriel en file.
2. La cloche de l'en-tête affiche le nombre d'avis non lus de l'entité active ; la personne la touche, puis touche un avis : l'écran de la demande ou du signalement s'ouvre et l'avis est lu.
3. Le courriel part dans la langue de la personne qui le reçoit ; en mode test, il est retenu et l'administrateur le lit dans « Journal des courriels ».
4. Lire le fil d'une demande marque lus ses avis de message et de mention ; la décision du chef marque lue « Demande à valider » chez le chef et le suppléant.

## Règles

| N° | Règle | Origine |
| --- | --- | --- |
| 1 | Événements en données (`config/notifications.json`) ; seuls les événements des modules actifs sont émis et montrés | NOT-01, standard section 18 |
| 2 | Personne n'est averti de sa propre action ; seule exception, l'accusé de réception par courriel de qui envoie sa propre demande | DEM-12 |
| 3 | Un avis ne porte que le numéro, le lieu, l'état, le délai et le lien ; jamais la description, un message, un motif ni un nom | NOT-06 |
| 4 | Un courriel est écrit dans la langue de la personne qui le reçoit, depuis un modèle FR et NL réglable ; variables contrôlées | NOT-04, LNG-05 |
| 5 | Mode test livré : rien ne part, tout est retenu et lisible par l'administrateur | Décision du 16/11/2026 |
| 6 | Qui suit une demande reçoit ses changements d'état, pas ses messages (il ne lit pas le fil) | DEM-04, 0.15.0 |
| 7 | Échéance « proche » à moins de deux jours ouvrés, « en retard » dépassée ; une alerte par échéance, à la personne qui a qualifié la demande, sinon au service technique de l'entité ; les retards déjà là à la mise à jour ne font pas d'alerte | PRI-03, décision du 17/11/2026 |
| 8 | Une notification de l'autre entité ou d'une autre personne n'est jamais rendue (API et MCP) | SEC-01 |
| 9 | Avis gardés 90 jours une fois lus, 365 jours non lus ; journal des courriels 90 jours (à confirmer avec le DPO) | RGPD-04, D-09 |

## Hors périmètre de la version

Préférences de chaque personne par événement et par canal, résumé quotidien (NOT-03, NOT-05, étape 21) ; message Teams et notification sur l'écran du téléphone (NOT-02, D-04, D-05) ; webhooks vers la GRC (étape 38).

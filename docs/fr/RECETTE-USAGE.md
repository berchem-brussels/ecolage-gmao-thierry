# Recette d'usage chronométrée

Version 0.18.0 · Le français fait foi.

Protocole du test d'usage avec cinq agents par entité qui ne connaissent pas l'application (cahier des charges REC-03), chronométré contre les objectifs d'ergonomie (ERG-02). Il clôt le lot L1 (demande d'intervention et premier parcours complet). Les objectifs de la réservation de salle (moins de 90 secondes) se mesureront avec le lot L3.

## 1. Objectifs mesurés

| N° | Objectif (ERG-02) | Mesure |
| --- | --- | --- |
| O1 | Déposer une demande d'intervention en moins de 60 secondes, sans formation | Temps entre l'accueil affiché et le numéro de la demande à l'écran |
| O2 | Suivre une demande en deux clics depuis l'accueil | Nombre de clics (ou de touchers) entre l'accueil et l'état de la demande lu à voix haute ; l'accueil montre l'état des demandes en cours : le lire là compte zéro clic |
| O3 (observation) | Déposer une demande avec une photo sur son téléphone (iPhone ou Android) | Temps et difficultés, sans seuil ; contrôle de la compatibilité des téléphones (DV-102) |

## 2. Participants

- Cinq agents de l'Administration communale et cinq agents du CPAS, qui n'ont jamais utilisé l'application ni assisté à une démonstration. Mélanger les services, les âges, l'aisance avec l'informatique et les langues (au moins un néerlandophone par entité si possible).
- Chaque agent utilise son propre compte (connexion Microsoft sur l'installation d'acceptance) : il a le rôle de demandeur dans son entité, rien de plus.
- Accord oral de l'agent avant de commencer : on teste l'application, pas la personne ; il peut arrêter quand il veut.
- Anonymat : dans la grille, l'agent est désigné par un code (AC-1 à AC-5, CPAS-1 à CPAS-5), jamais par son nom. Pas de vidéo ni d'enregistrement de l'écran.

## 3. Préparation (la veille)

1. La 0.18.0 est installée sur NIXUS et `recette.sh` répond OK.
2. Vérifier pour chaque entité : catégories et délais en place (Éclairage, Plomberie au minimum), lieux de l'entité présents dans le patrimoine, au moins un service technique avec un compte qui pourra répondre le jour même (pour O2, l'état peut rester « Reçue par le service technique »).
3. Ne pas régler de lieu de travail habituel pour les agents testés : on mesure la première utilisation réelle.
4. La visite guidée s'ouvrira à la première connexion de chaque agent : la laisser s'ouvrir et noter si l'agent la suit ou la ferme (elle compte dans l'observation, pas dans le chronomètre d'O1, qui démarre après).
5. Prévoir un poste de bureau (navigateur habituel de l'administration) et, pour O3, l'iPhone (Edge) et un téléphone Android, chacun connecté au réseau qui atteint l'acceptance.
6. Imprimer la grille (section 7) et une fiche de consignes par langue (section 6).
7. Un animateur (qui lit les consignes et chronomètre) et, si possible, un observateur (qui note les hésitations). Un chronomètre de téléphone suffit.

## 4. Déroulement (15 minutes par agent)

1. Accueil (2 min) : présenter le but en une phrase, demander l'accord, rappeler qu'on ne peut pas aider pendant les exercices.
2. Connexion de l'agent avec son compte ; si la fenêtre « Nouveautés » ou la visite guidée s'ouvre, laisser l'agent faire et noter ce qu'il fait.
3. Exercice O1 sur le poste de bureau : lire la consigne, démarrer le chronomètre quand l'accueil est affiché et que l'agent a dit « j'ai compris », l'arrêter quand le numéro de la demande apparaît à l'écran.
4. Exercice O2 sur le même poste, depuis l'accueil (cliquer sur le logo ou « Accueil » avant de lire la consigne) : compter les clics jusqu'à ce que l'agent dise l'état de la demande.
5. Exercice O3 (facultatif, trois agents par entité suffisent) sur un téléphone : lire la consigne, chronométrer jusqu'au numéro, noter les difficultés (appareil photo, autorisations, clavier, lisibilité).
6. Deux questions (section 6, Q1 et Q2), puis remerciements. Les demandes créées sont des demandes de recette : les annuler ensuite avec le motif « recette d'usage » (Mes demandes, Annuler ma demande), ou les laisser au service technique qui les refusera avec ce motif.

Règles de l'animateur :

- Ne pas montrer l'écran, ne pas nommer de bouton. Si l'agent pose une question, répondre « faites comme vous feriez sans moi ».
- Si l'agent est bloqué plus de deux minutes ou abandonne, donner l'indice le plus court possible (par exemple « regardez en haut de l'écran ») et cocher « aide » : l'exercice compte comme échoué pour la réussite sans aide, mais le temps est noté.
- Noter mot pour mot les hésitations et les phrases de l'agent (« je ne sais pas ce que veut dire… ») : ce sont les remarques les plus utiles.

## 5. Seuils de réussite (proposés, à confirmer en atelier avant le test)

| Objectif | Seuil par entité |
| --- | --- |
| O1 | Au moins 4 agents sur 5 déposent leur demande sans aide, et le temps médian est inférieur à 60 secondes |
| O2 | Au moins 4 agents sur 5 trouvent l'état en 2 clics au plus, sans aide |
| O3 | Aucun blocage dû au téléphone (photo prise et jointe sur iPhone et sur Android) |

Un seuil manqué n'est pas un échec du lot à lui seul : il donne la liste des corrections. Un blocage (un agent ne peut pas déposer sa demande du tout, ou la photo ne passe pas sur un téléphone) est un défaut, corrigé par une version 0.18.Z avant l'étape suivante ; une hésitation ou un libellé mal compris est une remarque pour la version suivante.

## 6. Consignes lues aux agents

### En français

- Présentation : « Nous testons une nouvelle application qui remplacera les fiches 3P du service technique. Nous testons l'application, pas vous. Je ne peux pas vous aider pendant les exercices : faites comme si vous étiez seul. Vous pouvez arrêter quand vous voulez. »
- O1 : « La lampe de votre bureau ne s'allume plus. Signalez-le au service technique avec cette application. Dites-moi quand vous avez terminé. »
- O2 : « Vous voulez savoir où en est la demande que vous venez de faire. Retrouvez-la et dites-moi où elle en est. »
- O3 : « Sur ce téléphone, il y a une fuite sous l'évier de la cuisine. Signalez-la avec une photo de l'évier. »
- Q1 : « De 1 à 5, est-ce que c'était facile ? (1 : très difficile, 5 : très facile) »
- Q2 : « Qu'est-ce qui vous a gêné ou surpris ? »

### In het Nederlands

- Voorstelling: « We testen een nieuwe toepassing die de 3P-fiches van de technische dienst zal vervangen. We testen de toepassing, niet u. Ik kan u tijdens de oefeningen niet helpen: doe alsof u alleen bent. U mag stoppen wanneer u wilt. »
- O1: « De lamp van uw bureau gaat niet meer aan. Meld het aan de technische dienst met deze toepassing. Zeg me wanneer u klaar bent. »
- O2: « U wilt weten hoever de aanvraag staat die u net gedaan hebt. Zoek ze terug en zeg me hoever ze staat. »
- O3: « Op deze telefoon: er is een lek onder de gootsteen van de keuken. Meld het met een foto van de gootsteen. »
- Q1: « Van 1 tot 5, was het gemakkelijk? (1: heel moeilijk, 5: heel gemakkelijk) »
- Q2: « Wat stoorde of verraste u? »

## 7. Grille de mesure

Une ligne par agent. Temps en secondes ; « Aide » : oui si un indice a été donné ; clics comptés depuis l'accueil.

| Code | Entité | Langue | Poste / téléphone | Visite guidée (suivie, fermée) | O1 temps (s) | O1 aide | O2 clics | O2 aide | O3 téléphone | O3 temps (s) | O3 difficultés | Q1 (1 à 5) | Q2 et remarques |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AC-1 | AC | | | | | | | | | | | | |
| AC-2 | AC | | | | | | | | | | | | |
| AC-3 | AC | | | | | | | | | | | | |
| AC-4 | AC | | | | | | | | | | | | |
| AC-5 | AC | | | | | | | | | | | | |
| CPAS-1 | CPAS | | | | | | | | | | | | |
| CPAS-2 | CPAS | | | | | | | | | | | | |
| CPAS-3 | CPAS | | | | | | | | | | | | |
| CPAS-4 | CPAS | | | | | | | | | | | | |
| CPAS-5 | CPAS | | | | | | | | | | | | |

Synthèse par entité, à remplir après le test :

| Entité | O1 réussis sans aide (sur 5) | O1 temps médian (s) | O1 temps le plus long (s) | O2 en 2 clics au plus, sans aide (sur 5) | O3 blocages | Q1 moyenne |
| --- | --- | --- | --- | --- | --- | --- |
| AC | | | | | | |
| CPAS | | | | | | |

## 8. Après le test

- Remettre la grille (codes seulement, aucun nom) à la personne qui conduit le projet ; elle est versée au projet avec la décision de recette.
- Trier les remarques : défaut (blocage) → version 0.18.Z ; remarque → version suivante ; libellé à revoir → atelier.
- Annuler ou faire refuser les demandes de recette avec le motif « recette d'usage ». Le journal d'audit garde leur trace ; elles sortent de la numérotation de production au moment de la reprise (étape 47 du planning).
- Rien d'autre n'est conservé : pas de nom dans la grille, pas d'enregistrement.

## 9. Ce que l'application ne mesure pas

L'application ne chronomètre pas les agents et ne compte pas leurs clics : la mesure est faite à la main par l'animateur. C'est voulu : aucun suivi individuel du comportement des agents (RGPD, minimisation).

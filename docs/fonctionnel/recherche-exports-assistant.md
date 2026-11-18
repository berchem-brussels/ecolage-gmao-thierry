# Recherche, exports, assistant et visite guidée

Version 0.18.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objectif

Retrouver une demande en un geste depuis n'importe quel écran (ERG-04), emporter une liste dans un tableur (IMP-03), obtenir une réponse simple sans chercher l'écran (AID-02, AID-03) et découvrir l'application seul à la première ouverture (ERG-07).

## Qui

- Tout agent : recherche dans ses demandes, export de « Mes demandes » et de ses tickets, assistant, visite guidée.
- Service technique : en plus, recherche et export des demandes de l'entité, et des lieux du patrimoine dans la recherche.
- Chef de service : export de « Demandes à valider ».

## Parcours

1. Recherche : la loupe en haut de l'écran (sur un petit téléphone, « Rechercher » en tête du menu) ; 2 caractères au moins : numéro, même partiel, lieu ou mot de la description ; résultats groupés (Mes demandes, Demandes de l'entité, Patrimoine), cinq par groupe ; un résultat ouvre la fiche, Entrée ouvre le premier.
2. Export : sur une liste, régler les filtres, puis « Exporter », Excel (.xlsx) ou CSV ; le fichier porte le nom de la liste, de l'entité et du jour.
3. Assistant : la bulle en bas à droite ; « où en est ma demande » montre les trois demandes ouvertes les plus récentes de la personne avec leur état, ou celle dont elle donne le numéro, avec un lien vers la fiche ; une question sans réponse prévue propose jusqu'à trois fiches du mode d'emploi.
4. Visite guidée : à la première ouverture, après la fenêtre « Nouveautés » ; accueil, une étape par rôle, puis les boutons de l'en-tête ; « Revoir la visite guidée » dans l'Aide.

## Règles

- La recherche, les exports et l'assistant ne montrent que ce que la liste montre déjà à la personne : mêmes droits, même entité active.
- Un export a 5 000 lignes au plus ; au-delà, il est refusé avec « affinez les filtres », jamais tronqué en silence. Chaque export est noté au journal d'audit, sans son contenu.
- Le CSV est en UTF-8 avec un séparateur « ; » ; une cellule qui ressemble à une formule est neutralisée par une apostrophe.
- L'assistant ne propose un écran que si la personne peut l'ouvrir ; il n'envoie rien hors de l'application.
- La visite revient quand la personne reçoit un rôle de plus ; elle est retenue par appareil.

## Données

- Aucune donnée nouvelle en base. Le journal d'audit reçoit une ligne par export (liste, format, nombre de lignes). La visite guidée garde « déjà vue » dans le navigateur.
- Un fichier exporté quitte l'application : il contient ce que la liste affiche, dont la description et, pour le service technique et le chef de service, le nom du demandeur. Il se garde et se transmet selon les règles de l'entité.

## Ce qui vient ensuite

Versions imprimables des listes ; export du patrimoine et du journal ; intentions « réserver une salle » et « emprunter des chaises » avec leurs modules (réservations, prêts) ; recherche des équipements, salles et articles avec leurs modules.

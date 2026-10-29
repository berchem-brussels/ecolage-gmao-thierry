# Patrimoine : sites, bâtiments, niveaux, locaux et types de lieux

Version 0.2.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Décrire le patrimoine de chaque entité en arbre, pour que chaque demande, réservation ou intervention des versions suivantes désigne un lieu précis (cahier des charges, section 6.1, REF-01, REF-02, REF-08). Chaque entité a son propre arbre : un bâtiment utilisé par l'administration communale et par le CPAS existe deux fois, une fois dans chaque entité. Les deux fiches ne partagent rien.

## Pour qui

| Rôle | Ce qu'il fait |
| --- | --- |
| Tout rôle de l'entité active (demandeur, ouvrier, lecteur…) | Consulte l'arbre et les fiches, cherche un lieu |
| Gestionnaire technique et responsable du service technique | Crée, modifie, déplace et désactive les lieux ; dépose, remplace et supprime les photos |
| Responsable du service technique | Règle les types de lieux dans Listes de valeurs |
| Administrateur de l'application | Aucun accès métier d'office (il consulte comme demandeur de son entité) |

## Règles

| N° | Règle | Source |
| --- | --- | --- |
| 1 | Un bâtiment se range sous un site, un niveau sous un bâtiment ; un bâtiment peut exister sans niveau | Validée le 21/10/2026 |
| 2 | Un local se range sous un niveau, un bâtiment ou directement un site : c'est le cas d'un lieu extérieur (cour, parking, toiture) | Validée le 21/10/2026 ; cahier des charges, section 6.1 |
| 3 | Le code court est unique dans l'entité ; le même code peut exister dans l'autre entité | Validée le 21/10/2026 ; REF-02 |
| 4 | Un lieu qui contient encore des lieux actifs ne se désactive pas ; on désactive d'abord ce qu'il contient | Validée le 21/10/2026 |
| 5 | L'adresse se saisit sur le site ; un bâtiment créé sans adresse reprend celle de son site et peut la changer | Validée le 21/10/2026 |
| 6 | Une photo par lieu ; une photo remplacée ou supprimée est effacée définitivement | Validée le 21/10/2026 ; standard, section 9.1 |
| 7 | Le type vient de la liste des types de lieux de l'entité ; il est exigé pour un local ; un type désactivé reste sur les lieux qui le portent | Validée le 21/10/2026 ; REF-08 |
| 8 | Noms en français et en néerlandais obligatoires, pour les lieux comme pour les types | LNG-02 |
| 9 | Rien ne se supprime : un lieu ou un type se désactive avec un motif et peut être réactivé | Standard, section 7.1 |

## Écrans

| Écran | Contenu | Actions |
| --- | --- | --- |
| Patrimoine (menu Principal) | À gauche l'arbre de l'entité active avec une recherche par code, nom ou adresse ; à droite la fiche du lieu : chemin, nature, type, statut, adresse, surface, nombre de lieux contenus, photo. Le lieu choisi est dans l'adresse de la page (`/patrimoine?lieu=12`). Sur téléphone, la fiche passe sous l'arbre | Créer un site ; dans la fiche, « Ajouter un bâtiment », « Ajouter un niveau », « Ajouter un local » ou « Ajouter un lieu extérieur » selon le lieu ; « Modifier » ; « Ajouter une photo », « Changer la photo », « Supprimer la photo » |
| Patrimoine, mode Complet | En plus : case « Afficher les lieux désactivés », date de modification, champ « Ranger sous » pour déplacer un lieu, désactivation avec motif, réactivation | Déplacer, désactiver, réactiver |
| Formulaire d'un lieu | Code court (proposé à partir du code du parent), nom FR, nom NL, type, adresse pour un site ou un bâtiment ; sous « + Plus d'options » en mode Simple : statut (boutons), code postal, commune, surface | Enregistrer |
| Listes de valeurs (menu Réglages du service, responsable) | Types de lieux : libellé dans la langue de l'écran et statut ; en mode Complet, libellés FR et NL, code technique et ordre | Créer, modifier le libellé et l'ordre, désactiver avec motif, réactiver |

Messages d'erreur : code déjà utilisé dans l'entité ; lieu impossible à ranger à cet endroit ; parent désactivé ; lieu qui contient encore des lieux actifs ; type du local manquant ; valeur hors de la liste ou désactivée ; photo d'un autre format que JPEG ou PNG ; photo illisible ou trop grande ; photo illisible ou trop lourde à la préparation.

## Paramètres

Types de lieux livrés pour chaque entité (`backend/config/listes-valeurs.json`) : bureau, salle de réunion, atelier, garage, classe, cuisine, sanitaires, stockage, local technique, extérieur. Le responsable les modifie dans l'écran Listes de valeurs. Taille de la photo : 1 600 pixels de côté après réduction, 1 Mo au plus.

## Données et conservation

Lieux : codes, noms, adresses de bâtiments, surfaces, statuts. Photos de lieux : peuvent montrer une personne, une plaque ou un dispositif de sécurité si la personne qui photographie n'y prend pas garde ; l'écran le rappelle. Métadonnées retirées (date, appareil, position GPS). Journal d'audit des créations, modifications, désactivations, dépôts et suppressions de photos, sans nom de fichier. Durées de conservation fixées au lot L6 (D-09).

## Échanges

Routes `/api/lieux` (dont `/api/lieux/arbre` et `/api/lieux/:id/photo`) et `/api/listes-valeurs` ; outils MCP correspondants (`docs/fr/MCP.md`), sauf le dépôt et la lecture du fichier de photo (écart E-17). Aucun webhook ni import dans cette version : l'import du patrimoine depuis un fichier arrive à l'étape 32.

## Limites

Pas encore d'équipements (étape 27), ni de fiche de bâtiment complète, de plans ou de documents (étape 27), ni de recherche tolérante aux accents par l'API (étape 5), ni de lieu de travail habituel des agents (REF-04, étape 5). La photo d'un lieu n'a pas de légende. Le MCP ne transporte pas de fichier.

## Mode d'emploi

FR et NL dans l'application, menu Aide : rubriques « Patrimoine » (tout rôle d'entité) et « Listes de valeurs » (responsable), questions de FAQ 4 à 6, intentions du chatbot « patrimoine », « photo » et « types de lieux ».

## Note de version

FR : Nouveau dans cette version : le patrimoine de l'entité, c'est-à-dire ses sites, bâtiments, niveaux et locaux, avec une photo par lieu. Le responsable du service technique règle les types de lieux.

NL : Nieuw in deze versie: het patrimonium van de entiteit, dat wil zeggen de sites, gebouwen, verdiepingen en lokalen, met een foto per plaats. De verantwoordelijke van de technische dienst stelt de soorten plaatsen in.

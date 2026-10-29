# Socle : entités, comptes et rôles

Version 0.1.0 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Servir plusieurs entités juridiques dans une même installation (à l'origine l'Administration communale et le CPAS) avec une cloison complète : chaque entité a ses données, et une personne n'agit dans une entité que si elle y a un rôle (cahier des charges, sections 4 A-02 et 5).

## Pour qui

Tout agent connecté (accueil, entité active) ; l'administrateur de l'application (entités, comptes, rôles).

## Règles

| Règle | Source |
| --- | --- |
| Tout compte reçoit d'office le rôle de demandeur dans son entité de rattachement ; ce rôle ne se retire pas | ROL-01 |
| Les autres rôles s'attribuent entité par entité, contrôlés par le serveur sur chaque route et chaque outil MCP | ROL-02 |
| La personne choisit l'entité active dans l'en-tête ; les écrans ne montrent que cette entité | ROL-03 |
| Le dernier administrateur actif ne peut être ni rétrogradé ni désactivé ; la dernière entité active ne peut être désactivée | ROL-06 |
| Aucune suppression : une entité se désactive avec un motif, un rôle se retire avec un motif, un compte se désactive | Standard, section 7.1 |
| L'administrateur règle l'application et n'a aucun rôle métier d'office | Cahier des charges, section 5.2 |

## Écrans

| Écran | Contenu | Actions |
| --- | --- | --- |
| Assistant d'installation | Nom du pouvoir local FR et NL, première entité, premier administrateur | Créer l'administrateur |
| En-tête | Code de l'entité active ; en boutons si la personne a des rôles dans plusieurs entités | Changer d'entité |
| Accueil | Entité active, rôles de la personne, personnes de l'entité pour les chefs d'équipe, gestionnaires, responsables et lecteurs | Aucune |
| Entités (administrateur) | Code, nom, statut | Créer, modifier, désactiver avec motif, réactiver |
| Utilisateurs et rôles (administrateur) | Personne (nom et adresse), étiquettes « Administrateur » et « Démonstration », rôles par entité ; colonne Actif en mode Complet ; une seule colonne sur téléphone | Créer, rechercher, régler l'accès à l'administration et cocher les rôles par entité dans le panneau Rôles, désactiver |

Messages d'erreur : code déjà utilisé, rôle déjà attribué, rôle de demandeur non retirable, entité désactivée, dernière entité, dernier administrateur.

## Paramètres

Nom de l'application et couleurs (`config/instance.defaut.json`), nom du pouvoir local (assistant d'installation), `DEMO_ALLOWED` dans `.env`.

## Données et conservation

Comptes : nom, prénom, adresse professionnelle, langue, entité de rattachement, rôles. Journal d'audit des connexions, des créations, des modifications et des changements d'entité active. Durées de conservation fixées au lot L6 (D-09).

## Échanges

Routes `/api/entites`, `/api/roles`, `/api/roles-utilisateurs`, `/api/users`, `/api/auth/entite` ; outils MCP correspondants (`docs/fr/MCP.md`). Aucun webhook ni import dans cette version.

## Limites

Pas encore de SSO (lot L7), ni de lecture de l'annuaire Microsoft (lot L6), ni d'écran de paramètres (version 0.3.0). La note de version n'est pas encore affichée à la première connexion.

## Mode d'emploi

FR et NL dans l'application, menu Aide : rubriques « Entité active », « Entités » et « Utilisateurs et rôles » (ces deux dernières pour l'administrateur), trois questions de FAQ, intentions du chatbot « entité » et « rôle ».

## Note de version

FR : Première version de l'application. Vous voyez en haut de l'écran l'entité pour laquelle vous travaillez. Si vous avez des rôles dans plusieurs entités, vous passez de l'une à l'autre d'un clic. L'administrateur crée les entités, les comptes et les rôles.

NL : Eerste versie van de toepassing. Bovenaan het scherm ziet u de entiteit waarvoor u werkt. Als u rollen hebt in meerdere entiteiten, wisselt u met één klik. De beheerder maakt de entiteiten, de accounts en de rollen aan.

# Demandes d'intervention : dépôt et suivi par le demandeur

Version 0.7.1 · Fiche fonctionnelle (modèle du standard, section 17.8).

## Objet

Permettre à tout agent de l'administration communale et du CPAS de signaler un problème au service technique de son entité en moins d'une minute, sans formation, et de retrouver ses demandes (cahier des charges DEM-01 à DEM-08, DEM-11, DEM-12 pour l'écran, DEM-16, NUM-01 à NUM-05, SUI-01, REF-03, REF-04, ERG-03, RGPD-10). Les choix faits en séance le 26/10/2026 sont les décisions DV-38 à DV-47 ; ceux du 28/10/2026 (formulaire complet, 0.7.0), DV-54 à DV-67.

## Pour qui

| Rôle | Ce qu'il fait |
| --- | --- |
| Toute personne qui a un rôle dans l'entité active | Dépose une demande (au besoin pour un collègue ou un service), s'associe à une demande déjà ouverte (« Moi aussi »), la retrouve dans « Mes demandes », choisit son lieu de travail habituel |
| Collègue pour qui la demande est faite | La lit dans « Mes demandes », marquée « Faite pour vous », avec le nom de qui l'a déposée |
| Gestionnaire technique, responsable du service technique | En plus, voit toutes les demandes de l'entité active, en lecture seule, avec la mention « Danger », la personne pour qui elle est faite, la date souhaitée, les réponses aux questions et les personnes qui la suivent avec leur remarque ; le nombre de demandes à qualifier sur l'accueil |
| Responsable du service technique | Règle la numérotation des demandes, le téléphone d'urgence, les questions de chaque catégorie, le contact du DPO et les mentions d'information de son entité |
| Administrateur de l'application | Règle le code de l'entité ; peut régler le lieu habituel d'un agent par l'API ou le MCP (écart E-25) ; voit les dépôts au journal d'audit |

## Parcours

1. L'agent clique sur « Nouvelle demande » : sur l'accueil, dans le menu, ou en haut de chaque écran. S'il avait commencé une demande, « Reprendre » ou « Recommencer à zéro ».
2. **Danger** : en cas de danger pour les personnes ou les biens, il coche la case en tête ; le numéro à appeler s'affiche.
3. **Où ?** Le lieu proposé d'office est son lieu de travail habituel, sinon celui de sa dernière demande, avec son chemin (site › bâtiment › local). « Changer de lieu » ouvre une recherche et la liste des bâtiments. Dessous, les demandes déjà ouvertes dans le même bâtiment : « Moi aussi » l'associe à l'une d'elles et le parcours s'arrête là.
4. **Quoi ?** Il touche la tuile du domaine, puis celle du problème. Un domaine sans nature se choisit directement. Les questions de la catégorie apparaissent dessous, en boutons.
5. **Description** : quelques mots, 10 caractères au moins, dans sa langue, sans nom ni donnée personnelle sur une autre personne.
6. Au besoin, « Pour quelqu'un d'autre ? » et « Une date ou un moment à respecter ? ».
7. « Envoyer la demande », sous la mention d'information (« En savoir plus ») : l'écran donne le numéro, par exemple `AC-DI-2026-00001`, le lieu, le délai indicatif (ou « priorité absolue » en cas de danger), les réponses aux questions et les liens vers « Mes demandes » et vers une nouvelle demande.

## Règles

| N° | Règle | Source |
| --- | --- | --- |
| 1 | Un seul lieu par demande, actif, de l'entité active. Pour plusieurs salles d'un même bâtiment, l'agent choisit le bâtiment et cite les salles | DV-39 |
| 2 | Une seule zone de texte, la description, de 10 caractères au moins comptés sans les espaces autour ; pas de titre court | DV-40 |
| 3 | Les tuiles sont les catégories actives de l'entité (35 livrées en 0.4.0), réglées par le responsable ; un domaine qui a des natures demande de préciser | DV-41, REF-06 |
| 4 | Le demandeur ne choisit ni la priorité ni le corps de métier : la catégorie propose la priorité, le gestionnaire la confirmera (étape 8) ; le corps de métier vient avec les équipes (étape 15) | Relevé de 3P du 26/10/2026, PRI-01 |
| 5 | Lieu proposé : le lieu habituel s'il est actif et de l'entité active, sinon le lieu de la dernière demande de la personne dans cette entité | DV-42, REF-04 |
| 6 | En 0.5.0, toute demande arrive « À qualifier », vue par le demandeur comme « Reçue par le service technique » ; la validation par le chef de service s'appliquera à l'étape 11 | DV-43, écart E-22 |
| 7 | Numéro `{code de l'entité}-{code du type}-{année}-{rang}`, le même en FR et en NL ; code du type (DI) et remise à un chaque année ou numérotation continue réglés par le responsable ; attribué à l'enregistrement, sans trou ni doublon, jamais réutilisé | DV-44, NUM-01 à 05 |
| 8 | « Mes demandes » : les demandes de la personne, ouvertes en tête, état en libellé simple et couleur, date de dépôt, délai annoncé ; le filtre « Mon service » attend la lecture du service des agents | DV-45, SUI-01, écart E-23 |
| 9 | « Demandes de l'entité » : toutes les demandes de l'entité active, en lecture seule, pour le gestionnaire et le responsable, avec le nom du demandeur | DV-46 |
| 10 | Les espaces en trop au début et à la fin d'un texte saisi sont retirés par le serveur, sauf dans les mots de passe ; un champ obligatoire fait seulement d'espaces est refusé | DV-37 |
| 11 | La recherche d'un lieu ignore accents, majuscules et ponctuation, en FR et en NL, et trouve une salle par le nom de son bâtiment | REF-03, LNG-09 |
| 12 | Aucune modification ni annulation d'une demande en 0.5.0 : elles arrivent avec le cycle de vie | Étape 9, écart E-21 |
| 13 | La liste des bâtiments s'ouvre et se referme par « Parcourir la liste des bâtiments » ; « Masquer la liste » la referme aussi ; « Annuler » apparaît dès qu'une recherche ou la liste est ouverte (0.5.1) | Recette du 26/10/2026, DV-04 |
| 14 | Une description faite seulement d'espaces affiche « Ce champ est obligatoire » sous le champ avant l'envoi, comme tout champ obligatoire de l'application (0.5.1) | Recette du 26/10/2026, DV-37 |
| 15 | « Nouvelle demande » est offert en haut de chaque écran et dans le menu ; l'écran « Mes demandes » n'a plus de bouton propre (0.5.1) | Recette du 26/10/2026 |
| 16 | Après l'envoi, « Mes demandes » et « Faire une autre demande » gardent 12 px d'écart quand ils passent l'un sous l'autre sur téléphone (0.5.2) | Recette du 27/10/2026, DV-51 |
| 17 | Sur téléphone, le texte saisi est en 16 px : l'iPhone n'agrandit plus la page au toucher de la recherche ou de la description ; le zoom à deux doigts reste permis (0.5.2) | Recette du 27/10/2026, DV-51 |
| 18 | « Même bâtiment » : le bâtiment du lieu choisi et tous ses locaux, ou le site entier si le lieu n'est dans aucun bâtiment ; demandes ouvertes de l'entité, même local puis même catégorie puis plus récentes, cinq au plus puis « Voir les autres (N) » ; catégorie, lieu, état, date et début de la description, sans nom du demandeur ni numéro (0.7.0) | DV-55, DV-56, DEM-04 |
| 19 | « Moi aussi » : confirmation avec le numéro ; le texte déjà tapé part comme remarque lue par le seul service technique ; la demande suivie apparaît dans « Mes demandes », marquée « Vous suivez aussi cette demande », sans le nom du demandeur ; impossible sur sa propre demande ou une demande fermée (0.7.0) | DV-57, DEM-04 |
| 20 | Danger : la demande part en P1 quelle que soit la catégorie ; numéro affiché : téléphone d'urgence de l'entité, sinon celui du service, sinon « prévenez votre responsable » ; le demandeur lit « traitée en priorité absolue », sans heure ; l'échéance P1 n'est rendue qu'au service technique (0.7.0) | DV-58, DEM-06 |
| 21 | « Pour » : un collègue de l'entité (recherche dès 2 lettres, prénom et nom seulement), qui lit la demande, ou un service ou une personne sans compte (texte libre, sans notification) ; le demandeur reste celui qui dépose (0.7.0) | DV-59, DEM-07 |
| 22 | Date souhaitée d'aujourd'hui à un an (heure de Bruxelles) et moment à respecter (200 caractères) ; le délai annoncé reste celui de la priorité (0.7.0) | DV-60, DEM-08 |
| 23 | Brouillon : enregistré tout seul sur le serveur, un par personne et par entité, lu par elle seule, sans numéro ; effacé à l'envoi, par « Recommencer à zéro » ou après 30 jours ; pas de ligne au journal d'audit (0.7.0) | DV-61, DEM-11, écart E-27 |
| 24 | Questions de la catégorie : réglées par le responsable sur un domaine ou une nature, « Oui ou non » ou un choix parmi 2 à 6 réponses, FR et NL, dix actives au plus ; une nature pose d'abord celles de son domaine ; aucune obligatoire sauf réglage, contrôlé aussi par le serveur ; réponses enregistrées avec la demande, texte compris, lues par le demandeur et le service technique (0.7.0) | DV-62, DEM-05 |
| 25 | Mention d'information de l'entité au-dessus du bouton d'envoi, texte complet par « En savoir plus » et dans l'aide, avec le contact du DPO ; textes FR et NL réglés par entité, texte livré si vide ; sans DPO, « adressez-vous à votre responsable » (0.7.0) | DV-65, RGPD-10, écart E-28 |
| 26 | L'aide de la description rappelle de ne citer ni nom ni donnée personnelle sur une autre personne ; la consigne de ne pas photographier de personnes viendra avec la photo (étape 6) (0.7.0) | DV-66, DEM-16 |
| 27 | Messages d'erreur dans un rouge d'au moins 4,5:1 de contraste, en clair et en sombre (0.7.0) | DV-64, DV-67, écart E-26 |
| 28 | Le brouillon s'enregistre aussi quand la personne garde le lieu proposé d'office (lieu de travail habituel ou de la dernière demande) ; seuls les champs connus du lieu partent au serveur (0.7.1, défaut de la recette de la 0.7.0) | DV-04, DV-68 |

## Données personnelles

Nom du demandeur, rattaché à la demande, visible du demandeur et des gestionnaires et responsables de l'entité ; lieu de travail habituel, choisi par la personne ; texte libre de la description (consigne : décrire le problème, pas les personnes). Depuis la 0.7.0 : bénéficiaire (collègue désigné ou texte libre), date souhaitée et moment, remarque du « Moi aussi » (lue par le seul service technique), brouillon (lu par la personne seule, 30 jours), réponses aux questions. Le collègue désigné est un destinataire nouveau. Aucune donnée n'est envoyée hors de l'application. Mentions d'information et contact du DPO par entité (RGPD-10). Réponses aux trois questions RGPD dans `NOTES_LIVRAISON_v0.5.0.md` et `NOTES_LIVRAISON_v0.7.0.md`.

## Ce qui vient ensuite

Photos et consigne de ne pas photographier de personnes (étape 6) ; tableau de bord et qualification (étape 8) ; ligne du temps, clôture, avis (étape 9) ; messages (étape 10) ; validation par le chef de service (étape 11) ; courriel d'accusé de réception, aussi au bénéficiaire et aux personnes qui suivent (étape 13) ; alerte de la garde en cas de danger (étapes 13 et 17) ; fusion des doublons (étape 12).

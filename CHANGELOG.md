# Journal des versions

Version de l'application : **0.7.2** · Mis à jour le 29/10/2026

## 0.7.2 (29/10/2026)

Version sans changement fonctionnel : le code est prêt pour le dépôt public GitHub `berchem-brussels/ecolage-gmao-thierry` (EUPL-1.2, `GITHUB.md`).

- `.github/workflows/ci.yml` ajouté, conforme à la section 7 de `GITHUB.md` : travail `tests` sous Node 20 (serveur : `npm ci`, `npm test`, `npm audit --omit=dev --audit-level=high` ; interface : `npm ci`, `npm test`, `npm run build`, `npm run a11y`). L'étape d'audit échoue tant que E-24 n'est pas tranché (E-30).
- `.gitignore` complété : `.env.*` sauf `.env.example`, fichiers de base SQLite, sauvegardes, certificats et clés, journaux, fichiers du poste.
- Adresse, ports et dossiers de NIXUS remplacés dans tous les fichiers de l'archive par des valeurs d'exemple (`192.0.2.10`, 18443, 18080, `/volume1/docker/monapp`, compte `admin`) ; la copie de `STANDARD.md` le dit en tête. Les fichiers du projet et les messages de livraison gardent les valeurs réelles (DV-70).
- Test de portabilité élargi à toute adresse IPv4 privée dans le code ; adresse professionnelle d'un test d'écran remplacée par une adresse d'exemple.
- Note de version : une ligne pour l'administrateur seulement ; rien ne s'ouvre pour les autres comptes.
- Tests : serveur 290 (289 en 0.7.1), interface 127 (127). Parcours du travail `tests` rejoué sous Node 20.20.2 sur les seuls fichiers versés par Git.

## 0.7.1 (28/10/2026)

Correctif de la recette de la 0.7.0 du 28/10/2026 (DV-04), avant la suite de la recette.

- Brouillon : il ne s'enregistrait pas quand le lieu proposé d'office (lieu de travail habituel ou lieu de la dernière demande) était gardé. Le profil rend ce lieu avec sa nature, champ que le schéma du brouillon refusait (400) ; l'écran n'en disait rien. Le formulaire n'envoie plus que les champs connus du lieu, et le schéma accepte la nature. « Brouillon enregistré à … » s'affiche de nouveau sous le bouton d'envoi.
- Mention complète livrée (« En savoir plus », rubrique « Protection de vos données ») : elle commence par « Responsable du traitement : » suivi du nom de l'entité (« Verwerkingsverantwoordelijke: »), au lieu de « Administration communale traite… » sans article ; les durées sont « fixées par le responsable du traitement ». Un texte modifié par un responsable ne change pas.
- Note de version : une ligne pour tous, une pour le responsable.
- Tests : serveur 289 (287 en 0.7.0), interface 127 (127, un test renforcé).

## 0.7.0 (28/10/2026)

Étape 7 du planning (lot L1), faite avant l'étape 6 (DV-54). Formulaire de demande complet.

- Avant l'envoi, les demandes déjà ouvertes dans le même bâtiment (le bâtiment du lieu choisi et tous ses locaux) : catégorie, lieu, état, date, début de la description, sans nom ni numéro ; cinq au plus, puis « Voir les autres ». « Moi aussi » associe la personne à l'une d'elles au lieu d'en créer une nouvelle ; elle la suit dans « Mes demandes », et son texte part comme remarque lue par le seul service technique.
- Case « Danger pour les personnes ou les biens » en tête du formulaire : numéro à appeler (téléphone d'urgence de l'entité, sinon celui du service), demande en P1, « traitée en priorité absolue » sans heure promise au demandeur.
- « Pour quelqu'un d'autre ? » : un collègue de l'entité, qui lit la demande (« Faite pour vous »), ou un service ou une personne sans compte. « Une date ou un moment à respecter ? » : date souhaitée et créneau.
- Brouillon gardé sur le serveur pendant 30 jours : « Reprendre » ou « Recommencer à zéro ».
- Questions propres à la catégorie, en boutons, réglées par le responsable dans Catégories et délais (« Oui ou non » ou un choix parmi 2 à 6 réponses, FR et NL, facultatives sauf « Obligatoire ») ; trois questions livrées (plomberie, prises, chauffage). Réponses sur la fiche, pour le demandeur et le service technique.
- Mentions d'information RGPD FR et NL sous le formulaire, « En savoir plus », et rubrique « Protection de vos données » de l'aide ; contact du DPO et textes réglés par entité dans Réglages de l'entité. L'aide de la description rappelle de ne citer personne.
- Rouge des messages d'erreur à 4,5:1 au moins en clair et en sombre (E-26).
- Migration `006_demandes_formulaire` (tables et colonnes ajoutées seulement). Onze routes et leurs outils MCP ; `create_demande` et `get_profile` enrichis.
- Aide : rubriques Nouvelle demande, Catégories et délais, Réglages de l'entité, Protection de vos données ; questions 20 à 24 ; quatre réponses de l'assistant ; note de version (trois lignes pour tous, une pour le service technique, une pour le responsable).
- Tests : serveur 287 (238 en 0.5.2), interface 127 (95).

## 0.5.2 (27/10/2026)

Correctif de la recette du 27/10/2026 (DV-04), avant l'étape 6.

- Après l'envoi d'une demande, sur téléphone, « Mes demandes » et « Faire une autre demande » ne sont plus collés quand ils passent l'un sous l'autre : 12 px d'écart.
- Sur petit écran (jusqu'à 768 px de large), le texte saisi dans les champs est en 16 px : l'iPhone n'agrandit plus la page au toucher d'un champ. Le zoom à deux doigts reste permis.
- Adresse e-mail : vide ou faite d'espaces, un seul message, « Ce champ est obligatoire » ; mal formée, « Adresse e-mail non valide » (« Ongeldig e-mailadres ») au lieu du message d'Ant Design sur le « type email ». Dans Utilisateurs et rôles, l'assistant d'installation, la connexion et le contact des réglages de l'entité.
- Note de version pour tous (deux lignes).
- Tests : interface 95 (89 en 0.5.1), serveur 238 (237).

## 0.5.1 (26/10/2026)

Correctif de la recette du 26/10/2026 (DV-04), avant l'étape 6.

- Liste des bâtiments : dans « Changer de lieu », « Parcourir la liste des bâtiments » ouvre et referme la liste ; la liste a un bouton « Masquer la liste » ; « Annuler » apparaît dès qu'une recherche ou la liste est ouverte, même sans lieu choisi. Une entité sans lieu actif affiche un message au lieu d'une liste vide.
- « Mes demandes » n'a plus son propre bouton « Nouvelle demande » : restent celui du haut de l'écran et celui du menu.
- Champs obligatoires : un champ vide ou fait seulement d'espaces affiche « Ce champ est obligatoire » (« Dit veld is verplicht ») sous le champ, avant l'envoi, dans tous les formulaires (lieux, valeurs de liste, catégories, priorités, calendrier, réglages, paramètres, utilisateurs, entités, installation, mot de passe, simulateur), sous les motifs de désactivation et sous la description d'une demande. Le message général « Données invalides » n'apparaît plus dans ces cas ; le serveur refuse toujours ces valeurs. Les mots de passe gardent leurs espaces.
- Aide : la rubrique Nouvelle demande cite « Masquer la liste » ; note de version pour tous.
- Tests : interface 89 (81 en 0.5.0), serveur 237 (236).

## 0.5.0 (26/10/2026)

Étape 5 du planning (lot L1).

- Nouvelle demande au service technique, pour toute personne qui a un rôle dans l'entité : « Nouvelle demande » sur l'accueil, dans le menu et en haut de chaque écran. Un seul écran en trois blocs : Où (lieu proposé d'office, recherche ou liste des bâtiments), Quoi (tuiles des catégories, domaine puis nature), Description (10 caractères au moins). Après l'envoi : numéro, lieu et délai indicatif.
- Numéro par entité, le même en FR et en NL : `AC-DI-2026-00001`, `CPAS-DI-2026-00001`. Code des demandes et remise à un chaque année ou numérotation continue réglés par le responsable dans Réglages de l'entité. Sans trou ni doublon, jamais redonné.
- « Mes demandes » : les demandes de la personne, en cours en premier, état en clair et en couleur, délai annoncé, filtre et recherche, fiche au clic. « Demandes de l'entité » pour le gestionnaire technique et le responsable, en lecture, avec le nom du demandeur.
- Accueil selon le rôle : gros boutons « Nouvelle demande » et « Mes demandes », demandes en cours ; nombre de demandes à qualifier pour le service technique.
- « Mon lieu de travail » dans le menu de l'utilisateur : le lieu proposé d'office dans les demandes ; sans choix, le lieu de la dernière demande.
- Recherche d'un lieu sans accents, en FR et en NL, par le nom, le code, l'adresse, la commune, le type ou le nom du bâtiment ; chaque lieu trouvé montre son chemin.
- Les espaces en trop au début et à la fin d'un texte saisi sont retirés, sauf dans les mots de passe ; un champ obligatoire fait seulement d'espaces est refusé. La mise à jour corrige une fois les libellés déjà enregistrés (défaut « Mobilier » de la recette du 24/10/2026).
- Aide : quatre rubriques, questions 16 à 19, réponses de l'assistant ; note de version.
- Outils MCP `create_demande`, `list_demandes`, `get_demande`, `set_lieu_habituel`.

## 0.4.1 (23/10/2026)

Correctif de la recette du 23/10/2026 (DV-04), avant l'étape 5.

- Simulateur : la date de l'échéance et son délai s'affichent l'un sous l'autre ; on lisait « 08:522 jours ouvrables ». Sur téléphone (moins de 576 px), les libellés du résultat passent au-dessus des valeurs. Vérifié à 1280 et 360 px, aux gabarits iPhone 13 et Galaxy S9+, en FR et en NL.
- Journal d'audit : la modification d'une catégorie, d'un congé, d'une fermeture, d'un lieu, d'une valeur de liste ou d'une entité ne note plus que les champs changés, avec l'ancienne et la nouvelle valeur, et de quoi reconnaître la fiche ; un enregistrement sans changement n'ajoute aucune ligne.
- Mention « Modifié le JJ/MM/AAAA à HH:MM par <nom> » sur chaque catégorie, priorité, jour de l'horaire, congé et fermeture ; « Créé le … » pour une fiche ajoutée et jamais modifiée ; « Valeur livrée, rétablie le … » après un retour aux valeurs livrées ; « Valeur livrée » sinon. Heure de Bruxelles ; nom rendu aux seules personnes de l'entité. Les identifiants internes des auteurs ne sont plus rendus par l'API.
- Aide : rubriques Catégories et délais et Journal d'audit complétées, question 15 de la FAQ, réponse de l'assistant sur « qui a modifié » ; note de version pour le responsable et l'administrateur.
- Tests : un test d'écran instable (limite de 5 secondes dépassée sur une machine lente) reçoit la limite de 30 secondes de ses voisins (écart E-20).

## 0.4.0 (22/10/2026)

- Nouvel écran Catégories et délais du responsable du service technique, dans Réglages du service, propre à chaque entité.
- Catégories des demandes en arbre : un domaine, puis ses natures, en FR et en NL, avec un pictogramme, une priorité proposée, un circuit (envoi direct ou validation du chef de service) et un délai propre facultatif ; une nature reprend les valeurs de son domaine. 8 domaines et 27 natures livrés pour l'AC et le CPAS. Aperçu des tuiles telles que les demandeurs les verront.
- Priorités P1 à P4 et leurs délais de prise en charge et de fin : P1 en heures calendaires (1 h, 4 h), P2 à P4 en jours ouvrables (1 et 2, 2 et 10, 5 et date convenue). Libellés, couleur, décompte et délais réglables, retour aux valeurs livrées.
- Calendrier des jours ouvrables par entité : horaire des ouvriers jour par jour (AC du lundi au jeudi 07:45-16:15 et le vendredi jusqu'à 12:00 ; CPAS du lundi au vendredi 08:00-16:30), dix jours fériés légaux calculés chaque année, congés de l'entité (8 mai, 27 septembre, 2 novembre, 15 novembre, 26 décembre), fermetures par période.
- Simulateur : une priorité ou une catégorie et un moment de réception donnent la prise en charge et la fin, à l'heure de Bruxelles.
- Aide : rubrique « Délais des demandes » pour tous, rubrique du responsable, trois questions de FAQ, réponses de l'assistant sur les délais, les jours fériés et les catégories ; note de version.
- Outils MCP des catégories, des priorités, de l'horaire, des congés et fermetures, des jours fériés et du simulateur.

## 0.3.1 (22/10/2026)

- La question de l'aide sur l'appareil photo qui reste noir couvre aussi les téléphones Android, Samsung compris, avec le réglage de Chrome (Paramètres, Applications, Chrome, Autorisations, Appareil photo) et celui du site ; l'iPhone reste expliqué. L'assistant y mène aussi pour « Android », « Samsung » et « galerie ».

## 0.3.0 (22/10/2026)

- Écran Paramètres de l'administrateur : nom de l'application et du pouvoir local en FR et en NL, contact du support, langue et niveau de détail par défaut. Chaque réglage s'explique, s'applique sans redémarrage, s'inscrit au journal et revient à sa valeur livrée sur demande. Le nom du pouvoir local se corrige ici.
- Modules activables pour toute l'instance, dans l'onglet Modules : le noyau reste actif, Patrimoine se règle, les modules à venir sont annoncés avec leur étape. Patrimoine éteint ferme la gestion des lieux et leurs photos, par l'écran comme par l'assistant, et laisse leur lecture ouverte ; l'écran quitte le menu, l'aide et l'assistant.
- Écran Réglages de l'entité du responsable du service technique : contact du service, téléphone d'urgence et délai de réouverture, propres à chaque entité. Le contact s'affiche dans Aide, Contact.
- Écran Journal d'audit de l'administrateur : qui a fait quoi, quand, dans quelle entité et par quel canal, avec filtres et détail ; l'entité est notée sur chaque action d'une entité.
- Note de version à la première connexion après une mise à jour, adaptée au rôle, et onglet Nouveautés dans l'aide. Un compte nouveau ne voit pas la note en cours.
- Assistant d'installation : langue par défaut et modules choisis dès l'installation.
- Aide : rubriques des écrans nouveaux, questions de FAQ nouvelles dont celle sur l'appareil photo de l'iPhone, réponses de l'assistant.
- Liens de l'écran clair à la couleur de l'institution, plus lisibles que le bleu d'origine.

## 0.2.0 (21/10/2026)

- Écran Patrimoine : arbre des sites, bâtiments, niveaux et locaux de l'entité active, recherche par code, nom ou adresse, fiche du lieu avec son chemin, son type, son statut, son adresse et sa surface. Le lieu choisi est dans l'adresse de la page.
- Création, modification, déplacement et désactivation des lieux par le gestionnaire technique et le responsable, selon les sept règles validées le 21/10/2026 : un bâtiment peut exister sans niveau, un lieu extérieur se range sous un site ou un bâtiment, le code est unique dans l'entité, un lieu qui contient des lieux actifs ne se désactive pas, un bâtiment reprend l'adresse de son site, une photo par lieu, un type exigé pour un local.
- Photo d'un lieu : réduite à 1 600 pixels et débarrassée de ses métadonnées dans le navigateur, contrôlée et nettoyée une seconde fois par le serveur, effacée réellement quand elle est remplacée ou supprimée. Elle est comprise dans la sauvegarde.
- Écran Listes de valeurs du responsable du service technique, avec la première liste : les types de lieux, en FR et en NL, avec ordre et activation. Dix types livrés pour chaque entité.
- Outils MCP des lieux et des listes de valeurs, dont l'effacement d'une photo en deux appels.
- Commande de démonstration : deux sites fictifs par entité, avec bâtiments, niveaux et locaux, sans photo ; une relance garde les lieux déjà présents et les photos déposées.
- Aide, FAQ, assistant et note d'accueil mis à jour en FR et en NL.

## 0.1.1 (15/10/2026)

- Écran Utilisateurs et rôles : les colonnes de droite étaient coupées et ne s'atteignaient qu'en faisant défiler le tableau. Le nom et l'adresse forment maintenant une seule colonne « Personne », la colonne Actions reste fixée à droite, la colonne Actif n'apparaît qu'en mode Complet, et sous 768 px tout s'empile dans une seule colonne.
- L'accès à l'administration se règle dans le panneau Rôles avec les rôles par entité ; la liste montre une étiquette « Administrateur ».
- En mode Simple, la liste ne montre que les comptes actifs.
- Port HTTPS de l'acceptance sur NIXUS : 18443 (le 18444 est pris par la GRC).
- Installée sur NIXUS le 15/10/2026.

## 0.1.0 (15/10/2026)

- Première version de la GMAO, tirée du gabarit v3 1.1.0 (standard v3.2). Ressource d'exemple `items` retirée.
- Entités en données (table `entites`), écran Entités, assistant d'installation qui demande le nom du pouvoir local et la première entité.
- Rôles par entité (table `user_roles`), catalogue des onze rôles dans `backend/config/roles.json`, rôle de demandeur d'office, écran Utilisateurs et rôles.
- Entité active sur la session, sélecteur en boutons dans l'en-tête, contrôle côté serveur et test de cloison entre entités.
- Accueil : entité active, rôles, personnes de l'entité pour les rôles habilités.
- Outils MCP des nouvelles ressources, dont le changement d'entité active.
- Commande de comptes de démonstration fictifs, autorisée par `DEMO_ALLOWED=1`.
- Déploiement : services `api` et `web`, interface livrée construite (`dist/`), utilisateur 10001 dans l'image du serveur, arrêt de la construction si `npm ci` laisse une installation incomplète.
- Installée sur NIXUS le 15/10/2026 (ports 18443 et 18080), entités AC et CPAS créées, comptes de démonstration créés.

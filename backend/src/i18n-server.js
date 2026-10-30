/** Dictionnaire des textes produits par le serveur (patron STEGA utils/i18n-server.js). FR et NL obligatoires. */
const MESSAGES = {
  NO_TOKEN: { fr: 'Connexion requise.', nl: 'Aanmelding vereist.' },
  BAD_TOKEN: { fr: 'Session invalide ou expirée.', nl: 'Ongeldige of verlopen sessie.' },
  CSRF: { fr: 'Requête refusée : en-tête de sécurité absent.', nl: 'Aanvraag geweigerd: beveiligingsheader ontbreekt.' },
  FORBIDDEN: { fr: 'Droits insuffisants.', nl: 'Onvoldoende rechten.' },
  NOT_FOUND: { fr: 'Élément introuvable.', nl: 'Element niet gevonden.' },
  VALIDATION: { fr: 'Données invalides.', nl: 'Ongeldige gegevens.' },
  LOGIN_FAILED: { fr: 'Identifiants incorrects.', nl: 'Ongeldige aanmeldgegevens.' },
  TOO_MANY: { fr: 'Trop de tentatives. Réessayez plus tard.', nl: 'Te veel pogingen. Probeer later opnieuw.' },
  BAD_PASSWORD: { fr: 'Mot de passe actuel incorrect.', nl: 'Huidig wachtwoord onjuist.' },
  INSTALL_CLOSED: { fr: "L'installation est déjà faite.", nl: 'De installatie is al uitgevoerd.' },
  TRANSITION: { fr: "Ce changement de statut n'est pas permis.", nl: 'Deze statuswijziging is niet toegestaan.' },
  CANCELLED: { fr: 'Élément annulé : plus de modification possible.', nl: 'Geannuleerd element: geen wijziging meer mogelijk.' },
  DUPLICATE: { fr: 'Cette adresse est déjà utilisée.', nl: 'Dit adres wordt al gebruikt.' },
  LAST_ADMIN: { fr: 'Le dernier administrateur actif ne peut être ni désactivé ni rétrogradé.', nl: 'De laatste actieve beheerder kan niet worden gedeactiveerd of gedegradeerd.' },
  CONFIRMATION: { fr: 'Jeton de confirmation absent, expiré ou déjà utilisé.', nl: 'Bevestigingstoken ontbreekt, is verlopen of al gebruikt.' },
  INTERNAL: { fr: 'Erreur interne. Elle a été enregistrée.', nl: 'Interne fout. Ze werd geregistreerd.' },
  BAD_JSON: { fr: 'Contenu illisible : JSON invalide.', nl: 'Onleesbare inhoud: ongeldige JSON.' },
  PAYLOAD_TOO_LARGE: { fr: 'Contenu trop volumineux.', nl: 'Inhoud te groot.' },
  NO_ENTITE: { fr: "Aucune entité active : vous n'avez de rôle dans aucune entité. Contactez l'administrateur.", nl: 'Geen actieve entiteit: u hebt in geen enkele entiteit een rol. Neem contact op met de beheerder.' },
  ENTITE_INACTIVE: { fr: 'Cette entité est désactivée.', nl: 'Deze entiteit is gedeactiveerd.' },
  ENTITE_REQUIRED: { fr: "Choisissez l'entité de rattachement de la personne.", nl: 'Kies de entiteit waartoe de persoon behoort.' },
  CODE_DUPLICATE: { fr: 'Ce code est déjà utilisé par une autre entité.', nl: 'Deze code wordt al door een andere entiteit gebruikt.' },
  ROLE_DUPLICATE: { fr: 'La personne a déjà ce rôle dans cette entité.', nl: 'De persoon heeft deze rol al in deze entiteit.' },
  ROLE_DEFAUT: { fr: "Le rôle de demandeur dans l'entité de rattachement ne se retire pas.", nl: 'De rol van aanvrager in de eigen entiteit kan niet worden ingetrokken.' },
  USER_INACTIVE: { fr: 'Ce compte est désactivé.', nl: 'Deze account is gedeactiveerd.' },
  LAST_ENTITE: { fr: 'La dernière entité active ne peut pas être désactivée.', nl: 'De laatste actieve entiteit kan niet worden gedeactiveerd.' },
  REFERENCE_INVALID: { fr: "Référence vers un élément inexistant ou encore utilisé.", nl: 'Verwijzing naar een onbestaand of nog gebruikt element.' },
  VALEUR_DUPLICATE: { fr: 'Ce code existe déjà dans cette liste.', nl: 'Deze code bestaat al in deze lijst.' },
  VALEUR_INVALIDE: { fr: "Cette valeur n'appartient pas à la liste attendue de l'entité ou elle est désactivée.", nl: 'Deze waarde behoort niet tot de verwachte lijst van de entiteit of is gedeactiveerd.' },
  LIEU_CODE_DUPLICATE: { fr: 'Ce code est déjà utilisé par un autre lieu de cette entité.', nl: 'Deze code wordt al gebruikt door een andere plaats van deze entiteit.' },
  LIEU_PARENT: { fr: "Ce lieu ne peut pas se ranger à cet endroit : un bâtiment va sous un site, un niveau sous un bâtiment, un local sous un niveau, un bâtiment ou un site.", nl: 'Deze plaats kan hier niet worden ondergebracht: een gebouw komt onder een site, een verdieping onder een gebouw, een lokaal onder een verdieping, een gebouw of een site.' },
  PARENT_INACTIF: { fr: 'Le lieu parent est désactivé : réactivez-le d’abord.', nl: 'De bovenliggende plaats is gedeactiveerd: heractiveer die eerst.' },
  LIEU_ENFANTS: { fr: 'Ce lieu contient encore des lieux actifs : désactivez-les d’abord.', nl: 'Deze plaats bevat nog actieve plaatsen: deactiveer die eerst.' },
  TYPE_REQUIS: { fr: 'Choisissez le type du local.', nl: 'Kies het soort lokaal.' },
  FILE_TYPE: { fr: "Ce format de fichier n'est pas accepté ici (photo : JPEG ou PNG ; pièce jointe : JPEG, PNG ou PDF).", nl: 'Dit bestandsformaat wordt hier niet aanvaard (foto: JPEG of PNG; bijlage: JPEG, PNG of PDF).' },
  FILE_INVALID: { fr: 'Fichier illisible ou mal formé (photo : 4 096 pixels de côté au plus).', nl: 'Onleesbaar of misvormd bestand (foto: maximaal 4 096 pixels per zijde).' },
  FILE_ACTIVE: { fr: 'Ce PDF contient du contenu actif (script, fichier joint, formulaire) : il est refusé. Imprimez-le en PDF ou scannez-le.', nl: 'Deze pdf bevat actieve inhoud (script, bijgevoegd bestand, formulier): hij wordt geweigerd. Druk hem af als pdf of scan hem.' },
  PIECES_FERMEES: { fr: "Votre entité n'accepte pas de pièces jointes aux demandes.", nl: 'Uw entiteit aanvaardt geen bijlagen bij aanvragen.' },
  PIECES_PLAFOND: { fr: 'Nombre maximal de pièces jointes atteint pour cette demande.', nl: 'Maximaal aantal bijlagen voor deze aanvraag bereikt.' },
  PIECE_VERROUILLEE: { fr: "La demande est prise en charge : seul le service technique peut encore retirer cette pièce jointe.", nl: 'De aanvraag is in behandeling: enkel de technische dienst kan deze bijlage nog verwijderen.' },
  FILE_MISSING: { fr: 'Aucun fichier reçu.', nl: 'Geen bestand ontvangen.' },
  FILE_FORM: { fr: 'Le fichier doit être envoyé seul, dans un formulaire, au champ « fichier ».', nl: 'Het bestand moet alleen worden verzonden, in een formulier, in het veld « fichier ».' },
  MODULE_DISABLED: { fr: "Ce module est désactivé par l'administrateur de l'application.", nl: 'Deze module is uitgeschakeld door de beheerder van de toepassing.' },
  MODULE_NOYAU: { fr: "Ce module fait partie du noyau de l'application : il ne se désactive pas.", nl: 'Deze module behoort tot de kern van de toepassing: ze kan niet worden uitgeschakeld.' },
  MODULE_A_VENIR: { fr: "Ce module n'est pas encore disponible dans cette version.", nl: 'Deze module is nog niet beschikbaar in deze versie.' },
  CATEGORIE_CODE_DUPLICATE: { fr: 'Ce code est déjà utilisé par une autre catégorie de cette entité.', nl: 'Deze code wordt al gebruikt door een andere categorie van deze entiteit.' },
  CATEGORIE_PARENT: { fr: "Une nature se range sous un domaine de l'entité ; un domaine n'a pas de parent et ne devient pas une nature.", nl: 'Een soort komt onder een domein van de entiteit; een domein heeft geen bovenliggend element en wordt geen soort.' },
  CATEGORIE_PARENT_INACTIF: { fr: 'Le domaine est désactivé : réactivez-le d’abord.', nl: 'Het domein is gedeactiveerd: heractiveer het eerst.' },
  CATEGORIE_ENFANTS: { fr: 'Ce domaine contient encore des natures actives : désactivez-les ou déplacez-les d’abord.', nl: 'Dit domein bevat nog actieve soorten: deactiveer of verplaats die eerst.' },
  CATEGORIE_DOMAINE: { fr: 'Un domaine porte toujours sa priorité par défaut et sa règle de validation.', nl: 'Een domein heeft altijd zijn standaardprioriteit en zijn goedkeuringsregel.' },
  PRIORITE_DELAIS: { fr: 'Délais incohérents : la prise en charge compte au moins 1, la fin est vide (date convenue) ou au moins égale à la prise en charge, dans les bornes de l’unité.', nl: 'Onsamenhangende termijnen: de tenlasteneming telt minstens 1, het einde is leeg (afgesproken datum) of minstens gelijk aan de tenlasteneming, binnen de grenzen van de eenheid.' },
  HORAIRE_INVALIDE: { fr: "Horaire invalide : début et fin tous deux vides (jour non ouvré) ou tous deux remplis, le début avant la fin.", nl: 'Ongeldig uurrooster: begin en einde allebei leeg (geen werkdag) of allebei ingevuld, het begin vóór het einde.' },
  JOUR_NON_OUVRE_INVALIDE: { fr: "Un congé porte un jour et un mois qui existent chaque année ; une fermeture, une date de début et une date de fin dans l'ordre, sur un an au plus.", nl: 'Een verlofdag heeft een dag en een maand die elk jaar bestaan; een sluiting een begin- en een einddatum in de juiste volgorde, over hoogstens een jaar.' },
  JOUR_NON_OUVRE_DUPLICATE: { fr: 'Ce congé existe déjà pour cette entité.', nl: 'Deze verlofdag bestaat al voor deze entiteit.' },
  CALENDRIER_VIDE: { fr: "Aucun jour ouvré dans le calendrier de l'entité : réglez l'horaire avant de calculer un délai.", nl: 'Geen enkele werkdag in de kalender van de entiteit: stel het uurrooster in voor u een termijn berekent.' },
  DEMANDE_LIEU_INACTIF: { fr: "Ce lieu n'est plus actif : choisissez-en un autre.", nl: 'Deze plaats is niet meer actief: kies een andere.' },
  DEMANDE_CATEGORIE_INACTIVE: { fr: "Cette catégorie n'est plus proposée : choisissez-en une autre.", nl: 'Deze categorie wordt niet meer aangeboden: kies een andere.' },
  DEMANDE_FERMEE: { fr: "Cette demande est déjà terminée : faites une nouvelle demande si le problème revient.", nl: 'Deze aanvraag is al afgerond: dien een nieuwe aanvraag in als het probleem terugkomt.' },
  BENEFICIAIRE_INVALIDE: { fr: "Cette personne ne peut pas être choisie : elle doit avoir un compte actif dans l'entité, et ne pas être vous.", nl: 'Deze persoon kan niet gekozen worden: ze moet een actief account hebben in de entiteit en mag niet uzelf zijn.' },
  BENEFICIAIRE_DOUBLE: { fr: 'Choisissez soit un collègue, soit un service ou une personne sans compte, pas les deux.', nl: 'Kies een collega of een dienst of persoon zonder account, niet beide.' },
  DATE_SOUHAITEE_INVALIDE: { fr: "La date souhaitée doit être aujourd'hui ou plus tard, dans l'année qui vient.", nl: 'De gewenste datum moet vandaag of later zijn, binnen het komende jaar.' },
  DEMANDE_PROPRE: { fr: 'Cette demande est la vôtre : vous la suivez déjà.', nl: 'Deze aanvraag is van u: u volgt ze al.' },
  DEMANDE_CATEGORIE_A_PRECISER: { fr: 'Précisez le problème : choisissez une des catégories de ce domaine.', nl: 'Verduidelijk het probleem: kies een van de categorieën van dit domein.' },
  LIEU_HABITUEL_INVALIDE: { fr: "Ce lieu ne peut pas être le lieu de travail habituel : il doit être actif et appartenir à une entité où la personne a un rôle.", nl: 'Deze plaats kan niet de gewone werkplek zijn: ze moet actief zijn en behoren tot een entiteit waar de persoon een rol heeft.' },
  QUESTION_REPONSES: { fr: 'Une question « Oui ou non » n’a pas de réponses à écrire ; une question à choix en a de 2 à 6, toutes différentes, en FR et en NL.', nl: 'Een vraag „Ja of nee” heeft geen antwoorden om in te vullen; een keuzevraag heeft er 2 tot 6, allemaal verschillend, in het FR en het NL.' },
  QUESTIONS_MAX: { fr: 'Dix questions actives au plus par catégorie : désactivez-en une d’abord.', nl: 'Hoogstens tien actieve vragen per categorie: deactiveer er eerst een.' },
  QUESTION_INVALIDE: { fr: 'Cette question n’est pas posée pour la catégorie choisie, ou elle n’est plus active : rechargez le formulaire.', nl: 'Deze vraag wordt niet gesteld voor de gekozen categorie, of ze is niet meer actief: laad het formulier opnieuw.' },
  REPONSE_INVALIDE: { fr: 'Cette réponse n’est pas une des réponses proposées.', nl: 'Dit antwoord is niet een van de voorgestelde antwoorden.' },
  REPONSE_OBLIGATOIRE: { fr: 'Répondez aux questions obligatoires sur la catégorie.', nl: 'Beantwoord de verplichte vragen over de categorie.' },
  NO_PHOTO: { fr: "Ce lieu n'a pas de photo.", nl: 'Deze plaats heeft geen foto.' },
};

function langOf(req) {
  if (req && req.user && req.user.lang) return req.user.lang;
  const h = (req && req.headers && req.headers['accept-language']) || '';
  return /^nl/i.test(h) ? 'nl' : 'fr';
}

function L(lang, code) {
  const m = MESSAGES[code];
  if (!m) return code;
  return m[lang] || m.fr;
}

module.exports = { MESSAGES, L, langOf };

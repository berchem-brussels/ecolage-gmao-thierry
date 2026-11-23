/** Un schéma par corps ou requête (patron SAGA schemas.js). Sert aussi au contrat OpenAPI. */
const { T, obj } = require('./validation');
const { ENTITE_ROLES } = require('./roles');
const { LISTES } = require('./services/listes-valeurs');
const parametres = require('./services/parametres');
const { CODES: MODULES, MODULES: CATALOGUE_MODULES } = require('./modules');
const MODULES_REGLABLES = CATALOGUE_MODULES.filter((m) => m.disponible && !m.noyau).map((m) => m.code);
const parametresEntite = require('./services/parametres-entite');
const { ICONES, PRIORITES } = require('./services/categories');
const { UNITES, COULEURS } = require('./services/priorites');

const listQuery = (extra = {}) => obj({
  limit: { ...T.int(1, 200), default: 50 },
  offset: { ...T.int(0), default: 0 },
  q: T.str(100),
  ...extra,
});

const flag = { type: 'integer', enum: [0, 1] };
const code = { type: 'string', pattern: '^[A-Z][A-Z0-9]{1,9}$' };
const motif = T.reqStr(500);

const NATURES = ['site', 'batiment', 'niveau', 'local'];
const STATUTS = ['en_service', 'hors_service', 'cede'];
const valeurCode = { type: 'string', pattern: '^[a-z][a-z0-9_]{1,39}$' };
const faqTopic = { type: ['string', 'null'], pattern: '^[a-z][a-z0-9_.-]{0,59}$' };
const faqFields = { topic_id: faqTopic, question_fr: T.reqStr(300), question_nl: T.reqStr(300), answer_fr: T.reqStr(4000), answer_nl: T.reqStr(4000) };
const lieuFields = {
  code: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._+-]{0,29}$' },
  nom_fr: T.reqStr(200), nom_nl: T.reqStr(200),
  type_id: { type: ['integer', 'null'], minimum: 1 },
  adresse: T.str(200), code_postal: { type: ['string', 'null'], maxLength: 10 }, commune: T.str(100),
  surface_m2: { type: ['number', 'null'], minimum: 0, maximum: 1000000 },
  statut: T.en(...STATUTS),
};

const heure = { type: ['string', 'null'], pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' };
const moisJour = { type: 'string', pattern: '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$' };
const jourIso = { type: 'string', format: 'date' };
// 0.19.0 : code d'équipe (lettres, chiffres, . _ + -) et créneaux de l'horaire d'une équipe (fin « 24:00 » admise).
const equipeCode = { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._+-]{1,19}$' };
const heureCreneau = { type: 'string', pattern: '^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$' };
const prestataireChamps = {
  nom: T.reqStr(150), numero_entreprise: { type: ['string', 'null'], pattern: '^[01][0-9. ]{9,13}$' }, langue: T.en('fr', 'nl'),
  contact_nom: T.str(100), telephone: { type: ['string', 'null'], maxLength: 30, pattern: '^[0-9+ ./()-]*$' },
  courriel: { type: ['string', 'null'], maxLength: 254, pattern: '^$|^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
  adresse: T.str(200), code_postal: { type: ['string', 'null'], maxLength: 10 }, commune: T.str(100), reference_marche: T.str(100),
  corps_metier: { type: 'array', uniqueItems: true, maxItems: 30, items: T.int(1) },
};
const horaireEquipe = {
  type: 'array', maxItems: 7,
  items: obj({ jour: T.int(1, 7), debut: heureCreneau, fin: heureCreneau }, ['jour', 'debut', 'fin']),
};

const categorieFields = {
  code: valeurCode, libelle_fr: T.reqStr(200), libelle_nl: T.reqStr(200), icone: T.en(...ICONES),
  priorite_defaut: { enum: [...PRIORITES, null] }, validation: { enum: [0, 1, null] },
  delai_fin_jours: { type: ['integer', 'null'], minimum: 1, maximum: 365 }, ordre: T.int(0, 100000),
  // 0.19.0 (REF-06) : corps de métier par défaut (liste corps_metier de l'entité) ; null : celui du domaine, ou aucun.
  corps_metier_id: { type: ['integer', 'null'], minimum: 1 },
};

// Questions propres à la catégorie (DEM-05, 0.7.0) : « oui_non » sans réponses, « choix » avec 2 à 6 réponses FR et NL
// (contrôle de service). Réponse d'une demande : « oui » ou « non », ou le rang de la réponse choisie, de « 1 » à « 6 ».
const reponseQuestion = obj({ fr: T.reqStr(100), nl: T.reqStr(100) }, ['fr', 'nl']);
const questionFields = {
  question_fr: T.reqStr(200), question_nl: T.reqStr(200), type: T.en('oui_non', 'choix'),
  reponses: { type: ['array', 'null'], maxItems: 6, items: reponseQuestion }, obligatoire: flag, ordre: T.int(0, 100000),
};
const reponsesDemande = {
  type: 'array', maxItems: 30,
  items: obj({ question_id: T.int(1), valeur: T.en('oui', 'non', '1', '2', '3', '4', '5', '6') }, ['question_id', 'valeur']),
};

const ETATS = ['brouillon', 'en_validation', 'refusee_validation', 'a_qualifier', 'qualifiee', 'planifiee', 'en_cours', 'en_attente',
  'externe', 'terminee', 'cloturee', 'rouverte', 'refusee', 'fusionnee', 'annulee'];

// Filtres de la liste du service technique (0.9.0, GES-02) ; les mêmes clés forment une vue enregistrée.
const listeCodes = { type: 'string', maxLength: 300, pattern: '^[a-z0-9_]+(,[a-z0-9_]+)*$' };
const listePrio = { type: 'string', maxLength: 20, pattern: '^P[1-4](,P[1-4])*$' };
const CANAUX_DEMANDE = ['ecran', 'mcp', 'api', 'telephone', 'courriel', 'grc', 'preventif'];
const TRIS_DEMANDE = ['depot', 'numero', 'echeance', 'priorite'];
/** États d'une demande (config/cycle-de-vie.json, 0.14.0). */
const ETATS_DEMANDE = Object.keys(require('../config/cycle-de-vie.json').etats);
const filtresGestion = {
  etats: listeCodes, priorites: listePrio, categorie_id: T.int(1), batiment_id: T.int(1),
  echeance: T.en('retard', 'proche', 'sans'), canal: T.en(...CANAUX_DEMANDE), danger: flag,
  // 0.14.0 : en attente depuis plus de N jours ouvrés (réglage de l'entité).
  attente: T.en('longue'),
  // 0.15.0 (point 3) : demandes où la personne est mentionnée dans une note qu'elle n'a pas encore lue.
  mentions: T.en('a_voir'),
  // 0.15.0 (point 2) : demandes dont le fil a des messages que la personne n'a pas encore lus.
  messages: T.en('non_lus'),
  // 0.20.0 (point 4 ; GES-02, E-35, DV-163) : demandes dont une tâche non annulée est confiée à l'équipe (ou à l'un de ses
  // membres), ou à l'ouvrier (directement ou par une de ses équipes).
  equipe_id: T.int(1), ouvrier_id: T.int(1),
  tri: T.en(...TRIS_DEMANDE), ordre: T.en('asc', 'desc'),
};
const vueFiltres = obj({ ...filtresGestion, q: T.str(100), ouvertes: flag });
const lieuOuNul = { type: ['integer', 'null'], minimum: 1 };

module.exports = {
  login: obj({ email: T.reqStr(200), password: T.reqStr(200) }, ['email', 'password']),
  // Assistant d'installation : premier administrateur, nom du pouvoir local et première entité (standard v3.2, section 17.7).
  installation: obj({
    email: T.email(), first_name: T.reqStr(100), last_name: T.reqStr(100),
    password: { type: 'string', minLength: 12, maxLength: 200 },
    organisation_fr: T.reqStr(200), organisation_nl: T.reqStr(200),
    entite_code: code, entite_nom_fr: T.reqStr(200), entite_nom_nl: T.reqStr(200),
    // Version 0.3.0 (E-08) : langue par défaut et modules activés dès l'installation ; seuls les modules disponibles
    // hors noyau se choisissent. Sans ces champs, les défauts livrés s'appliquent.
    default_lang: T.en('fr', 'nl'),
    modules: { type: 'array', uniqueItems: true, maxItems: 20, items: T.en(...MODULES_REGLABLES) },
  }, ['email', 'first_name', 'last_name', 'password', 'organisation_fr', 'organisation_nl', 'entite_code', 'entite_nom_fr', 'entite_nom_nl']),
  changePassword: obj({ current_password: T.reqStr(200), new_password: { type: 'string', minLength: 12, maxLength: 200 } }, ['current_password', 'new_password']),
  preferences: obj({ preferred_lang: T.en('fr', 'nl'), ui_mode: T.en('simple', 'complet'), theme: T.en('clair', 'sombre') }),
  entiteActive: obj({ entite_id: T.int(1) }, ['entite_id']),

  entiteList: listQuery({ is_active: flag }),
  entiteCreate: obj({ code, nom_fr: T.reqStr(200), nom_nl: T.reqStr(200) }, ['code', 'nom_fr', 'nom_nl']),
  // is_active ne sert qu'à réactiver ; la désactivation passe par DELETE avec un motif.
  entiteUpdate: obj({ code, nom_fr: T.reqStr(200), nom_nl: T.reqStr(200), is_active: { type: 'integer', enum: [1] } }),
  entiteDeactivate: obj({ motif }, ['motif']),

  roleList: obj({}),
  roleParams: obj({ code: { type: 'string', pattern: '^[a-z_]{2,40}$' } }, ['code']),

  userRoleList: listQuery({ user_id: T.int(1), entite_id: T.int(1), role: T.en(...ENTITE_ROLES), is_active: flag }),
  userRoleCreate: obj({ user_id: T.int(1), entite_id: T.int(1), role: T.en(...ENTITE_ROLES) }, ['user_id', 'entite_id', 'role']),
  userRoleUpdate: obj({ role: T.en(...ENTITE_ROLES) }, ['role']),
  userRoleRetrait: obj({ motif }, ['motif']),

  // Listes de valeurs (REF-08) : la liste admise vient du catalogue config/listes-valeurs.json.
  valeurList: listQuery({ liste: T.en(...LISTES), is_active: flag }),
  valeurCreate: obj({
    liste: T.en(...LISTES), code: valeurCode, libelle_fr: T.reqStr(200), libelle_nl: T.reqStr(200), ordre: T.int(0, 100000),
  }, ['liste', 'code', 'libelle_fr', 'libelle_nl']),
  // Le code et la liste ne changent pas après la création ; is_active ne sert qu'à réactiver.
  valeurUpdate: obj({ libelle_fr: T.reqStr(200), libelle_nl: T.reqStr(200), ordre: T.int(0, 100000), is_active: { type: 'integer', enum: [1] } }),
  valeurDeactivate: obj({ motif }, ['motif']),
  // 0.15.0 (point 4, GES-09) : modèles de réponse au demandeur, FR et NL.
  modeleList: listQuery({ is_active: flag }),
  modeleCreate: obj({ titre_fr: T.reqStr(100), titre_nl: T.reqStr(100), texte_fr: T.reqStr(4000), texte_nl: T.reqStr(4000), ordre: T.int(0, 100000) },
    ['titre_fr', 'titre_nl', 'texte_fr', 'texte_nl']),
  modeleUpdate: obj({ titre_fr: T.reqStr(100), titre_nl: T.reqStr(100), texte_fr: T.reqStr(4000), texte_nl: T.reqStr(4000), ordre: T.int(0, 100000), is_active: { type: 'integer', enum: [1] } }),
  modeleDeactivate: obj({ motif }, ['motif']),

  // Référentiel des lieux (REF-01, REF-02). La nature ne change pas après la création.
  // 0.13.0 (étape 8 ter) : has_photo filtre les lieux avec (1) ou sans (0) photo.
  lieuList: listQuery({ nature: T.en(...NATURES), parent_id: T.int(1), type_id: T.int(1), statut: T.en(...STATUTS), is_active: flag, has_photo: flag }),
  lieuArbre: obj({ inclure_inactifs: { ...flag, default: 0 } }),
  lieuCreate: obj({
    nature: T.en(...NATURES), parent_id: T.int(1), ...lieuFields,
  }, ['nature', 'code', 'nom_fr', 'nom_nl']),
  lieuUpdate: obj({ parent_id: T.int(1), ...lieuFields, is_active: { type: 'integer', enum: [1] } }),
  lieuDeactivate: obj({ motif }, ['motif']),

  // Catégories d'intervention en arbre (REF-06) : domaine sans parent, nature sous un domaine. Une nature met priorité,
  // validation ou délai à null pour reprendre ceux de son domaine ; un domaine les porte toujours (contrôle de service).
  categorieList: listQuery({ niveau: T.en('domaine', 'nature'), parent_id: T.int(1), priorite: T.en(...PRIORITES), is_active: flag }),
  categorieArbre: obj({ inclure_inactifs: { ...flag, default: 0 } }),
  categorieCreate: obj({ parent_id: T.int(1), ...categorieFields }, ['code', 'libelle_fr', 'libelle_nl']),
  categorieUpdate: obj({ parent_id: T.int(1), ...categorieFields, is_active: { type: 'integer', enum: [1] } }),
  categorieDeactivate: obj({ motif }, ['motif']),
  // Questions d'une catégorie (DEM-05, 0.7.0) : liste sur la fiche de la catégorie ; une question ne se supprime pas.
  questionList: obj({ inclure_inactives: { ...flag, default: 0 } }),
  questionCreate: obj({ ...questionFields }, ['question_fr', 'question_nl', 'type']),
  questionUpdate: obj({ ...questionFields, is_active: { type: 'integer', enum: [1] } }),
  questionDeactivate: obj({ motif }, ['motif']),

  // Priorités P1 à P4 et délais par entité (PRI-02) : catalogue fermé ; cohérence des délais contrôlée par le service.
  prioriteList: obj({ limit: { ...T.int(1, 200), default: 50 }, offset: { ...T.int(0), default: 0 } }),
  prioriteParams: obj({ code: T.en(...PRIORITES) }, ['code']),
  prioriteUpdate: obj({
    libelle_fr: T.reqStr(100), libelle_nl: T.reqStr(100), description_fr: T.str(500), description_nl: T.str(500),
    couleur: T.en(...COULEURS), unite: T.en(...UNITES), prise_en_charge: T.int(1, 720), fin: { type: ['integer', 'null'], minimum: 1, maximum: 720 },
  }),
  prioriteReset: obj({}),

  // Calendrier des jours ouvrables par entité (PRI-02) : horaire de sept jours (catalogue fermé, écart E-19), congés
  // répétés chaque année et fermetures ponctuelles, jours fériés légaux calculés, simulateur d'échéance.
  horaireList: obj({ limit: { ...T.int(1, 200), default: 50 }, offset: { ...T.int(0), default: 0 } }),
  horaireParams: obj({ jour: T.int(1, 7) }, ['jour']),
  horaireUpdate: obj({ debut: heure, fin: heure }),
  horaireReset: obj({}),
  jourList: listQuery({ nature: T.en('conge', 'fermeture'), annee: T.int(2000, 2100), is_active: flag }),
  jourCreate: obj({
    nature: T.en('conge', 'fermeture'), mois_jour: moisJour, date_debut: jourIso, date_fin: jourIso, libelle_fr: T.reqStr(200), libelle_nl: T.reqStr(200),
  }, ['nature', 'libelle_fr', 'libelle_nl']),
  // La nature ne change pas après la création ; is_active ne sert qu'à réactiver.
  jourUpdate: obj({ mois_jour: moisJour, date_debut: jourIso, date_fin: jourIso, libelle_fr: T.reqStr(200), libelle_nl: T.reqStr(200), is_active: { type: 'integer', enum: [1] } }),
  jourDeactivate: obj({ motif }, ['motif']),
  ferieList: obj({ annee: T.int(2000, 2100) }),
  echeanceSimulation: obj({ priorite: T.en(...PRIORITES), recu_le: { type: 'string', format: 'date-time' }, categorie_id: T.int(1) }),

  // Paramètres de l'instance (ADM-01) : catalogue fermé de config/parametres-instance.json ; la valeur se contrôle
  // ensuite selon son type (texte, choix) dans la couche de service.
  parametreList: listQuery({ groupe: T.en(...parametres.GROUPES.map((g) => g.code)) }),
  parametreParams: obj({ cle: { type: 'string', pattern: '^[a-z_]{2,20}\\.[a-z_]{2,40}$' } }, ['cle']),
  // 0.7.0 : 3 000 caractères pour les mentions RGPD (texte_long) ; chaque catalogue contrôle ensuite son propre plafond.
  parametreUpdate: obj({ valeur: { type: 'string', maxLength: 3000 } }, ['valeur']),
  parametreReset: obj({}),
  // Paramètres métier par entité (ADM-03) : mêmes clés et corps que ceux de l'instance, catalogue config/parametres-entite.json.
  parametreEntiteList: listQuery({ groupe: T.en(...parametresEntite.GROUPES.map((g) => g.code)) }),

  // Modules activables (ADM-02) : catalogue fermé de config/modules.json, réglés pour toute l'instance.
  moduleList: listQuery({ actif: flag, disponible: flag }),
  moduleParams: obj({ code: T.en(...MODULES) }, ['code']),
  moduleUpdate: obj({ actif: flag }, ['actif']),

  // Journal d'audit (lecture seule) : action exacte ou famille (« lieu » pour « lieu.* »), personne, entité, canal, période ISO.
  auditList: listQuery({
    action: { type: 'string', pattern: '^[a-z_]{2,40}(\\.[a-z_]{2,40}){0,3}$' }, user_id: T.int(1), entite_id: T.int(1),
    channel: T.en('api', 'mcp', 'cli'), du: { type: 'string', format: 'date-time' }, au: { type: 'string', format: 'date-time' },
  }),

  // Notes de version (lecture) et nouveautés lues.
  noteList: obj({ limit: { ...T.int(1, 200), default: 50 }, offset: { ...T.int(0), default: 0 } }),
  noteParams: obj({ version: { type: 'string', pattern: '^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$' } }, ['version']),
  nouveautesLues: obj({}),

  userList: listQuery({ is_active: flag, entite_id: T.int(1), service_id: T.int(1) }),
  // Modèle Microsoft 365 (standard v3.2, section 8.1) : mot de passe généré ou encodé, changement imposé en option.
  userCreate: {
    ...obj({
      email: T.email(), first_name: T.reqStr(100), last_name: T.reqStr(100),
      user_role: T.en('agent', 'admin'), preferred_lang: T.en('fr', 'nl'), entite_id: T.int(1),
      password_mode: { enum: ['generated', 'manual'], default: 'generated' },
      password: { type: 'string', minLength: 8, maxLength: 200 },
      must_change_password: { type: 'boolean', default: false },
    }, ['email', 'first_name', 'last_name', 'entite_id']),
    if: { properties: { password_mode: { const: 'manual' } }, required: ['password_mode'] },
    then: { required: ['password'] },
  },
  userUpdate: obj({
    first_name: T.reqStr(100), last_name: T.reqStr(100), entite_id: T.int(1),
    user_role: T.en('agent', 'admin'), preferred_lang: T.en('fr', 'nl'), is_active: flag,
    // Lieu de travail habituel (REF-04, DV-42), réglé par l'administrateur ; null l'efface.
    lieu_habituel_id: lieuOuNul,
    // Accès de secours par mot de passe en mode « sso » (section 8.6), réglé par l'administrateur.
    is_admin_local: flag,
    // 0.16.0 (ROL-04) : service du compte dans son entité de rattachement ; null le retire.
    service_id: { type: ['integer', 'null'], minimum: 1 },
  }),

  // 0.16.0 (étape 11 ; ROL-04) : services des entités, valideur et suppléant pour une période (administrateur).
  serviceList: listQuery({ entite_id: T.int(1), is_active: flag }),
  serviceCreate: obj({
    entite_id: T.int(1), code: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._+-]{1,29}$' }, nom_fr: T.reqStr(150), nom_nl: T.reqStr(150),
    valideur_id: { type: ['integer', 'null'], minimum: 1 }, suppleant_id: { type: ['integer', 'null'], minimum: 1 },
    suppleant_du: { type: ['string', 'null'], format: 'date' }, suppleant_au: { type: ['string', 'null'], format: 'date' }, ordre: T.int(0, 100000),
  }, ['entite_id', 'code', 'nom_fr', 'nom_nl']),
  serviceUpdate: obj({
    code: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._+-]{1,29}$' }, nom_fr: T.reqStr(150), nom_nl: T.reqStr(150),
    valideur_id: { type: ['integer', 'null'], minimum: 1 }, suppleant_id: { type: ['integer', 'null'], minimum: 1 },
    suppleant_du: { type: ['string', 'null'], format: 'date' }, suppleant_au: { type: ['string', 'null'], format: 'date' }, ordre: T.int(0, 100000),
    is_active: { type: 'integer', enum: [1] },
  }),
  serviceDeactivate: obj({ motif }, ['motif']),

  // 0.20.0 (point 1 ; CYC-03, DV-160) : tâches d'une demande. Durée estimée en minutes, bornes de la qualification.
  tacheCreate: obj({
    titre: { type: 'string', minLength: 3, maxLength: 200 }, consignes: T.str(2000),
    corps_metier_id: { type: ['integer', 'null'], minimum: 1 }, duree_estimee_min: { type: ['integer', 'null'], minimum: 15, maximum: 10080 },
  }, ['titre']),
  tacheUpdate: obj({
    titre: { type: 'string', minLength: 3, maxLength: 200 }, consignes: T.str(2000),
    corps_metier_id: { type: ['integer', 'null'], minimum: 1 }, duree_estimee_min: { type: ['integer', 'null'], minimum: 15, maximum: 10080 },
  }),
  // 0.21.0 (point 1, R5) : debut et fin (date et heure ISO 8601 avec fuseau) pour terminer une tâche jamais démarrée.
  tacheEtat: obj({ etat: T.en('a_faire', 'en_cours', 'terminee', 'annulee'), motif: T.str(500),
    debut: { type: 'string', format: 'date-time', maxLength: 40 }, fin: { type: 'string', format: 'date-time', maxLength: 40 } }, ['etat']),
  // Point 2 (PLA-01, DV-161) : affectation complète (remplace la précédente) ; une équipe ou des ouvriers, pas les deux.
  tacheAffectation: obj({
    ouvriers: { type: 'array', uniqueItems: true, maxItems: 10, items: T.int(1) }, equipe_id: { type: ['integer', 'null'], minimum: 1 },
    date_prevue: { type: ['string', 'null'], format: 'date' }, heure_debut: { type: ['string', 'null'], pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
    duree_estimee_min: { type: ['integer', 'null'], minimum: 15, maximum: 10080 },
  }),
  // Point 3 (PLA-02, DV-162) : suggestion d'affectation, jour (par défaut celui de la tâche, sinon aujourd'hui) et compétence.
  tacheSuggestions: obj({ date: { type: 'string', format: 'date' }, competence_id: { type: 'integer', minimum: 1 } }),
  // Équipes et ouvriers (0.19.0, étape 15, point 2 ; ROL-05, DV-28). Horaire : un créneau par jour au plus (contrôlé par le
  // service), 1 = lundi … 7 = dimanche ; [] = horaire de l'entité. Membres et horaire remplacent les précédents en entier.
  equipeList: listQuery({ is_active: flag }),
  equipeCreate: obj({
    code: equipeCode, nom_fr: T.reqStr(100), nom_nl: T.reqStr(100), chef_id: { type: ['integer', 'null'], minimum: 1 },
    membres: { type: 'array', uniqueItems: true, maxItems: 100, items: T.int(1) }, horaire: horaireEquipe, ordre: T.int(0, 100000),
  }, ['code', 'nom_fr', 'nom_nl']),
  equipeUpdate: obj({
    code: equipeCode, nom_fr: T.reqStr(100), nom_nl: T.reqStr(100), chef_id: { type: ['integer', 'null'], minimum: 1 },
    membres: { type: 'array', uniqueItems: true, maxItems: 100, items: T.int(1) }, horaire: horaireEquipe, ordre: T.int(0, 100000),
    is_active: { type: 'integer', enum: [1] },
  }),
  equipeDeactivate: obj({ motif }, ['motif']),
  ouvrierList: listQuery({ equipe_id: T.int(1), corps_metier_id: T.int(1), competence_id: T.int(1) }),
  // 0.21.0 (étape 17, point 3 ; PLA-03) : planning d'une période de 1 à 14 jours (par défaut la semaine en cours).
  planningQuery: obj({ du: { type: 'string', format: 'date' }, au: { type: 'string', format: 'date' } }),
  // 0.21.0 (étape 17, point 2 ; PLA-04) : indisponibilités des ouvriers ; du et au en AAAA-MM-JJ (au par défaut : du).
  indispoList: listQuery({ user_id: T.int(1), du: { type: 'string', format: 'date' }, au: { type: 'string', format: 'date' } }),
  indispoCreate: obj({ user_id: T.int(1), du: { type: 'string', format: 'date' }, au: { type: 'string', format: 'date' },
    periode: T.en('journee', 'matin', 'apres_midi'), motif: T.en('conge', 'formation', 'autre') }, ['user_id', 'du', 'motif']),
  indispoUpdate: obj({ du: { type: 'string', format: 'date' }, au: { type: 'string', format: 'date' },
    periode: T.en('journee', 'matin', 'apres_midi'), motif: T.en('conge', 'formation', 'autre') }),
  // Prestataires externes (0.19.0, point 3 ; REF-07, EXT-03). Numéro d'entreprise : chiffres et points, contrôlé (modulo 97)
  // et normalisé par le service ; corps_metier : liste complète des identifiants.
  prestataireList: listQuery({ is_active: flag, corps_metier_id: T.int(1) }),
  prestataireCreate: obj(prestataireChamps, ['nom']),
  prestataireUpdate: obj({ ...prestataireChamps, is_active: { type: 'integer', enum: [1] } }),
  prestataireDeactivate: obj({ motif }, ['motif']),
  ouvrierUpdate: obj({
    corps_metier_id: { type: ['integer', 'null'], minimum: 1 },
    competences: { type: 'array', uniqueItems: true, maxItems: 50, items: T.int(1) },
  }),
  demandeAValider: listQuery({}),

  // Réglages de la connexion Microsoft (gabarit 1.3.0, section 8.6) ; le secret est chiffré et jamais renvoyé.
  authSettings: obj({
    mode: T.en('local', 'sso', 'sso_optional'),
    tenant: T.str(100), client_id: T.str(100), client_secret: { type: 'string', maxLength: 500 },
    public_url: { type: 'string', maxLength: 300, pattern: '^(https://[^\\s/]+(/[^\\s]*)?)?$' },
    domains: T.str(500),
  }),

  // 0.17.0 (étape 13, point 2) : courriel (SMTP en paramètres, mode test, envoi d'essai, journal des envois).
  courrielSettings: obj({
    mode: T.en('test', 'smtp'),
    host: { type: 'string', maxLength: 200, pattern: '^[A-Za-z0-9.-]*$' },
    port: T.int(1, 65535),
    securite: T.en('starttls', 'tls', 'aucune'),
    user: T.str(200), password: { type: 'string', maxLength: 500 },
    from: { anyOf: [{ type: 'string', maxLength: 0 }, T.email()] },
    from_name: { type: 'string', maxLength: 100, pattern: '^[^<>"\\r\\n]*$' },
    public_url: { type: 'string', maxLength: 300, pattern: '^(https://[^\\s/]+(/[^\\s]*)?)?$' },
  }),
  courrielEssai: obj({ destinataire: T.email() }),
  courrielList: listQuery({ etat: T.en('test', 'en_attente', 'envoye', 'echec') }),
  // Point 3 : modèles de courriel (sujet sur une ligne ; variables contrôlées par le service).
  modeleCourrielParams: obj({ code: { type: 'string', maxLength: 60, pattern: '^[a-z_]+(\\.[a-z_]+){1,2}$' } }, ['code']),
  modeleCourrielUpdate: { ...obj({
    sujet_fr: { type: 'string', minLength: 1, maxLength: 150, pattern: '^[^\\r\\n]*$' },
    sujet_nl: { type: 'string', minLength: 1, maxLength: 150, pattern: '^[^\\r\\n]*$' },
    corps_fr: T.reqStr(4000), corps_nl: T.reqStr(4000),
  }), minProperties: 1 },
  modeleCourrielApercu: obj({
    langue: T.en('fr', 'nl'),
    sujet: { type: 'string', maxLength: 150, pattern: '^[^\\r\\n]*$' },
    corps: { type: 'string', maxLength: 4000 },
  }, ['langue']),
  modeleCourrielRetablir: obj({}),

  // Demandes d'intervention (DEM-01 à 03, SUI-01) : un lieu, une catégorie, une description de 10 caractères au moins
  // (comptés après le retrait des espaces, DV-37). perimetre « entite » : gestionnaire et responsable (DV-46).
  demandeList: listQuery({ etat: T.en(...ETATS), ouvertes: flag, perimetre: { enum: ['miennes', 'entite'], default: 'miennes' }, ...filtresGestion }),
  // 0.18.0 (point 2, IMP-03) : export Excel ou CSV d'une liste avec les mêmes filtres, sans pagination ; format obligatoire.
  demandeExport: obj({ q: T.str(100), etat: T.en(...ETATS), ouvertes: flag, perimetre: { enum: ['miennes', 'entite'], default: 'miennes' }, ...filtresGestion,
    format: T.en('xlsx', 'csv') }, ['format']),
  demandeAValiderExport: obj({ q: T.str(100), format: T.en('xlsx', 'csv') }, ['format']),
  // Qualification par le service technique (0.9.0, GES-04, PRI-01) : catégorie, lieu et priorité obligatoires ; le motif
  // est exigé par le serveur quand la priorité diffère de la priorité proposée. Champs facultatifs absents : inchangés.
  demandeQualifier: obj({
    categorie_id: T.int(1), lieu_id: T.int(1), priorite: T.en('P1', 'P2', 'P3', 'P4'),
    motif_priorite: T.str(500),
    duree_estimee_minutes: { type: ['integer', 'null'], minimum: 15, maximum: 10080 },
    consignes: T.str(2000), photos_visibles: flag,
    date_convenue: { type: ['string', 'null'], format: 'date' },
    // 0.19.0 (GES-04) : corps de métier ; absent, celui déjà noté ou, à défaut, celui de la catégorie ; null : aucun.
    corps_metier_id: { type: ['integer', 'null'], minimum: 1 },
  }, ['categorie_id', 'lieu_id', 'priorite']),
  // Vues enregistrées de la liste du service technique (0.9.0, GES-02) : un nom et les filtres de la liste.
  vueList: listQuery(),
  // 0.17.0 (étape 13) : notifications de la cloche de la personne connectée, dans l'entité active.
  notificationList: listQuery({ non_lues: flag }),
  notificationLue: obj({}),
  vueCreate: obj({ nom: T.reqStr(60), filtres: vueFiltres }, ['nom', 'filtres']),
  vueUpdate: obj({ nom: T.reqStr(60), filtres: vueFiltres }),
  demandeCreate: obj({
    lieu_id: T.int(1), categorie_id: T.int(1), description: { type: 'string', minLength: 10, maxLength: 5000 }, langue: T.en('fr', 'nl'),
    // 0.7.0 (DEM-06) : « Danger pour les personnes ou les biens » ; la demande part en P1.
    danger: flag,
    // 0.7.0 (DEM-07, DEM-08) : pour un collègue (beneficiaire_id) ou pour un service ou une personne sans compte
    // (beneficiaire_texte), l'un ou l'autre ; date souhaitée (AAAA-MM-JJ) et créneau, facultatifs.
    beneficiaire_id: { type: ['integer', 'null'], minimum: 1 }, beneficiaire_texte: T.str(200),
    // 0.16.0 (étape 12, GES-05) : demande encodée par le service technique pour un agent de l'entité, reçue par
    // téléphone ou par courriel ; les deux champs vont ensemble.
    demandeur_id: T.int(1), canal: T.en('telephone', 'courriel'),
    date_souhaitee: { type: ['string', 'null'], format: 'date' }, creneau: T.str(200),
    // 0.7.0 (DEM-05) : réponses aux questions de la catégorie et de son domaine.
    reponses: reponsesDemande,
  }, ['lieu_id', 'categorie_id', 'description']),
  // Brouillon du formulaire (DEM-11, 0.7.0) : ce que l'écran affiche, pour le reprendre tel quel ; tout est facultatif.
  brouillonSave: obj({
    contenu: obj({
      danger: flag,
      lieu: { anyOf: [{ type: 'null' }, obj({
        // nature : rendue avec le lieu proposé par le profil (lieu_propose) ; acceptée depuis la 0.7.1.
        id: T.int(1), code: T.str(60), nom_fr: T.str(200), nom_nl: T.str(200), nature: T.str(20), source: T.str(30),
        chemin: { type: 'array', maxItems: 8, items: obj({ id: T.int(1), nature: T.str(20), code: T.str(60), nom_fr: T.str(200), nom_nl: T.str(200) }, ['id']) },
      }, ['id']) ] },
      categorie: { anyOf: [{ type: 'null' }, obj({
        id: T.int(1), libelle_fr: T.str(200), libelle_nl: T.str(200), icone: T.str(40), domaine_fr: T.str(200), domaine_nl: T.str(200),
      }, ['id']) ] },
      description: T.str(5000),
      pour_mode: T.en('collegue', 'texte'),
      collegue: { anyOf: [{ type: 'null' }, obj({ id: T.int(1), prenom: T.str(100), nom: T.str(100) }, ['id'])] },
      beneficiaire_texte: T.str(200), date_souhaitee: { type: ['string', 'null'], format: 'date' }, creneau: T.str(200),
      reponses: reponsesDemande,
    }),
  }, ['contenu']),
  // Recherche d'un collègue de l'entité active pour le champ « Pour » : 2 caractères au moins.
  demandeBeneficiaires: obj({ q: { type: 'string', minLength: 2, maxLength: 100 } }, ['q']),
  // Demandes ouvertes du même bâtiment, avant l'envoi (DEM-04, 0.7.0) : lieu choisi, catégorie choisie pour l'ordre.
  demandeVoisines: obj({ lieu_id: T.int(1), categorie_id: T.int(1), limit: { ...T.int(1, 50), default: 5 } }, ['lieu_id']),
  // « Moi aussi » (DEM-04) : la remarque facultative est lisible du seul service technique.
  // 0.15.0 (point 5, SUI-09) : source « abonnement » pour suivre une demande vue, sans remarque.
  demandeSuivre: obj({ remarque: T.str(5000), source: T.en('moi_aussi', 'abonnement') }),
  // Cycle de vie (0.14.0, CYC-01, CLO-01) : état d'arrivée, motif (valeur de la liste du passage), commentaire, compte rendu.
  demandeTransition: obj({
    etat: T.en(...ETATS_DEMANDE),
    motif_id: { type: ['integer', 'null'], minimum: 1 },
    commentaire: T.str(2000), compte_rendu: T.str(5000),
  }, ['etat']),
  // Point 5 (SUI-05, E-21) : complément du demandeur (texte, dans sa langue) ; annulation avec un motif.
  demandeComplement: obj({ complement: T.reqStr(2000), langue: T.en('fr', 'nl') }, ['complement']),
  demandeAnnulation: obj({ motif: T.reqStr(2000) }, ['motif']),
  // 0.16.0 (GES-06) : fusion dans une demande principale de l'entité, commentaire facultatif lu par le demandeur.
  demandeFusion: obj({ principale_id: T.int(1), commentaire: T.str(2000) }, ['principale_id']),
  // 0.16.0 (GES-06) : découpage en une à cinq demandes nouvelles ; lieu et catégorie de l'origine si non donnés.
  demandeDecoupage: obj({
    parties: { type: 'array', minItems: 1, maxItems: 5, items: obj({
      description: { type: 'string', minLength: 10, maxLength: 5000 }, categorie_id: T.int(1), lieu_id: T.int(1),
    }, ['description']) },
    commentaire: T.str(2000), langue: T.en('fr', 'nl'),
  }, ['parties']),
  // Point 6 (SUI-06) : avis en cinq niveaux, commentaire facultatif.
  demandeAvis: obj({ note: T.int(1, 5), commentaire: T.str(2000) }, ['note']),
  // 0.15.0 (point 1 ; SUI-04) : message du fil ; texte facultatif si des pièces attendent le message ; interne : service.
  demandeMessage: obj({
    texte: T.str(4000), interne: T.bool(), langue: T.en('fr', 'nl'),
    // Point 3 (GES-08) : collègues du service mentionnés, dans une note interne seulement.
    mentions: { type: 'array', items: T.int(1), maxItems: 10, uniqueItems: true },
  }),
  // 0.15.0 (point 2) : fil lu jusqu'au dernier message visible, ou jusqu'à un message donné.
  demandeMessagesLus: obj({ jusqu_a: T.int(1) }),
  etatDemandeParams: obj({ code: T.en(...ETATS_DEMANDE) }, ['code']),
  etatDemandeUpdate: obj({ libelle_fr: T.reqStr(100), libelle_nl: T.reqStr(100), grc_fr: T.reqStr(100), grc_nl: T.reqStr(100) }),
  // Lieu de travail habituel choisi par la personne dans « Mon profil » ; null l'efface.
  lieuHabituel: obj({ lieu_id: lieuOuNul }, ['lieu_id']),

  // Tickets (standard, section 13.5 ; 0.11.0) : schémas du gabarit 1.3.0 repris à l'identique.
  ticketList: listQuery({
    status: T.en('new', 'in_progress', 'waiting_requester', 'resolved', 'rejected', 'cancelled', 'closed'),
    type: T.en('incident', 'bug', 'question', 'wish'), queue: T.en('business', 'it'),
    open_only: { type: 'boolean' }, mine: { type: 'boolean' },
  }),
  // 0.18.0 (point 2, IMP-03) : export des tickets avec les filtres de la liste.
  ticketExport: obj({
    q: T.str(100), status: T.en('new', 'in_progress', 'waiting_requester', 'resolved', 'rejected', 'cancelled', 'closed'),
    type: T.en('incident', 'bug', 'question', 'wish'), queue: T.en('business', 'it'),
    open_only: { type: 'boolean' }, mine: { type: 'boolean' }, format: T.en('xlsx', 'csv'),
  }, ['format']),
  ticketCreate: obj({
    type: T.en('incident', 'bug', 'question', 'wish'), title: T.reqStr(200),
    description: T.text(8000), expected: T.text(4000), actual: T.text(4000),
    impact: T.en('person', 'service', 'organisation'), urgency: T.en('blocking', 'annoying', 'comfort'),
    screen: T.str(200), context: { type: 'object' }, screenshot: { type: 'string', maxLength: 2900000 },
  }, ['type', 'title']),
  ticketUpdate: obj({
    title: T.reqStr(200), description: T.text(8000), expected: T.text(4000), actual: T.text(4000),
    assignee_id: { type: ['integer', 'null'], minimum: 1 }, impact: T.en('person', 'service', 'organisation'),
    urgency: T.en('blocking', 'annoying', 'comfort'), priority: T.en('P1', 'P2', 'P3', 'P4'),
    wish_status: T.en('study', 'planned', 'delivered', 'refused'), fixed_version: T.str(30),
    queue: T.en('business', 'it'), reason: T.str(2000),
  }),
  ticketStatus: obj({ to: T.en('in_progress', 'waiting_requester', 'resolved', 'rejected', 'cancelled', 'closed', 'reopen'), reason: T.str(4000) }, ['to']),
  ticketMessage: obj({ body: T.reqStr(8000), is_internal: { type: 'boolean' } }, ['body']),

  // FAQ locale (standard, section 13.1 ; 0.12.0) : schémas du gabarit 1.3.0, plus la portée, la recherche, la
  // désactivation avec motif et la transformation d'une question métier (E-44). topic_id : fiche d'aide d'un écran.
  faqList: listQuery({ topic_id: faqTopic, inclure_inactives: { ...flag, default: 0 } }),
  faqCreate: obj({ portee: T.en('commune', 'entite'), ...faqFields }, ['question_fr', 'question_nl', 'answer_fr', 'answer_nl']),
  faqUpdate: obj({ ...faqFields, is_active: { type: 'integer', enum: [1] } }),
  faqDeactivate: obj({ motif }, ['motif']),
  faqFromTicket: obj({ ...faqFields }, ['question_fr', 'question_nl', 'answer_fr', 'answer_nl']),
};

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

const categorieFields = {
  code: valeurCode, libelle_fr: T.reqStr(200), libelle_nl: T.reqStr(200), icone: T.en(...ICONES),
  priorite_defaut: { enum: [...PRIORITES, null] }, validation: { enum: [0, 1, null] },
  delai_fin_jours: { type: ['integer', 'null'], minimum: 1, maximum: 365 }, ordre: T.int(0, 100000),
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

  // Référentiel des lieux (REF-01, REF-02). La nature ne change pas après la création.
  lieuList: listQuery({ nature: T.en(...NATURES), parent_id: T.int(1), type_id: T.int(1), statut: T.en(...STATUTS), is_active: flag }),
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

  userList: listQuery({ is_active: flag, entite_id: T.int(1) }),
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
  }),

  // Demandes d'intervention (DEM-01 à 03, SUI-01) : un lieu, une catégorie, une description de 10 caractères au moins
  // (comptés après le retrait des espaces, DV-37). perimetre « entite » : gestionnaire et responsable (DV-46).
  demandeList: listQuery({ etat: T.en(...ETATS), ouvertes: flag, perimetre: { enum: ['miennes', 'entite'], default: 'miennes' } }),
  demandeCreate: obj({
    lieu_id: T.int(1), categorie_id: T.int(1), description: { type: 'string', minLength: 10, maxLength: 5000 }, langue: T.en('fr', 'nl'),
    // 0.7.0 (DEM-06) : « Danger pour les personnes ou les biens » ; la demande part en P1.
    danger: flag,
    // 0.7.0 (DEM-07, DEM-08) : pour un collègue (beneficiaire_id) ou pour un service ou une personne sans compte
    // (beneficiaire_texte), l'un ou l'autre ; date souhaitée (AAAA-MM-JJ) et créneau, facultatifs.
    beneficiaire_id: { type: ['integer', 'null'], minimum: 1 }, beneficiaire_texte: T.str(200),
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
  demandeSuivre: obj({ remarque: T.str(5000) }),
  // Lieu de travail habituel choisi par la personne dans « Mon profil » ; null l'efface.
  lieuHabituel: obj({ lieu_id: lieuOuNul }, ['lieu_id']),
};

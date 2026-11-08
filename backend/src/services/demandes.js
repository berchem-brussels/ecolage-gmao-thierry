/**
 * Demandes d'intervention, côté demandeur (cahier des charges DEM-01 à DEM-03, SUI-01, REF-04, NUM-01 à NUM-05 ;
 * décisions DV-39 à DV-46 du 26/10/2026).
 *   1. Toute personne qui a un rôle dans l'entité active dépose une demande dans cette entité (rôle « demandes:creer »,
 *      porté par tous les rôles d'entité) : un lieu, une catégorie, une description de 10 caractères au moins.
 *   2. Un seul lieu par demande (DV-39), actif, de l'entité active. Une catégorie active de l'entité : une nature, ou
 *      un domaine qui n'a aucune nature active (sinon il faut préciser).
 *   3. Le numéro est attribué dans la transaction d'enregistrement (services/numerotation.js).
 *   4. En 0.5.0, toute demande arrive « À qualifier » (DV-43) : la règle de validation de la catégorie est gardée et
 *      s'appliquera à l'étape 11. La priorité proposée par la catégorie est notée ; le gestionnaire la confirmera à
 *      l'étape 8 (PRI-01).
 *   5. Lecture : le demandeur voit ses demandes (SEC-02 ; le filtre « Mon service » attend la lecture du service,
 *      DV-45) ; le gestionnaire et le responsable voient toutes celles de l'entité active, en lecture seule (DV-46,
 *      rôle « demandes:entite »). Une demande d'une autre entité répond 403, par l'API comme par le MCP (SEC-01).
 *   6. Lieu proposé d'office (REF-04, DV-42) : le lieu de travail habituel s'il est actif et de l'entité active, sinon
 *      le lieu de la dernière demande de la personne dans cette entité.
 *   7. Aucune suppression (CYC-05) ; la modification et l'annulation arrivent avec le cycle de vie (étape 9).
 *   8. « Moi aussi » (DEM-04, 0.7.0) : avant l'envoi, la personne voit les demandes ouvertes de l'entité dans le même
 *      bâtiment (le bâtiment du lieu choisi et tous ses locaux ; un site entier si le lieu n'est dans aucun bâtiment),
 *      sans le nom des demandeurs. Elle peut suivre l'une d'elles au lieu d'en créer une nouvelle : elle la lit ensuite
 *      dans « Mes demandes », sans le nom du demandeur ; sa remarque n'est lue que par le service technique.
 *   9. Danger (DEM-06, 0.7.0) : une demande cochée « Danger pour les personnes ou les biens » part en P1, quelle que soit
 *      la catégorie. Le demandeur lit « traitée en priorité absolue », sans heure ; l'échéance P1 n'est rendue qu'au
 *      service technique, qui confirmera la priorité (étape 8). L'alerte de la garde viendra aux étapes 13 et 17.
 *  10. « Pour » (DEM-07, 0.7.0) : la demande peut être faite pour un collègue de l'entité (il la lit dans « Mes
 *      demandes » et recevra les courriels à l'étape 13) ou pour un service ou une personne sans compte (texte libre,
 *      sans notification). Le demandeur reste celui qui dépose. Date souhaitée et créneau (DEM-08) sont facultatifs ;
 *      la date va d'aujourd'hui à un an (heure de Bruxelles) et ne remplace pas le délai de la priorité.
 *  11. Questions propres à la catégorie (DEM-05, 0.7.0) : les réponses sont contrôlées au dépôt (questions de la
 *      catégorie choisie et de son domaine, réponse permise, obligatoires remplies ; services/questions-categorie.js)
 *      et enregistrées avec la demande, texte compris. Elles sont lues sur la fiche par le demandeur et par le service.
 *  12. Pièces jointes (DEM-09, 0.8.0, services/pieces.js) : celles du brouillon passent à la demande dans la transaction
 *      d'envoi ; la fiche les rend au demandeur, au bénéficiaire et au service technique, pas à qui suit seulement.
 *  13. Qualification et échéances (0.9.0, services/qualification.js) : les échéances de prise en charge et de fin sont
 *      enregistrées au dépôt ; la fiche rend l'échéance qui compte et le retard. Le service technique lit en plus la
 *      priorité proposée, le motif d'un changement, la durée estimée, les consignes à l'ouvrier et qui a qualifié ;
 *      le demandeur ne les reçoit pas. Liste du gestionnaire (GES-02) : filtres par états, priorités, catégorie (son
 *      domaine compris), bâtiment (ses locaux compris), échéance, source et danger ; tri par numéro, dépôt, échéance
 *      ou priorité.
 * Module « demandes » du noyau : toujours actif ; le contrôle est posé pour l'ordre API-04.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { assertActif } = require('../modules');
const { rolesWith } = require('../roles');
const { rolesIn } = require('../auth');
const numerotation = require('./numerotation');
const echeances = require('./echeances');
const questions = require('./questions-categorie');
const qualification = require('./qualification');

const OUVERTE = "d.etat NOT IN ('cloturee', 'refusee', 'refusee_validation', 'fusionnee', 'annulee')";
const COLUMNS = `d.id, d.entite_id, d.numero, d.annee, d.sequence, d.description, d.langue, d.etat, d.priorite, d.danger, d.canal,
  d.lieu_id, l.code AS lieu_code, l.nom_fr AS lieu_nom_fr, l.nom_nl AS lieu_nom_nl, l.nature AS lieu_nature,
  d.categorie_id, c.code AS categorie_code, c.libelle_fr AS categorie_libelle_fr, c.libelle_nl AS categorie_libelle_nl, c.icone AS categorie_icone,
  p.libelle_fr AS domaine_libelle_fr, p.libelle_nl AS domaine_libelle_nl,
  COALESCE(c.delai_fin_jours, p.delai_fin_jours) AS delai_fin_jours_categorie,
  d.demandeur_id, u.first_name AS demandeur_prenom, u.last_name AS demandeur_nom,
  d.beneficiaire_id, b.first_name AS beneficiaire_prenom, b.last_name AS beneficiaire_nom, d.beneficiaire_texte,
  d.date_souhaitee, d.creneau,
  d.priorite_proposee, d.motif_priorite, d.prise_en_charge_le, d.echeance_le, d.date_convenue, d.duree_estimee_minutes,
  d.consignes, d.photos_visibles, d.qualifiee_par, qp.first_name AS qualifiee_par_prenom, qp.last_name AS qualifiee_par_nom, d.qualifiee_le,
  (SELECT COUNT(*) FROM demande_suiveurs s WHERE s.demande_id = d.id) AS nb_suiveurs,
  d.is_demo, d.created_at, d.updated_at`;
const FROM = `FROM demandes d JOIN lieux l ON l.id = d.lieu_id JOIN categories c ON c.id = d.categorie_id
  LEFT JOIN categories p ON p.id = c.parent_id JOIN users u ON u.id = d.demandeur_id LEFT JOIN users b ON b.id = d.beneficiaire_id
  LEFT JOIN users qp ON qp.id = d.qualifiee_par`;
/** Champs internes au service technique (0.9.0) : retirés de la fiche rendue au demandeur et à qui suit la demande. */
const INTERNES = ['priorite_proposee', 'motif_priorite', 'duree_estimee_minutes', 'consignes', 'qualifiee_par', 'qualifiee_par_prenom', 'qualifiee_par_nom', 'qualifiee_le'];
const LIEU = 'SELECT id, entite_id, parent_id, nature, code, nom_fr, nom_nl, is_active FROM lieux WHERE id = ?';
const ETATS_FERMES = ['cloturee', 'refusee', 'refusee_validation', 'fusionnee', 'annulee'];
const SUIVIE = 'SELECT 1 FROM demande_suiveurs WHERE demande_id = ? AND user_id = ?';
const ETATS = ['brouillon', 'en_validation', 'refusee_validation', 'a_qualifier', 'qualifiee', 'planifiee', 'en_cours', 'en_attente', 'externe',
  'terminee', 'cloturee', 'rouverte', 'refusee', 'fusionnee', 'annulee'];

function entiteActive(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  return user.entiteId;
}

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));

/** Instant SQL (UTC) d'une date JavaScript, et l'inverse. */
const versSql = (date) => date.toISOString().replace('T', ' ').slice(0, 19);
const depuisSql = (s) => new Date(`${s.replace(' ', 'T')}Z`);

/** Chemin d'un lieu, de la racine au lieu : [{ id, nature, code, nom_fr, nom_nl }]. */
function chemin(lieuId, cache = new Map()) {
  if (cache.has(lieuId)) return cache.get(lieuId);
  const out = [];
  let id = lieuId;
  for (let i = 0; i < 6 && id; i += 1) {
    const l = getDb().prepare(LIEU).get(id);
    if (!l) break;
    out.unshift({ id: l.id, nature: l.nature, code: l.code, nom_fr: l.nom_fr, nom_nl: l.nom_nl });
    id = l.parent_id;
  }
  cache.set(lieuId, out);
  return out;
}

/**
 * Photo qui montre l'endroit d'une demande (0.13.0, étape 8 ter, DV-101) : celle du lieu choisi ; à défaut, celle du
 * plus proche lieu au-dessus de lui (niveau, bâtiment, site). Rendue au seul service technique, avec de quoi dire d'où
 * elle vient ; null si aucun lieu du chemin n'a de photo. Le fichier se lit par GET /api/lieux/:id/photo, avec les
 * droits et la cloison des lieux ; photo_at sert à ne pas garder en cache une photo remplacée.
 */
function photoDuLieu(cheminLieu) {
  const ids = cheminLieu.map((l) => l.id);
  if (!ids.length) return null;
  const avecPhoto = new Map(getDb().prepare(`SELECT id, photo_at FROM lieux WHERE photo_fichier IS NOT NULL
    AND id IN (SELECT value FROM json_each(?))`).all(JSON.stringify(ids)).map((r) => [r.id, r.photo_at]));
  for (let i = cheminLieu.length - 1; i >= 0; i -= 1) {
    const l = cheminLieu[i];
    if (avecPhoto.has(l.id)) {
      return { lieu_id: l.id, nature: l.nature, code: l.code, nom_fr: l.nom_fr, nom_nl: l.nom_nl, photo_at: avecPhoto.get(l.id),
        du_lieu: i === cheminLieu.length - 1 ? 1 : 0 };
    }
  }
  return null;
}

/**
 * Délai annoncé : échéance de fin enregistrée sur la fiche (0.9.0 ; calculée au dépôt, recalculée à la qualification),
 * avec l'unité et le délai de la priorité ; null si la priorité manque.
 */
function delaiAnnonce(d) {
  if (!d.priorite) return null;
  const prio = getDb().prepare('SELECT code, unite, fin FROM priorites WHERE entite_id = ? AND code = ?').get(d.entite_id, d.priorite);
  if (!prio) return null;
  const fin = d.echeance_le ? depuisSql(d.echeance_le) : null;
  return {
    priorite: prio.code, unite: prio.unite,
    delai_fin: prio.unite === 'jours_ouvrables' && d.delai_fin_jours_categorie ? d.delai_fin_jours_categorie : prio.fin,
    fin_le: fin ? { utc: fin.toISOString(), local: echeances.texteLocal(fin) } : null,
    date_convenue: !fin,
  };
}

/**
 * Fiche rendue à la personne. Une personne qui suit la demande d'un autre (« Moi aussi ») ne reçoit pas le nom du
 * demandeur ; le gestionnaire et le responsable le reçoivent (DV-46).
 */
function fiche(d, cache, user) {
  const reste = { ...d };
  delete reste.delai_fin_jours_categorie;
  const autre = user && d.demandeur_id !== user.id;
  const pourMoi = !!user && d.beneficiaire_id === user.id;
  // Une personne qui suit seulement la demande (« Moi aussi ») ne reçoit ni le demandeur ni le bénéficiaire ; le
  // bénéficiaire voit qui a déposé la demande pour lui.
  if (autre && !pourMoi && !peut(user, 'demandes:entite')) {
    for (const k of ['demandeur_id', 'demandeur_prenom', 'demandeur_nom', 'beneficiaire_id', 'beneficiaire_prenom', 'beneficiaire_nom', 'beneficiaire_texte']) reste[k] = null;
  }
  // Champs internes du service technique (0.9.0) : ni pour le demandeur, ni pour le bénéficiaire, ni pour qui suit.
  const service = !!user && peut(user, 'demandes:entite');
  if (!service) for (const k of INTERNES) delete reste[k];
  return {
    ...reste,
    // Échéance qui compte et retard (0.9.0, PRI-03) : pour le service technique ; le demandeur garde le délai annoncé.
    ...(service ? qualification.etatEcheance(d) : {}),
    suivie: autre && !pourMoi && getDb().prepare(SUIVIE).get(d.id, user.id) ? 1 : 0,
    pour_moi: pourMoi ? 1 : 0,
    ouverte: !ETATS_FERMES.includes(d.etat) ? 1 : 0,
    lieu_chemin: chemin(d.lieu_id, cache),
    // Danger : pas d'heure promise au demandeur (DEM-06, décision du 28/10/2026) ; le service technique garde l'échéance P1.
    delai_annonce: d.danger && !(user && peut(user, 'demandes:entite')) ? null : delaiAnnonce(d),
  };
}

function row(id) {
  return getDb().prepare(`SELECT ${COLUMNS} ${FROM} WHERE d.id = ?`).get(id);
}

/**
 * Charge une demande lisible par la personne : 404 inconnue, 403 autre entité, ou demande d'un autre qu'elle ne suit
 * pas (SEC-02).
 */
function load(user, id) {
  const d = row(id);
  if (!d) throw new AppError(404, 'NOT_FOUND');
  if (d.entite_id !== entiteActive(user)) throw new AppError(403, 'FORBIDDEN');
  if (d.demandeur_id !== user.id && d.beneficiaire_id !== user.id && !peut(user, 'demandes:entite') && !getDb().prepare(SUIVIE).get(d.id, user.id)) {
    throw new AppError(403, 'FORBIDDEN');
  }
  return d;
}

/** Personnes qui suivent la demande, avec leur remarque : pour le gestionnaire et le responsable seulement. */
function suiveurs(demandeId) {
  return getDb().prepare(`SELECT s.user_id, u.first_name AS prenom, u.last_name AS nom, s.remarque, s.created_at
    FROM demande_suiveurs s JOIN users u ON u.id = s.user_id WHERE s.demande_id = ? ORDER BY s.created_at, s.id`).all(demandeId);
}

function get(user, id) {
  const d = load(user, id);
  const f = fiche(d, undefined, user);
  f.reponses = questions.deDemande(d.id);
  if (peut(user, 'demandes:entite')) {
    f.suiveurs = suiveurs(d.id);
    f.photo_lieu = photoDuLieu(f.lieu_chemin);
  }
  // Pièces jointes (0.8.0) : demandeur, bénéficiaire et service technique ; null pour qui suit seulement la demande.
  const litPieces = d.demandeur_id === user.id || d.beneficiaire_id === user.id || peut(user, 'demandes:entite');
  f.pieces = litPieces ? require('./pieces').deDemande(d.id, user, d) : null;
  return f;
}

/** Tris de la liste (GES-02, 0.9.0) : colonne SQL de chaque tri. Ouvertes en tête dans tous les cas. */
const TRIS = {
  depot: 'd.created_at',
  numero: 'd.annee, d.sequence',
  echeance: `(${qualification.ECHEANCE}) IS NULL, ${qualification.ECHEANCE}`,
  priorite: "d.priorite IS NULL, d.priorite",
};
const FERMEE_SQL = "CASE WHEN d.etat IN ('cloturee', 'refusee', 'refusee_validation', 'fusionnee', 'annulee') THEN 1 ELSE 0 END";

/**
 * Requêtes de la liste. La clause n'est faite que de fragments constants du module, de noms de la table TRIS et de
 * « ? » ; toute valeur reçue passe en paramètre.
 */
const compter = (clause, params) => getDb().prepare(`SELECT COUNT(*) AS n ${FROM} ${clause}`).get(...params).n;
const lire = (clause, params) => getDb().prepare(`SELECT ${COLUMNS} ${FROM} ${clause}`).all(...params);

/** Liste de valeurs séparées par des virgules, chacune admise ; sinon 400. */
function valeurs(texte, admises, champ) {
  if (!texte) return [];
  const v = [...new Set(String(texte).split(',').map((x) => x.trim()).filter(Boolean))];
  const hors = v.filter((x) => !admises.includes(x));
  if (hors.length) throw new AppError(400, 'VALIDATION', [`${champ}: ${hors.join(', ')}`]);
  return v;
}

/**
 * Liste de l'entité active. perimetre « miennes » (défaut) : les demandes de la personne ; « entite » : toutes celles
 * de l'entité, pour le gestionnaire et le responsable. Ouvertes en tête, puis les plus récentes (ou le tri demandé).
 * Filtres du service technique (0.9.0, GES-02) : etats et priorites (listes séparées par des virgules), categorie_id
 * (un domaine compte ses natures), batiment_id (un lieu compte tout ce qu'il contient), echeance (retard, proche,
 * sans), canal, danger. La recherche q porte aussi sur le nom du demandeur dans le périmètre de l'entité.
 */
function list(user, { limit = 50, offset = 0, q, etat, etats, priorites, categorie_id: categorieId, batiment_id: batimentId,
  echeance, canal, danger, ouvertes, tri, ordre, perimetre = 'miennes' } = {}) {
  const entiteId = entiteActive(user);
  const where = ['d.entite_id = ?'];
  const params = [entiteId];
  const db = getDb();
  if (perimetre === 'entite') {
    if (!peut(user, 'demandes:entite')) throw new AppError(403, 'FORBIDDEN');
  } else {
    // Ses demandes, celles faites pour elle (DEM-07) et celles qu'elle suit (« Moi aussi », DEM-04).
    where.push('(d.demandeur_id = ? OR d.beneficiaire_id = ? OR d.id IN (SELECT demande_id FROM demande_suiveurs WHERE user_id = ?))');
    params.push(user.id, user.id, user.id);
  }
  if (etat) { where.push('d.etat = ?'); params.push(etat); }
  const listeEtats = valeurs(etats, ETATS, 'etats');
  if (listeEtats.length) { where.push(`d.etat IN (${listeEtats.map(() => '?').join(', ')})`); params.push(...listeEtats); }
  const listePrio = valeurs(priorites, ['P1', 'P2', 'P3', 'P4'], 'priorites');
  if (listePrio.length) { where.push(`d.priorite IN (${listePrio.map(() => '?').join(', ')})`); params.push(...listePrio); }
  if (categorieId) {
    const c = db.prepare('SELECT id, entite_id FROM categories WHERE id = ?').get(categorieId);
    if (!c) throw new AppError(404, 'NOT_FOUND');
    if (c.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
    where.push('(d.categorie_id = ? OR c.parent_id = ?)'); params.push(categorieId, categorieId);
  }
  if (batimentId) {
    const l = db.prepare(LIEU).get(batimentId);
    if (!l) throw new AppError(404, 'NOT_FOUND');
    if (l.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
    const ids = descendants(entiteId, batimentId);
    where.push(`d.lieu_id IN (${ids.map(() => '?').join(', ')})`); params.push(...ids);
  }
  if (echeance) {
    const f = qualification.filtreEcheance(entiteId, echeance);
    where.push(f.sql); params.push(...f.params);
  }
  if (canal) { where.push('d.canal = ?'); params.push(canal); }
  if (danger === 1) where.push('d.danger = 1');
  if (danger === 0) where.push('d.danger = 0');
  if (ouvertes === 1) where.push(OUVERTE);
  if (ouvertes === 0) where.push(`NOT (${OUVERTE})`);
  if (q) {
    const champs = ['d.numero', 'd.description', 'l.nom_fr', 'l.nom_nl', 'l.code'];
    if (perimetre === 'entite') champs.push("(u.first_name || ' ' || u.last_name)", "(u.last_name || ' ' || u.first_name)");
    where.push(`(${champs.map((c) => `${c} LIKE ?`).join(' OR ')})`);
    params.push(...champs.map(() => `%${q}%`));
  }
  const total = compter(`WHERE ${where.join(' AND ')}`, params);
  const cache = new Map();
  // Ordre : seuls des noms de la table TRIS et ASC ou DESC entrent dans la clause, jamais une valeur reçue telle quelle.
  const sens = ordre === 'asc' ? 'ASC' : ordre === 'desc' ? 'DESC' : null;
  const cle = Object.prototype.hasOwnProperty.call(TRIS, tri) ? tri : null;
  let order = `${FERMEE_SQL}, d.created_at DESC, d.id DESC`;
  if (cle) {
    const s = sens || (cle === 'depot' || cle === 'numero' ? 'DESC' : 'ASC');
    const cols = TRIS[cle].split(', ').map((c) => (c.endsWith('IS NULL') ? c : `${c} ${s}`)).join(', ');
    order = `${FERMEE_SQL}, ${cols}, d.id ${s}`;
  }
  const rows = lire(`WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, limit, offset]).map((d) => fiche(d, cache, user));
  return { rows, pagination: { total, limit, offset } };
}

/** Lieu admis pour une demande : existe, de l'entité, actif. */
function lieuDeDemande(entiteId, lieuId) {
  const l = getDb().prepare(LIEU).get(lieuId);
  if (!l) throw new AppError(404, 'NOT_FOUND');
  if (l.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
  if (!l.is_active) throw new AppError(409, 'DEMANDE_LIEU_INACTIF');
  return l;
}

/** Catégorie admise : de l'entité, active (domaine compris), nature ou domaine sans nature active. */
function categorieDeDemande(entiteId, categorieId) {
  const db = getDb();
  const c = db.prepare(`SELECT c.id, c.entite_id, c.parent_id, c.code, c.is_active, p.is_active AS parent_actif,
    COALESCE(c.priorite_defaut, p.priorite_defaut) AS priorite_effective
    FROM categories c LEFT JOIN categories p ON p.id = c.parent_id WHERE c.id = ?`).get(categorieId);
  if (!c) throw new AppError(404, 'NOT_FOUND');
  if (c.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
  if (!c.is_active || c.parent_actif === 0) throw new AppError(409, 'DEMANDE_CATEGORIE_INACTIVE');
  if (!c.parent_id && db.prepare('SELECT 1 FROM categories WHERE parent_id = ? AND is_active = 1').get(c.id)) {
    throw new AppError(409, 'DEMANDE_CATEGORIE_A_PRECISER');
  }
  return c;
}

const CANAUX = { api: 'ecran', mcp: 'mcp' };

/** Jour à Bruxelles, AAAA-MM-JJ, d'une date JavaScript. */
const jourBruxelles = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(date);

/** Bénéficiaire admis (DEM-07) : compte actif, avec un rôle actif dans l'entité, autre que le demandeur. */
function controlerBeneficiaire(user, entiteId, beneficiaireId) {
  const u = getDb().prepare('SELECT id, is_active FROM users WHERE id = ?').get(beneficiaireId);
  if (!u || !u.is_active || u.id === user.id || !rolesIn(u.id, entiteId).length) throw new AppError(409, 'BENEFICIAIRE_INVALIDE');
}

/** Date souhaitée (DEM-08) : d'aujourd'hui à un an, jours de Bruxelles. */
function controlerDateSouhaitee(jour, maintenant) {
  const aujourdhui = jourBruxelles(maintenant);
  const dansUnAn = jourBruxelles(new Date(maintenant.getTime() + 366 * 24 * 3600 * 1000));
  if (jour < aujourdhui || jour > dansUnAn) throw new AppError(409, 'DATE_SOUHAITEE_INVALIDE');
}

function create(user, data, channel = 'api') {
  const entiteId = entiteActive(user);
  if (!peut(user, 'demandes:creer')) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  lieuDeDemande(entiteId, data.lieu_id);
  const cat = categorieDeDemande(entiteId, data.categorie_id);
  const danger = data.danger === 1 ? 1 : 0;
  const priorite = danger ? 'P1' : cat.priorite_effective || null;
  const beneficiaireId = data.beneficiaire_id || null;
  const beneficiaireTexte = data.beneficiaire_texte || null;
  if (beneficiaireId && beneficiaireTexte) throw new AppError(409, 'BENEFICIAIRE_DOUBLE');
  if (beneficiaireId) controlerBeneficiaire(user, entiteId, beneficiaireId);
  const dateSouhaitee = data.date_souhaitee || null;
  const langue = data.langue || user.lang || 'fr';
  const maintenant = new Date();
  if (dateSouhaitee) controlerDateSouhaitee(dateSouhaitee, maintenant);
  const reponses = questions.controler(cat, data.reponses || []);
  const db = getDb();
  // Échéances enregistrées au dépôt (0.9.0, DV-88), depuis l'instant de réception.
  const ech = qualification.calculer(db, { entiteId, recuSql: versSql(maintenant), priorite, categorieId: data.categorie_id });
  const id = db.transaction(() => {
    const n = numerotation.attribuer(entiteId, 'demande', maintenant);
    const r = db.prepare(`INSERT INTO demandes (entite_id, numero, annee, sequence, lieu_id, categorie_id, description, langue, etat,
      priorite, danger, canal, demandeur_id, beneficiaire_id, beneficiaire_texte, date_souhaitee, creneau,
      priorite_proposee, prise_en_charge_le, echeance_le, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'a_qualifier', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(entiteId, n.numero, n.annee, n.sequence, data.lieu_id, data.categorie_id, data.description, langue,
        priorite, danger, CANAUX[channel] || 'api', user.id, beneficiaireId, beneficiaireTexte, dateSouhaitee, data.creneau || null,
        priorite, ech.prise_en_charge_le, ech.echeance_le, user.id, user.id, versSql(maintenant), versSql(maintenant));
    questions.enregistrer(r.lastInsertRowid, reponses);
    // Les pièces jointes du brouillon passent à la demande (DV-85, 0.8.0), avant l'effacement du brouillon.
    const nbPieces = require('./pieces').rattacher(user.id, entiteId, r.lastInsertRowid);
    // Le brouillon du formulaire n'a plus lieu d'être (DEM-11, 0.7.0).
    require('./brouillons').effacerApresEnvoi(user.id, entiteId);
    // Le journal garde le numéro, le lieu et la catégorie ; la description reste sur la fiche.
    logAudit(user.id, 'demande.create', 'demande', r.lastInsertRowid,
      // Ni le texte du bénéficiaire ni le créneau : textes libres, ils restent sur la fiche.
      { numero: n.numero, lieu_id: data.lieu_id, categorie_id: data.categorie_id, priorite, danger,
        beneficiaire_id: beneficiaireId, beneficiaire_texte: beneficiaireTexte ? 1 : 0, date_souhaitee: dateSouhaitee,
        reponses: reponses.length, pieces: nbPieces }, channel, entiteId);
    return r.lastInsertRowid;
  })();
  return get(user, id);
}

/** Début d'une description pour la liste des demandes voisines : 60 caractères au plus. */
const EXTRAIT = 60;
const extrait = (s) => (s.length > EXTRAIT ? `${s.slice(0, EXTRAIT - 1).trimEnd()}…` : s);

/**
 * Lieu qui délimite le « même bâtiment » : le bâtiment le plus proche dans le chemin du lieu (lui-même compris) ;
 * à défaut, la racine du chemin (le site). Un site choisi vaut donc pour tous ses bâtiments.
 */
function perimetreBatiment(lieuId) {
  const c = chemin(lieuId);
  const bat = [...c].reverse().find((e) => e.nature === 'batiment');
  return bat || c[0];
}

/** Identifiants du lieu et de tous les lieux qu'il contient, dans l'entité. */
function descendants(entiteId, racineId) {
  const enfants = new Map();
  for (const l of getDb().prepare('SELECT id, parent_id FROM lieux WHERE entite_id = ?').all(entiteId)) {
    if (!enfants.has(l.parent_id)) enfants.set(l.parent_id, []);
    enfants.get(l.parent_id).push(l.id);
  }
  const out = [racineId];
  for (let i = 0; i < out.length; i += 1) out.push(...(enfants.get(out[i]) || []));
  return out;
}

/**
 * Demandes ouvertes de l'entité active dans le même bâtiment que le lieu choisi (DEM-04, 0.7.0), avant l'envoi.
 * Sans le nom des demandeurs. Ordre : même local, puis même catégorie, puis les plus récentes ; « limit » au plus,
 * avec le total pour « Voir les autres ».
 */
function voisines(user, { lieu_id: lieuId, categorie_id: categorieId, limit = 5 }) {
  const entiteId = entiteActive(user);
  if (!peut(user, 'demandes:creer')) throw new AppError(403, 'FORBIDDEN');
  const l = getDb().prepare(LIEU).get(lieuId);
  if (!l) throw new AppError(404, 'NOT_FOUND');
  if (l.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
  const racine = perimetreBatiment(lieuId);
  const ids = descendants(entiteId, racine.id);
  const db = getDb();
  // Seuls des « ? » sont ajoutés à la clause : les valeurs passent en paramètres.
  const clause = `WHERE d.entite_id = ? AND ${OUVERTE} AND d.lieu_id IN (${ids.map(() => '?').join(', ')})`;
  const rows = db.prepare(`SELECT d.id, d.numero, d.etat, d.danger, d.created_at, d.description, d.demandeur_id, d.beneficiaire_id, d.lieu_id, d.categorie_id,
      l.code AS lieu_code, l.nom_fr AS lieu_nom_fr, l.nom_nl AS lieu_nom_nl,
      c.libelle_fr AS categorie_libelle_fr, c.libelle_nl AS categorie_libelle_nl, c.icone AS categorie_icone
    FROM demandes d JOIN lieux l ON l.id = d.lieu_id JOIN categories c ON c.id = d.categorie_id ${clause}`).all(entiteId, ...ids);
  const rang = (d) => [d.lieu_id === lieuId ? 0 : 1, categorieId && d.categorie_id === categorieId ? 0 : 1];
  rows.sort((a, b) => {
    const [ra, rb] = [rang(a), rang(b)];
    return ra[0] - rb[0] || ra[1] - rb[1] || b.created_at.localeCompare(a.created_at) || b.id - a.id;
  });
  return {
    batiment: { id: racine.id, nature: racine.nature, code: racine.code, nom_fr: racine.nom_fr, nom_nl: racine.nom_nl },
    total: rows.length,
    demandes: rows.slice(0, limit).map((d) => ({
      id: d.id, numero: d.numero, etat: d.etat, danger: d.danger, created_at: d.created_at,
      lieu_id: d.lieu_id, lieu_code: d.lieu_code, lieu_nom_fr: d.lieu_nom_fr, lieu_nom_nl: d.lieu_nom_nl,
      categorie_id: d.categorie_id, categorie_libelle_fr: d.categorie_libelle_fr, categorie_libelle_nl: d.categorie_libelle_nl,
      categorie_icone: d.categorie_icone, extrait: extrait(d.description),
      meme_lieu: d.lieu_id === lieuId ? 1 : 0,
      propre: d.demandeur_id === user.id || d.beneficiaire_id === user.id ? 1 : 0,
      suivie: d.demandeur_id !== user.id && d.beneficiaire_id !== user.id && db.prepare(SUIVIE).get(d.id, user.id) ? 1 : 0,
    })),
  };
}

/**
 * « Moi aussi » (DEM-04) : la personne suit une demande ouverte de l'entité active au lieu d'en créer une nouvelle.
 * Refus : demande d'une autre entité (403), fermée (409), la sienne (409). Un second appel ne change rien (double clic).
 * La remarque reste sur la fiche, pour le service technique ; le journal ne la garde pas.
 */
function suivre(user, id, { remarque } = {}, channel = 'api') {
  const entiteId = entiteActive(user);
  if (!peut(user, 'demandes:creer')) throw new AppError(403, 'FORBIDDEN');
  assertActif('demandes');
  const d = row(id);
  if (!d) throw new AppError(404, 'NOT_FOUND');
  if (d.entite_id !== entiteId) throw new AppError(403, 'FORBIDDEN');
  if (ETATS_FERMES.includes(d.etat)) throw new AppError(409, 'DEMANDE_FERMEE');
  if (d.demandeur_id === user.id || d.beneficiaire_id === user.id) throw new AppError(409, 'DEMANDE_PROPRE');
  const db = getDb();
  if (!db.prepare(SUIVIE).get(d.id, user.id)) {
    db.transaction(() => {
      db.prepare('INSERT INTO demande_suiveurs (demande_id, user_id, remarque, canal) VALUES (?, ?, ?, ?)')
        .run(d.id, user.id, remarque ? remarque : null, CANAUX[channel] || 'api');
      logAudit(user.id, 'demande.suivre', 'demande', d.id, { numero: d.numero, remarque: remarque ? 1 : 0 }, channel, entiteId);
    })();
  }
  return get(user, d.id);
}

/**
 * Collègues de l'entité active pour le champ « Pour » (DEM-07) : comptes actifs qui ont un rôle actif dans l'entité,
 * autres que la personne, dont le prénom ou le nom contient q (sans accents) ; prénom et nom seulement, 10 au plus.
 */
function beneficiaires(user, { q }) {
  const entiteId = entiteActive(user);
  if (!peut(user, 'demandes:creer')) throw new AppError(403, 'FORBIDDEN');
  const sansAccent = (x) => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const mots = sansAccent(q).split(/\s+/).filter(Boolean);
  const rows = getDb().prepare(`SELECT DISTINCT u.id, u.first_name AS prenom, u.last_name AS nom FROM users u
    JOIN user_roles ur ON ur.user_id = u.id AND ur.is_active = 1 AND ur.entite_id = ?
    WHERE u.is_active = 1 AND u.id <> ? ORDER BY u.last_name, u.first_name`).all(entiteId, user.id);
  return rows.filter((r) => { const t = sansAccent(`${r.prenom} ${r.nom}`); return mots.every((m) => t.includes(m)); }).slice(0, 10);
}

/** Lieu proposé d'office dans le formulaire (REF-04, DV-42) ; null s'il n'y en a pas. */
function lieuPropose(user) {
  if (!user.entiteId) return null;
  const db = getDb();
  const u = db.prepare('SELECT lieu_habituel_id FROM users WHERE id = ?').get(user.id);
  const actif = (id) => { const l = id && db.prepare(LIEU).get(id); return l && l.is_active && l.entite_id === user.entiteId ? l : null; };
  let source = 'habituel';
  let l = actif(u && u.lieu_habituel_id);
  if (!l) {
    source = 'derniere_demande';
    const d = db.prepare('SELECT lieu_id FROM demandes WHERE demandeur_id = ? AND entite_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(user.id, user.entiteId);
    l = actif(d && d.lieu_id);
  }
  return l ? { id: l.id, code: l.code, nom_fr: l.nom_fr, nom_nl: l.nom_nl, nature: l.nature, chemin: chemin(l.id), source } : null;
}

/**
 * Lieux récents (0.7.5, DV-74) : les derniers lieux distincts des demandes déposées par la personne dans l'entité
 * active, du plus récent au plus ancien, lieux actifs seulement, cinq au plus. Tirés des demandes déjà en base : aucune
 * donnée nouvelle. Le lieu proposé d'office est rendu à part (lieu_propose) et retiré de la liste.
 */
function lieuxRecents(user, limit = 5) {
  if (!user.entiteId) return [];
  const propose = lieuPropose(user);
  const rows = getDb().prepare(`SELECT l.id, l.code, l.nom_fr, l.nom_nl, l.nature FROM demandes d JOIN lieux l ON l.id = d.lieu_id
    WHERE d.demandeur_id = ? AND d.entite_id = ? AND l.is_active = 1 AND l.entite_id = d.entite_id
    GROUP BY l.id ORDER BY MAX(d.id) DESC LIMIT ?`).all(user.id, user.entiteId, limit + 1);
  const cache = new Map();
  return rows.filter((l) => !propose || l.id !== propose.id).slice(0, limit).map((l) => ({ ...l, chemin: chemin(l.id, cache) }));
}

/** Contrôle d'un lieu de travail habituel pour un compte : actif, dans une entité où le compte a un rôle actif. */
function controlerLieuHabituel(userId, lieuId) {
  if (lieuId === null) return;
  const l = getDb().prepare(LIEU).get(lieuId);
  if (!l || !l.is_active || !rolesIn(userId, l.entite_id).length) throw new AppError(409, 'LIEU_HABITUEL_INVALIDE');
}

/** La personne choisit son lieu de travail habituel (« Mon profil ») ; null l'efface. */
function choisirLieuHabituel(user, lieuId, channel = 'api') {
  controlerLieuHabituel(user.id, lieuId);
  const db = getDb();
  const avant = db.prepare('SELECT lieu_habituel_id FROM users WHERE id = ?').get(user.id).lieu_habituel_id;
  if (avant === lieuId) return;
  db.prepare("UPDATE users SET lieu_habituel_id = ?, updated_at = datetime('now') WHERE id = ?").run(lieuId, user.id);
  const entite = lieuId ? db.prepare('SELECT entite_id FROM lieux WHERE id = ?').get(lieuId).entite_id : null;
  logAudit(user.id, 'user.lieu_habituel', 'user', user.id, { avant: avant ?? null, apres: lieuId }, channel, entite);
}

module.exports = { list, get, create, voisines, suivre, beneficiaires, lieuPropose, lieuxRecents, controlerLieuHabituel, choisirLieuHabituel, chemin, lieuDeDemande, categorieDeDemande, descendants };

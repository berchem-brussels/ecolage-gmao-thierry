/**
 * Export des listes en Excel et en CSV (0.18.0, point 2 ; cahier des charges IMP-03 ; standard, section 13.4 « Exports »).
 * Décision du 17/11/2026 (DV-149, « le plus simple ») : un module, trois listes (demandes de la personne ou de l'entité,
 * demandes à valider, tickets), lues par les fonctions de liste existantes : mêmes droits, même cloison, mêmes filtres.
 *   - Excel par `exceljs` (stack, TEC-03) : une feuille, ligne de titres en gras et figée, filtre automatique ;
 *   - CSV en UTF-8 avec BOM, séparateur « ; » (Excel en français et en néerlandais), fins de ligne CRLF ; une cellule qui
 *     commence par = + - @ ou une tabulation est précédée d'une apostrophe (pas de formule exécutée à l'ouverture).
 * Au-delà de EXPORT_MAX lignes, l'export est refusé (EXPORT_TROP) : on n'envoie jamais un fichier tronqué sans le dire.
 * Chaque export s'inscrit au journal (export.liste : liste, format, nombre de lignes ; jamais le contenu, DV-116).
 * Colonnes dans la langue de la personne ; dates à l'heure de Bruxelles, « JJ/MM/AAAA HH:MM ».
 * Libellés des états du service et des tickets : copie des libellés de l'interface (i18n.ts), FR et NL.
 */
const ExcelJS = require('exceljs');
const { AppError } = require('../envelope');
const { logAudit } = require('../audit');
const { getDb } = require('../database');
const cycleDeVie = require('../../config/cycle-de-vie.json');

const EXPORT_MAX = 5000;
const FORMATS = ['xlsx', 'csv'];
const LISTES = ['demandes_miennes', 'demandes_entite', 'demandes_a_valider', 'tickets'];

const ETAT_SERVICE = {
  brouillon: ['Brouillon', 'Ontwerp'], en_validation: ['En validation', 'Ter goedkeuring'],
  refusee_validation: ['Refusée par le valideur', 'Geweigerd door de goedkeurder'], a_qualifier: ['À qualifier', 'Te kwalificeren'],
  qualifiee: ['Qualifiée', 'Gekwalificeerd'], planifiee: ['Planifiée', 'Gepland'], en_cours: ['En cours', 'Bezig'],
  en_attente: ['En attente', 'In wacht'], externe: ['Confiée à un prestataire', 'Toevertrouwd aan een aannemer'],
  terminee: ['Terminée', 'Beëindigd'], cloturee: ['Clôturée', 'Afgesloten'], rouverte: ['Rouverte', 'Heropend'],
  refusee: ['Refusée', 'Geweigerd'], fusionnee: ['Fusionnée', 'Samengevoegd'], annulee: ['Annulée', 'Geannuleerd'],
};
const TICKET_TYPE = { incident: ['Incident', 'Incident'], bug: ['Bug', 'Bug'], question: ['Question métier', 'Functionele vraag'], wish: ['Souhait', 'Wens'] };
const TICKET_STATUT = {
  new: ['Nouveau', 'Nieuw'], in_progress: ['Pris en charge', 'In behandeling'], waiting_requester: ['En attente du demandeur', 'Wacht op aanvrager'],
  resolved: ['Résolu', 'Opgelost'], rejected: ['Rejeté', 'Afgewezen'], cancelled: ['Annulé', 'Geannuleerd'], closed: ['Clos', 'Afgesloten'],
};
const TICKET_FILE = { business: ['Métier', 'Functioneel'], it: ['IT', 'IT'] };
const COL = {
  numero: ['Numéro', 'Nummer'], depose: ['Déposée le', 'Ingediend op'], etat: ['État', 'Status'], priorite: ['Priorité', 'Prioriteit'],
  categorie: ['Catégorie', 'Categorie'], lieu: ['Lieu', 'Plaats'], demandeur: ['Demandeur', 'Aanvrager'], echeance: ['Échéance', 'Termijn'],
  description: ['Description', 'Beschrijving'], reference: ['Référence', 'Referentie'], type: ['Type', 'Type'], titre: ['Titre', 'Titel'],
  statut: ['Statut', 'Status'], file: ['File', 'Wachtrij'], attribue: ['Attribué à', 'Toegewezen aan'], cree: ['Créé le', 'Aangemaakt op'],
  maj: ['Mis à jour le', 'Bijgewerkt op'],
};
const NOM_FICHIER = { demandes_miennes: 'mes-demandes', demandes_entite: 'demandes-entite', demandes_a_valider: 'demandes-a-valider', tickets: 'tickets' };

const i = (lang) => (lang === 'nl' ? 1 : 0);
const lib = (table, code, lang) => (table[code] ? table[code][i(lang)] : (code || ''));

/** « 2026-11-17 09:05:00 » (UTC, SQLite) → « 17/11/2026 10:05 » à Bruxelles ; vide si absent. */
function dateLocale(sql) {
  if (!sql) return '';
  const d = new Date(`${String(sql).replace(' ', 'T')}${/[zZ]|[+-]\d\d:?\d\d$/.test(sql) ? '' : 'Z'}`);
  if (Number.isNaN(d.getTime())) return String(sql);
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

/** Cellule CSV : guillemets doublés, apostrophe devant une formule possible. */
function celluleCsv(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(colonnes, lignes, lang) {
  const out = [colonnes.map((c) => celluleCsv(c.titre[i(lang)])).join(';')];
  for (const l of lignes) out.push(colonnes.map((c) => celluleCsv(c.valeur(l))).join(';'));
  return Buffer.from(`\uFEFF${out.join('\r\n')}\r\n`, 'utf8');
}

async function xlsx(colonnes, lignes, lang, titreFeuille) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GMAO';
  const ws = wb.addWorksheet(titreFeuille.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = colonnes.map((c) => ({ header: c.titre[i(lang)], key: c.cle, width: c.largeur || 18 }));
  for (const l of lignes) ws.addRow(Object.fromEntries(colonnes.map((c) => [c.cle, c.valeur(l) ?? ''])));
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonnes.length } };
  // 0.19.0 (défaut 1 de la recette de la 0.18.0) : exceljs lève une erreur pour une clé absente (tickets) ; la colonne
  // Description ne se met en forme que dans les listes qui l'ont.
  if (colonnes.some((c) => c.cle === 'description')) {
    ws.getColumn('description').eachCell((cell) => { cell.alignment = { wrapText: true, vertical: 'top' }; });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Colonnes de chaque liste ; une colonne reçoit la ligne telle que la rend la fonction de liste. */
function colonnes(liste, lang) {
  const nomLieu = (r) => `${r.lieu_code || ''} · ${lang === 'nl' ? r.lieu_nom_nl : r.lieu_nom_fr}`;
  const cat = (r) => (lang === 'nl' ? r.categorie_libelle_nl : r.categorie_libelle_fr) || '';
  const personne = (p, n) => [p, n].filter(Boolean).join(' ');
  const c = (cle, valeur, largeur) => ({ cle, titre: COL[cle], valeur, largeur });
  const etatDemandeur = (r) => (lang === 'nl' ? r.etat_libelle_nl : r.etat_libelle_fr) || (cycleDeVie.etats[r.etat] || {})[lang] || r.etat;
  if (liste === 'demandes_miennes') {
    return [c('numero', (r) => r.numero, 20), c('depose', (r) => dateLocale(r.created_at), 17), c('etat', etatDemandeur, 30),
      c('categorie', cat, 28), c('lieu', nomLieu, 36), c('description', (r) => r.description, 60)];
  }
  if (liste === 'demandes_entite') {
    return [c('numero', (r) => r.numero, 20), c('depose', (r) => dateLocale(r.created_at), 17), c('etat', (r) => lib(ETAT_SERVICE, r.etat, lang), 22),
      c('priorite', (r) => r.priorite || '', 9), c('categorie', cat, 28), c('lieu', nomLieu, 36),
      c('demandeur', (r) => personne(r.demandeur_prenom, r.demandeur_nom), 24), c('echeance', (r) => dateLocale(r.echeance_le), 17),
      c('description', (r) => r.description, 60)];
  }
  if (liste === 'demandes_a_valider') {
    return [c('numero', (r) => r.numero, 20), c('depose', (r) => dateLocale(r.created_at), 17), c('categorie', cat, 28), c('lieu', nomLieu, 36),
      c('demandeur', (r) => personne(r.demandeur_prenom, r.demandeur_nom), 24), c('description', (r) => r.description, 60)];
  }
  return [c('reference', (r) => r.reference, 18), c('type', (r) => lib(TICKET_TYPE, r.type, lang), 18), c('titre', (r) => r.title, 50),
    c('priorite', (r) => r.priority, 9), c('statut', (r) => lib(TICKET_STATUT, r.status, lang), 24), c('file', (r) => lib(TICKET_FILE, r.queue, lang), 12),
    c('demandeur', (r) => r.requester_name || '', 24), c('attribue', (r) => r.assignee_name || '', 24),
    c('cree', (r) => dateLocale(r.created_at), 17), c('maj', (r) => dateLocale(r.updated_at), 17)];
}

/**
 * Produit le fichier d'une liste. lire(limit) rend { rows, pagination } de la fonction de liste ; le total est lu d'abord
 * (limit 1) pour refuser un export trop grand sans charger les lignes.
 * Rend { buffer, type, fichier, lignes }.
 */
async function produire(user, { liste, format, lang = 'fr', lire, canal = 'api' }) {
  if (!LISTES.includes(liste)) throw new AppError(400, 'VALIDATION');
  if (!FORMATS.includes(format)) throw new AppError(400, 'VALIDATION');
  const total = lire(1).pagination.total;
  if (total > EXPORT_MAX) throw new AppError(400, 'EXPORT_TROP');
  const { rows } = lire(Math.max(total, 1));
  const cols = colonnes(liste, lang);
  const titre = { demandes_miennes: ['Mes demandes', 'Mijn aanvragen'], demandes_entite: ["Demandes de l'entité", 'Aanvragen van de entiteit'],
    demandes_a_valider: ['Demandes à valider', 'Goed te keuren aanvragen'], tickets: ['Tickets', 'Tickets'] }[liste][i(lang)];
  const buffer = format === 'csv' ? csv(cols, rows, lang) : await xlsx(cols, rows, lang, titre);
  // Entité active (absente pour un administrateur sans rôle dans une entité, qui exporte ses tickets).
  const entiteId = user.entiteId || null;
  const code = entiteId ? getDb().prepare('SELECT code FROM entites WHERE id = ?').get(entiteId)?.code || '' : '';
  const jour = new Date().toISOString().slice(0, 10);
  const fichier = `${NOM_FICHIER[liste]}${code ? `-${code}` : ''}-${jour}.${format}`;
  logAudit(user.id, 'export.liste', null, null, { liste, format, lignes: rows.length }, canal, entiteId);
  return {
    buffer, fichier, lignes: rows.length,
    type: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/** Envoie le fichier en pièce à télécharger. */
function envoyer(res, f) {
  res.setHeader('Content-Type', f.type);
  res.setHeader('Content-Disposition', `attachment; filename="${f.fichier}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Export-Lignes', String(f.lignes));
  res.send(f.buffer);
}

module.exports = { produire, envoyer, EXPORT_MAX, FORMATS, LISTES, celluleCsv, dateLocale };

/**
 * Planning du service technique (0.21.0, étape 17, point 3 ; cahier des charges PLA-03 ; volumétrie D-15 : hypothèse
 * TEC-08 gardée pour la démonstration, DV-165).
 *   1. Lecture seule : une période de 1 à 14 jours (par défaut la semaine en cours, du lundi au dimanche, à Bruxelles),
 *      pour l'entité active. Droits : « equipes:lire » (chef d'équipe, gestionnaire, responsable) ou « demandes:traiter ».
 *      Les déplacements passent par l'affectation d'une tâche (PUT /api/taches/:id/affectation, « demandes:traiter »),
 *      avec ses contrôles et son journal : aucune écriture ici.
 *   2. Jours : date, jour ouvré de l'entité (horaire, fériés, congés, fermetures).
 *   3. Ouvriers (rôle portant « interventions:realiser » dans l'entité), par nom : équipes actives, et pour chaque jour :
 *      travaille (créneau de son équipe à horaire propre, ou jour ouvré de l'entité s'il la suit), indisponible
 *      ('journee', 'matin', 'apres_midi' ou null ; jamais le motif, PLA-04), charge en minutes et nombre de tâches ouvertes
 *      datées ce jour qui lui sont confiées, directement ou par une de ses équipes (même règle que la suggestion, DV-162).
 *   4. Équipes actives, par ordre : membres, horaire propre ou non, et pour chaque jour : travaille, charge et nombre de
 *      tâches ouvertes confiées à l'équipe.
 *   5. Tâches datées dans la période, à faire, en cours ou terminées (les annulées ne sont pas montrées), des demandes de
 *      l'entité : numéro de la demande, rang, titre, état, date, heure, durée estimée, équipe, ouvriers, corps de métier,
 *      priorité et état de la demande, lieu. Le demandeur n'y a pas accès (droits ci-dessus).
 *   6. Volumétrie : quelques requêtes de chargement plus une par jour (calendrier de l'entité), quel que soit le nombre
 *      d'ouvriers ; mesurée sous une seconde pour 40 ouvriers et une semaine chargée (test).
 *   7. Capacité (0.21.0, point 4 ; PLA-06) : durée de la journée de travail d'un ouvrier, en minutes, du début à la fin du
 *      créneau (pause comprise, l'horaire ne la connaît pas) : le plus long créneau du jour de ses équipes à horaire propre,
 *      ou l'horaire de l'entité ce jour-là s'il le suit et que le jour est ouvré ; la moitié pour une demi-journée
 *      d'absence ; 0 un jour non travaillé.
 *   8. Conflits d'un ouvrier un jour (PLA-06), sur ses tâches ouvertes de ce jour : 'absent' (indisponible toute la
 *      journée), 'jour_non_travaille' (ni créneau ni jour ouvré, sans absence), 'trop_charge' (charge au-delà de la
 *      capacité, demi-journée d'absence comprise). Une équipe : 'jour_non_travaille'. Jamais bloquants : l'affectation
 *      les rend (conflitsAffectation) et le gestionnaire décide.
 *   9. Tâches non planifiées (PLA-05) : à faire ou en cours, sans date, des demandes où les tâches se modifient
 *      (taches.DEMANDE_MODIFIABLE), triées par priorité puis par échéance de la demande, 200 au plus ; avec leur affectation.
 */
const { getDb } = require('../database');
const { AppError } = require('../envelope');
const { rolesWith } = require('../roles');
const { porteurs } = require('./equipes');

const peut = (user, permission) => user.roles.some((r) => rolesWith(permission).includes(r));
const jourBruxelles = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(date);
const ajouter = (jour, n) => new Date(Date.parse(`${jour}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const jourSemaine = (jour) => ((new Date(`${jour}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

function lecteur(user) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  if (!peut(user, 'equipes:lire') && !peut(user, 'demandes:traiter')) throw new AppError(403, 'FORBIDDEN');
}

/** Règle 1 : période demandée, bornée à 14 jours ; par défaut la semaine en cours. */
function periode({ du, au } = {}) {
  const aujourdhui = jourBruxelles();
  const debut = du || ajouter(aujourdhui, 1 - jourSemaine(aujourdhui));
  const fin = au || ajouter(debut, 6);
  if (fin < debut) throw new AppError(409, 'PLANNING_PERIODE', { du: debut, au: fin });
  const n = Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${debut}T00:00:00Z`)) / 86400000) + 1;
  if (n > 14) throw new AppError(409, 'PLANNING_PERIODE', { du: debut, au: fin });
  return { du: debut, au: fin, dates: Array.from({ length: n }, (_, i) => ajouter(debut, i)) };
}

const OUVERTS = new Set(['a_faire', 'en_cours']);
const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

function lire(user, query = {}) {
  lecteur(user);
  const { du, au, dates } = periode(query);
  return { ...calculer(user.entiteId, du, au, dates), non_planifiees: nonPlanifiees(user.entiteId) };
}

/** Règles 2 à 8 : jours, ouvriers, équipes et tâches datées d'une période, sans contrôle de droits. */
function calculer(entiteId, du, au, dates) {
  const db = getDb();
  const echeances = require('./echeances');
  const jours = dates.map((date) => ({ date, jour_semaine: jourSemaine(date), ouvre_entite: echeances.jourOuvre(entiteId, date) ? 1 : 0 }));
  const ouvreEntite = Object.fromEntries(jours.map((j) => [j.date, j.ouvre_entite]));
  const horaireEntite = new Map(db.prepare('SELECT jour, debut, fin FROM horaires WHERE entite_id = ?').all(entiteId)
    .filter((h) => h.debut && h.fin).map((h) => [h.jour, minutes(h.fin) - minutes(h.debut)]));

  // Équipes actives, horaires et membres (règle 4).
  const equipes = db.prepare(`SELECT id, code, nom_fr, nom_nl, chef_id, ordre FROM equipes WHERE entite_id = ? AND is_active = 1 ORDER BY ordre, nom_fr`).all(entiteId);
  const horaires = db.prepare(`SELECT h.equipe_id, h.jour, h.debut, h.fin FROM equipe_horaires h JOIN equipes q ON q.id = h.equipe_id
    WHERE q.entite_id = ? AND q.is_active = 1`).all(entiteId);
  const membres = db.prepare(`SELECT m.equipe_id, m.user_id FROM equipe_membres m JOIN equipes q ON q.id = m.equipe_id
    WHERE q.entite_id = ? AND q.is_active = 1`).all(entiteId);
  const creneaux = new Map(equipes.map((q) => [q.id, horaires.filter((h) => h.equipe_id === q.id)]));
  const travailleEquipe = (qid, date) => {
    const c = creneaux.get(qid);
    return c.length ? c.some((h) => h.jour === jourSemaine(date)) : !!ouvreEntite[date];
  };

  // Ouvriers (règle 3) et indisponibilités de la période.
  const ids = [...porteurs(entiteId, 'interventions:realiser')];
  const personnes = (() => {
    if (!ids.length) return [];
    const inQ = ids.map(() => '?').join(', ');
    return db.prepare(`SELECT id, first_name, last_name FROM users WHERE id IN (${inQ})`).all(...ids);
  })();
  personnes.sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr') || a.first_name.localeCompare(b.first_name, 'fr'));
  const indispos = db.prepare('SELECT user_id, du, au, periode FROM indisponibilites WHERE entite_id = ? AND du <= ? AND au >= ?').all(entiteId, au, du);
  const indisponible = (uid, date) => {
    const p = indispos.filter((i) => i.user_id === uid && i.du <= date && i.au >= date).map((i) => i.periode);
    if (p.includes('journee') || (p.includes('matin') && p.includes('apres_midi'))) return 'journee';
    return p[0] || null;
  };

  // Tâches datées de la période (règle 5).
  const taches = db.prepare(`SELECT t.id, t.demande_id, d.numero, t.rang, t.titre, t.etat, t.date_prevue, t.heure_debut, t.duree_estimee_min, t.equipe_id,
      t.corps_metier_id, v.libelle_fr AS corps_metier_libelle_fr, v.libelle_nl AS corps_metier_libelle_nl,
      d.priorite, d.etat AS demande_etat, l.code AS lieu_code, l.nom_fr AS lieu_nom_fr, l.nom_nl AS lieu_nom_nl
    FROM demande_taches t JOIN demandes d ON d.id = t.demande_id LEFT JOIN lieux l ON l.id = d.lieu_id LEFT JOIN listes_valeurs v ON v.id = t.corps_metier_id
    WHERE t.entite_id = ? AND t.date_prevue BETWEEN ? AND ? AND t.etat IN ('a_faire', 'en_cours', 'terminee')
    ORDER BY t.date_prevue, COALESCE(t.heure_debut, '99:99'), d.numero, t.rang`).all(entiteId, du, au);
  const affectations = (() => {
    if (!taches.length) return [];
    const inQ = taches.map(() => '?').join(', ');
    return db.prepare(`SELECT tache_id, user_id FROM tache_ouvriers WHERE tache_id IN (${inQ})`).all(...taches.map((t) => t.id));
  })();
  for (const t of taches) t.ouvriers = affectations.filter((a) => a.tache_id === t.id).map((a) => a.user_id);

  const equipesDe = (uid) => membres.filter((m) => m.user_id === uid).map((m) => m.equipe_id);
  const ouvriers = personnes.map((u) => {
    const sesEquipes = equipesDe(u.id);
    const suitEntite = !sesEquipes.length || sesEquipes.some((q) => !creneaux.get(q).length);
    return {
      id: u.id, prenom: u.first_name, nom: u.last_name, equipes: sesEquipes,
      jours: Object.fromEntries(dates.map((date) => {
        const ind = indisponible(u.id, date);
        const travaille = sesEquipes.some((q) => creneaux.get(q).length && travailleEquipe(q, date)) || (suitEntite && !!ouvreEntite[date]);
        const siennes = taches.filter((t) => t.date_prevue === date && OUVERTS.has(t.etat) && (t.ouvriers.includes(u.id) || (t.equipe_id && sesEquipes.includes(t.equipe_id))));
        const charge = siennes.reduce((s, t) => s + (t.duree_estimee_min || 0), 0);
        // Règle 7 : capacité du jour.
        const propres = sesEquipes.flatMap((q) => creneaux.get(q).filter((h) => h.jour === jourSemaine(date)).map((h) => minutes(h.fin) - minutes(h.debut)));
        const pleine = Math.max(0, ...propres, suitEntite && ouvreEntite[date] ? (horaireEntite.get(jourSemaine(date)) || 0) : 0);
        const capacite = ind === 'journee' ? 0 : ind ? Math.round(pleine / 2) : pleine;
        // Règle 8 : conflits, seulement s'il y a des tâches ouvertes ce jour.
        const conflits = !siennes.length ? []
          : ind === 'journee' ? ['absent'] : !travaille ? ['jour_non_travaille'] : charge > capacite ? ['trop_charge'] : [];
        return [date, { travaille: travaille && ind !== 'journee' ? 1 : 0, indisponible: ind,
          charge_min: charge, nb_taches: siennes.length, capacite_min: capacite, conflits }];
      })),
    };
  });
  const equipesRendues = equipes.map((q) => ({
    id: q.id, code: q.code, nom_fr: q.nom_fr, nom_nl: q.nom_nl, chef_id: q.chef_id, horaire_propre: creneaux.get(q.id).length ? 1 : 0,
    membres: membres.filter((m) => m.equipe_id === q.id).map((m) => m.user_id),
    jours: Object.fromEntries(dates.map((date) => {
      const siennes = taches.filter((t) => t.date_prevue === date && OUVERTS.has(t.etat) && t.equipe_id === q.id);
      const travaille = travailleEquipe(q.id, date);
      return [date, { travaille: travaille ? 1 : 0, charge_min: siennes.reduce((s, t) => s + (t.duree_estimee_min || 0), 0), nb_taches: siennes.length,
        conflits: siennes.length && !travaille ? ['jour_non_travaille'] : [] }];
    })),
  }));
  return { du, au, aujourdhui: jourBruxelles(), jours, ouvriers, equipes: equipesRendues, taches };
}

/** Règle 9 : tâches ouvertes sans date (PLA-05). */
function nonPlanifiees(entiteId) {
  const { DEMANDE_MODIFIABLE } = require('./taches');
  const db = getDb();
  const inQ = DEMANDE_MODIFIABLE.map(() => '?').join(', ');
  const rows = db.prepare(`SELECT t.id, t.demande_id, d.numero, t.rang, t.titre, t.etat, t.date_prevue, t.heure_debut, t.duree_estimee_min, t.equipe_id,
      t.corps_metier_id, v.libelle_fr AS corps_metier_libelle_fr, v.libelle_nl AS corps_metier_libelle_nl,
      d.priorite, d.etat AS demande_etat, d.echeance_le, l.code AS lieu_code, l.nom_fr AS lieu_nom_fr, l.nom_nl AS lieu_nom_nl
    FROM demande_taches t JOIN demandes d ON d.id = t.demande_id LEFT JOIN lieux l ON l.id = d.lieu_id LEFT JOIN listes_valeurs v ON v.id = t.corps_metier_id
    WHERE t.entite_id = ? AND t.date_prevue IS NULL AND t.etat IN ('a_faire', 'en_cours') AND d.etat IN (${inQ})
    ORDER BY COALESCE(d.priorite, 'P9'), COALESCE(d.echeance_le, '9999'), d.numero, t.rang LIMIT 200`).all(entiteId, ...DEMANDE_MODIFIABLE);
  if (!rows.length) return rows;
  const ids = rows.map((t) => t.id);
  const aff = (() => {
    const inQ = ids.map(() => '?').join(', ');
    return db.prepare(`SELECT tache_id, user_id FROM tache_ouvriers WHERE tache_id IN (${inQ})`).all(...ids);
  })();
  return rows.map((t) => ({ ...t, ouvriers: aff.filter((a) => a.tache_id === t.id).map((a) => a.user_id) }));
}

/**
 * Règle 8 : conflits des personnes à qui une tâche est confiée, le jour de la tâche, après son affectation (appelée par
 * taches.affecter) : [{ ouvrier_id, prenom, nom, conflits, charge_min, capacite_min }] ; une équipe qui ne travaille pas ce
 * jour-là : { equipe_id, conflits: ['jour_non_travaille'] }. Vide sans date.
 */
function conflitsAffectation(entiteId, tache) {
  if (!tache.date_prevue || !OUVERTS.has(tache.etat)) return [];
  const p = calculer(entiteId, tache.date_prevue, tache.date_prevue, [tache.date_prevue]);
  const membres = tache.equipe_id ? (p.equipes.find((q) => q.id === tache.equipe_id)?.membres || []) : [];
  const vises = new Set([...(tache.ouvriers || []).map((o) => (typeof o === 'object' ? o.id : o)), ...membres]);
  const sortie = p.ouvriers.filter((o) => vises.has(o.id) && o.jours[tache.date_prevue].conflits.length).map((o) => {
    const j = o.jours[tache.date_prevue];
    return { ouvrier_id: o.id, prenom: o.prenom, nom: o.nom, conflits: j.conflits, charge_min: j.charge_min, capacite_min: j.capacite_min };
  });
  const q = tache.equipe_id && p.equipes.find((x) => x.id === tache.equipe_id);
  if (q && q.jours[tache.date_prevue].conflits.length) sortie.push({ equipe_id: q.id, conflits: q.jours[tache.date_prevue].conflits });
  return sortie;
}

module.exports = { lire, periode, conflitsAffectation };

/**
 * Calcul des échéances d'une demande (cahier des charges PRI-02, PRI-03 ; règles validées par Thierry le 22/10/2026).
 * Toutes les heures sont celles de Bruxelles (config/calendrier.json, « fuseau »), heure d'été comprise, quel que soit
 * le fuseau du serveur. Le calcul ne lit que le calendrier de l'entité et ses priorités ; il n'écrit rien.
 *   1. Une demande reçue hors des heures ouvrables commence à compter à l'ouverture suivante (AC : reçue le vendredi
 *      à 13:00, elle compte dès le lundi à 07:45).
 *   2. N jours ouvrables tombent à la même heure, N jours ouvrés plus tard (lundi 14:00 + 2 = mercredi 14:00).
 *   3. Si cette heure dépasse la fermeture du jour d'arrivée, l'échéance est l'heure de fermeture de ce jour (AC :
 *      vendredi 14:00 devient vendredi 12:00) ; si elle précède son ouverture, l'heure d'ouverture.
 *   4. Les heures ouvrables ne comptent que le temps d'ouverture ; les heures calendaires comptent tout, depuis la
 *      réception (P1 livrée ainsi : nuit et week-end compris).
 *   5. Un jour est ouvré s'il a un horaire et n'est ni férié légal, ni congé de l'entité, ni dans une fermeture.
 *   6. Le délai propre d'une catégorie (jours ouvrables) remplace le délai de fin d'une priorité comptée en jours
 *      ouvrables ; il est ignoré pour une priorité comptée en heures. Fin vide : date convenue, pas d'échéance.
 * Sans aucun jour ouvré sur trois ans (horaire entièrement vide, par exemple), le calcul répond CALENDRIER_VIDE.
 */
const { AppError } = require('../envelope');
const calendrier = require('./calendrier');
const priorites = require('./priorites');
const categories = require('./categories');

const FUSEAU = calendrier.CATALOGUE.fuseau;
const JOUR_MS = 86400000;
const GARDE_JOURS = 1100;

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSEAU, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** Composantes de l'heure de Bruxelles d'un instant. */
function local(date) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour), mi: Number(p.minute), s: Number(p.second) };
}

/** Décalage de Bruxelles sur UTC à un instant, en minutes (60 en hiver, 120 en été). */
function decalage(date) {
  const p = local(date);
  return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

/** Jour local (numéro de jour depuis 1970) et minute du jour d'un instant. */
function versLocal(date) {
  const p = local(date);
  return { dn: Date.UTC(p.y, p.m - 1, p.d) / JOUR_MS, min: p.h * 60 + p.mi + p.s / 60 };
}

/** Instant d'un jour local et d'une minute du jour, à l'heure de Bruxelles. */
function versInstant(dn, min) {
  const naif = dn * JOUR_MS + Math.round(min * 60000);
  let t = naif - decalage(new Date(naif)) * 60000;
  const d2 = decalage(new Date(t));
  t = naif - d2 * 60000;
  return new Date(t);
}

const isoJour = (dn) => new Date(dn * JOUR_MS).toISOString().slice(0, 10);
const jourIso = (dn) => ((new Date(dn * JOUR_MS).getUTCDay() + 6) % 7) + 1;

/** Texte local lisible : « 2026-10-26 07:45 ». */
function texteLocal(date) {
  const p = local(date);
  const z = (n) => String(n).padStart(2, '0');
  return `${p.y}-${z(p.m)}-${z(p.d)} ${z(p.h)}:${z(p.mi)}`;
}

/** Horaire du jour local, ou null s'il n'est pas ouvré (règle 5). */
function ouverture(cal, dn) {
  const h = cal.horaires.get(jourIso(dn));
  if (!h) return null;
  const date = isoJour(dn);
  const annee = Number(date.slice(0, 4));
  if (!cal.feries.has(annee)) cal.feries.set(annee, new Set(calendrier.feries(annee).map((f) => f.date)));
  if (cal.feries.get(annee).has(date)) return null;
  if (cal.conges.has(date.slice(5))) return null;
  if (cal.fermetures.some(([a, b]) => date >= a && date <= b)) return null;
  return h;
}

/** Règle 1 : premier moment ouvrable à partir d'un jour local et d'une minute. */
function normaliser(cal, dn, min) {
  for (let i = 0; i < GARDE_JOURS; i += 1, dn += 1, min = 0) {
    const h = ouverture(cal, dn);
    if (h && min < h.c) return { dn, min: Math.max(min, h.o) };
  }
  throw new AppError(409, 'CALENDRIER_VIDE');
}

/** Règles 2 et 3 : N jours ouvrés plus tard, même heure, ramenée dans l'horaire du jour d'arrivée. */
function plusJours(cal, depart, n) {
  let dn = depart.dn;
  for (let compte = 0, i = 0; compte < n; i += 1) {
    if (i > GARDE_JOURS) throw new AppError(409, 'CALENDRIER_VIDE');
    dn += 1;
    if (ouverture(cal, dn)) compte += 1;
  }
  const h = ouverture(cal, dn);
  return { dn, min: Math.min(Math.max(depart.min, h.o), h.c) };
}

/** Règle 4 : N heures de temps d'ouverture. */
function plusHeuresOuvrables(cal, depart, n) {
  let reste = n * 60;
  let { dn, min } = depart;
  for (let i = 0; i < GARDE_JOURS; i += 1, dn += 1, min = 0) {
    const h = ouverture(cal, dn);
    if (!h) continue;
    const debut = Math.max(min, h.o);
    if (debut >= h.c) continue;
    if (reste <= h.c - debut) return { dn, min: debut + reste };
    reste -= h.c - debut;
  }
  throw new AppError(409, 'CALENDRIER_VIDE');
}

/** Échéance d'un délai dans une unité, à partir de l'instant de réception. */
function ajouter(cal, recu, unite, n) {
  if (unite === 'heures_calendaires') return new Date(recu.getTime() + n * 3600000);
  const l = versLocal(recu);
  const depart = normaliser(cal, l.dn, l.min);
  const r = unite === 'jours_ouvrables' ? plusJours(cal, depart, n) : plusHeuresOuvrables(cal, depart, n);
  return versInstant(r.dn, r.min);
}

/** Début du décompte : la réception pour les heures calendaires, sinon l'ouverture suivante (règle 1). */
function debutDecompte(cal, recu, unite) {
  if (unite === 'heures_calendaires') return recu;
  const l = versLocal(recu);
  const d = normaliser(cal, l.dn, l.min);
  return versInstant(d.dn, d.min);
}

const sortie = (date) => (date ? { utc: date.toISOString(), local: texteLocal(date) } : null);

/**
 * Échéances d'une demande d'une entité : prise en charge et fin, selon la priorité et, au besoin, la catégorie.
 * Sert au simulateur (point 3 de la 0.4.0) et servira à l'étape 8 (échéance sur la fiche).
 */
function calculer(entiteId, recu, prio, delaiCategorie = null) {
  const cal = calendrier.charger(entiteId);
  const finJours = prio.unite === 'jours_ouvrables' && delaiCategorie ? delaiCategorie : prio.fin;
  const delaiFinSource = prio.unite === 'jours_ouvrables' && delaiCategorie ? 'categorie' : 'priorite';
  return {
    priorite: prio.code,
    unite: prio.unite,
    recu_le: sortie(recu),
    debut_decompte: sortie(debutDecompte(cal, recu, prio.unite)),
    delai_prise_en_charge: prio.prise_en_charge,
    prise_en_charge_le: sortie(ajouter(cal, recu, prio.unite, prio.prise_en_charge)),
    delai_fin: finJours,
    delai_fin_source: finJours === null ? null : delaiFinSource,
    fin_le: finJours === null ? null : sortie(ajouter(cal, recu, prio.unite, finJours)),
    date_convenue: finJours === null,
  };
}

/** Simulateur : « une demande de priorité P reçue le … (catégorie facultative) est due le … » dans l'entité active. */
function simuler(user, { priorite, recu_le, categorie_id } = {}) {
  if (!user.entiteId) throw new AppError(403, 'NO_ENTITE');
  const cat = categorie_id ? categories.get(user, categorie_id) : null;
  // Sans priorité donnée, celle que la catégorie propose (PRI-01).
  if (!priorite && !cat) throw new AppError(400, 'VALIDATION', ['priorite: priorité ou catégorie attendue']);
  const prio = priorites.get(user, priorite || cat.priorite_effective);
  const recu = recu_le ? new Date(recu_le) : new Date();
  const r = calculer(user.entiteId, recu, prio, cat ? cat.delai_fin_jours_effectif : null);
  return { ...r, categorie: cat ? { id: cat.id, code: cat.code, libelle_fr: cat.libelle_fr, libelle_nl: cat.libelle_nl } : null };
}

module.exports = { calculer, simuler, texteLocal, versInstant, versLocal };

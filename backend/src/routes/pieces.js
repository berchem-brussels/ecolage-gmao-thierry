/**
 * Pièces jointes des demandes (DEM-09, DEM-10, RGPD-02 ; version 0.8.0) : fiche, téléchargement authentifié et
 * suppression réelle. L'ajout passe par le brouillon (POST /api/demandes/brouillon/pieces, routes/demandes.js).
 * Le fichier se télécharge toujours en pièce jointe (Content-Disposition attachment, nosniff), jamais affiché en ligne
 * par le navigateur depuis l'adresse de l'API ; il se lit par le seul cookie de session, comme une balise image l'envoie.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const pieces = require('../services/pieces');

const router = express.Router();
router.use(authMiddleware);

/** En-tête Content-Disposition : nom ASCII de repli et nom UTF-8 (RFC 6266, RFC 5987). */
function disposition(nom) {
  const ascii = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nom)}`;
}

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, pieces.get(req.user, Number(req.params.id)), { resource: 'pieces' });
}));

router.get('/:id/fichier', validateParams(idParam), handle((req, res) => {
  const { file, type, nom } = pieces.fichier(req.user, Number(req.params.id));
  res.setHeader('Content-Type', type);
  res.setHeader('Content-Disposition', disposition(nom));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.sendFile(file);
}));

/** Suppression réelle (RGPD-02, DV-84) : fichier effacé du disque, ligne supprimée, journal d'audit. */
router.delete('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, pieces.supprimer(req.user, Number(req.params.id)), { resource: 'pieces' });
}));

router.disposition = disposition;
module.exports = router;

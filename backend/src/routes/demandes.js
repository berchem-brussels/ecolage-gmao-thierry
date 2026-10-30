/**
 * Demandes d'intervention (DEM-01 à 03, SUI-01) : liste, fiche et dépôt, appelant la couche de service (standard v3.2,
 * section 7.3). En 0.5.0, pas de modification ni d'annulation : elles arrivent avec le cycle de vie (étape 9, écart E-21).
 * 0.7.0 : demandes ouvertes du même bâtiment et « Moi aussi » (DEM-04).
 * 0.8.0 : pièces jointes du brouillon (DEM-09, DV-85), formulaire multipart lu par fichiers.js après le contrôle préalable.
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const demandes = require('../services/demandes');
const brouillons = require('../services/brouillons');
const pieces = require('../services/pieces');
const fichiers = require('../fichiers');
const { PIECE_MAX_OCTETS } = require('../config');

const router = express.Router();
router.use(authMiddleware);

router.get('/', validateQuery(S.demandeList), handle((req, res) => {
  const { rows, pagination } = demandes.list(req.user, req.query);
  ok(res, rows, { resource: 'demandes' }, pagination);
}));

// Avant « /:id » : demandes ouvertes du même bâtiment (DEM-04, 0.7.0).
router.get('/voisines', validateQuery(S.demandeVoisines), handle((req, res) => {
  ok(res, demandes.voisines(req.user, req.query), { resource: 'demandes' });
}));

// Avant « /:id » : brouillon du formulaire de la personne dans l'entité active (DEM-11, 0.7.0).
router.get('/brouillon', handle((req, res) => {
  ok(res, brouillons.get(req.user), { resource: 'brouillons' });
}));
router.put('/brouillon', validate(S.brouillonSave), handle((req, res) => {
  ok(res, brouillons.save(req.user, req.body), { resource: 'brouillons' });
}));
router.delete('/brouillon', handle((req, res) => {
  ok(res, brouillons.remove(req.user), { resource: 'brouillons' });
}));

// Pièces jointes du brouillon (0.8.0) : liste avec les plafonds de l'entité, ajout d'un fichier. Le contrôle préalable
// (droit, module, nombre) précède la lecture du corps ; le lecteur reçoit ensuite la taille et les formats de l'entité.
router.get('/brouillon/pieces', handle((req, res) => {
  ok(res, pieces.duBrouillon(req.user), { resource: 'pieces' });
}));
const avantPiece = handle((req, res, next) => { req.plafondsPieces = pieces.peutAjouter(req.user); next(); });
const recevoirPiece = fichiers.recevoir({
  maxOctets: (req) => req.plafondsPieces.octets,
  types: (req) => req.plafondsPieces.types,
  contrat: { maxOctets: PIECE_MAX_OCTETS, types: [...fichiers.IMAGES, fichiers.PDF] },
});
router.post('/brouillon/pieces', avantPiece, recevoirPiece, handle((req, res) => {
  const annonce = fichiers.annonce(req, req.plafondsPieces.types);
  ok(res, pieces.ajouter(req.user, req.file.buffer, annonce, req.file.originalname), { resource: 'pieces' }, null, 201);
}));

// Avant « /:id » : collègues pour le champ « Pour » (DEM-07, 0.7.0).
router.get('/beneficiaires', validateQuery(S.demandeBeneficiaires), handle((req, res) => {
  ok(res, demandes.beneficiaires(req.user, req.query), { resource: 'demandes' });
}));

router.get('/:id', validateParams(idParam), handle((req, res) => {
  ok(res, demandes.get(req.user, Number(req.params.id)), { resource: 'demandes' });
}));

router.post('/', validate(S.demandeCreate), handle((req, res) => {
  ok(res, demandes.create(req.user, req.body), { resource: 'demandes' }, null, 201);
}));

// « Moi aussi » (DEM-04) : suivre une demande ouverte au lieu d'en créer une nouvelle.
router.post('/:id/suivre', validateParams(idParam), validate(S.demandeSuivre), handle((req, res) => {
  ok(res, demandes.suivre(req.user, Number(req.params.id), req.body), { resource: 'demandes' });
}));

module.exports = router;

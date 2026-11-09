/**
 * Demandes d'intervention (DEM-01 à 03, SUI-01) : liste, fiche et dépôt, appelant la couche de service (standard v3.2,
 * section 7.3). En 0.5.0, pas de modification ni d'annulation : elles arrivent avec le cycle de vie (étape 9, écart E-21).
 * 0.7.0 : demandes ouvertes du même bâtiment et « Moi aussi » (DEM-04).
 * 0.8.0 : pièces jointes du brouillon (DEM-09, DV-85), formulaire multipart lu par fichiers.js après le contrôle préalable.
 * 0.9.0 : tableau de bord du service technique (GES-01), filtres et tris de la liste (GES-02), qualification (GES-04,
 * PRI-01) ; services/qualification.js.
 * 0.14.0 : cycle de vie (CYC-01, CYC-02, CLO-01) : historique de la fiche et passage d'un état à l'autre ; services/cycle.js.
 * 0.14.0, point 5 (SUI-05, E-21) : PUT complète la demande (texte), DELETE l'annule avec un motif (annulation logique,
 * CYC-05) ; POST /:id/pieces ajoute une photo ou un document à une demande envoyée (formulaire multipart, hors MCP, E-17).
 */
const express = require('express');
const { authMiddleware } = require('../auth');
const { validate, validateQuery, validateParams, idParam } = require('../validation');
const { ok, handle } = require('../envelope');
const S = require('../schemas');
const demandes = require('../services/demandes');
const qualification = require('../services/qualification');
const cycle = require('../services/cycle');
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

// Avant « /:id » : tableau de bord du service technique de l'entité active (GES-01, 0.9.0).
router.get('/tableau-bord', handle((req, res) => {
  ok(res, qualification.tableauBord(req.user), { resource: 'demandes' });
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

// Qualification par le service technique (GES-04, PRI-01, 0.9.0) : « À qualifier » devient « Qualifiée ».
router.post('/:id/qualifier', validateParams(idParam), validate(S.demandeQualifier), handle((req, res) => {
  ok(res, qualification.qualifier(req.user, Number(req.params.id), req.body), { resource: 'demandes' });
}));

// Complément et annulation par le demandeur ou le bénéficiaire (0.14.0, point 5).
router.put('/:id', validateParams(idParam), validate(S.demandeComplement), handle((req, res) => {
  ok(res, demandes.completer(req.user, Number(req.params.id), req.body), { resource: 'demandes' });
}));
router.delete('/:id', validateParams(idParam), validate(S.demandeAnnulation), handle((req, res) => {
  ok(res, cycle.annuler(req.user, Number(req.params.id), req.body.motif), { resource: 'demandes' });
}));
const avantPieceDemande = handle((req, res, next) => { req.plafondsPieces = pieces.peutAjouterADemande(req.user, Number(req.params.id)); next(); });
router.post('/:id/pieces', validateParams(idParam), avantPieceDemande, recevoirPiece, handle((req, res) => {
  const annonce = fichiers.annonce(req, req.plafondsPieces.types);
  ok(res, pieces.ajouter(req.user, req.file.buffer, annonce, req.file.originalname, 'api', Number(req.params.id)), { resource: 'pieces' }, null, 201);
}));

// Avis du demandeur ou du bénéficiaire sur une demande clôturée (0.14.0, point 6 ; SUI-06).
router.post('/:id/avis', validateParams(idParam), validate(S.demandeAvis), handle((req, res) => {
  ok(res, cycle.donnerAvis(req.user, Number(req.params.id), req.body), { resource: 'demandes' }, null, 201);
}));

// Cycle de vie (0.14.0) : historique lisible par qui lit la demande, passage contrôlé par la table des passages.
router.get('/:id/historique', validateParams(idParam), handle((req, res) => {
  ok(res, cycle.historique(req.user, Number(req.params.id)), { resource: 'demandes' });
}));
router.post('/:id/transitions', validateParams(idParam), validate(S.demandeTransition), handle((req, res) => {
  ok(res, cycle.appliquer(req.user, Number(req.params.id), req.body), { resource: 'demandes' });
}));

module.exports = router;

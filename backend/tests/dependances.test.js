/**
 * Dépendances du serveur (standard v3.2, section 10.2 ; écarts E-24 et E-30).
 * Le verrou ne doit jamais redescendre sous les versions corrigées en 0.7.3 : body-parser (haute, GHSA-27r3-jxmh-p828),
 * fast-uri et qs (modérées). Mise à jour ciblée du verrou, sans `npm audit fix` ni changement de version majeure.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const VERROU = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package-lock.json'), 'utf8')).packages;
const MINIMA = { 'body-parser': '1.20.9', 'fast-uri': '3.1.9', qs: '6.16.2' };
const num = (v) => v.split('.').map(Number);
const auMoins = (v, min) => {
  const [a, b] = [num(v), num(min)];
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
};

test('verrou du serveur : body-parser, fast-uri et qs aux versions corrigées ou au-delà, à chaque emplacement', () => {
  for (const [nom, min] of Object.entries(MINIMA)) {
    const trouves = Object.entries(VERROU).filter(([k]) => k === `node_modules/${nom}` || k.endsWith(`/node_modules/${nom}`));
    assert.ok(trouves.length >= 1, `${nom} présent dans le verrou`);
    for (const [k, p] of trouves) assert.ok(auMoins(p.version, min), `${k} ${p.version} < ${min}`);
  }
});

test('verrou du serveur : Express reste en version 4 (standard, section 4)', () => {
  assert.equal(num(VERROU['node_modules/express'].version)[0], 4);
});

test('verrou du serveur : `multer` en version 2 (E-16 ; la ligne 1.x est dépréciée par son éditeur), sur busboy', () => {
  assert.equal(num(VERROU['node_modules/multer'].version)[0], 2);
  assert.ok(VERROU['node_modules/busboy'], 'busboy, lecteur multipart de multer');
  assert.ok(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).dependencies.multer.startsWith('^2.'));
});

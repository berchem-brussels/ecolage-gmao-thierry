/**
 * Script de recette (0.14.0, point 1, DV-117) : un refus de connexion se dit en clair, avec le nombre de caractères
 * reçus, jamais par un code HTTP seul ; recette.sh montre la saisie, l'efface à Entrée et ne recopie jamais le mot de passe.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { motifConnexion } = require('../src/recette-api');

test('recette-api : motif lisible pour chaque refus de connexion', () => {
  assert.equal(motifConnexion(200, 16), '');
  assert.equal(motifConnexion(401, 16), 'mot de passe refusé, vérifiez la saisie (16 caractère(s) reçu(s))');
  assert.match(motifConnexion(401, 0), /aucun mot de passe reçu/);
  assert.match(motifConnexion(429, 16), /trop d’essais/);
  assert.match(motifConnexion(403, 16), /fermée pour ce compte/);
  assert.match(motifConnexion(400, 16), /mal formé/);
  assert.equal(motifConnexion(500, 16), 'connexion impossible (HTTP 500)');
  for (const s of [401, 429, 403, 400]) assert.doesNotMatch(motifConnexion(s, 5), /^HTTP|HTTP \d/);
});

test('recette.sh : saisie visible, ligne effacée à Entrée, nombre de caractères affiché, mot de passe jamais écrit', () => {
  const sh = fs.readFileSync(path.join(__dirname, '..', '..', 'recette.sh'), 'utf8');
  assert.match(sh, /read -r -p "Mot de passe : " MDP/);
  assert.doesNotMatch(sh, /read -r -s/, 'plus de saisie masquée');
  assert.match(sh, /\\033\[1A\\033\[2K/, 'la ligne saisie est effacée');
  assert.match(sh, /\$\{#MDP\} caractère\(s\)/);
  assert.match(sh, /unset MDP/);
  const lignesEcho = sh.split('\n').filter((l) => /^\s*(echo|printf)/.test(l) && /\$MDP|\$\{MDP\}/.test(l));
  assert.deepEqual(lignesEcho.filter((l) => !/printf '%s\\n' "\$MDP" \| docker exec/.test(l)), [], 'le mot de passe ne sort que vers le conteneur');
});

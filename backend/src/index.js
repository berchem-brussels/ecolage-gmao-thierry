/** Point d'entrée : base, migrations, application, arrêt propre (la base est écrite avant la sortie). */
const { initDb, saveNow } = require('./database');
const { PORT, VERSION } = require('./config');
const { buildApp } = require('./app');

async function start() {
  await initDb();
  // 0.9.0 : échéances des demandes qui n'en ont pas (déposées par une version antérieure après un retour arrière).
  const n = require('./services/qualification').completerEcheances(require('./database').getDb());
  if (n) { console.log(`[DB] Échéances calculées pour ${n} demande(s)`); saveNow(); }
  const app = buildApp();
  const server = app.listen(PORT, '0.0.0.0', () => console.log(`[APP] API ${VERSION} sur le port ${PORT}`));
  const stop = () => { saveNow(); server.close(() => process.exit(0)); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

start().catch((err) => { console.error('[APP] Démarrage impossible :', err); process.exit(1); });

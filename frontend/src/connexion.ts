/**
 * Outils de la connexion Microsoft côté interface (standard, section 8.6, 0.10.0).
 * safeNext : même règle que le serveur (src/oidc.js) pour le retour à l'écran demandé après une connexion par mot de passe.
 * redirection : navigation complète du navigateur (vers Microsoft ou la page de déconnexion), isolée pour les tests.
 */

/** Chemin de retour accepté seulement s'il commence par un seul « / » et ne contient que des caractères sûrs, sinon « / ». */
export function safeNext(next: string | null) {
  const s = String(next || '');
  return /^\/(?![/\\])[A-Za-z0-9\-._~/]*$/.test(s) ? s : '/';
}

export const redirection = {
  vers: (url: string) => { window.location.assign(url); },
};

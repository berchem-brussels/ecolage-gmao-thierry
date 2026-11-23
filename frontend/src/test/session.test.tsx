/**
 * Session de l'onglet (0.15.0, R1 de la recette de la 0.14.0) : la fenêtre « Nouveautés » gardait la note du compte
 * précédent après un changement de compte fait dans un autre onglet, sans rechargement. Le cookie de session est commun
 * aux onglets : l'onglet resté ouvert montrait encore la première personne alors que le serveur répondait pour la
 * seconde. Cause racine : `AuthContext` ne relisait le profil qu'au chargement de la page. Il le relit maintenant au
 * retour sur l'onglet (focus, page de nouveau visible) et recharge la page si la personne a changé.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { redirection } from '../connexion';

const personne = (id: number, prenom: string) => ({
  id, email: `${prenom.toLowerCase()}@exemple.test`, first_name: prenom, last_name: 'Nom', user_role: 'user', entite_id: 1,
  preferred_lang: 'fr', entites: [], entite_active_id: null, nouveautes: [], csrf_token: 'jeton',
});
let profil: Record<string, unknown> | null = personne(1, 'Ada');

function Qui() {
  const { user } = useAuth();
  return <p>{user ? `Connecté : ${user.first_name}` : 'Déconnecté'}</p>;
}

beforeEach(() => {
  profil = personne(1, 'Ada');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (url === '/api/auth/me' && !profil
    ? { ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ error: true, code: 'UNAUTHORIZED', message: 'Session expirée' }) }
    : { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: profil, meta: { envelope: 1 } }) })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('retour sur l’onglet (R1)', () => {
  it('autre personne connectée dans un autre onglet : la page est rechargée à l’accueil', async () => {
    const vers = vi.spyOn(redirection, 'vers').mockImplementation(() => {});
    render(<AuthProvider><Qui /></AuthProvider>);
    expect(await screen.findByText('Connecté : Ada')).toBeInTheDocument();
    profil = personne(2, 'Bert');
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(vers).toHaveBeenCalledWith('/'));
  });

  it('même personne : rien ne change ; session fermée ailleurs : retour à la connexion', async () => {
    const vers = vi.spyOn(redirection, 'vers').mockImplementation(() => {});
    render(<AuthProvider><Qui /></AuthProvider>);
    expect(await screen.findByText('Connecté : Ada')).toBeInTheDocument();
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByText('Connecté : Ada')).toBeInTheDocument();
    expect(vers).not.toHaveBeenCalled();
    profil = null;
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(await screen.findByText('Déconnecté')).toBeInTheDocument();
    expect(vers).not.toHaveBeenCalled();
  });
});

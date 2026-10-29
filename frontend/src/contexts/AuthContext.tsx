/** Session de la personne connectée (patron SAGA AuthContext.tsx, session en cookie côté serveur). */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setCsrfToken } from '../api';
import type { LieuChoisi } from '../demandes';

/** Entité où la personne a au moins un rôle actif, avec ses rôles dans cette entité. */
export interface UserEntite { id: number; code: string; nom_fr: string; nom_nl: string; roles: string[] }

/** Note de version : ce qui est nouveau dans une version, une ligne par nouveauté, en FR et en NL. */
export interface NoteVersion { version: string; date: string; lignes: { fr: string; nl: string }[] }

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  user_role: 'agent' | 'admin';
  entite_id: number | null;
  entites: UserEntite[];
  entite_active_id: number | null;
  preferred_lang: 'fr' | 'nl';
  ui_mode: 'simple' | 'complet';
  theme: 'clair' | 'sombre';
  must_change_password: number;
  /** Notes non lues depuis la dernière mise à jour (vide pour un compte nouveau). */
  nouveautes?: NoteVersion[];
  /** Lieu de travail habituel choisi (0.5.0, REF-04) et lieu proposé d'office dans l'entité active. */
  lieu_habituel_id?: number | null;
  lieu_propose?: LieuChoisi | null;
  /** Derniers lieux des demandes de la personne dans l'entité active, sans le lieu proposé (0.7.5, DV-74). */
  lieux_recents?: LieuChoisi[];
  /** Numéro à appeler en cas de danger dans l'entité active (0.7.0, DEM-06) : urgence, sinon service ; null sinon. */
  telephone_urgence?: string | null;
  /** Mentions d'information RGPD de l'entité active (0.7.0, RGPD-10), prêtes à afficher, et contact du DPO. */
  protection_donnees?: ProtectionDonnees | null;
}

export interface ProtectionDonnees {
  mention_courte_fr: string; mention_courte_nl: string; mention_fr: string; mention_nl: string; dpo_contact: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  savePreferences: (p: Partial<Pick<User, 'preferred_lang' | 'ui_mode' | 'theme'>>) => Promise<void>;
  setEntite: (id: number) => Promise<void>;
  /** Marque les nouveautés de la version installée comme lues : la fenêtre ne revient plus. */
  nouveautesLues: () => Promise<void>;
  isAdmin: boolean;
  /** Entité active et rôles de la personne dans celle-ci (cahier des charges ROL-03). */
  entite: UserEntite | null;
  roles: string[];
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { setUser(await api.get<User>('/auth/me')); } catch { setUser(null); }
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);
  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener('app-unauthorized', h);
    return () => window.removeEventListener('app-unauthorized', h);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ user: User }>('/auth/login', { email, password });
    setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout', {}); } finally { setCsrfToken(null); setUser(null); }
  }, []);

  /** Change l'entité active de la session ; le serveur refuse une entité où la personne n'a aucun rôle. */
  const setEntite = useCallback(async (id: number) => {
    setUser(await api.put<User>('/auth/entite', { entite_id: id }));
  }, []);

  const nouveautesLues = useCallback(async () => {
    setUser((u) => (u ? { ...u, nouveautes: [] } : u));
    try { setUser(await api.put<User>('/auth/nouveautes', {})); } catch { /* la fenêtre est fermée ; elle reviendra à la prochaine connexion */ }
  }, []);

  const savePreferences = useCallback(async (p: Partial<Pick<User, 'preferred_lang' | 'ui_mode' | 'theme'>>) => {
    setUser((u) => (u ? { ...u, ...p } : u));
    try { setUser(await api.put<User>('/auth/preferences', p)); } catch { /* le choix reste appliqué à l'écran */ }
  }, []);

  const entite = user?.entites?.find((e) => e.id === user.entite_active_id) || null;
  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, savePreferences, setEntite, nouveautesLues, isAdmin: user?.user_role === 'admin', entite, roles: entite?.roles || [] }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

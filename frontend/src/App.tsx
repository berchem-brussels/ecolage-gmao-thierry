/**
 * Coquille : thème Ant Design par jetons, clair et sombre, langue d'Ant Design et de dayjs, routes.
 * Patron SAGA App.tsx ; les couleurs viennent des paramètres de l'instance, jamais d'une constante.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin, theme as antTheme } from 'antd';
import frFR from 'antd/locale/fr_FR';
import nlNL from 'antd/locale/nl_NL';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/fr';
import 'dayjs/locale/nl';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { I18nProvider, useI18n } from './contexts/I18nContext';
import { SettingsProvider, type InstanceSettings } from './contexts/SettingsContext';
import { ROUGE_ERREUR, TEXTE_BOUTON_DANGER } from './couleurs';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import { loadSettings, applyThemeVariables } from './settings';
import { hasPermission, useRoles } from './useRoles';
import { moduleActif, useModules } from './moduleMap';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const EntitesPage = React.lazy(() => import('./pages/EntitesPage'));
const UsersPage = React.lazy(() => import('./pages/UsersPage'));
const PatrimoinePage = React.lazy(() => import('./pages/PatrimoinePage'));
const ListesValeursPage = React.lazy(() => import('./pages/ListesValeursPage'));
const ParametresPage = React.lazy(() => import('./pages/ParametresPage'));
const ReglagesEntitePage = React.lazy(() => import('./pages/ReglagesEntitePage'));
const ReferentielPage = React.lazy(() => import('./pages/ReferentielPage'));
const JournalPage = React.lazy(() => import('./pages/JournalPage'));
const HelpPage = React.lazy(() => import('./pages/HelpPage'));
const NouvelleDemandePage = React.lazy(() => import('./pages/NouvelleDemandePage'));
const DemandesPage = React.lazy(() => import('./pages/DemandesPage'));
const AccessibilityPage = React.lazy(() => import('./pages/AccessibilityPage'));

dayjs.extend(localizedFormat);

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export function buildTheme(s: InstanceSettings, dark: boolean) {
  const base = {
    token: { colorPrimary: s.theme.primary, borderRadius: 6, fontFamily: FONT },
    components: {
      Menu: { darkItemBg: 'transparent', darkSubMenuItemBg: 'transparent', darkItemSelectedBg: 'rgba(173,212,204,0.2)', darkItemHoverBg: 'rgba(255,255,255,0.08)' },
      Card: { headerFontSize: 14 },
    },
  };
  if (dark) {
    return {
      algorithm: antTheme.darkAlgorithm,
      // Rouge d'erreur lisible sur fond sombre (E-26, 0.7.0) ; texte foncé sur les boutons de danger pleins.
      token: { ...base.token, colorLink: s.theme.primary_text_dark, colorBgLayout: '#141414', colorBgContainer: '#1f1f1f',
        colorError: ROUGE_ERREUR.sombre, colorErrorText: ROUGE_ERREUR.sombre },
      components: { ...base.components, Button: { dangerColor: TEXTE_BOUTON_DANGER.sombre }, Table: { headerBg: '#262626', rowHoverBg: 'rgba(95,184,173,0.12)' }, Tree: { nodeSelectedBg: s.theme.selection_dark }, Tabs: { itemSelectedColor: s.theme.primary_text_dark, inkBarColor: s.theme.primary_text_dark } },
    };
  }
  return {
    // Liens à la couleur principale : le bleu par défaut d'Ant Design (#1677ff) n'atteint pas 4,5:1 sur fond blanc.
    // Rouge d'erreur à 4,5:1 au moins sur les fonds clairs (E-26, 0.7.0) : le rouge par défaut d'Ant Design n'atteint que 3,3:1.
    token: { ...base.token, colorLink: s.theme.primary, colorText: '#444', colorTextSecondary: '#666', colorBgLayout: '#f6f6f6', colorBgContainer: '#ffffff',
      colorError: ROUGE_ERREUR.clair, colorErrorText: ROUGE_ERREUR.clair },
    components: { ...base.components, Button: { dangerColor: TEXTE_BOUTON_DANGER.clair }, Table: { headerBg: '#f6f6f6', rowHoverBg: 'rgba(173,212,204,0.25)' }, Tree: { nodeSelectedBg: s.theme.selection } },
  };
}

function Loading() {
  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
}

function AdminOnly({ children }: { children: React.ReactElement }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

/** Écran réservé aux rôles de l'entité active qui portent la permission (confort ; le serveur contrôle). */
function PermissionOnly({ permission, children }: { permission: string; children: React.ReactElement }) {
  const { roles } = useAuth();
  const catalogue = useRoles();
  if (!catalogue.length) return <Loading />;
  return hasPermission(catalogue, roles, permission) ? children : <Navigate to="/" replace />;
}

/** Écran d'un module : renvoie à l'accueil quand le module est éteint (confort ; le serveur refuse ses opérations). */
function ModuleGate({ module, children }: { module: string; children: React.ReactElement }) {
  const { modules, loaded } = useModules();
  if (!loaded) return <Loading />;
  return moduleActif(modules, module) ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return (
    <React.Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<HomePage />} />
          <Route path="demandes/nouvelle" element={<ModuleGate module="demandes"><NouvelleDemandePage /></ModuleGate>} />
          <Route path="demandes" element={<ModuleGate module="demandes"><DemandesPage perimetre="miennes" /></ModuleGate>} />
          <Route path="demandes-entite" element={<ModuleGate module="demandes"><PermissionOnly permission="demandes:entite"><DemandesPage perimetre="entite" /></PermissionOnly></ModuleGate>} />
          <Route path="patrimoine" element={<ModuleGate module="patrimoine"><PermissionOnly permission="lieux:lire"><PatrimoinePage /></PermissionOnly></ModuleGate>} />
          <Route path="listes" element={<PermissionOnly permission="listes:gerer"><ListesValeursPage /></PermissionOnly>} />
          <Route path="referentiel" element={<PermissionOnly permission="categories:gerer"><ReferentielPage /></PermissionOnly>} />
          <Route path="reglages-entite" element={<PermissionOnly permission="parametres:gerer"><ReglagesEntitePage /></PermissionOnly>} />
          <Route path="entites" element={<AdminOnly><EntitesPage /></AdminOnly>} />
          <Route path="users" element={<AdminOnly><UsersPage /></AdminOnly>} />
          <Route path="parametres" element={<AdminOnly><ParametresPage /></AdminOnly>} />
          <Route path="journal" element={<AdminOnly><JournalPage /></AdminOnly>} />
          <Route path="help" element={<HelpPage />} />
          <Route path="accessibility" element={<AccessibilityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}

/** Applique thème et langue de la personne connectée (préférences en base). */
function Themed({ settings, children }: { settings: InstanceSettings; children: React.ReactNode }) {
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const dark = user?.theme === 'sombre';
  // La langue de la personne prime sur la langue par défaut de l'instance, même quand l'administrateur change celle-ci.
  React.useEffect(() => { if (user?.preferred_lang) setLang(user.preferred_lang); }, [user?.preferred_lang, settings.app.default_lang, setLang]);
  React.useEffect(() => { document.body.classList.toggle('app-dark', dark); }, [dark]);
  React.useEffect(() => { dayjs.locale(lang); }, [lang]);
  React.useEffect(() => { document.title = lang === 'nl' ? settings.app.name_nl : settings.app.name_fr; }, [lang, settings]);
  const theme = useMemo(() => buildTheme(settings, dark), [settings, dark]);
  return <ConfigProvider theme={theme} locale={lang === 'nl' ? nlNL : frFR}>{children}</ConfigProvider>;
}

export default function App({ initialSettings }: { initialSettings: InstanceSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const reload = useCallback(async () => {
    const s = await loadSettings();
    applyThemeVariables(s);
    setSettings(s);
  }, []);
  return (
    <SettingsProvider value={{ settings, reload }}>
      <BrowserRouter>
        <I18nProvider defaultLang={settings.app.default_lang}>
          <AuthProvider>
            <Themed settings={settings}>
              <AppRoutes />
            </Themed>
          </AuthProvider>
        </I18nProvider>
      </BrowserRouter>
    </SettingsProvider>
  );
}

/**
 * Mise en page (patron SAGA AppLayout.tsx, standard v3.2 section 12.3) :
 * menu latéral sombre de 230 px replié à 80 px, tiroir de 260 px sous 768 px, en-tête blanc de 56 px collant,
 * bascule Simple ou Complet, langue, thème, menu de l'utilisateur, lien d'évitement, chatbot.
 * Sélecteur de l'entité active en boutons (choix exclusif, standard section 12.4 ; cahier des charges ROL-03).
 */
import { useState } from 'react';
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Segmented, Select, Tag, Tooltip, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined, ApartmentOutlined, TeamOutlined, QuestionCircleOutlined, EyeOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  LogoutOutlined, LockOutlined, SunOutlined, MoonOutlined, ControlOutlined, BankOutlined, UnorderedListOutlined, SettingOutlined, AuditOutlined, FieldTimeOutlined,
  PlusOutlined, ProfileOutlined, InboxOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useSettings } from '../contexts/SettingsContext';
import AppMark from './AppMark';
import Chatbot from './Chatbot';
import PasswordModal from './PasswordModal';
import NouveautesModal from './NouveautesModal';
import LieuHabituelModal from './LieuHabituelModal';
import { hasPermission, useRoles } from '../useRoles';
import { routeActive, useModules } from '../moduleMap';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const screens = Grid.useBreakpoint();
  // Grid.useBreakpoint() est vide au premier rendu : on attend la vraie valeur (piège SAGA 84)
  const isMobile = screens.md === false;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [lieuOpen, setLieuOpen] = useState(false);
  const { user, isAdmin, logout, savePreferences, setEntite, entite, roles } = useAuth();
  const catalogue = useRoles();
  const can = (p: string) => hasPermission(catalogue, roles, p);
  const { modules } = useModules();
  const on = (route: string) => routeActive(modules, route);
  const { t, lang, setLang, tField } = useI18n();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const dark = user?.theme === 'sombre';

  const menuItems: MenuProps['items'] = [
    { type: 'group', label: t('nav.group.main'), children: [
      { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
      // Demandes (0.5.0) : toute personne qui a un rôle dans l'entité active dépose et suit ses demandes (DEM-01, SUI-01).
      ...(entite ? [
        { key: '/demandes/nouvelle', icon: <PlusOutlined />, label: t('nav.demande.nouvelle') },
        { key: '/demandes', icon: <ProfileOutlined />, label: t('nav.demandes') },
      ] : []),
      ...(can('demandes:entite') ? [{ key: '/demandes-entite', icon: <InboxOutlined />, label: t('nav.demandes.entite') }] : []),
      ...(can('lieux:lire') && on('/patrimoine') ? [{ key: '/patrimoine', icon: <BankOutlined />, label: t('nav.patrimoine') }] : []),
    ] },
    ...(can('listes:gerer') || can('parametres:gerer') || can('categories:gerer') ? [{ type: 'group' as const, label: t('nav.group.reglages'), children: [
      ...(can('categories:gerer') ? [{ key: '/referentiel', icon: <FieldTimeOutlined />, label: t('nav.referentiel') }] : []),
      ...(can('parametres:gerer') ? [{ key: '/reglages-entite', icon: <ControlOutlined />, label: t('nav.reglages') }] : []),
      ...(can('listes:gerer') ? [{ key: '/listes', icon: <UnorderedListOutlined />, label: t('nav.listes') }] : []),
    ] }] : []),
    ...(isAdmin ? [{ type: 'group' as const, label: t('nav.group.admin'), children: [
      { key: '/entites', icon: <ApartmentOutlined />, label: t('nav.entites') },
      { key: '/users', icon: <TeamOutlined />, label: t('nav.users') },
      { key: '/parametres', icon: <SettingOutlined />, label: t('nav.parametres') },
      { key: '/journal', icon: <AuditOutlined />, label: t('nav.journal') },
    ] }] : []),
    { type: 'group', label: t('nav.group.help'), children: [
      { key: '/help', icon: <QuestionCircleOutlined />, label: t('nav.help') },
      { key: '/accessibility', icon: <EyeOutlined />, label: t('nav.accessibility') },
    ] },
  ];

  const go: MenuProps['onClick'] = ({ key }) => { navigate(key); setDrawerOpen(false); };
  const changeLang = (l: 'fr' | 'nl') => { setLang(l); savePreferences({ preferred_lang: l }); };
  const changeEntite = async (id: number) => {
    try { await setEntite(id); message.success(t('layout.entite.changed')); } catch { message.error(t('common.error')); }
  };
  const entites = user?.entites || [];
  const entiteSelector = entites.length > 1 ? (
    <Segmented size="small" aria-label={t('layout.entite')} value={user?.entite_active_id ?? undefined}
      onChange={(v) => changeEntite(Number(v))}
      options={entites.map((e) => ({ value: e.id, label: <Tooltip title={tField(e as unknown as Record<string, unknown>, 'nom')}><span>{e.code}</span></Tooltip> }))} />
  ) : (
    <Tooltip title={entite ? tField(entite as unknown as Record<string, unknown>, 'nom') : t('layout.entite.none')}>
      <Tag color={entite ? 'var(--app-primary)' : 'default'} style={{ marginInlineEnd: 0 }} aria-label={t('layout.entite')}>
        {entite ? entite.code : t('layout.entite.none')}
      </Tag>
    </Tooltip>
  );

  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: collapsed && !isMobile ? 'center' : 'flex-start', padding: collapsed && !isMobile ? '0 8px' : '0 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <AppMark collapsed={collapsed && !isMobile} onDark />
      </div>
      <nav aria-label={t('layout.menu')} style={{ flex: 1, overflow: 'auto' }}>
        <Menu mode="inline" theme="dark" selectedKeys={[location.pathname]} items={menuItems} onClick={go}
          style={{ background: 'transparent', border: 'none', marginTop: 8 }} inlineCollapsed={collapsed && !isMobile} />
      </nav>
      {!(collapsed && !isMobile) && (
        <div style={{ padding: '8px 0 12px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 1 }}>
          v{settings.version}
        </div>
      )}
    </div>
  );

  const userMenu: MenuProps = {
    items: [
      // Sur téléphone, la bascule Simple ou Complet passe dans ce menu : elle reste accessible (standard section 12.5).
      ...(isMobile ? [{ key: 'mode', icon: <ControlOutlined />, label: `${t('layout.mode')} : ${user?.ui_mode === 'complet' ? t('layout.mode.simple') : t('layout.mode.complet')}` }] : []),
      ...(entite ? [{ key: 'lieu', icon: <EnvironmentOutlined />, label: t('profil.lieu.title') }] : []),
      { key: 'password', icon: <LockOutlined />, label: t('layout.password') },
      { key: 'logout', icon: <LogoutOutlined />, label: t('layout.logout') },
    ],
    onClick: ({ key }) => {
      if (key === 'mode') savePreferences({ ui_mode: user?.ui_mode === 'complet' ? 'simple' : 'complet' });
      else if (key === 'lieu') setLieuOpen(true);
      else if (key === 'password') setPwdOpen(true);
      else logout();
    },
  };

  const width = collapsed ? 80 : 230;
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <a className="skip-link" href="#main-content">{t('layout.skip')}</a>
      <NouveautesModal />
      <LieuHabituelModal open={lieuOpen} onClose={() => setLieuOpen(false)} />
      <PasswordModal open={pwdOpen || user?.must_change_password === 1} forced={user?.must_change_password === 1} onClose={() => setPwdOpen(false)} />
      {!isMobile && (
        <Sider trigger={null} collapsible collapsed={collapsed} width={230}
          style={{ background: 'var(--app-menu-bg)', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 10, overflow: 'auto' }}>
          {sidebar}
        </Sider>
      )}
      {isMobile && (
        <Drawer placement="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={260}
          styles={{ body: { padding: 0, background: 'var(--app-menu-bg)' }, header: { display: 'none' } }}>
          {sidebar}
        </Drawer>
      )}
      <Layout style={{ marginLeft: isMobile ? 0 : width, transition: 'margin-left 0.2s' }}>
        <Header style={{ padding: '0 16px', background: 'var(--app-bg-container)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 9, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', height: 56 }}>
          <Button type="text" aria-label={t('layout.menu')}
            icon={isMobile || collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))} />
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, minWidth: 0 }}>
            {/* Bouton « Nouvelle demande » sur chaque écran (DEM-01) ; sur téléphone, l'icône seule avec son nom accessible. */}
            {entite && location.pathname !== '/demandes/nouvelle' && (
              <Button type="primary" size={isMobile ? 'middle' : 'small'} icon={<PlusOutlined />} onClick={() => navigate('/demandes/nouvelle')}
                aria-label={isMobile ? t('nav.demande.nouvelle') : undefined}>
                {isMobile ? null : t('nav.demande.nouvelle')}
              </Button>
            )}
            {entiteSelector}
            {!isMobile && <Segmented size="small" aria-label={t('layout.mode')} value={user?.ui_mode || 'simple'}
              onChange={(v) => savePreferences({ ui_mode: v as 'simple' | 'complet' })}
              options={[{ label: t('layout.mode.simple'), value: 'simple' }, { label: t('layout.mode.complet'), value: 'complet' }]} />}
            <Select size="small" aria-label={t('layout.lang')} value={lang} onChange={changeLang} style={{ width: 64 }}
              options={[{ value: 'fr', label: 'FR' }, { value: 'nl', label: 'NL' }]} />
            <Tooltip title={dark ? t('layout.theme.light') : t('layout.theme.dark')}>
              <Button type="text" aria-label={dark ? t('layout.theme.light') : t('layout.theme.dark')}
                icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={() => savePreferences({ theme: dark ? 'clair' : 'sombre' })} />
            </Tooltip>
            <Dropdown menu={userMenu} trigger={['click']}>
              <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44 }}>
                <Avatar size={30} style={{ background: 'var(--app-primary)', flexShrink: 0 }}>{user?.first_name?.[0]}{user?.last_name?.[0]}</Avatar>
                {screens.lg && <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{user?.first_name} {user?.last_name}</span>}
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content id="main-content" role="main" aria-label={t('layout.main')} style={{ padding: isMobile ? 12 : 24, background: 'var(--app-bg-page)', minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
          <Chatbot />
        </Content>
      </Layout>
    </Layout>
  );
}

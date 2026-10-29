/**
 * Page de connexion (patron SAGA LoginPage.tsx) : dégradé aux couleurs de l'institution, carte de 440 px,
 * sélecteur de langue. Tant qu'aucun compte n'existe, la carte présente l'assistant d'installation du premier administrateur,
 * avec la langue par défaut et les modules activés dès le départ (version 0.3.0, écart E-08).
 * Le bouton Microsoft (SSO préconisé) s'ajoute avec le patron OpenID Connect de PILOT : non inclus dans le gabarit.
 */
import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Divider, Form, Grid, Input, Radio, Select, Space, Typography } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import api, { ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useSettings } from '../contexts/SettingsContext';
import AppMark from '../components/AppMark';
import { courriel, obligatoire, texteObligatoire } from '../validation';

export default function LoginPage() {
  const { login, refresh } = useAuth();
  const { t, lang, setLang, tField } = useI18n();
  const { settings, reload } = useSettings();
  const screens = Grid.useBreakpoint();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try { await fn(); } catch (e) { setError(e instanceof ApiError ? e.message : t('common.error')); } finally { setLoading(false); }
  };

  const onLogin = (v: { email: string; password: string }) => run(() => login(v.email, v.password));
  const installables = settings.modules_installables || [];
  const onInstall = (v: Record<string, unknown>) => run(async () => {
    await api.post('/install', v);
    await reload();
    await refresh();
  });

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      background: `linear-gradient(135deg, ${settings.theme.primary} 0%, ${settings.theme.menu_bg} 50%, ${settings.theme.login_gradient_end} 100%)` }}>
      <Card style={{ width: screens.sm ? 440 : '100%', maxWidth: 440, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><AppMark /></div>
        <Typography.Title level={1} style={{ fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
          {settings.installed ? t('login.title') : t('install.title')}
        </Typography.Title>
        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError('')} style={{ marginBottom: 16 }} />}

        {settings.installed ? (
          <Form onFinish={onLogin} size="large" layout="vertical" requiredMark={false}>
            <Form.Item name="email" label={t('login.email')} rules={[texteObligatoire(t), courriel(t)]} validateFirst>
              <Input prefix={<UserOutlined />} autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label={t('login.password')} rules={[obligatoire(t)]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44 }}>{t('login.submit')}</Button>
          </Form>
        ) : (
          <Form onFinish={onInstall} layout="vertical" requiredMark={false}
            initialValues={{ default_lang: settings.app.default_lang || 'fr', modules: installables.filter((m) => m.actif_defaut).map((m) => m.code) }}>
            <Typography.Paragraph type="secondary">{t('install.intro')}</Typography.Paragraph>
            <Divider orientation="left" plain>{t('install.section.organisation')}</Divider>
            <Form.Item name="organisation_fr" label={t('install.organisation_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
            <Form.Item name="organisation_nl" label={t('install.organisation_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
            <Divider orientation="left" plain>{t('install.section.entite')}</Divider>
            <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>{t('install.entite.help')}</Typography.Paragraph>
            <Form.Item name="entite_code" label={t('entites.field.code')} extra={t('entites.field.code.help')}
              normalize={(v: string) => (v || '').toUpperCase().replace(/\s/g, '')}
              rules={[texteObligatoire(t), { pattern: /^[A-Z][A-Z0-9]{1,9}$/, message: t('entites.field.code.help') }]}>
              <Input maxLength={10} />
            </Form.Item>
            <Form.Item name="entite_nom_fr" label={t('entites.field.nom_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
            <Form.Item name="entite_nom_nl" label={t('entites.field.nom_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
            <Divider orientation="left" plain>{t('install.section.reglages')}</Divider>
            <Form.Item name="default_lang" label={t('install.default_lang')} extra={t('install.default_lang.help')}>
              <Radio.Group optionType="button" buttonStyle="solid" options={[{ value: 'fr', label: t('install.lang.fr') }, { value: 'nl', label: t('install.lang.nl') }]} />
            </Form.Item>
            {installables.length > 0 && (
              <Form.Item name="modules" label={t('install.modules')} extra={t('install.modules.help')}>
                <Checkbox.Group style={{ width: '100%' }}>
                  <Space direction="vertical">
                    {installables.map((m) => (
                      <Checkbox key={m.code} value={m.code}>
                        <span style={{ fontWeight: 500 }}>{tField(m as unknown as Record<string, unknown>, 'libelle')}</span>
                        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{tField(m as unknown as Record<string, unknown>, 'description')}</Typography.Text>
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              </Form.Item>
            )}
            <Divider orientation="left" plain>{t('install.section.admin')}</Divider>
            <Form.Item name="email" label={t('users.field.email')} rules={[texteObligatoire(t), courriel(t)]} validateFirst><Input prefix={<MailOutlined />} autoComplete="email" /></Form.Item>
            <Form.Item name="first_name" label={t('users.field.first_name')} rules={[texteObligatoire(t)]}><Input autoComplete="given-name" /></Form.Item>
            <Form.Item name="last_name" label={t('users.field.last_name')} rules={[texteObligatoire(t)]}><Input autoComplete="family-name" /></Form.Item>
            <Form.Item name="password" label={t('login.password')} extra={t('install.password.help')} rules={[obligatoire(t), { min: 12 }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: 44 }}>{t('install.submit')}</Button>
          </Form>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Select size="small" aria-label={t('layout.lang')} value={lang} onChange={setLang} style={{ width: 120 }}
            options={[{ value: 'fr', label: 'Français' }, { value: 'nl', label: 'Nederlands' }]} />
        </div>
      </Card>
    </main>
  );
}

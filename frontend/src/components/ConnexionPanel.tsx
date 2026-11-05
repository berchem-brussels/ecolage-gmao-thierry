/**
 * Réglages de la connexion Microsoft (administrateur) : mode, inscription Entra ID ; le secret n'est jamais réaffiché
 * (standard, section 8.6). Repris de SettingsPage.tsx du gabarit 1.3.0, en onglet de Paramètres (?onglet=connexion) ;
 * les infobulles du gabarit attendent l'aide par écran (0.12.0) et sont remplacées par une ligne d'aide sous chaque champ.
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Radio, Typography, message } from 'antd';
import api, { ApiError } from '../api';
import { useI18n } from '../contexts/I18nContext';

export interface AuthSettings { mode: 'local' | 'sso' | 'sso_optional'; tenant: string; client_id: string; public_url: string; domains: string; secret_set: boolean; redirect_uri: string | null }

export default function ConnexionPanel() {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [data, setData] = useState<AuthSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get<AuthSettings>('/settings/auth').then((d) => { setData(d); form.setFieldsValue(d); }).catch(() => setData(null)); }, [form]);
  const save = async (v: Partial<AuthSettings> & { client_secret?: string }) => {
    const body = { ...v };
    if (!body.client_secret) delete body.client_secret;
    setSaving(true);
    try { const d = await api.put<AuthSettings>('/settings/auth', body); setData(d); form.setFieldsValue({ ...d, client_secret: '' }); message.success(t('common.saved')); }
    catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };
  return (
    <Card>
      <Typography.Paragraph type="secondary">{t('connexion.intro')}</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={save} style={{ maxWidth: 640 }}>
        <Form.Item name="mode" label={t('settings.mode')} extra={t('connexion.mode.help')}>
          <Radio.Group optionType="button" aria-label={t('settings.mode')}
            options={(['local', 'sso_optional', 'sso'] as const).map((m) => ({ value: m, label: t(`settings.mode.${m}`) }))} />
        </Form.Item>
        <Form.Item name="tenant" label={t('settings.tenant')} extra={t('connexion.tenant.help')}><Input autoComplete="off" /></Form.Item>
        <Form.Item name="client_id" label={t('settings.client_id')} extra={t('connexion.client_id.help')}><Input autoComplete="off" /></Form.Item>
        <Form.Item name="client_secret" label={t('settings.client_secret')} extra={data?.secret_set ? t('settings.secret_set') : t('connexion.client_secret.help')}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="public_url" label={t('settings.public_url')} extra={t('connexion.public_url.help')}
          rules={[{ pattern: /^(https:\/\/[^\s/]+(\/\S*)?)?$/, message: t('connexion.public_url.invalid') }]}><Input placeholder="https://" inputMode="url" /></Form.Item>
        <Form.Item name="domains" label={t('settings.domains')} extra={t('connexion.domains.help')}><Input /></Form.Item>
        {data?.redirect_uri && <Alert type="info" showIcon style={{ marginBottom: 16 }} message={t('settings.redirect_uri')} description={<Typography.Text copyable code style={{ wordBreak: 'break-all' }}>{data.redirect_uri}</Typography.Text>} />}
        <Button type="primary" htmlType="submit" loading={saving}>{t('common.save')}</Button>
      </Form>
    </Card>
  );
}

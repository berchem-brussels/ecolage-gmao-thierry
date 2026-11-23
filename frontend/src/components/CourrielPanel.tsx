/**
 * Courriel (administrateur ; 0.17.0, étape 13, point 2 ; NOT-02, NOT-04 ; standard section 7, « Courriel » et « Règles
 * communes ») : onglet de Paramètres (?onglet=courriel).
 *   - Mode test (livré) : aucun courriel ne part, ils sont retenus et se lisent ici ; l'écran le dit « simulé ».
 *     Mode SMTP : envoi réel par le serveur réglé.
 *   - Réglages SMTP ; le mot de passe n'est jamais réaffiché (laissé vide, il est gardé).
 *   - Envoi d'essai : retenu en mode test ; en mode SMTP, le résultat et l'explication du code d'erreur s'affichent.
 *   - Journal des courriels : retenus, en attente, envoyés, en échec ; un clic ouvre le texte.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Drawer, Form, Grid, Input, InputNumber, List, Radio, Space, Table, Tag, Typography, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { bruxelles } from './referentiel/TraceFiche';
import { instant } from '../demandes';
import ModelesCourriel from './ModelesCourriel';

export interface CourrielSettings {
  mode: 'test' | 'smtp'; host: string; port: number; securite: 'starttls' | 'tls' | 'aucune'; user: string; password_set: boolean;
  from: string; from_name: string; public_url: string; adresse_liens: string | null;
  file: { en_attente: number; echec: number; test: number }; enregistre?: { le: string | null; par: string | null } | null;
}
export interface Courriel {
  id: number; destinataire: string; langue: 'fr' | 'nl'; evenement: string; numero: string | null; sujet: string; mode: 'test' | 'smtp';
  etat: 'test' | 'en_attente' | 'envoye' | 'echec'; essais: number; erreur: string | null; envoye_le: string | null; created_at: string; corps?: string;
}
interface Essai { id: number; mode: 'test' | 'smtp'; resultat: 'retenu' | 'envoye' | 'echec'; erreur: string | null; destinataire: string }

const COULEUR: Record<Courriel['etat'], string> = { test: 'default', en_attente: 'gold', envoye: 'green', echec: 'red' };
const ERREURS = ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ETLS', 'EENVELOPE', 'EDNS'];
const TAILLE = 20;

export default function CourrielPanel() {
  const { t, hint } = useI18n();
  const screens = Grid.useBreakpoint();
  const mobile = screens.md === false;
  const [form] = Form.useForm();
  const [essaiForm] = Form.useForm();
  const [data, setData] = useState<CourrielSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [essai, setEssai] = useState<Essai | null>(null);
  const [filtre, setFiltre] = useState<'tous' | Courriel['etat']>('tous');
  const [rows, setRows] = useState<Courriel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [ouvert, setOuvert] = useState<Courriel | null>(null);
  const mode = Form.useWatch('mode', form) as CourrielSettings['mode'] | undefined;

  const lire = useCallback(() => api.get<CourrielSettings>('/settings/courriel').then((d) => { setData(d); form.setFieldsValue({ ...d, password: '' }); }).catch(() => setData(null)), [form]);
  const charger = useCallback(() => {
    api.page<Courriel>(`/courriels${qs({ limit: TAILLE, offset: (page - 1) * TAILLE, etat: filtre === 'tous' ? undefined : filtre })}`)
      .then((r) => { setRows(r.data); setTotal(r.pagination.total); }).catch(() => { setRows([]); setTotal(0); });
  }, [page, filtre]);
  useEffect(() => { lire(); }, [lire]);
  useEffect(() => { charger(); }, [charger]);

  const save = async (v: Partial<CourrielSettings> & { password?: string }) => {
    const body: Record<string, unknown> = { mode: v.mode, host: v.host || '', port: v.port, securite: v.securite, user: v.user || '', from: v.from || '', from_name: v.from_name || '', public_url: v.public_url || '' };
    if (v.password) body.password = v.password;
    setSaving(true);
    try { const d = await api.put<CourrielSettings>('/settings/courriel', body); setData(d); form.setFieldsValue({ ...d, password: '' }); message.success(t('common.saved')); }
    catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };
  const envoyerEssai = async (v: { destinataire?: string }) => {
    setEnvoi(true);
    setEssai(null);
    try { setEssai(await api.post<Essai>('/settings/courriel/essai', v.destinataire ? { destinataire: v.destinataire } : {})); lire(); charger(); }
    catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setEnvoi(false); }
  };
  const ouvrir = async (c: Courriel) => { try { setOuvert(await api.get<Courriel>(`/courriels/${c.id}`)); } catch { message.error(t('common.error')); } };

  const enregistre = () => {
    const e = data?.enregistre;
    if (!e || !e.le) return t('courriel.jamais');
    const { date, heure } = bruxelles(new Date(e.le));
    const base = t('connexion.enregistre').replace('{date}', date).replace('{heure}', heure);
    return e.par ? `${base} ${t('ref.trace.par').replace('{nom}', e.par)}` : base;
  };
  const explication = (code: string | null) => (code && ERREURS.includes(code) ? t(`courriel.erreur.${code}`) : t('courriel.erreur.autre'));
  const etatTag = (c: Courriel) => <Tag color={COULEUR[c.etat]} style={{ marginInlineEnd: 0 }}>{t(`courriel.etat.${c.etat}`)}</Tag>;
  const enTest = (mode ?? data?.mode) !== 'smtp';

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Typography.Paragraph type="secondary">{t('courriel.intro')}</Typography.Paragraph>
        {data && (
          <Alert type={data.mode === 'test' ? 'info' : 'success'} showIcon style={{ marginBottom: 12 }}
            message={data.mode === 'test' ? t('courriel.mode.test.actif') : t('courriel.mode.smtp.actif')} />
        )}
        {data && (data.file.en_attente > 0 || data.file.echec > 0) && (
          <Alert type={data.file.echec ? 'warning' : 'info'} showIcon style={{ marginBottom: 12 }}
            message={t('courriel.file').replace('{attente}', String(data.file.en_attente)).replace('{echec}', String(data.file.echec))} />
        )}
        {data && <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{enregistre()}</Typography.Paragraph>}
        <Form form={form} layout="vertical" onFinish={save} style={{ maxWidth: 640 }}>
          <Form.Item name="mode" label={t('courriel.mode')} tooltip={hint('courriel.mode')} extra={enTest ? t('courriel.mode.test.help') : t('courriel.mode.smtp.help')}>
            <Radio.Group optionType="button" aria-label={t('courriel.mode')}
              options={[{ value: 'test', label: t('courriel.mode.test') }, { value: 'smtp', label: t('courriel.mode.smtp') }]} />
          </Form.Item>
          <Form.Item name="host" label={t('courriel.host')} tooltip={hint('courriel.host')}
            rules={[{ pattern: /^[A-Za-z0-9.-]*$/, message: t('courriel.host.invalide') }, { required: mode === 'smtp', message: t('form.obligatoire') }]}>
            <Input autoComplete="off" inputMode="url" placeholder="smtp.exemple.be" />
          </Form.Item>
          <Form.Item name="port" label={t('courriel.port')} tooltip={hint('courriel.port')}>
            <InputNumber min={1} max={65535} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="securite" label={t('courriel.securite')} tooltip={hint('courriel.securite')} extra={t('courriel.securite.help')}>
            <Radio.Group optionType="button" aria-label={t('courriel.securite')}
              options={(['starttls', 'tls', 'aucune'] as const).map((s) => ({ value: s, label: t(`courriel.securite.${s}`) }))} />
          </Form.Item>
          <Form.Item name="user" label={t('courriel.user')} tooltip={hint('courriel.user')}><Input autoComplete="off" /></Form.Item>
          <Form.Item name="password" label={t('courriel.password')} tooltip={hint('courriel.password')} extra={data?.password_set ? t('settings.secret_set') : undefined}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="from" label={t('courriel.from')} tooltip={hint('courriel.from')}
            rules={[{ type: 'email', message: t('courriel.from.invalide') }, { required: mode === 'smtp', message: t('form.obligatoire') }]}>
            <Input autoComplete="off" inputMode="email" placeholder="gmao@exemple.be" />
          </Form.Item>
          <Form.Item name="from_name" label={t('courriel.from_name')} tooltip={hint('courriel.from_name')}
            rules={[{ pattern: /^[^<>"\r\n]*$/, message: t('courriel.from_name.invalide') }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="public_url" label={t('courriel.public_url')} tooltip={hint('courriel.public_url')}
            extra={data?.adresse_liens ? t('courriel.public_url.actuelle').replace('{url}', data.adresse_liens) : t('courriel.public_url.aucune')}
            rules={[{ pattern: /^(https:\/\/[^\s/]+(\/\S*)?)?$/, message: t('connexion.public_url.invalid') }]}>
            <Input placeholder="https://" inputMode="url" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>{t('common.save')}</Button>
        </Form>
      </Card>

      <Card title={t('courriel.essai.titre')}>
        <Typography.Paragraph type="secondary">{data?.mode === 'smtp' ? t('courriel.essai.smtp') : t('courriel.essai.test')}</Typography.Paragraph>
        <Form form={essaiForm} layout="vertical" onFinish={envoyerEssai} style={{ maxWidth: 640 }}>
          <Form.Item name="destinataire" label={t('courriel.essai.destinataire')} tooltip={hint('courriel.essai.destinataire')} extra={t('courriel.essai.destinataire.help')}
            rules={[{ type: 'email', message: t('courriel.from.invalide') }]}>
            <Input autoComplete="off" inputMode="email" />
          </Form.Item>
          <Button icon={<MailOutlined />} htmlType="submit" loading={envoi} style={{ whiteSpace: 'normal', height: 'auto', maxWidth: '100%' }}>{t('courriel.essai.bouton')}</Button>
        </Form>
        {essai && (
          <Alert style={{ marginTop: 12 }} showIcon role="status"
            type={essai.resultat === 'echec' ? 'error' : essai.resultat === 'envoye' ? 'success' : 'info'}
            message={t(`courriel.essai.${essai.resultat}`).replace('{adresse}', essai.destinataire)}
            description={essai.resultat === 'echec' ? `${essai.erreur} : ${explication(essai.erreur)}` : undefined} />
        )}
      </Card>

      <ModelesCourriel />

      <Card title={t('courriel.journal')}>
        <Typography.Paragraph type="secondary">{t('courriel.journal.intro')}</Typography.Paragraph>
        {/* Boutons qui passent à la ligne : en un seul bloc, le filtre sortait de l'écran à 320 px. */}
        <Radio.Group value={filtre} onChange={(e) => { setFiltre(e.target.value as typeof filtre); setPage(1); }} optionType="button" buttonStyle="solid" size="small"
          aria-label={t('courriel.journal.filtre')} className="courriel-filtre" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}
          options={(['tous', 'test', 'en_attente', 'envoye', 'echec'] as const).map((e) => ({ value: e, label: e === 'tous' ? t('courriel.etat.tous') : t(`courriel.etat.${e}`) }))} />
        {mobile ? (
          <List<Courriel> dataSource={rows} locale={{ emptyText: t('courriel.journal.vide') }}
            pagination={total > TAILLE ? { current: page, pageSize: TAILLE, total, onChange: setPage, size: 'small' } : false}
            renderItem={(c) => (
              <List.Item style={{ padding: '6px 0' }}>
                <Card size="small" style={{ width: '100%' }}>
                  <Space direction="vertical" size={2} style={{ width: '100%', minWidth: 0 }}>
                    <Button type="link" onClick={() => ouvrir(c)} style={{ paddingInline: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start' }}>{c.sujet}</Button>
                    <Typography.Text style={{ overflowWrap: 'anywhere' }}>{c.destinataire}</Typography.Text>
                    <Space size={6} wrap>{etatTag(c)}<Typography.Text type="secondary" style={{ fontSize: 12 }}>{instant(c.created_at)}</Typography.Text></Space>
                    {c.erreur && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{c.erreur} : {explication(c.erreur)}</Typography.Text>}
                  </Space>
                </Card>
              </List.Item>
            )} />
        ) : (
          <Table<Courriel> rowKey="id" size="middle" dataSource={rows} locale={{ emptyText: t('courriel.journal.vide') }} scroll={{ x: 'max-content' }}
            pagination={total > TAILLE ? { current: page, pageSize: TAILLE, total, onChange: setPage, showSizeChanger: false } : false}
            columns={[
              { title: t('courriel.col.date'), key: 'date', render: (_, c) => instant(c.created_at) },
              { title: t('courriel.col.destinataire'), dataIndex: 'destinataire', key: 'destinataire' },
              { title: t('courriel.col.sujet'), key: 'sujet', render: (_, c) => <Button type="link" onClick={() => ouvrir(c)} style={{ paddingInline: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start' }}>{c.sujet}</Button> },
              { title: t('courriel.col.etat'), key: 'etat', render: (_, c) => <Space size={4} wrap>{etatTag(c)}{c.erreur && <Typography.Text type="secondary" style={{ fontSize: 12 }} title={explication(c.erreur)}>{c.erreur}</Typography.Text>}</Space> },
            ]} />
        )}
      </Card>

      <Drawer open={!!ouvert} onClose={() => setOuvert(null)} width={mobile ? '100%' : 520} title={ouvert?.sujet} closable={{ 'aria-label': t('common.close') }}>
        {ouvert && (
          <>
            <Space direction="vertical" size={4} style={{ marginBottom: 12 }}>
              <Typography.Text>{t('courriel.col.destinataire')} : <span style={{ overflowWrap: 'anywhere' }}>{ouvert.destinataire}</span></Typography.Text>
              <Space size={6} wrap>{etatTag(ouvert)}<Typography.Text type="secondary">{instant(ouvert.created_at)}</Typography.Text></Space>
              {ouvert.mode === 'test' && <Alert type="info" showIcon message={t('courriel.simule')} />}
              {ouvert.erreur && <Alert type="error" showIcon message={`${ouvert.erreur} : ${explication(ouvert.erreur)}`} />}
            </Space>
            <pre lang={ouvert.langue} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit', background: 'var(--app-bg-page)', padding: 12, borderRadius: 6, margin: 0 }}>{ouvert.corps}</pre>
          </>
        )}
      </Drawer>
    </Space>
  );
}

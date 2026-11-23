/**
 * Modèles de courriel (administrateur ; 0.17.0, étape 13, point 3 ; NOT-04, NOT-06, LNG-05), dans Paramètres › Courriel.
 * Un modèle par événement, ou par variante de l'accusé de réception : sujet et texte en FR et en NL, variables admises
 * seulement ({numero} obligatoire), aperçu avec des valeurs d'exemple sans rien envoyer, retour au texte livré.
 * Chaque courriel part dans la langue de la personne qui le reçoit ; le pied « Courriel automatique… » est ajouté.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Drawer, Form, Grid, Input, List, Popconfirm, Radio, Space, Tag, Typography, message } from 'antd';
import { EyeOutlined, RollbackOutlined } from '@ant-design/icons';
import api, { ApiError } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { bruxelles } from './referentiel/TraceFiche';

export interface ModeleCourriel {
  code: string; libelle_fr: string; libelle_nl: string; sujet_fr: string; sujet_nl: string; corps_fr: string; corps_nl: string;
  texte_livre: 0 | 1; variables: string[]; trace: { etat: 'livree' | 'modifiee' | 'retablie'; le: string | null; par: string | null };
}
interface Apercu { sujet: string; corps: string; langue: 'fr' | 'nl' }

export default function ModelesCourriel() {
  const { t, hint, lang } = useI18n();
  const screens = Grid.useBreakpoint();
  const mobile = screens.md === false;
  const [form] = Form.useForm();
  const [rows, setRows] = useState<ModeleCourriel[]>([]);
  const [ouvert, setOuvert] = useState<ModeleCourriel | null>(null);
  const [saving, setSaving] = useState(false);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [langueApercu, setLangueApercu] = useState<'fr' | 'nl'>('fr');
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(() => api.get<ModeleCourriel[]>('/modeles-courriel').then(setRows).catch(() => setRows([])), []);
  useEffect(() => { charger(); }, [charger]);

  const ouvrir = (m: ModeleCourriel) => { setOuvert(m); setApercu(null); setErreur(null); form.setFieldsValue(m); };
  const apres = (m: ModeleCourriel) => { setOuvert(m); form.setFieldsValue(m); charger(); };
  const enregistrer = async (v: Pick<ModeleCourriel, 'sujet_fr' | 'sujet_nl' | 'corps_fr' | 'corps_nl'>) => {
    if (!ouvert) return;
    setSaving(true);
    setErreur(null);
    try { apres(await api.put<ModeleCourriel>(`/modeles-courriel/${ouvert.code}`, v)); message.success(t('common.saved')); }
    catch (e) { setErreur(e instanceof ApiError ? e.message : t('common.error')); }
    finally { setSaving(false); }
  };
  const voir = async (l: 'fr' | 'nl') => {
    if (!ouvert) return;
    setLangueApercu(l);
    setErreur(null);
    try {
      setApercu(await api.post<Apercu>(`/modeles-courriel/${ouvert.code}/apercu`, { langue: l, sujet: form.getFieldValue(`sujet_${l}`), corps: form.getFieldValue(`corps_${l}`) }));
    } catch (e) { setApercu(null); setErreur(e instanceof ApiError ? e.message : t('common.error')); }
  };
  const retablir = async () => {
    if (!ouvert) return;
    try { apres(await api.post<ModeleCourriel>(`/modeles-courriel/${ouvert.code}/retablir`, {})); setApercu(null); message.success(t('modelec.retabli')); }
    catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
  };
  const trace = (m: ModeleCourriel) => {
    if (m.trace.etat === 'livree' || !m.trace.le) return t('modelec.trace.livree');
    const { date, heure } = bruxelles(new Date(m.trace.le));
    const base = t(`modelec.trace.${m.trace.etat}`).replace('{date}', date).replace('{heure}', heure);
    return m.trace.par ? `${base} ${t('ref.trace.par').replace('{nom}', m.trace.par)}` : base;
  };
  const nom = (m: ModeleCourriel) => (lang === 'nl' ? m.libelle_nl : m.libelle_fr);
  const variables = (rows[0]?.variables || []).map((v) => `{${v}}`).join('  ');

  return (
    <Card title={t('modelec.titre')}>
      <Typography.Paragraph type="secondary">{t('modelec.intro')}</Typography.Paragraph>
      <List<ModeleCourriel> dataSource={rows} locale={{ emptyText: t('modelec.vide') }}
        renderItem={(m) => (
          <List.Item style={{ padding: '6px 0', gap: 8, flexWrap: 'wrap' }}>
            <Button type="link" onClick={() => ouvrir(m)} style={{ paddingInline: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start', minWidth: 0, flex: '1 1 200px' }}>{nom(m)}</Button>
            <Tag color={m.texte_livre ? 'default' : 'blue'} style={{ marginInlineEnd: 0 }}>{m.texte_livre ? t('modelec.livre') : t('modelec.modifie')}</Tag>
          </List.Item>
        )} />
      <Drawer open={!!ouvert} onClose={() => setOuvert(null)} width={mobile ? '100%' : 620} title={ouvert ? nom(ouvert) : ''} closable={{ 'aria-label': t('common.close') }}>
        {ouvert && (
          <>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{trace(ouvert)}</Typography.Paragraph>
            <Alert type="info" showIcon style={{ marginBottom: 12 }} message={t('modelec.variables')}
              description={<Typography.Text code style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{variables}</Typography.Text>} />
            <Form form={form} layout="vertical" onFinish={enregistrer}>
              <Form.Item name="sujet_fr" label={t('modelec.sujet_fr')} tooltip={hint('modelec.sujet')} rules={[{ required: true, message: t('form.obligatoire') }, { pattern: /^[^\r\n]*$/, message: t('modelec.une_ligne') }]}>
                <Input maxLength={150} lang="fr" />
              </Form.Item>
              <Form.Item name="corps_fr" label={t('modelec.corps_fr')} tooltip={hint('modelec.corps')} rules={[{ required: true, message: t('form.obligatoire') }]}>
                <Input.TextArea autoSize={{ minRows: 5, maxRows: 14 }} maxLength={4000} lang="fr" />
              </Form.Item>
              <Form.Item name="sujet_nl" label={t('modelec.sujet_nl')} tooltip={hint('modelec.sujet')} rules={[{ required: true, message: t('form.obligatoire') }, { pattern: /^[^\r\n]*$/, message: t('modelec.une_ligne') }]}>
                <Input maxLength={150} lang="nl" />
              </Form.Item>
              <Form.Item name="corps_nl" label={t('modelec.corps_nl')} tooltip={hint('modelec.corps')} rules={[{ required: true, message: t('form.obligatoire') }]}>
                <Input.TextArea autoSize={{ minRows: 5, maxRows: 14 }} maxLength={4000} lang="nl" />
              </Form.Item>
              {erreur && <Alert type="error" showIcon style={{ marginBottom: 12 }} message={erreur} />}
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={saving}>{t('common.save')}</Button>
                <Button icon={<EyeOutlined />} onClick={() => voir('fr')}>{t('modelec.apercu_fr')}</Button>
                <Button icon={<EyeOutlined />} onClick={() => voir('nl')}>{t('modelec.apercu_nl')}</Button>
                {!ouvert.texte_livre && (
                  <Popconfirm title={t('modelec.retablir.confirmer')} okText={t('modelec.retablir')} cancelText={t('common.cancel')} onConfirm={retablir}>
                    <Button icon={<RollbackOutlined />}>{t('modelec.retablir')}</Button>
                  </Popconfirm>
                )}
              </Space>
            </Form>
            {apercu && (
              <section aria-label={t('modelec.apercu')} style={{ marginTop: 16 }}>
                <Space align="center" wrap style={{ marginBottom: 8 }}>
                  <Typography.Title level={2} style={{ fontSize: 16, margin: 0 }}>{t('modelec.apercu')}</Typography.Title>
                  <Radio.Group size="small" optionType="button" value={langueApercu} onChange={(e) => voir(e.target.value)} aria-label={t('modelec.apercu.langue')}
                    options={[{ value: 'fr', label: 'FR' }, { value: 'nl', label: 'NL' }]} />
                </Space>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('modelec.apercu.aide')}</Typography.Paragraph>
                <div lang={apercu.langue} style={{ border: '1px solid var(--app-border)', borderRadius: 6, padding: 12 }}>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8, overflowWrap: 'anywhere' }}>{apercu.sujet}</Typography.Text>
                  <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit', margin: 0 }}>{apercu.corps}</pre>
                </div>
              </section>
            )}
          </>
        )}
      </Drawer>
    </Card>
  );
}

/**
 * Onglet « Prestataires » de l'écran Équipes et prestataires (version 0.19.0, étape 15, point 3 ; REF-07, EXT-03).
 * Lecture : gestionnaire et responsable (« prestataires:lire ») ; réglage : responsable (« prestataires:gerer »).
 * - Liste (tableau sur grand écran, une colonne empilée sous 768 px), recherche (nom, numéro, référence, contact) et filtre
 *   par corps de métier ; inactifs à la fin.
 * - Fiche en volet : nom, numéro d'entreprise (contrôlé par le serveur, clé modulo 97), langue de correspondance, contact,
 *   téléphone, courriel, adresse, référence libre du marché ou du contrat, corps de métier. Désactivation avec motif.
 * Un refus du serveur s'affiche dans le volet, la saisie reste (ERG-09).
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Drawer, Form, Grid, Input, Modal, Radio, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { texteObligatoire } from '../validation';

interface Valeur { id: number; code: string; libelle_fr: string; libelle_nl: string; is_active: number }
export interface Prestataire {
  id: number; nom: string; numero_entreprise: string | null; langue: 'fr' | 'nl'; contact_nom: string | null; telephone: string | null; courriel: string | null;
  adresse: string | null; code_postal: string | null; commune: string | null; reference_marche: string | null; is_active: number; motif_desactivation: string | null;
  is_demo: number; corps_metier: Valeur[];
}
type Saisie = Omit<Prestataire, 'id' | 'is_active' | 'motif_desactivation' | 'is_demo' | 'corps_metier'> & { corps_metier?: number[] };
const CHAMPS = ['nom', 'numero_entreprise', 'langue', 'contact_nom', 'telephone', 'courriel', 'adresse', 'code_postal', 'commune', 'reference_marche'] as const;

export default function PrestatairesOnglet({ gerer, corps, onCompte }: { gerer: boolean; corps: Valeur[]; onCompte?: (n: number) => void }) {
  const { t, tField, hint } = useI18n();
  const mobile = Grid.useBreakpoint().md === false;
  const [rows, setRows] = useState<Prestataire[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [filtreCorps, setFiltreCorps] = useState<number | null>(null);
  const [fiche, setFiche] = useState<Prestataire | 'nouveau' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [desactiver, setDesactiver] = useState<Prestataire | null>(null);
  const [motif, setMotif] = useState('');
  const [form] = Form.useForm<Saisie>();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));
  const libelle = (v: Valeur) => tField(v as unknown as Record<string, unknown>, 'libelle');
  const courant = fiche && fiche !== 'nouveau' ? fiche : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.page<Prestataire>(`/prestataires${qs({ limit: 200, q: q.trim() || undefined, corps_metier_id: filtreCorps ?? undefined })}`);
      setRows(r.data);
      if (!q.trim() && !filtreCorps) onCompte?.(r.data.length);
    } catch (e) { fail(e); } finally { setLoading(false); }
  }, [q, filtreCorps]);
  useEffect(() => { const id = window.setTimeout(load, 250); return () => window.clearTimeout(id); }, [load]);

  const choix = (gardees: number[]) => corps.filter((v) => v.is_active || gardees.includes(v.id)).map((v) => ({ value: v.id, label: libelle(v) }));

  const ouvrir = (p: Prestataire | 'nouveau') => {
    setErreur(null);
    form.resetFields();
    if (p === 'nouveau') form.setFieldsValue({ langue: 'fr' });
    else form.setFieldsValue({ ...Object.fromEntries(CHAMPS.map((k) => [k, p[k] ?? undefined])), corps_metier: p.corps_metier.map((c) => c.id) } as Saisie);
    setFiche(p);
  };

  const enregistrer = async (v: Saisie) => {
    setEnvoi(true);
    setErreur(null);
    const corpsEnvoye = {
      ...Object.fromEntries(CHAMPS.map((k) => [k, typeof v[k] === 'string' ? (v[k] as string).trim() || null : v[k] ?? null])),
      corps_metier: v.corps_metier || [],
    };
    try {
      if (fiche === 'nouveau') await api.post<Prestataire>('/prestataires', corpsEnvoye);
      else if (courant) await api.put<Prestataire>(`/prestataires/${courant.id}`, corpsEnvoye);
      message.success(t('common.saved'));
      setFiche(null);
      await load();
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  const confirmerDesactivation = async () => {
    if (!desactiver || !motif.trim()) return;
    try {
      await api.del(`/prestataires/${desactiver.id}`, { motif: motif.trim() });
      message.success(t('common.saved'));
      setDesactiver(null); setMotif(''); setFiche(null);
      await load();
    } catch (e) { fail(e); }
  };
  const reactiver = async (p: Prestataire) => {
    try { await api.put(`/prestataires/${p.id}`, { is_active: 1 }); message.success(t('common.saved')); setFiche(null); await load(); } catch (e) { fail(e); }
  };

  const titre = (p: Prestataire) => (
    <span>
      <Button type="link" onClick={() => ouvrir(p)} style={{ paddingInline: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start' }}>{p.nom}</Button>
      {p.numero_entreprise && <>{' '}<Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.numero_entreprise}</Typography.Text></>}
      {' '}<Tag style={{ marginInlineStart: 6 }}>{p.langue.toUpperCase()}</Tag>
      {p.is_demo ? <Tag color="purple">{t('common.demo')}</Tag> : null}
      {!p.is_active && <Tag>{t('prestataires.inactif')}</Tag>}
    </span>
  );
  const metiers = (p: Prestataire) => (p.corps_metier.length
    ? <Space size={[4, 4]} wrap>{p.corps_metier.map((c) => <Tag key={c.id} style={{ marginInlineEnd: 0 }}>{libelle(c)}</Tag>)}</Space>
    : <Typography.Text type="secondary">{t('ouvriers.corps.aucun')}</Typography.Text>);
  const contact = (p: Prestataire) => {
    const l = [p.contact_nom, p.telephone, p.courriel].filter(Boolean);
    return l.length ? <span style={{ overflowWrap: 'anywhere' }}>{l.join(' · ')}</span> : <Typography.Text type="secondary">{t('prestataires.contact.aucun')}</Typography.Text>;
  };
  const reference = (p: Prestataire) => p.reference_marche || <Typography.Text type="secondary">{t('prestataires.reference.aucune')}</Typography.Text>;

  return (
    <>
      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space wrap size={[12, 12]} style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space wrap size={[12, 12]}>
              <Input.Search allowClear className="prestataires-recherche" style={{ width: mobile ? '100%' : 260 }} aria-label={t('prestataires.recherche')}
                placeholder={t('prestataires.recherche.court')} title={t('prestataires.recherche')} value={q} onChange={(e) => setQ(e.target.value)} />
              <Select<number> allowClear style={{ width: mobile ? '100%' : 240 }} aria-label={t('prestataires.filtre')} placeholder={t('prestataires.filtre')}
                value={filtreCorps ?? undefined} onChange={(v) => setFiltreCorps(v ?? null)} options={choix([])} />
            </Space>
            {gerer && <Button type="primary" icon={<PlusOutlined />} onClick={() => ouvrir('nouveau')}>{t('prestataires.nouveau')}</Button>}
          </Space>
          <Table<Prestataire> rowKey="id" size="middle" loading={loading} dataSource={rows} pagination={false} locale={{ emptyText: t('prestataires.vide') }}
            rowClassName={(p) => (p.is_active ? '' : 'dem-close')} scroll={mobile ? undefined : { x: 'max-content' }}
            columns={mobile ? [
              { title: t('prestataires.col.prestataire'), key: 'pile', render: (_, p) => (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {titre(p)}
                  <div>{metiers(p)}</div>
                  <div><Typography.Text type="secondary">{t('prestataires.col.contact')} : </Typography.Text>{contact(p)}</div>
                  <div><Typography.Text type="secondary">{t('prestataires.col.reference')} : </Typography.Text>{reference(p)}</div>
                </Space>
              ) },
            ] : [
              { title: t('prestataires.col.prestataire'), key: 'nom', render: (_, p) => titre(p) },
              { title: t('prestataires.col.corps'), key: 'corps', render: (_, p) => <div style={{ maxWidth: 280 }}>{metiers(p)}</div> },
              { title: t('prestataires.col.contact'), key: 'contact', render: (_, p) => <div style={{ maxWidth: 280 }}>{contact(p)}</div> },
              { title: t('prestataires.col.reference'), key: 'reference', render: (_, p) => <div style={{ maxWidth: 240, whiteSpace: 'normal' }}>{reference(p)}</div> },
            ]} />
        </Space>
      </Card>

      <Drawer open={!!fiche} onClose={() => setFiche(null)} width={mobile ? '100%' : 560} title={fiche === 'nouveau' ? t('prestataires.nouveau') : courant ? courant.nom : ''}>
        {fiche && (
          <Form<Saisie> form={form} layout="vertical" onFinish={enregistrer} requiredMark disabled={!gerer}>
            {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
            {!gerer && <Alert type="info" showIcon message={t('prestataires.lecture')} style={{ marginBottom: 12 }} />}
            {courant && !courant.is_active && <Alert type="warning" showIcon message={`${t('prestataires.desactive')} ${courant.motif_desactivation || ''}`} style={{ marginBottom: 12 }} />}
            <Form.Item name="nom" label={t('prestataires.field.nom')} tooltip={hint('prestataires.nom')} rules={[texteObligatoire(t)]}><Input maxLength={150} /></Form.Item>
            <Form.Item name="numero_entreprise" label={t('prestataires.field.numero')} tooltip={hint('prestataires.numero')}
              rules={[{ pattern: /^[01][0-9. ]{9,13}$/, message: t('prestataires.field.numero.format') }]}>
              <Input maxLength={14} inputMode="numeric" placeholder="0123.456.749" />
            </Form.Item>
            <Form.Item name="langue" label={t('prestataires.field.langue')} tooltip={hint('prestataires.langue')}>
              <Radio.Group optionType="button" options={[{ value: 'fr', label: t('prestataires.langue.fr') }, { value: 'nl', label: t('prestataires.langue.nl') }]} />
            </Form.Item>
            <Form.Item name="corps_metier" label={t('prestataires.field.corps')} tooltip={hint('prestataires.corps')}>
              <Select<number[]> mode="multiple" allowClear showSearch optionFilterProp="label" placeholder={t('equipes.choisir')}
                options={choix(courant ? courant.corps_metier.map((c) => c.id) : [])} />
            </Form.Item>
            <Form.Item name="reference_marche" label={t('prestataires.field.reference')} tooltip={hint('prestataires.reference')}><Input maxLength={100} /></Form.Item>
            <Form.Item name="contact_nom" label={t('prestataires.field.contact')} tooltip={hint('prestataires.contact')}><Input maxLength={100} /></Form.Item>
            <Form.Item name="telephone" label={t('prestataires.field.telephone')} tooltip={hint('prestataires.telephone')}
              rules={[{ pattern: /^[0-9+ ./()-]*$/, message: t('prestataires.field.telephone.format') }]}><Input maxLength={30} type="tel" /></Form.Item>
            <Form.Item name="courriel" label={t('prestataires.field.courriel')} tooltip={hint('prestataires.courriel')}
              rules={[{ type: 'email', message: t('prestataires.field.courriel.format') }]}><Input maxLength={254} type="email" /></Form.Item>
            <Form.Item name="adresse" label={t('prestataires.field.adresse')} tooltip={hint('prestataires.adresse')}><Input maxLength={200} /></Form.Item>
            <Space wrap size={12} align="start">
              <Form.Item name="code_postal" label={t('prestataires.field.code_postal')} tooltip={hint('prestataires.code_postal')}><Input maxLength={10} style={{ width: 120 }} /></Form.Item>
              <Form.Item name="commune" label={t('prestataires.field.commune')} tooltip={hint('prestataires.commune')}><Input maxLength={100} /></Form.Item>
            </Space>
            {gerer && (
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={envoi}>{t('common.save')}</Button>
                <Button onClick={() => setFiche(null)}>{t('common.cancel')}</Button>
                {courant && (courant.is_active
                  ? <Button danger onClick={() => { setMotif(''); setDesactiver(courant); }}>{t('prestataires.desactiver')}</Button>
                  : <Button onClick={() => reactiver(courant)}>{t('prestataires.reactiver')}</Button>)}
              </Space>
            )}
          </Form>
        )}
      </Drawer>

      <Modal open={!!desactiver} title={desactiver ? `${t('prestataires.desactiver')} : ${desactiver.nom}` : ''} okText={t('prestataires.desactiver')}
        okButtonProps={{ danger: true, disabled: !motif.trim() }} cancelText={t('common.cancel')} onOk={confirmerDesactivation} onCancel={() => setDesactiver(null)}>
        <Typography.Paragraph type="secondary">{t('prestataires.desactiver.aide')}</Typography.Paragraph>
        <Input.TextArea rows={2} maxLength={500} aria-label={t('equipes.motif')} placeholder={t('equipes.motif')} value={motif} onChange={(e) => setMotif(e.target.value)} />
      </Modal>
    </>
  );
}

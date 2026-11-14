/**
 * Services et valideurs (version 0.16.0, étape 11, point 2 ; cahier des charges ROL-04, DEM-15), réservé à
 * l'administrateur : les services de chaque entité, leur valideur (chef de service) et un suppléant pour une période.
 * - Entité choisie en boutons ; liste des services (tableau sur grand écran, une colonne empilée sous 768 px).
 * - Fiche en volet : code, noms FR et NL, valideur et suppléant choisis parmi les personnes qui ont le rôle « Valideur »
 *   dans l'entité (le serveur refait le contrôle, VALIDEUR_SANS_ROLE), période du suppléant en deux dates ; membres du
 *   service (lecture : on rattache une personne dans Utilisateurs et rôles).
 * - Désactivation avec motif, réactivation. Un refus du serveur s'affiche dans le volet, la saisie reste (ERG-09).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Grid, Input, Modal, Radio, Select, Space, Table, Tag, Typography, Drawer, List, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import api, { ApiError, qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { useRoles } from '../useRoles';
import { texteObligatoire } from '../validation';

interface Entite { id: number; code: string; nom_fr: string; nom_nl: string; is_active: number }
interface RoleRow { entite_id: number; role: string }
interface Personne { id: number; first_name: string; last_name: string; email: string; entite_id: number | null; service_id: number | null; is_active: number; roles: RoleRow[] }
export interface Service {
  id: number; entite_id: number; code: string; nom_fr: string; nom_nl: string; ordre: number; is_active: number; motif_desactivation: string | null;
  valideur_id: number | null; valideur_prenom: string | null; valideur_nom: string | null;
  suppleant_id: number | null; suppleant_prenom: string | null; suppleant_nom: string | null; suppleant_du: string | null; suppleant_au: string | null;
  suppleance_en_cours: 0 | 1; nb_membres: number; is_demo: number;
}
interface Saisie { code: string; nom_fr: string; nom_nl: string; valideur_id?: number | null; suppleant_id?: number | null; suppleant_du?: Dayjs | null; suppleant_au?: Dayjs | null }

const JOUR = 'YYYY-MM-DD';
const jourLu = (d: string | null) => (d ? dayjs(d).format('DD/MM/YYYY') : '');

export default function ServicesPage() {
  const { t, tField, hint } = useI18n();
  const mobile = Grid.useBreakpoint().md === false;
  const catalogue = useRoles();
  const [entites, setEntites] = useState<Entite[]>([]);
  const [entiteId, setEntiteId] = useState<number | null>(null);
  const [rows, setRows] = useState<Service[]>([]);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [loading, setLoading] = useState(false);
  /** Fiche ouverte : un service, ou « nouveau ». */
  const [fiche, setFiche] = useState<Service | 'nouveau' | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [desactiver, setDesactiver] = useState<Service | null>(null);
  const [motif, setMotif] = useState('');
  const [form] = Form.useForm<Saisie>();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));

  useEffect(() => {
    api.page<Entite>(`/entites${qs({ limit: 200, is_active: 1 })}`).then((r) => { setEntites(r.data); setEntiteId((x) => x ?? r.data[0]?.id ?? null); }).catch(fail);
    api.page<Personne>(`/users${qs({ limit: 200, is_active: 1 })}`).then((r) => setPersonnes(r.data)).catch(() => setPersonnes([]));
  }, []);

  const load = useCallback(async () => {
    if (!entiteId) return;
    setLoading(true);
    try { setRows((await api.page<Service>(`/services${qs({ entite_id: entiteId, limit: 200 })}`)).data); } catch (e) { fail(e); } finally { setLoading(false); }
  }, [entiteId]);
  useEffect(() => { load(); }, [load]);

  /** Rôles qui permettent de valider (« demandes:valider ») : le rôle « Valideur » livré. */
  const rolesValideur = useMemo(() => catalogue.filter((r) => r.permissions.includes('demandes:valider')).map((r) => r.code), [catalogue]);
  const candidats = personnes.filter((p) => p.roles.some((r) => r.entite_id === entiteId && rolesValideur.includes(r.role)));
  const options = candidats.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` }));
  const nom = (prenom: string | null, n: string | null) => `${prenom || ''} ${n || ''}`.trim();
  const courant = fiche && fiche !== 'nouveau' ? fiche : null;
  const membres = courant ? personnes.filter((p) => p.service_id === courant.id) : [];

  const ouvrir = (s: Service | 'nouveau') => {
    setErreur(null);
    form.resetFields();
    if (s !== 'nouveau') {
      form.setFieldsValue({
        code: s.code, nom_fr: s.nom_fr, nom_nl: s.nom_nl, valideur_id: s.valideur_id, suppleant_id: s.suppleant_id,
        suppleant_du: s.suppleant_du ? dayjs(s.suppleant_du) : null, suppleant_au: s.suppleant_au ? dayjs(s.suppleant_au) : null,
      });
    }
    setFiche(s);
  };

  const enregistrer = async (v: Saisie) => {
    setEnvoi(true);
    setErreur(null);
    const suppleant = v.suppleant_id ?? null;
    const corps = {
      code: v.code.trim(), nom_fr: v.nom_fr.trim(), nom_nl: v.nom_nl.trim(), valideur_id: v.valideur_id ?? null, suppleant_id: suppleant,
      ...(suppleant ? { suppleant_du: v.suppleant_du ? v.suppleant_du.format(JOUR) : null, suppleant_au: v.suppleant_au ? v.suppleant_au.format(JOUR) : null } : {}),
    };
    try {
      if (fiche === 'nouveau') await api.post<Service>('/services', { entite_id: entiteId, ...corps });
      else if (courant) await api.put<Service>(`/services/${courant.id}`, corps);
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
      await api.del(`/services/${desactiver.id}`, { motif: motif.trim() });
      message.success(t('common.saved'));
      setDesactiver(null); setMotif(''); setFiche(null);
      await load();
    } catch (e) { fail(e); }
  };
  const reactiver = async (s: Service) => {
    try { await api.put(`/services/${s.id}`, { is_active: 1 }); message.success(t('common.saved')); setFiche(null); await load(); } catch (e) { fail(e); }
  };

  const valideur = (s: Service) => (s.valideur_id ? nom(s.valideur_prenom, s.valideur_nom) : <Tag color="orange" style={{ marginInlineEnd: 0 }}>{t('services.sans_valideur')}</Tag>);
  const suppleant = (s: Service) => (s.suppleant_id ? (
    <div>
      <div>{nom(s.suppleant_prenom, s.suppleant_nom)} {s.suppleance_en_cours === 1 && <Tag color="green" style={{ marginInlineEnd: 0 }}>{t('services.suppleance.en_cours')}</Tag>}</div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('services.periode.texte').replace('{du}', jourLu(s.suppleant_du)).replace('{au}', jourLu(s.suppleant_au))}</Typography.Text>
    </div>
  ) : <Typography.Text type="secondary">{t('services.suppleant.aucun')}</Typography.Text>);
  const titreService = (s: Service) => (
    <span>
      <Button type="link" onClick={() => ouvrir(s)} style={{ paddingInline: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start' }}>{tField(s as unknown as Record<string, unknown>, 'nom')}</Button>
      {' '}<Typography.Text type="secondary" style={{ fontSize: 12 }}>{s.code}</Typography.Text>
      {s.is_demo ? <Tag color="purple" style={{ marginInlineStart: 6 }}>{t('common.demo')}</Tag> : null}
      {!s.is_active && <Tag style={{ marginInlineStart: 6 }}>{t('services.inactif')}</Tag>}
    </span>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0 }}>{t('nav.services')}</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => ouvrir('nouveau')} disabled={!entiteId}>{t('services.nouveau')}</Button>
      </div>
      <Typography.Paragraph type="secondary">{t('services.intro')}</Typography.Paragraph>
      <Card>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Radio.Group optionType="button" aria-label={t('services.entite')} value={entiteId} onChange={(e) => setEntiteId(e.target.value)}
            options={entites.map((e) => ({ value: e.id, label: e.code }))} />
          <Table<Service> rowKey="id" size="middle" loading={loading} dataSource={rows} pagination={false} locale={{ emptyText: t('services.vide') }}
            rowClassName={(s) => (s.is_active ? '' : 'dem-close')} scroll={mobile ? undefined : { x: 'max-content' }}
            columns={mobile ? [
              { title: t('services.col.service'), key: 'pile', render: (_, s) => (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {titreService(s)}
                  <div><Typography.Text type="secondary">{t('services.col.valideur')} : </Typography.Text>{valideur(s)}</div>
                  <div><Typography.Text type="secondary">{t('services.col.suppleant')} : </Typography.Text>{suppleant(s)}</div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('services.col.membres')} : {s.nb_membres}</Typography.Text>
                </Space>
              ) },
            ] : [
              { title: t('services.col.service'), key: 'service', render: (_, s) => titreService(s) },
              { title: t('services.col.valideur'), key: 'valideur', render: (_, s) => valideur(s) },
              { title: t('services.col.suppleant'), key: 'suppleant', render: (_, s) => suppleant(s) },
              { title: t('services.col.membres'), key: 'membres', dataIndex: 'nb_membres', width: 100 },
            ]} />
        </Space>
      </Card>

      <Drawer open={!!fiche} onClose={() => setFiche(null)} width={mobile ? '100%' : 520}
        title={fiche === 'nouveau' ? t('services.nouveau') : courant ? `${t('services.fiche')} ${courant.code}` : ''}>
        {fiche && (
          <Form<Saisie> form={form} layout="vertical" onFinish={enregistrer} requiredMark>
            {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
            {courant && !courant.is_active && <Alert type="warning" showIcon message={`${t('services.desactive')} ${courant.motif_desactivation || ''}`} style={{ marginBottom: 12 }} />}
            <Form.Item name="code" label={t('services.field.code')} tooltip={hint('services.code')} rules={[texteObligatoire(t), { pattern: /^[A-Za-z0-9][A-Za-z0-9._+-]{1,29}$/, message: t('services.field.code.format') }]}>
              <Input maxLength={30} />
            </Form.Item>
            <Form.Item name="nom_fr" label={t('services.field.nom_fr')} tooltip={hint('services.nom_fr')} rules={[texteObligatoire(t)]}><Input maxLength={150} /></Form.Item>
            <Form.Item name="nom_nl" label={t('services.field.nom_nl')} tooltip={hint('services.nom_nl')} rules={[texteObligatoire(t)]}><Input maxLength={150} lang="nl" /></Form.Item>
            {options.length === 0 && <Alert type="info" showIcon message={t('services.aucun_candidat')} style={{ marginBottom: 12 }} />}
            <Form.Item name="valideur_id" label={t('services.field.valideur')} tooltip={hint('services.valideur')} extra={t('services.field.valideur.aide')}>
              <Select<number> allowClear showSearch optionFilterProp="label" options={options} placeholder={t('services.choisir')} />
            </Form.Item>
            <Form.Item name="suppleant_id" label={t('services.field.suppleant')} tooltip={hint('services.suppleant')}>
              <Select<number> allowClear showSearch optionFilterProp="label" options={options} placeholder={t('services.choisir')} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(a, b) => a.suppleant_id !== b.suppleant_id}>
              {() => (form.getFieldValue('suppleant_id') ? (
                <Space wrap size={12} align="start">
                  <Form.Item name="suppleant_du" label={t('services.field.du')} tooltip={hint('services.periode')} rules={[{ required: true, message: t('form.obligatoire') }]}>
                    <DatePicker format="DD/MM/YYYY" inputReadOnly />
                  </Form.Item>
                  <Form.Item name="suppleant_au" label={t('services.field.au')} tooltip={hint('services.periode')} dependencies={['suppleant_du']}
                    rules={[{ required: true, message: t('form.obligatoire') }, ({ getFieldValue }) => ({
                      validator: (_, v: Dayjs | null) => (!v || !getFieldValue('suppleant_du') || !v.isBefore(getFieldValue('suppleant_du'), 'day')
                        ? Promise.resolve() : Promise.reject(new Error(t('services.periode.ordre')))),
                    })]}>
                    <DatePicker format="DD/MM/YYYY" inputReadOnly />
                  </Form.Item>
                </Space>
              ) : null)}
            </Form.Item>
            {courant && (
              <Card size="small" title={`${t('services.membres')} (${membres.length})`} style={{ marginBottom: 16 }}>
                <List size="small" dataSource={membres} locale={{ emptyText: t('services.membres.vide') }}
                  renderItem={(p) => <List.Item style={{ paddingInline: 0 }}>{p.first_name} {p.last_name}</List.Item>} />
                <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0, marginTop: 8 }}>{t('services.membres.aide')}</Typography.Paragraph>
              </Card>
            )}
            <Space wrap>
              <Button type="primary" htmlType="submit" loading={envoi}>{t('common.save')}</Button>
              <Button onClick={() => setFiche(null)}>{t('common.cancel')}</Button>
              {courant && (courant.is_active
                ? <Button danger onClick={() => { setMotif(''); setDesactiver(courant); }}>{t('services.desactiver')}</Button>
                : <Button onClick={() => reactiver(courant)}>{t('services.reactiver')}</Button>)}
            </Space>
          </Form>
        )}
      </Drawer>

      <Modal open={!!desactiver} title={desactiver ? `${t('services.desactiver')} ${desactiver.code}` : ''} okText={t('services.desactiver')} okButtonProps={{ danger: true, disabled: !motif.trim() }}
        cancelText={t('common.cancel')} onOk={confirmerDesactivation} onCancel={() => setDesactiver(null)}>
        <Typography.Paragraph type="secondary">{t('services.desactiver.aide')}</Typography.Paragraph>
        <Input.TextArea rows={2} maxLength={500} aria-label={t('services.motif')} placeholder={t('services.motif')} value={motif} onChange={(e) => setMotif(e.target.value)} />
      </Modal>
    </div>
  );
}

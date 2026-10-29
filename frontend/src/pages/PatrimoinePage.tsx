/**
 * Patrimoine de l'entité active (cahier des charges REF-01, REF-02) : arbre site, bâtiment, niveau, local à gauche,
 * fiche du lieu à droite (en dessous sur téléphone). Le lieu choisi est dans l'adresse (?lieu=12), partageable.
 * Lecture pour tout rôle de l'entité ; création, modification, photo et désactivation pour les rôles qui portent
 * « lieux:gerer ». En mode Simple, la désactivation et le déplacement sont repliés (standard v3.2, section 12.5).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Checkbox, Col, Collapse, Descriptions, Drawer, Empty, Form, Image, Input, InputNumber, Modal,
  Popconfirm, Radio, Row, Select, Space, Spin, Tag, Tree, Typography, message,
} from 'antd';
import type { DataNode } from 'antd/es/tree';
import {
  PlusOutlined, EditOutlined, CameraOutlined, DeleteOutlined, EnvironmentOutlined, BankOutlined, BarsOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { hasPermission, useRoles } from '../useRoles';
import { reduirePhoto } from '../photo';
import {
  type Lieu, type Nature, type Valeur, ENFANTS, PARENTS, STATUTS, ancestors, codeSuggestion, flatten, normalize,
} from '../lieux';
import ErreurObligatoire from '../components/ErreurObligatoire';
import { obligatoire, seulementEspaces, texteObligatoire } from '../validation';

const ICONS: Record<Nature, JSX.Element> = {
  site: <EnvironmentOutlined />, batiment: <BankOutlined />, niveau: <BarsOutlined />, local: <AppstoreOutlined />,
};

interface FormValues {
  code: string; nom_fr: string; nom_nl: string; type_id?: number | null; statut?: string;
  adresse?: string | null; code_postal?: string | null; commune?: string | null; surface_m2?: number | null; parent_id?: number;
}

export default function PatrimoinePage() {
  const { t, tField } = useI18n();
  const { user, roles } = useAuth();
  const catalogue = useRoles();
  const canEdit = hasPermission(catalogue, roles, 'lieux:gerer');
  const simple = user?.ui_mode !== 'complet';
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get('lieu')) || null;

  const [racines, setRacines] = useState<Lieu[]>([]);
  const [types, setTypes] = useState<Valeur[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [inactifs, setInactifs] = useState(false);
  const [expanded, setExpanded] = useState<React.Key[]>([]);
  const [creating, setCreating] = useState<{ nature: Nature; parent: Lieu | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [motif, setMotif] = useState('');
  const [uploading, setUploading] = useState(false);
  const [createForm] = Form.useForm<FormValues>();
  const [editForm] = Form.useForm<FormValues>();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = await api.get<{ racines: Lieu[] }>(`/lieux/arbre${qs({ inclure_inactifs: inactifs ? 1 : 0 })}`);
      setRacines(a.racines);
      setTypes((await api.page<Valeur>(`/listes-valeurs${qs({ liste: 'type_lieu', limit: 200 })}`)).data);
    } catch (e) { fail(e); } finally { setLoading(false); }
  }, [inactifs, t]);
  useEffect(() => { load(); }, [load, user?.entite_active_id]);

  const all = useMemo(() => flatten(racines), [racines]);
  const byId = useMemo(() => new Map(all.map((l) => [l.id, l])), [all]);
  const current = selectedId ? byId.get(selectedId) || null : null;
  useEffect(() => {
    // Dépliage initial : les sites et le chemin du lieu choisi.
    const keys = new Set<React.Key>([...expanded, ...racines.map((r) => r.id)]);
    if (selectedId) ancestors(selectedId, byId).forEach((a) => keys.add(a.id));
    setExpanded([...keys]);
  }, [racines]); // dépend volontairement du seul arbre chargé

  const select = (id: number | null) => { setParams(id ? { lieu: String(id) } : {}); setMotif(''); };
  const natureLabel = (n: Nature) => t(`lieux.nature.${n}`);
  const statutTag = (l: Lieu) => (l.statut === 'en_service' ? null : <Tag color={l.statut === 'cede' ? 'default' : 'orange'}>{t(`lieux.statut.${l.statut}`)}</Tag>);
  const activeTypes = types.filter((v) => v.is_active);
  const typeOptions = (keep?: number | null) => types
    .filter((v) => v.is_active || v.id === keep)
    .map((v) => ({ value: v.id, label: tField(v as unknown as Record<string, unknown>, 'libelle') }));

  /* ---------- Arbre ---------- */
  const treeData = useMemo(() => {
    const q = normalize(search.trim());
    const match = (l: Lieu) => !q || [l.code, l.nom_fr, l.nom_nl, l.adresse || ''].some((s) => normalize(s).includes(q));
    const build = (nodes: Lieu[]): DataNode[] => nodes.flatMap((l) => {
      const kids = build(l.enfants || []);
      if (!match(l) && !kids.length) return [];
      return [{
        key: l.id,
        icon: ICONS[l.nature],
        title: (
          <span style={{ opacity: l.is_active ? 1 : 0.55 }}>
            <span style={{ fontWeight: 500 }}>{l.code}</span> · {tField(l as unknown as Record<string, unknown>, 'nom')}
            {' '}{statutTag(l)}{!l.is_active && <Tag>{t('common.inactive')}</Tag>}
          </span>
        ),
        children: kids,
      }];
    });
    return build(racines);
  }, [racines, search, t, tField]);
  const treeExpanded = search.trim() ? all.map((l) => l.id) : expanded;

  /* ---------- Création ---------- */
  const openCreate = (nature: Nature, parent: Lieu | null) => setCreating({ nature, parent });
  const create = async (v: FormValues) => {
    if (!creating) return;
    try {
      const body: Record<string, unknown> = { ...v, nature: creating.nature };
      if (creating.parent) body.parent_id = creating.parent.id;
      for (const k of Object.keys(body)) if (body[k] === undefined || body[k] === '') delete body[k];
      const l = await api.post<Lieu>('/lieux', body);
      message.success(t('common.saved'));
      setCreating(null);
      if (creating.parent) setExpanded((e) => [...new Set([...e, creating.parent!.id])]);
      await load();
      select(l.id);
    } catch (e) { fail(e); }
  };

  /* ---------- Modification ---------- */
  const openEdit = () => setEditing(true);
  const editValues = (l: Lieu): FormValues => ({
    code: l.code, nom_fr: l.nom_fr, nom_nl: l.nom_nl, type_id: l.type_id, statut: l.statut,
    adresse: l.adresse, code_postal: l.code_postal, commune: l.commune, surface_m2: l.surface_m2, parent_id: l.parent_id ?? undefined,
  });
  const save = async (v: FormValues) => {
    if (!current) return;
    try {
      const body: Record<string, unknown> = { ...v };
      for (const k of ['adresse', 'code_postal', 'commune']) if (body[k] === '') body[k] = null;
      // Un champ vidé à l'écran s'efface en base (le type reste exigé pour un local).
      if (body.type_id === undefined && current.nature !== 'local') body.type_id = null;
      if (body.surface_m2 === undefined) body.surface_m2 = null;
      if (current.nature === 'site' || body.parent_id === current.parent_id) delete body.parent_id;
      for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
      await api.put<Lieu>(`/lieux/${current.id}`, body);
      message.success(t('common.saved'));
      setEditing(false);
      await load();
    } catch (e) { fail(e); }
  };
  const deactivate = async () => {
    if (!current || !motif.trim()) return;
    try { await api.del(`/lieux/${current.id}`, { motif: motif.trim() }); setMotif(''); setInactifs(true); await load(); } catch (e) { fail(e); }
  };
  const reactivate = async () => {
    if (!current) return;
    try { await api.put(`/lieux/${current.id}`, { is_active: 1 }); await load(); } catch (e) { fail(e); }
  };

  /* ---------- Photo ---------- */
  const choosePhoto = async (file: File | undefined) => {
    if (!current || !file) return;
    setUploading(true);
    try {
      const blob = await reduirePhoto(file);
      await api.upload<Lieu>(`/lieux/${current.id}/photo`, blob);
      message.success(t('lieux.photo.saved'));
      await load();
    } catch (e) {
      if (e instanceof ApiError) fail(e); else message.error(t('lieux.photo.unreadable'));
    } finally { setUploading(false); }
  };
  const deletePhoto = async () => {
    if (!current) return;
    try { await api.del(`/lieux/${current.id}/photo`); message.success(t('lieux.photo.deleted')); await load(); } catch (e) { fail(e); }
  };

  /* ---------- Champs ---------- */
  const fields = (nature: Nature, keepType?: number | null, editMode = false, self?: Lieu) => {
    const secondary = (
      <>
        <Form.Item name="statut" label={t('lieux.field.statut')}>
          <Radio.Group optionType="button" options={STATUTS.map((s) => ({ value: s, label: t(`lieux.statut.${s}`) }))} />
        </Form.Item>
        {nature !== 'site' && nature !== 'batiment' ? null : (
          <>
            <Form.Item name="code_postal" label={t('lieux.field.code_postal')} rules={[{ max: 10 }]}><Input autoComplete="off" /></Form.Item>
            <Form.Item name="commune" label={t('lieux.field.commune')} rules={[{ max: 100 }]}><Input autoComplete="off" /></Form.Item>
          </>
        )}
        <Form.Item name="surface_m2" label={t('lieux.field.surface')}>
          <InputNumber min={0} max={1000000} step={0.5} style={{ width: 180 }} addonAfter="m²" />
        </Form.Item>
        {editMode && self && PARENTS[nature].length > 0 && (
          <Form.Item name="parent_id" label={t('lieux.field.parent')} extra={t('lieux.field.parent.help')}>
            <Select showSearch optionFilterProp="label"
              options={all.filter((p) => p.is_active && PARENTS[nature].includes(p.nature) && p.id !== self.id)
                .map((p) => ({ value: p.id, label: `${p.code} · ${tField(p as unknown as Record<string, unknown>, 'nom')}` }))} />
          </Form.Item>
        )}
      </>
    );
    return (
      <>
        <Form.Item name="code" label={t('lieux.field.code')} extra={t('lieux.field.code.help')}
          rules={[texteObligatoire(t), { pattern: /^[A-Za-z0-9][A-Za-z0-9._+-]{0,29}$/, message: t('lieux.field.code.help') }]}>
          <Input maxLength={30} autoComplete="off" />
        </Form.Item>
        <Form.Item name="nom_fr" label={t('lieux.field.nom_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
        <Form.Item name="nom_nl" label={t('lieux.field.nom_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
        <Form.Item name="type_id" label={t('lieux.field.type')} rules={nature === 'local' ? [obligatoire(t)] : []}>
          <Select showSearch allowClear={nature !== 'local'} optionFilterProp="label" options={typeOptions(keepType)} />
        </Form.Item>
        {(nature === 'site' || nature === 'batiment') && (
          <Form.Item name="adresse" label={t('lieux.field.adresse')} extra={nature === 'batiment' && !editMode ? t('lieux.field.adresse.help') : undefined} rules={[{ max: 200 }]}>
            <Input autoComplete="off" />
          </Form.Item>
        )}
        {simple
          ? <Collapse ghost items={[{ key: 'plus', label: t('common.more'), children: secondary, forceRender: true }]} />
          : secondary}
      </>
    );
  };

  /* ---------- Fiche ---------- */
  const chemin = current ? ancestors(current.id, byId) : [];
  const fiche = current ? (
    <Card title={<span>{ICONS[current.nature]} {current.code} · {tField(current as unknown as Record<string, unknown>, 'nom')}</span>}
      extra={canEdit && current.is_active ? <Button icon={<EditOutlined />} onClick={openEdit}>{t('common.edit')}</Button> : null}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Tag>{natureLabel(current.nature)}</Tag>
        {current.type_id && <Tag color="blue">{tField(current as unknown as Record<string, unknown>, 'type_libelle')}</Tag>}
        {statutTag(current)}
        {!current.is_active && <Tag>{t('common.inactive')}</Tag>}
        {current.is_demo === 1 && <Tag color="gold">{t('common.demo')}</Tag>}
      </Space>
      {chemin.length > 0 && (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {chemin.map((a, i) => (
            <span key={a.id}>{i > 0 && ' › '}
              <Typography.Link onClick={() => select(a.id)}>{a.code}</Typography.Link>
            </span>
          ))}
        </Typography.Paragraph>
      )}
      <div style={{ marginBottom: 16 }}>
        {current.has_photo ? (
          <Image src={`/api/lieux/${current.id}/photo?v=${encodeURIComponent(current.photo_at || '')}`}
            alt={`${t('lieux.photo.alt')} ${current.code}`} style={{ maxHeight: 280, maxWidth: '100%', objectFit: 'cover', borderRadius: 6 }} />
        ) : (
          <Typography.Text type="secondary">{t('lieux.photo.none')}</Typography.Text>
        )}
        {canEdit && current.is_active === 1 && (
          <Space wrap style={{ display: 'flex', marginTop: 8 }}>
            <Button icon={<CameraOutlined />} loading={uploading} onClick={() => document.getElementById('photo-input')?.click()}>
              {current.has_photo ? t('lieux.photo.replace') : t('lieux.photo.add')}
            </Button>
            <input id="photo-input" type="file" accept="image/*" aria-label={t('lieux.photo.add')} style={{ display: 'none' }}
              onChange={(e) => { choosePhoto(e.target.files?.[0]); e.target.value = ''; }} />
            {current.has_photo === 1 && (
              <Popconfirm title={t('lieux.photo.delete.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={deletePhoto}>
                <Button danger icon={<DeleteOutlined />}>{t('lieux.photo.delete')}</Button>
              </Popconfirm>
            )}
          </Space>
        )}
        {canEdit && current.is_active === 1 && <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>{t('lieux.photo.help')}</Typography.Paragraph>}
      </div>
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        {current.adresse && <Descriptions.Item label={t('lieux.field.adresse')}>{[current.adresse, [current.code_postal, current.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</Descriptions.Item>}
        {current.surface_m2 !== null && <Descriptions.Item label={t('lieux.field.surface')}>{current.surface_m2} m²</Descriptions.Item>}
        {current.enfants && <Descriptions.Item label={t('lieux.contenu')}>{current.enfants.filter((e) => e.is_active).length}</Descriptions.Item>}
        {!simple && <Descriptions.Item label={t('common.updated')}>{dayjs(current.updated_at).format('L LT')}</Descriptions.Item>}
        {current.motif_desactivation && <Descriptions.Item label={t('common.reason')}>{current.motif_desactivation}</Descriptions.Item>}
      </Descriptions>
      {canEdit && current.is_active === 1 && ENFANTS[current.nature].length > 0 && (
        <Space wrap>
          {ENFANTS[current.nature].map((n) => (
            <Button key={n} icon={<PlusOutlined />} onClick={() => openCreate(n, current)}>{t(`lieux.add.${current.nature === 'site' && n === 'local' ? 'exterieur' : n}`)}</Button>
          ))}
        </Space>
      )}
      {canEdit && !simple && (current.is_active ? (
        <Card size="small" style={{ marginTop: 24 }} title={t('lieux.deactivate')}>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('lieux.deactivate.help')}</Typography.Paragraph>
          <Input.TextArea rows={2} aria-label={t('lieux.motif')} placeholder={t('lieux.motif')} value={motif} onChange={(e) => setMotif(e.target.value)}
            aria-invalid={seulementEspaces(motif) || undefined} aria-describedby={seulementEspaces(motif) ? 'motif-lieux-erreur' : undefined} />
          {seulementEspaces(motif) && <ErreurObligatoire id="motif-lieux-erreur" />}
          <Popconfirm title={t('lieux.deactivate.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={deactivate} disabled={!motif.trim()}>
            <Button danger style={{ marginTop: 8 }} disabled={!motif.trim()}>{t('lieux.deactivate')}</Button>
          </Popconfirm>
        </Card>
      ) : (
        <Button style={{ marginTop: 24 }} onClick={reactivate}>{t('lieux.reactivate')}</Button>
      ))}
    </Card>
  ) : (
    <Card><Empty description={t('lieux.choose')} /></Card>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{t('lieux.title')}</Typography.Title>
        {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('site', null)}>{t('lieux.add.site')}</Button>}
      </div>
      <Typography.Paragraph type="secondary">{t('lieux.intro')}</Typography.Paragraph>
      {!activeTypes.length && !loading && canEdit && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={t('lieux.types.none')} />}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={t('lieux.tree')}>
            <Input.Search allowClear aria-label={t('lieux.search')} placeholder={t('lieux.search')} value={search}
              onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 8 }} />
            {!simple && (
              <Checkbox checked={inactifs} onChange={(e) => setInactifs(e.target.checked)} style={{ marginBottom: 8 }}>{t('lieux.show_inactive')}</Checkbox>
            )}
            <Spin spinning={loading}>
              {treeData.length ? (
                <Tree showIcon blockNode treeData={treeData} expandedKeys={treeExpanded} onExpand={(k) => setExpanded(k)}
                  selectedKeys={selectedId ? [selectedId] : []} onSelect={(k) => select(k.length ? Number(k[0]) : null)} />
              ) : (
                <Empty description={search ? t('lieux.search.none') : t('lieux.empty')} />
              )}
            </Spin>
          </Card>
        </Col>
        <Col xs={24} lg={14}>{fiche}</Col>
      </Row>

      <Modal open={!!creating} destroyOnClose title={creating ? `${t('lieux.new')} : ${natureLabel(creating.nature)}${creating.parent ? ` (${creating.parent.code})` : ''}` : ''}
        okText={t('common.save')} cancelText={t('common.cancel')} onOk={() => createForm.submit()} onCancel={() => setCreating(null)}>
        {creating && (
          <Form form={createForm} layout="vertical" onFinish={create} preserve={false}
            initialValues={{ code: codeSuggestion(creating.parent), statut: 'en_service' }}>
            {fields(creating.nature)}
          </Form>
        )}
      </Modal>

      <Drawer open={editing && !!current} width={480} title={t('lieux.detail')} onClose={() => setEditing(false)} destroyOnClose>
        {current && (
          <Form key={current.id} form={editForm} layout="vertical" onFinish={save} preserve={false} initialValues={editValues(current)}>
            {fields(current.nature, current.type_id, true, current)}
            <Button type="primary" htmlType="submit">{t('common.save')}</Button>
          </Form>
        )}
      </Drawer>
    </div>
  );
}

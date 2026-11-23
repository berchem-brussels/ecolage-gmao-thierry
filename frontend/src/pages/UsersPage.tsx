/**
 * Comptes et rôles par entité, réservés à l'administrateur (standard v3.2, section 17.4 ; cahier des charges ROL-01, ROL-02, ROL-06).
 * Création sur le modèle Microsoft 365 avec l'entité de rattachement, où le rôle de demandeur est donné d'office.
 * Les rôles se cochent entité par entité ; un rôle décoché se retire avec un motif. Remplacé à terme par l'application Droits.
 * 0.16.0 (étape 11, ROL-04) : le service de la personne (un service actif de son entité de rattachement), choisi dans
 * le même volet ; il décide de son chef de service pour les demandes à valider. Le service s'affiche sous le nom.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Checkbox, Drawer, Form, Grid, Input, Modal, Popconfirm, Radio, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useRoles } from '../useRoles';
import ErreurObligatoire from '../components/ErreurObligatoire';
import { courriel, obligatoire, seulementEspaces, texteObligatoire } from '../validation';

interface RoleRow { id: number; entite_id: number; role: string; entite_code: string }
interface U {
  id: number; email: string; first_name: string; last_name: string; user_role: 'agent' | 'admin'; entite_id: number | null;
  preferred_lang: 'fr' | 'nl'; is_active: number; is_demo: number; roles: RoleRow[];
  /** Accès de secours par mot de passe en mode « sso » ; compte déjà rattaché à Microsoft (section 8.6, 0.10.0). */
  is_admin_local: number; microsoft: number;
  /** 0.16.0 : service de la personne dans son entité de rattachement. */
  service_id: number | null;
}
interface ServiceCourt { id: number; entite_id: number; code: string; nom_fr: string; nom_nl: string; is_active: number }
interface Entite { id: number; code: string; nom_fr: string; nom_nl: string; is_active: number }

export default function UsersPage() {
  const { t, tField, hint } = useI18n();
  const { refresh, user } = useAuth();
  const simple = user?.ui_mode !== 'complet';
  // Sous 768 px, une seule colonne empilée : personne, rôles puis actions (standard section 12.7).
  const mobile = Grid.useBreakpoint().md === false;
  const catalogue = useRoles();
  const [rows, setRows] = useState<U[]>([]);
  const [entites, setEntites] = useState<Entite[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [rolesOf, setRolesOf] = useState<U | null>(null);
  const [selection, setSelection] = useState<Record<number, string[]>>({});
  const [motif, setMotif] = useState('');
  // 0.13.0 (D7 du contrôle DV-113) : un retrait sans motif le dit sous le champ, plus dans un bandeau qui disparaît.
  const [motifManquant, setMotifManquant] = useState(false);
  const motifRef = useRef<TextAreaRef>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [instanceRole, setInstanceRole] = useState<U['user_role']>('agent');
  const [secours, setSecours] = useState(false);
  const [services, setServices] = useState<ServiceCourt[]>([]);
  const [serviceSel, setServiceSel] = useState<number | null>(null);
  const [form] = Form.useForm();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, e] = await Promise.all([api.page<U>(`/users${qs({ limit: 200, q, is_active: simple ? 1 : undefined })}`), api.page<Entite>(`/entites${qs({ limit: 200, is_active: 1 })}`)]);
      setRows(u.data);
      setEntites(e.data);
      api.page<ServiceCourt>(`/services${qs({ limit: 200 })}`).then((r) => setServices(r.data)).catch(() => setServices([]));
    } catch (e) { fail(e); } finally { setLoading(false); }
  }, [t, q, simple]);
  useEffect(() => { load(); }, [load]);

  const mode = Form.useWatch('password_mode', form);
  const entiteRoles = catalogue.filter((r) => r.portee === 'entite');
  const roleLabel = (code: string) => {
    const r = catalogue.find((x) => x.code === code);
    return r ? tField(r as unknown as Record<string, unknown>, 'label') : code;
  };
  const entiteOptions = entites.map((e) => ({ value: e.id, label: e.code }));

  const create = async (v: Record<string, unknown>) => {
    try {
      const r = await api.post<U & { generated_password?: string }>('/users', v);
      form.resetFields();
      load();
      if (r.generated_password) setGeneratedPassword(r.generated_password);
      else { setOpen(false); message.success(t('common.saved')); }
    } catch (e) { fail(e); }
  };

  const deactivate = async (u: U) => { try { await api.del(`/users/${u.id}`); load(); } catch (e) { fail(e); } };

  const openRoles = (u: U) => {
    const sel: Record<number, string[]> = {};
    for (const e of entites) sel[e.id] = u.roles.filter((r) => r.entite_id === e.id).map((r) => r.role);
    setSelection(sel);
    setInstanceRole(u.user_role);
    setSecours(!!u.is_admin_local);
    setServiceSel(u.service_id ?? null);
    setMotif('');
    setMotifManquant(false);
    setRolesOf(u);
  };

  /** Rôles actuels décochés : leur retrait demande un motif. */
  const removed = useMemo(() => (rolesOf ? rolesOf.roles.filter((r) => selection[r.entite_id] && !selection[r.entite_id].includes(r.role)) : []), [rolesOf, selection]);
  const added = useMemo(() => {
    if (!rolesOf) return [] as { entite_id: number; role: string }[];
    return Object.entries(selection).flatMap(([ent, list]) => list
      .filter((role) => !rolesOf.roles.some((r) => r.entite_id === Number(ent) && r.role === role))
      .map((role) => ({ entite_id: Number(ent), role })));
  }, [rolesOf, selection]);

  const saveRoles = async () => {
    if (!rolesOf) return;
    if (removed.length && !motif.trim()) { setMotifManquant(true); motifRef.current?.focus(); return; }
    setSaving(true);
    try {
      const fiche: { user_role?: U['user_role']; is_admin_local?: number; service_id?: number | null } = {};
      if (instanceRole !== rolesOf.user_role) fiche.user_role = instanceRole;
      if (secours !== !!rolesOf.is_admin_local) fiche.is_admin_local = secours ? 1 : 0;
      if (serviceSel !== (rolesOf.service_id ?? null)) fiche.service_id = serviceSel;
      if (Object.keys(fiche).length) await api.put(`/users/${rolesOf.id}`, fiche);
      for (const a of added) await api.post('/roles-utilisateurs', { user_id: rolesOf.id, ...a });
      for (const r of removed) await api.del(`/roles-utilisateurs/${r.id}`, { motif: motif.trim() });
      message.success(t('common.saved'));
      setRolesOf(null);
      await load();
      await refresh();
    } catch (e) { fail(e); await load(); } finally { setSaving(false); }
  };

  const nomService = (id: number | null) => {
    const sv = id ? services.find((x) => x.id === id) : null;
    return sv ? tField(sv as unknown as Record<string, unknown>, 'nom') : '';
  };
  const person = (u: U) => (
    <div style={{ minWidth: 0 }}>
      <div>{u.last_name} {u.first_name}{' '}
        {u.user_role === 'admin' && <Tag color="gold">{t('users.role.admin')}</Tag>}
        {u.is_demo ? <Tag color="purple">{t('common.demo')}</Tag> : null}
        {u.microsoft ? <Tag color="blue">{t('users.microsoft')}</Tag> : null}
        {u.is_admin_local ? <Tag color="orange">{t('users.secours')}</Tag> : null}
        {!u.is_active && <Tag>{t('common.inactive')}</Tag>}
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-all' }}>{u.email}</Typography.Text>
      {nomService(u.service_id) && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('users.service')} : {nomService(u.service_id)}</Typography.Text></div>}
    </div>
  );
  const rolesTags = (u: U) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {u.roles.map((r) => <Tag key={r.id} style={{ marginInlineEnd: 0 }}>{r.entite_code} · {roleLabel(r.role)}</Tag>)}
    </div>
  );
  const actions = (u: U) => (u.is_active ? (
    <Space size={4} wrap>
      <Button size="small" onClick={() => openRoles(u)}>{t('users.roles.edit')}</Button>
      <Popconfirm title={t('users.deactivate.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={() => deactivate(u)}>
        <Button size="small" danger>{t('users.deactivate')}</Button>
      </Popconfirm>
    </Space>
  ) : null);

  const instanceOptions = [{ value: 'agent', label: t('users.role.agent') }, { value: 'admin', label: t('users.role.admin') }];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0 }}>{t('users.title')}</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setGeneratedPassword(null); setOpen(true); }}>{t('common.create')}</Button>
      </div>
      <Card>
        <Input.Search allowClear aria-label={t('common.search')} placeholder={t('common.search')} onSearch={setQ} style={{ width: 260, marginBottom: 16 }} />
        <Table<U> rowKey="id" size="middle" loading={loading} dataSource={rows} pagination={{ pageSize: 20, showSizeChanger: false }} scroll={mobile ? undefined : { x: 760 }} locale={{ emptyText: t('common.nodata') }}
          columns={mobile ? [
            { title: t('users.field.person'), key: 'stack', render: (_, u) => (
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {person(u)}{rolesTags(u)}{actions(u)}
              </Space>
            ) },
          ] : [
            { title: t('users.field.person'), key: 'person', render: (_, u) => person(u) },
            { title: t('users.field.roles'), key: 'roles', render: (_, u) => rolesTags(u) },
            ...(simple ? [] : [{ title: t('users.field.active'), key: 'active', width: 90, render: (_: unknown, u: U) => (u.is_active ? <Tag color="green">{t('yes')}</Tag> : <Tag>{t('no')}</Tag>) }]),
            { title: t('common.actions'), key: 'actions', fixed: 'right' as const, width: 200, render: (_, u) => actions(u) },
          ]} />
      </Card>

      <Modal open={open} title={t('users.new')} okText={generatedPassword ? t('common.close') : t('common.save')} cancelText={t('common.cancel')}
        onOk={() => (generatedPassword ? setOpen(false) : form.submit())} onCancel={() => setOpen(false)}>
        {generatedPassword ? (
          <Alert type="warning" showIcon message={t('users.generated')} description={<Typography.Text copyable code>{generatedPassword}</Typography.Text>} />
        ) : (
          <Form form={form} layout="vertical" onFinish={create}
            initialValues={{ user_role: 'agent', preferred_lang: 'fr', password_mode: 'generated', must_change_password: false, entite_id: entites[0]?.id }}>
            <Form.Item name="email" label={t('users.field.email')} tooltip={hint('users.email')} rules={[texteObligatoire(t), courriel(t)]} validateFirst><Input /></Form.Item>
            <Form.Item name="first_name" label={t('users.field.first_name')} tooltip={hint('users.first_name')} rules={[texteObligatoire(t)]}><Input /></Form.Item>
            <Form.Item name="last_name" label={t('users.field.last_name')} tooltip={hint('users.last_name')} rules={[texteObligatoire(t)]}><Input /></Form.Item>
            <Form.Item name="entite_id" label={t('users.field.entite')} tooltip={hint('users.entite')} extra={t('users.field.entite.help')} rules={[obligatoire(t)]}>
              <Radio.Group optionType="button" options={entiteOptions} />
            </Form.Item>
            <Form.Item name="preferred_lang" label={t('users.field.lang')} tooltip={hint('users.lang')}><Radio.Group optionType="button" options={[{ value: 'fr', label: 'FR' }, { value: 'nl', label: 'NL' }]} /></Form.Item>
            <Form.Item name="user_role" label={t('users.instance_role')} tooltip={hint('users.role')}><Radio.Group optionType="button" options={instanceOptions} /></Form.Item>
            {/* Modèle Microsoft 365 (standard v3.2, section 8.1) */}
            <Form.Item name="password_mode" label={t('users.password.mode')} tooltip={hint('users.password_mode')}>
              <Radio.Group optionType="button" options={[{ value: 'generated', label: t('users.password.generated') }, { value: 'manual', label: t('users.password.manual') }]} />
            </Form.Item>
            {mode === 'manual' && (
              <Form.Item name="password" label={t('users.password.value')} tooltip={hint('users.password')} rules={[obligatoire(t), { min: 8 }]}><Input.Password autoComplete="new-password" /></Form.Item>
            )}
            <Form.Item name="must_change_password" valuePropName="checked" label={t('users.password.premiere')} tooltip={hint('users.must_change')}><Checkbox>{t('users.password.must_change')}</Checkbox></Form.Item>
          </Form>
        )}
      </Modal>

      <Drawer open={!!rolesOf} width={mobile ? '100%' : 520} title={rolesOf ? `${t('users.roles.title')} ${rolesOf.first_name} ${rolesOf.last_name}` : ''}
        onClose={() => setRolesOf(null)}
        extra={<Button type="primary" loading={saving} onClick={saveRoles}>{t('common.save')}</Button>}>
        {rolesOf && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card size="small" title={t('users.instance_role')}>
              <Radio.Group optionType="button" value={instanceRole} options={instanceOptions} aria-label={t('users.instance_role')}
                onChange={(e) => setInstanceRole(e.target.value)} />
              <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>{t('users.instance_role.help')}</Typography.Paragraph>
              {(instanceRole === 'admin' || secours) && (
                <div style={{ marginTop: 12 }}>
                  <Checkbox checked={secours} onChange={(e) => setSecours(e.target.checked)}>{t('users.secours.field')}</Checkbox>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}>{t('users.secours.help')}</Typography.Paragraph>
                </div>
              )}
            </Card>
            <Card size="small" title={t('users.service')}>
              <Select<number> allowClear style={{ width: '100%' }} aria-label={t('users.service')} placeholder={t('users.service.aucun')}
                value={serviceSel ?? undefined} onChange={(v) => setServiceSel(v ?? null)}
                options={services.filter((x) => x.entite_id === rolesOf.entite_id && (x.is_active === 1 || x.id === rolesOf.service_id))
                  .map((x) => ({ value: x.id, label: `${tField(x as unknown as Record<string, unknown>, 'nom')} (${x.code})` }))} />
              <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>{t('users.service.aide')}</Typography.Paragraph>
            </Card>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>{t('users.roles.help')}</Typography.Paragraph>
            {entites.map((e) => (
              <Card key={e.id} size="small" title={`${e.code} · ${tField(e as unknown as Record<string, unknown>, 'nom')}`}>
                <Checkbox.Group value={selection[e.id] || []} style={{ display: 'grid', gap: 6 }}
                  onChange={(v) => setSelection((s) => ({ ...s, [e.id]: v as string[] }))}
                  options={entiteRoles.map((r) => ({
                    value: r.code,
                    label: roleLabel(r.code),
                    disabled: r.defaut && rolesOf.entite_id === e.id,
                  }))} />
              </Card>
            ))}
            {removed.length > 0 && (
              <div>
                <Input.TextArea ref={motifRef} rows={2} aria-label={t('users.roles.motif')} placeholder={t('users.roles.motif')} value={motif}
                  onChange={(ev) => { setMotif(ev.target.value); if (ev.target.value.trim()) setMotifManquant(false); }}
                  status={motifManquant || seulementEspaces(motif) ? 'error' : undefined}
                  aria-invalid={motifManquant || seulementEspaces(motif) || undefined} aria-describedby={motifManquant || seulementEspaces(motif) ? 'motif-roles-erreur' : undefined} />
                {(motifManquant || seulementEspaces(motif)) && <ErreurObligatoire id="motif-roles-erreur" texte={motifManquant ? t('users.roles.motif.required') : undefined} />}
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
}

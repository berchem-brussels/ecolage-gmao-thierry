/**
 * Entités de l'instance (administrateur) : liste, création, fiche en tiroir, modification, désactivation avec motif,
 * réactivation (cahier des charges, section 5.1 ; ADM-04). Patron d'écran du gabarit : titre et action principale
 * en haut à droite, ligne cliquable vers la fiche.
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Descriptions, Drawer, Form, Input, Modal, Popconfirm, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import ErreurObligatoire from '../components/ErreurObligatoire';
import { seulementEspaces, texteObligatoire } from '../validation';

interface Entite { id: number; code: string; nom_fr: string; nom_nl: string; is_active: number; motif_desactivation: string | null; created_at: string; updated_at: string }

const CODE_RULE = { pattern: /^[A-Z][A-Z0-9]{1,9}$/ };

export default function EntitesPage() {
  const { t, tField } = useI18n();
  const { refresh, user } = useAuth();
  const [rows, setRows] = useState<Entite[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [current, setCurrent] = useState<Entite | null>(null);
  const [motif, setMotif] = useState('');
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const simple = user?.ui_mode !== 'complet';
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await api.page<Entite>(`/entites${qs({ limit: 200 })}`)).data); } catch (e) { fail(e); } finally { setLoading(false); }
  }, [t]);
  useEffect(() => { load(); }, [load]);

  const after = async (e: Entite | null) => { setCurrent(e); await load(); await refresh(); };

  const create = async (v: { code: string; nom_fr: string; nom_nl: string }) => {
    try {
      await api.post('/entites', v);
      message.success(t('common.saved'));
      createForm.resetFields();
      setCreateOpen(false);
      after(null);
    } catch (e) { fail(e); }
  };

  const open = (e: Entite) => { setCurrent(e); setMotif(''); editForm.setFieldsValue({ code: e.code, nom_fr: e.nom_fr, nom_nl: e.nom_nl }); };

  const save = async (v: { code: string; nom_fr: string; nom_nl: string }) => {
    if (!current) return;
    try { await after(await api.put<Entite>(`/entites/${current.id}`, v)); message.success(t('common.saved')); } catch (e) { fail(e); }
  };
  const deactivate = async () => {
    if (!current || !motif.trim()) return;
    try { await after(await api.del<Entite>(`/entites/${current.id}`, { motif: motif.trim() })); setMotif(''); } catch (e) { fail(e); }
  };
  const reactivate = async () => {
    if (!current) return;
    try { await after(await api.put<Entite>(`/entites/${current.id}`, { is_active: 1 })); } catch (e) { fail(e); }
  };

  const statusTag = (e: Entite) => (e.is_active ? <Tag color="green">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>);
  const fields = (
    <>
      <Form.Item name="code" label={t('entites.field.code')} extra={t('entites.field.code.help')}
        normalize={(v: string) => (v || '').toUpperCase().replace(/\s/g, '')} rules={[texteObligatoire(t), { ...CODE_RULE, message: t('entites.field.code.help') }]}>
        <Input maxLength={10} />
      </Form.Item>
      <Form.Item name="nom_fr" label={t('entites.field.nom_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
      <Form.Item name="nom_nl" label={t('entites.field.nom_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
    </>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{t('entites.title')}</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>{t('common.create')}</Button>
      </div>
      <Typography.Paragraph type="secondary">{t('entites.intro')}</Typography.Paragraph>
      <Card>
        <Table<Entite> rowKey="id" size="middle" loading={loading} dataSource={rows} pagination={false}
          scroll={{ x: 'max-content' }} locale={{ emptyText: t('common.nodata') }}
          onRow={(r) => ({ onClick: () => open(r), style: { cursor: 'pointer' } })}
          columns={[
            { title: t('entites.field.code'), dataIndex: 'code', key: 'code', width: 110 },
            { title: t('entites.field.name'), key: 'nom', render: (_, e) => tField(e as unknown as Record<string, unknown>, 'nom') },
            { title: t('common.status'), key: 'status', render: (_, e) => statusTag(e), width: 120 },
            ...(simple ? [] : [{ title: t('common.updated'), dataIndex: 'updated_at', key: 'updated_at', render: (d: string) => dayjs(d).format('L LT') }]),
          ]} />
      </Card>

      <Modal open={createOpen} title={t('entites.new')} okText={t('common.save')} cancelText={t('common.cancel')}
        onOk={() => createForm.submit()} onCancel={() => setCreateOpen(false)}>
        <Form form={createForm} layout="vertical" onFinish={create}>{fields}</Form>
      </Modal>

      <Drawer open={!!current} width={480} title={t('entites.detail')} onClose={() => setCurrent(null)}>
        {current && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('common.status')}>{statusTag(current)}</Descriptions.Item>
              <Descriptions.Item label={t('common.created')}>{dayjs(current.created_at).format('L LT')}</Descriptions.Item>
              {current.motif_desactivation && <Descriptions.Item label={t('common.reason')}>{current.motif_desactivation}</Descriptions.Item>}
            </Descriptions>
            <Form form={editForm} layout="vertical" onFinish={save}>
              {fields}
              <Button type="primary" htmlType="submit">{t('common.save')}</Button>
            </Form>
            {current.is_active ? (
              <Card size="small" style={{ marginTop: 24 }} title={t('entites.deactivate')}>
                <Input.TextArea rows={2} aria-label={t('entites.motif')} placeholder={t('entites.motif')} value={motif} onChange={(e) => setMotif(e.target.value)}
                  aria-invalid={seulementEspaces(motif) || undefined} aria-describedby={seulementEspaces(motif) ? 'motif-entites-erreur' : undefined} />
                {seulementEspaces(motif) && <ErreurObligatoire id="motif-entites-erreur" />}
                <Popconfirm title={t('entites.deactivate.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={deactivate} disabled={!motif.trim()}>
                  <Button danger style={{ marginTop: 8 }} disabled={!motif.trim()}>{t('entites.deactivate')}</Button>
                </Popconfirm>
              </Card>
            ) : (
              <Button style={{ marginTop: 24 }} onClick={reactivate}>{t('entites.reactivate')}</Button>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}

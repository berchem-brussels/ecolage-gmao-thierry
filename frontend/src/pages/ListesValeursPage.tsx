/**
 * Listes de valeurs de l'entité active (cahier des charges REF-08, LNG-02) : première liste, les types de lieux.
 * Le responsable du service technique ajoute une valeur en FR et en NL, change son libellé ou son ordre,
 * la désactive avec un motif ou la réactive. Le code se tire du libellé et ne change plus (visible en mode Complet).
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { type Valeur, codeFromLabel } from '../lieux';
import ErreurObligatoire from '../components/ErreurObligatoire';
import { seulementEspaces, texteObligatoire } from '../validation';

/** Listes réglables dans cet écran ; leur catalogue serveur est config/listes-valeurs.json. */
const LISTES = ['type_lieu'];

interface FormValues { libelle_fr: string; libelle_nl: string; ordre?: number; code?: string }

export default function ListesValeursPage() {
  const { t, tField } = useI18n();
  const { user } = useAuth();
  const simple = user?.ui_mode !== 'complet';
  const [liste, setListe] = useState(LISTES[0]);
  const [rows, setRows] = useState<Valeur[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [current, setCurrent] = useState<Valeur | null>(null);
  const [motif, setMotif] = useState('');
  const [createForm] = Form.useForm<FormValues>();
  const [editForm] = Form.useForm<FormValues>();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await api.page<Valeur>(`/listes-valeurs${qs({ liste, limit: 200 })}`)).data); } catch (e) { fail(e); } finally { setLoading(false); }
  }, [liste, t]);
  useEffect(() => { load(); }, [load, user?.entite_active_id]);

  const create = async (v: FormValues) => {
    try {
      await api.post('/listes-valeurs', { liste, libelle_fr: v.libelle_fr, libelle_nl: v.libelle_nl, code: v.code || codeFromLabel(v.libelle_fr), ...(v.ordre !== undefined && v.ordre !== null ? { ordre: v.ordre } : {}) });
      message.success(t('common.saved'));
      setCreateOpen(false);
      load();
    } catch (e) { fail(e); }
  };
  const refreshCurrent = async (v: Valeur) => { setCurrent(v); setMotif(''); await load(); };
  const save = async (v: FormValues) => {
    if (!current) return;
    try { await refreshCurrent(await api.put<Valeur>(`/listes-valeurs/${current.id}`, { libelle_fr: v.libelle_fr, libelle_nl: v.libelle_nl, ordre: v.ordre ?? current.ordre })); message.success(t('common.saved')); } catch (e) { fail(e); }
  };
  const deactivate = async () => {
    if (!current || !motif.trim()) return;
    try { await refreshCurrent(await api.del<Valeur>(`/listes-valeurs/${current.id}`, { motif: motif.trim() })); } catch (e) { fail(e); }
  };
  const reactivate = async () => {
    if (!current) return;
    try { await refreshCurrent(await api.put<Valeur>(`/listes-valeurs/${current.id}`, { is_active: 1 })); } catch (e) { fail(e); }
  };

  const statusTag = (v: Valeur) => (v.is_active ? <Tag color="green">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>);
  const labels = (
    <>
      <Form.Item name="libelle_fr" label={t('listes.field.libelle_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
      <Form.Item name="libelle_nl" label={t('listes.field.libelle_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
      <Form.Item name="ordre" label={t('listes.field.ordre')} extra={t('listes.field.ordre.help')}><InputNumber min={0} max={100000} step={10} /></Form.Item>
    </>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{t('listes.title')}</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>{t('common.create')}</Button>
      </div>
      <Typography.Paragraph type="secondary">{t('listes.intro')}</Typography.Paragraph>
      {LISTES.length > 1 && (
        <Segmented aria-label={t('listes.choose')} value={liste} onChange={(v) => setListe(String(v))} style={{ marginBottom: 16 }}
          options={LISTES.map((l) => ({ value: l, label: t(`listes.liste.${l}`) }))} />
      )}
      <Card title={t(`listes.liste.${liste}`)}>
        <Table<Valeur> rowKey="id" size="middle" loading={loading} dataSource={rows} pagination={false}
          scroll={{ x: 'max-content' }} locale={{ emptyText: t('common.nodata') }}
          onRow={(r) => ({ onClick: () => { setCurrent(r); setMotif(''); }, style: { cursor: 'pointer' } })}
          columns={[
            { title: t('listes.field.libelle'), key: 'libelle', render: (_, v) => tField(v as unknown as Record<string, unknown>, 'libelle') },
            ...(simple ? [] : [
              { title: t('listes.field.libelle_fr'), dataIndex: 'libelle_fr', key: 'libelle_fr' },
              { title: t('listes.field.libelle_nl'), dataIndex: 'libelle_nl', key: 'libelle_nl' },
              { title: t('listes.field.code'), dataIndex: 'code', key: 'code' },
              { title: t('listes.field.ordre'), dataIndex: 'ordre', key: 'ordre', width: 90 },
            ]),
            { title: t('common.status'), key: 'status', render: (_, v) => statusTag(v), width: 120 },
          ]} />
      </Card>

      <Modal open={createOpen} destroyOnClose title={t('listes.new')} okText={t('common.save')} cancelText={t('common.cancel')}
        onOk={() => createForm.submit()} onCancel={() => setCreateOpen(false)}>
        <Form form={createForm} layout="vertical" onFinish={create} preserve={false}>
          {labels}
          {!simple && (
            <Form.Item name="code" label={t('listes.field.code')} extra={t('listes.field.code.help')} rules={[{ pattern: /^[a-z][a-z0-9_]{1,39}$/, message: t('listes.field.code.help') }]}>
              <Input maxLength={40} autoComplete="off" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Drawer open={!!current} width={480} title={t('listes.detail')} onClose={() => setCurrent(null)} destroyOnClose>
        {current && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('common.status')}>{statusTag(current)}</Descriptions.Item>
              <Descriptions.Item label={t('listes.field.code')}>{current.code}</Descriptions.Item>
              {current.motif_desactivation && <Descriptions.Item label={t('common.reason')}>{current.motif_desactivation}</Descriptions.Item>}
            </Descriptions>
            <Form key={current.id} form={editForm} layout="vertical" onFinish={save} preserve={false}
              initialValues={{ libelle_fr: current.libelle_fr, libelle_nl: current.libelle_nl, ordre: current.ordre }}>
              {labels}
              <Button type="primary" htmlType="submit">{t('common.save')}</Button>
            </Form>
            {current.is_active ? (
              <Card size="small" style={{ marginTop: 24 }} title={t('listes.deactivate')}>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('listes.deactivate.help')}</Typography.Paragraph>
                <Input.TextArea rows={2} aria-label={t('listes.motif')} placeholder={t('listes.motif')} value={motif} onChange={(e) => setMotif(e.target.value)}
                  aria-invalid={seulementEspaces(motif) || undefined} aria-describedby={seulementEspaces(motif) ? 'motif-listes-erreur' : undefined} />
                {seulementEspaces(motif) && <ErreurObligatoire id="motif-listes-erreur" />}
                <Popconfirm title={t('listes.deactivate.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={deactivate} disabled={!motif.trim()}>
                  <Button danger style={{ marginTop: 8 }} disabled={!motif.trim()}>{t('listes.deactivate')}</Button>
                </Popconfirm>
              </Card>
            ) : (
              <Button style={{ marginTop: 24 }} onClick={reactivate}>{t('listes.reactivate')}</Button>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}

/**
 * Tickets : le demandeur suit les siens, les traitants voient leur file et les compteurs (standard, section 13.5).
 *
 * Repris de TicketsPage.tsx du gabarit 1.3.0 (0.11.0). Adaptations à la GMAO :
 * - filtre du type en boutons (choix exclusif, standard section 12.4) au lieu d'une liste déroulante ;
 * - colonne Entité (code) pour qui voit des tickets de plusieurs entités ; dates de la base à l'heure locale ;
 * - liste rechargée au changement d'entité active (la file métier suit l'entité active, DV-107) ;
 * - le bouton « Signaler » de l'écran ouvre le même formulaire que celui de l'en-tête.
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Input, Radio, Row, Space, Statistic, Switch, Table, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import PageHeader from '../components/PageHeader';
import ReportTicketModal from '../components/ReportTicketModal';
import TicketDrawer, { dateTicket } from '../components/TicketDrawer';

interface Ligne { id: number; reference: string; type: string; title: string; priority: string; status: string; queue: string; overdue: number; updated_at: string; requester_name: string; entite_id: number | null }
interface Stats { open: number; overdue: number; unassigned: number; resolved_30d: number }
const PRIORITY_COLORS: Record<string, string> = { P1: 'red', P2: 'orange', P3: 'blue', P4: 'default' };

export default function TicketsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Ligne[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(false);
  const [q, setQ] = useState('');
  const [type, setType] = useState<string>('');
  const [openOnly, setOpenOnly] = useState(true);
  const current = params.get('id') ? Number(params.get('id')) : null;
  const entiteActive = user?.entite_active_id;
  const codeEntite = (id: number | null) => (user?.entites || []).find((e) => e.id === id)?.code || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await api.page<Ligne>(`/tickets${qs({ q: q || undefined, type: type || undefined, open_only: openOnly ? 'true' : undefined, limit: 200 })}`)).data);
      try { setStats(await api.get<Stats>('/tickets/stats')); } catch { setStats(null); }
    } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); } finally { setLoading(false); }
  // entiteActive : la file métier suit l'entité active (DV-107).
  // eslint-disable-next-line
  }, [q, type, openOnly, t, entiteActive]);
  useEffect(() => { load(); }, [load]);

  const openTicket = (id: number | null) => { const p = new URLSearchParams(params); if (id) p.set('id', String(id)); else p.delete('id'); setParams(p); };

  return (
    <div>
      <PageHeader title={t('tickets.title')} actions={<Button type="primary" onClick={() => setReport(true)}>{t('tickets.report')}</Button>} />
      <Typography.Paragraph type="secondary">{t('tickets.intro')}</Typography.Paragraph>
      {stats && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {([['open', 'tickets.stats.open'], ['overdue', 'tickets.stats.overdue'], ['unassigned', 'tickets.stats.unassigned'], ['resolved_30d', 'tickets.stats.resolved']] as const).map(([k, label]) => (
            <Col xs={12} md={6} key={k}><Card size="small"><Statistic title={t(label)} value={stats[k]} /></Card></Col>
          ))}
        </Row>
      )}
      <Card>
        <Space wrap className="tickets-filters" style={{ marginBottom: 16 }}>
          <Input.Search allowClear aria-label={t('common.search')} placeholder={t('common.search')} onSearch={setQ} style={{ width: 240, maxWidth: '100%' }} />
          <Radio.Group optionType="button" size="small" aria-label={t('tickets.field.type')} value={type} onChange={(e) => setType(e.target.value)}
            options={[{ value: '', label: t('tickets.all') }, ...(['incident', 'bug', 'question', 'wish'] as const).map((x) => ({ value: x, label: t(`tickets.type.${x}`) }))]} />
          <Space><Switch checked={openOnly} onChange={setOpenOnly} aria-label={t('tickets.open_only')} />{t('tickets.open_only')}</Space>
        </Space>
        <Table<Ligne> rowKey="id" size="middle" loading={loading} dataSource={rows} scroll={{ x: 'max-content' }} locale={{ emptyText: t('common.nodata') }}
          onRow={(r) => ({ onClick: () => openTicket(r.id), style: { cursor: 'pointer' } })}
          columns={[
            { title: t('tickets.reference'), dataIndex: 'reference', key: 'reference', render: (v: string, r) => <a href={`?id=${r.id}`} onClick={(e) => { e.preventDefault(); openTicket(r.id); }}>{v}</a> },
            { title: t('tickets.field.title'), dataIndex: 'title', key: 'title' },
            { title: t('tickets.field.type'), dataIndex: 'type', key: 'type', render: (v: string) => t(`tickets.type.${v}`) },
            { title: t('tickets.priority'), dataIndex: 'priority', key: 'priority', render: (v: string, r) => <Space><Tag color={PRIORITY_COLORS[v]}>{v}</Tag>{r.overdue ? <Tag color="red">{t('tickets.overdue')}</Tag> : null}</Space> },
            { title: t('common.status'), dataIndex: 'status', key: 'status', render: (v: string) => t(`tickets.status.${v}`) },
            { title: t('tickets.entite'), dataIndex: 'entite_id', key: 'entite', render: (v: number | null) => codeEntite(v) },
            { title: t('tickets.requester'), dataIndex: 'requester_name', key: 'requester' },
            { title: t('common.updated'), dataIndex: 'updated_at', key: 'updated_at', render: (d: string) => dateTicket(d) },
          ]} />
      </Card>
      <ReportTicketModal open={report} onClose={() => setReport(false)} onCreated={load} screenName={t('tickets.title')} />
      <TicketDrawer id={current} userId={user?.id || 0} onClose={() => openTicket(null)} onChanged={load} />
    </div>
  );
}

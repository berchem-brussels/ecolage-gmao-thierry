/**
 * Détail d'un ticket : fil d'échanges, contexte, capture et actions selon le statut et le rôle (standard, section 13.5).
 *
 * Repris de TicketDrawer.tsx du gabarit 1.3.0 (0.11.0). Adaptations à la GMAO :
 * - dates de la base (UTC) affichées à l'heure locale par depuisBase, au format JJ/MM/AAAA HH:MM ;
 * - entité du ticket affichée ; après un transfert vers une file que la personne ne traite pas, le panneau se ferme
 *   avec « Ticket transféré » (le serveur ne rend plus le contenu, DV-107) ;
 * - infobulles du gabarit (hint) remplacées par une ligne d'aide sous le motif, en attendant l'aide par écran (E-39) ;
 * - contexte technique montré en mode Complet seulement (standard, section 12.5 : codes techniques).
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, Collapse, Descriptions, Drawer, Form, Grid, Input, List, Modal, Space, Tag, Typography, message } from 'antd';
import api, { ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { depuisBase } from '../pages/JournalPage';
import { texteObligatoire } from '../validation';

export interface TicketMessage { id: number; kind: 'message' | 'event'; body: string; is_internal: number; created_at: string; author_name: string | null }
export interface Ticket {
  id: number; reference: string; type: string; title: string; description: string | null; expected: string | null; actual: string | null;
  queue: 'business' | 'it'; priority: string; status: string; screen: string | null; context: Record<string, unknown> | null; entite_id: number | null;
  has_screenshot: boolean; messages: TicketMessage[]; can_handle: boolean; can_reopen: boolean; requester_id: number; resolution: string | null; created_at: string;
}
type Action = { to: string; reason: boolean; label: string; danger?: boolean };
const OPEN = ['new', 'in_progress', 'waiting_requester'];
export const dateTicket = (d: string) => depuisBase(d).format('DD/MM/YYYY HH:mm');

export default function TicketDrawer({ id, onClose, onChanged, userId }: { id: number | null; onClose: () => void; onChanged: () => void; userId: number }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState('');
  const [form] = Form.useForm();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));
  const complet = user?.ui_mode === 'complet';

  const load = useCallback(async () => {
    if (!id) { setTicket(null); return; }
    try { setTicket(await api.get<Ticket>(`/tickets/${id}`)); } catch (e) { fail(e); }
  // eslint-disable-next-line
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!ticket) return <Drawer open={!!id} onClose={onClose} title={t('tickets.detail')} />;
  const requester = ticket.requester_id === userId;
  const open = OPEN.includes(ticket.status);
  const entite = (user?.entites || []).find((e) => e.id === ticket.entite_id);
  const actions: Action[] = [];
  if (ticket.can_handle && ['new', 'waiting_requester'].includes(ticket.status)) actions.push({ to: 'in_progress', reason: false, label: 'tickets.action.take' });
  if (ticket.can_handle && ['new', 'in_progress'].includes(ticket.status)) actions.push({ to: 'waiting_requester', reason: true, label: 'tickets.action.wait' });
  if (ticket.can_handle && open) actions.push({ to: 'resolved', reason: true, label: 'tickets.action.resolve' }, { to: 'rejected', reason: true, label: 'tickets.action.reject', danger: true }, { to: 'transfer', reason: true, label: 'tickets.action.transfer' });
  if ((ticket.can_handle || requester) && open) actions.push({ to: 'cancelled', reason: true, label: 'tickets.action.cancel', danger: true });
  if ((ticket.can_handle || requester) && ticket.status === 'resolved') actions.push({ to: 'closed', reason: false, label: 'tickets.action.close' });
  if (ticket.can_reopen) actions.push({ to: 'reopen', reason: true, label: 'tickets.action.reopen' });

  const run = async (a: Action, why?: string) => {
    try {
      if (a.to === 'transfer') {
        const r = await api.put<{ transferred?: boolean }>(`/tickets/${ticket.id}`, { queue: ticket.queue === 'it' ? 'business' : 'it', reason: why });
        setPending(null); setReason('');
        if (r.transferred) { message.success(t('tickets.transferred')); onChanged(); onClose(); return; }
      } else await api.post(`/tickets/${ticket.id}/status`, { to: a.to, ...(why ? { reason: why } : {}) });
      setPending(null); setReason(''); await load(); onChanged();
    } catch (e) { fail(e); }
  };
  const post = async (v: { body: string; is_internal?: boolean }) => {
    try { await api.post(`/tickets/${ticket.id}/messages`, { body: v.body, is_internal: !!v.is_internal }); form.resetFields(); await load(); onChanged(); } catch (e) { fail(e); }
  };

  return (
    <Drawer open={!!id} onClose={onClose} width={screens.md === false ? '100%' : 640} title={`${ticket.reference} · ${ticket.title}`}>
      <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
        <Descriptions.Item label={t('common.status')}><Tag>{t(`tickets.status.${ticket.status}`)}</Tag></Descriptions.Item>
        <Descriptions.Item label={t('tickets.field.type')}>{t(`tickets.type.${ticket.type}`)}</Descriptions.Item>
        <Descriptions.Item label={t('tickets.priority')}>{ticket.priority}</Descriptions.Item>
        <Descriptions.Item label={t('tickets.queue')}>{t(`tickets.queue.${ticket.queue}`)}</Descriptions.Item>
        {entite && <Descriptions.Item label={t('tickets.entite')}>{entite.code}</Descriptions.Item>}
        <Descriptions.Item label={t('tickets.created')}>{dateTicket(ticket.created_at)}</Descriptions.Item>
        {ticket.description && <Descriptions.Item label={t('tickets.field.description')}><span style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</span></Descriptions.Item>}
        {ticket.expected && <Descriptions.Item label={t('tickets.field.expected')}><span style={{ whiteSpace: 'pre-wrap' }}>{ticket.expected}</span></Descriptions.Item>}
        {ticket.actual && <Descriptions.Item label={t('tickets.field.actual')}><span style={{ whiteSpace: 'pre-wrap' }}>{ticket.actual}</span></Descriptions.Item>}
      </Descriptions>
      {ticket.has_screenshot && <Typography.Paragraph><a href={`/api/tickets/${ticket.id}/screenshot`} target="_blank" rel="noreferrer">{t('tickets.screenshot.view')}</a></Typography.Paragraph>}
      {complet && ticket.context && <Collapse size="small" style={{ marginBottom: 12 }} items={[{ key: 'c', label: t('tickets.context'), children: <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(ticket.context, null, 2)}</pre> }]} />}
      {actions.length > 0 && (
        <Space wrap style={{ marginBottom: 16 }}>
          {actions.map((a) => <Button key={a.to} danger={a.danger} onClick={() => (a.reason ? setPending(a) : run(a))}>{t(a.label)}</Button>)}
        </Space>
      )}
      <List size="small" dataSource={ticket.messages} renderItem={(m) => (
        <List.Item style={m.is_internal ? { background: 'var(--app-bg-muted)' } : undefined}>
          <List.Item.Meta
            title={<span>{m.author_name || ''} · {dateTicket(m.created_at)}{m.is_internal ? ` · ${t('tickets.internal')}` : ''}</span>}
            description={m.kind === 'event' ? <em>{t(`tickets.event.${m.body}`)}</em> : <span style={{ whiteSpace: 'pre-wrap' }}>{m.body}</span>} />
        </List.Item>
      )} />
      {open && (
        <Form form={form} layout="vertical" onFinish={post} style={{ marginTop: 12 }}>
          <Form.Item name="body" label={t('tickets.message')} rules={[texteObligatoire(t), { max: 8000 }]}><Input.TextArea rows={3} maxLength={8000} /></Form.Item>
          {ticket.can_handle && <Form.Item name="is_internal" valuePropName="checked"><Checkbox>{t('tickets.internal')}</Checkbox></Form.Item>}
          <Button type="primary" htmlType="submit">{t('tickets.post')}</Button>
        </Form>
      )}
      <Modal open={!!pending} title={pending ? t(pending.label) : ''} okText={t('common.save')} cancelText={t('common.cancel')}
        okButtonProps={{ disabled: !reason.trim() }} onOk={() => pending && run(pending, reason.trim())} onCancel={() => { setPending(null); setReason(''); }}>
        <Typography.Paragraph type="secondary">{t('tickets.reason.help')}</Typography.Paragraph>
        <Input.TextArea rows={3} aria-label={t('tickets.reason')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={4000} />
      </Modal>
    </Drawer>
  );
}

/**
 * Saisie d'une question de la FAQ locale (0.12.0, standard section 13.1) : ajout, modification, ou transformation d'une
 * question métier résolue (section 13.5, ticket fourni : la question et la réponse sont préremplies en français à partir
 * du titre et de la résolution, à réécrire sans donnée personnelle et à traduire). La portée (commune ou entité active)
 * n'est proposée qu'à l'administrateur ; le service technique écrit toujours pour son entité active.
 */
import { useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, Radio, Select, message } from 'antd';
import api, { ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { texteObligatoire } from '../validation';
import { TOPICS, useHelpAccess } from './index';
import type { LocalFaq } from './TopicView';

interface Valeurs { portee?: 'commune' | 'entite'; topic_id?: string | null; question_fr: string; question_nl: string; answer_fr: string; answer_nl: string }

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (f: LocalFaq) => void;
  /** Question à modifier. */
  faq?: LocalFaq | null;
  /** Ticket à transformer : POST /tickets/:id/faq. */
  ticket?: { id: number; reference: string; title: string; resolution?: string | null } | null;
  /** Écran proposé pour un ajout. */
  topicId?: string | null;
}

export default function FaqModal({ open, onClose, onSaved, faq, ticket, topicId }: Props) {
  const { t, hint } = useI18n();
  const { isAdmin, entite } = useAuth();
  const voit = useHelpAccess();
  const [form] = Form.useForm<Valeurs>();
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (faq) form.setFieldsValue({ topic_id: faq.topic_id, question_fr: faq.question_fr, question_nl: faq.question_nl, answer_fr: faq.answer_fr, answer_nl: faq.answer_nl });
    else if (ticket) form.setFieldsValue({ question_fr: ticket.title, answer_fr: ticket.resolution || '' });
    else form.setFieldsValue({ portee: isAdmin ? 'commune' : 'entite', topic_id: topicId || null });
  }, [open, faq, ticket, topicId, isAdmin, form]);

  const save = async (v: Valeurs) => {
    setSaving(true);
    try {
      const corps = { ...v, topic_id: v.topic_id || null };
      let r: LocalFaq;
      if (faq) { const { portee: _p, ...reste } = corps; r = await api.put<LocalFaq>(`/faq/${faq.id}`, reste); }
      else if (ticket) { const { portee: _p, ...reste } = corps; r = await api.post<LocalFaq>(`/tickets/${ticket.id}/faq`, reste); }
      else r = await api.post<LocalFaq>('/faq', corps);
      message.success(t('common.saved'));
      onSaved(r);
      onClose();
    } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); } finally { setSaving(false); }
  };

  const titre = faq ? t('faq.modifier') : ticket ? t('faq.depuis_ticket') : t('help.faq.add');
  return (
    <Modal open={open} width={640} title={titre} okText={t('common.save')} cancelText={t('common.cancel')} onOk={() => form.submit()} onCancel={onClose}
      okButtonProps={{ loading: saving }} destroyOnClose>
      {ticket && <Alert type="info" showIcon style={{ marginBottom: 12 }} message={t('faq.depuis_ticket.aide').replace('{ref}', ticket.reference).replace('{entite}', entite?.code || '')} />}
      <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
        {!faq && !ticket && isAdmin && (
          <Form.Item name="portee" label={t('faq.portee')} tooltip={hint('faq.portee')}>
            <Radio.Group optionType="button" buttonStyle="solid" aria-label={t('faq.portee')}
              options={[{ value: 'commune', label: t('faq.portee.commune') }, { value: 'entite', label: `${t('faq.portee.entite')}${entite ? ` (${entite.code})` : ''}`, disabled: !entite }]} />
          </Form.Item>
        )}
        <Form.Item name="topic_id" label={t('faq.topic')} tooltip={hint('faq.topic')}>
          <Select allowClear placeholder={t('help.general')} aria-label={t('faq.topic')}
            options={TOPICS.filter((tp) => voit(tp.acces)).map((tp) => ({ value: tp.id, label: t(tp.titleKey) }))} />
        </Form.Item>
        <Form.Item name="question_fr" label={t('faq.question_fr')} tooltip={hint('faq.question')} rules={[texteObligatoire(t), { max: 300 }]}><Input lang="fr" maxLength={300} /></Form.Item>
        <Form.Item name="question_nl" label={t('faq.question_nl')} tooltip={hint('faq.question')} rules={[texteObligatoire(t), { max: 300 }]}><Input lang="nl" maxLength={300} /></Form.Item>
        <Form.Item name="answer_fr" label={t('faq.answer_fr')} tooltip={hint('faq.answer')} rules={[texteObligatoire(t), { max: 4000 }]}><Input.TextArea lang="fr" autoSize={{ minRows: 3, maxRows: 10 }} maxLength={4000} /></Form.Item>
        <Form.Item name="answer_nl" label={t('faq.answer_nl')} tooltip={hint('faq.answer')} rules={[texteObligatoire(t), { max: 4000 }]}><Input.TextArea lang="nl" autoSize={{ minRows: 3, maxRows: 10 }} maxLength={4000} /></Form.Item>
      </Form>
    </Modal>
  );
}

/** Retrait d'une question avec un motif (rien n'est supprimé). */
export function RetraitFaqModal({ faq, onClose, onDone }: { faq: LocalFaq | null; onClose: () => void; onDone: () => void }) {
  const { t, hint } = useI18n();
  const [form] = Form.useForm<{ motif: string }>();
  useEffect(() => { if (faq) form.resetFields(); }, [faq, form]);
  const go = async (v: { motif: string }) => {
    if (!faq) return;
    try { await api.del(`/faq/${faq.id}`, { motif: v.motif.trim() }); message.success(t('faq.retiree.ok')); onDone(); onClose(); }
    catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
  };
  return (
    <Modal open={!!faq} title={t('faq.remove')} okText={t('faq.remove')} okButtonProps={{ danger: true }} cancelText={t('common.cancel')} onOk={() => form.submit()} onCancel={onClose} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={go} requiredMark={false}>
        <Form.Item name="motif" label={t('faq.motif')} tooltip={hint('faq.motif')} rules={[texteObligatoire(t), { max: 500 }]}><Input.TextArea rows={2} maxLength={500} /></Form.Item>
      </Form>
    </Modal>
  );
}

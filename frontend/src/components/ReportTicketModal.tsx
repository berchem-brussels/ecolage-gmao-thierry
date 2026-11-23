/**
 * Formulaire « Signaler » (standard, section 13.5), ouvert depuis l'en-tête de chaque écran.
 * Le contexte (écran, version, langue, navigateur, date, dernière erreur de l'API) est joint sans saisie.
 *
 * Repris de ReportTicketModal.tsx du gabarit 1.3.0 (0.11.0). Adaptations à la GMAO :
 * - l'écran est nommé par son libellé dans le menu, reçu de l'en-tête ; la fiche d'aide de l'écran prendra le relais
 *   avec l'aide par écran (0.12.0) ; les infobulles du gabarit (hint) arrivent aussi avec elle (E-39) ;
 * - la capture passe par reduirePhoto (photo.ts, comme les photos des demandes) : réduite à 1 600 pixels, réencodée en
 *   JPEG sans métadonnées, lisible sur iPhone et Android (DV-102), sous le plafond du serveur ; le serveur contrôle encore ;
 * - le titre prend texteObligatoire (« Ce champ est obligatoire », DV-48).
 */
import { useState } from 'react';
import { Alert, Form, Input, Modal, Radio, Typography, message } from 'antd';
import { useLocation } from 'react-router-dom';
import api, { ApiError, getLastApiError } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { useSettings } from '../contexts/SettingsContext';
import { reduirePhoto } from '../photo';
import { texteObligatoire } from '../validation';

type TicketType = 'incident' | 'bug' | 'question' | 'wish';

const enDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(new Error('lecture'));
  r.readAsDataURL(blob);
});

export default function ReportTicketModal({ open, onClose, onCreated, screenName }: { open: boolean; onClose: () => void; onCreated?: () => void; screenName?: string }) {
  const { t, lang, hint } = useI18n();
  const { settings } = useSettings();
  const location = useLocation();
  const [form] = Form.useForm();
  const [shot, setShot] = useState<string | null>(null);
  const [shotError, setShotError] = useState(false);
  const [sending, setSending] = useState(false);
  const type: TicketType = Form.useWatch('type', form) || 'question';
  const ecran = screenName || location.pathname;

  const pick = async (file?: File) => {
    setShotError(false);
    setShot(null);
    if (!file) return;
    try { setShot(await enDataUrl(await reduirePhoto(file))); } catch { setShotError(true); }
  };

  const submit = async (v: Record<string, string>) => {
    setSending(true);
    try {
      const r = await api.post<{ reference: string }>('/tickets', {
        ...v,
        screen: location.pathname,
        context: { path: location.pathname, screen: ecran, version: settings.version, lang, userAgent: navigator.userAgent, at: new Date().toISOString(), lastApiError: getLastApiError() },
        ...(shot ? { screenshot: shot } : {}),
      });
      message.success(`${t('tickets.sent')} ${r.reference}`);
      form.resetFields();
      setShot(null);
      onClose();
      onCreated?.();
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setSending(false); }
  };

  return (
    <Modal open={open} width={640} title={t('tickets.report')} okText={t('tickets.send')} cancelText={t('common.cancel')} onOk={() => form.submit()} onCancel={onClose}
      okButtonProps={{ loading: sending }} destroyOnClose>
      <Typography.Paragraph type="secondary">{t('tickets.screen_joined')} <strong>{ecran}</strong></Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={submit} initialValues={{ type: 'question', impact: 'person', urgency: 'annoying' }}>
        <Form.Item name="type" label={t('tickets.field.type')} tooltip={hint('tickets.type')} extra={t(type === 'question' ? 'tickets.who.business' : 'tickets.who.it')}>
          <Radio.Group optionType="button" aria-label={t('tickets.field.type')} options={(['incident', 'bug', 'question', 'wish'] as const).map((x) => ({ value: x, label: t(`tickets.type.${x}`) }))} />
        </Form.Item>
        <Form.Item name="title" label={t('tickets.field.title')} tooltip={hint('tickets.title')} rules={[texteObligatoire(t), { max: 200 }]}><Input maxLength={200} /></Form.Item>
        <Form.Item name="description" label={t('tickets.field.description')} tooltip={hint('tickets.description')}><Input.TextArea rows={3} maxLength={8000} /></Form.Item>
        {(type === 'incident' || type === 'bug') && (
          <>
            <Form.Item name="expected" label={t('tickets.field.expected')} tooltip={hint('tickets.expected')}><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
            <Form.Item name="actual" label={t('tickets.field.actual')} tooltip={hint('tickets.actual')}><Input.TextArea rows={2} maxLength={4000} /></Form.Item>
          </>
        )}
        <Form.Item name="impact" label={t('tickets.field.impact')} tooltip={hint('tickets.impact')}>
          <Radio.Group optionType="button" aria-label={t('tickets.field.impact')} options={(['person', 'service', 'organisation'] as const).map((x) => ({ value: x, label: t(`tickets.impact.${x}`) }))} />
        </Form.Item>
        <Form.Item name="urgency" label={t('tickets.field.urgency')} tooltip={hint('tickets.urgency')}>
          <Radio.Group optionType="button" aria-label={t('tickets.field.urgency')} options={(['blocking', 'annoying', 'comfort'] as const).map((x) => ({ value: x, label: t(`tickets.urgency.${x}`) }))} />
        </Form.Item>
        <Form.Item label={t('tickets.field.screenshot')} tooltip={hint('tickets.screenshot')} extra={t('tickets.screenshot.help')}>
          <input type="file" accept="image/png,image/jpeg" aria-label={t('tickets.field.screenshot')} onChange={(e) => pick(e.target.files?.[0])} />
          {shot && <img src={shot} alt={t('tickets.field.screenshot')} style={{ display: 'block', maxWidth: '100%', maxHeight: 160, marginTop: 8, border: '1px solid var(--app-border)' }} />}
          {shotError && <Alert type="error" showIcon message={t('tickets.screenshot.too_big')} style={{ marginTop: 8 }} />}
        </Form.Item>
      </Form>
    </Modal>
  );
}

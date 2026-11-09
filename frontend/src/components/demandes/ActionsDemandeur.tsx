/**
 * Ce que le demandeur ou le bénéficiaire peut encore faire sur sa demande (version 0.14.0, étape 9, point 5 ; cahier
 * des charges SUI-05, CYC-05 ; écart E-21 fermé).
 * - « Compléter ma demande » tant qu'elle n'est pas fermée : un texte ajouté sous la description (qui ne change pas),
 *   et des photos ou documents envoyés aussitôt à la demande, dans le plafond de l'entité.
 * - « Annuler ma demande » tant que les travaux n'ont pas commencé, avec un motif lu par le service technique ; rien
 *   n'est supprimé, la demande reste « Annulée ».
 * - 0.14.0, point 6 (SUI-06) : « Rouvrir ma demande » après la clôture, dans le délai de l'entité (date limite dite),
 *   en disant ce qui ne va pas ; avis en cinq niveaux (boutons) et commentaire facultatif, un par clôture ; l'avis
 *   donné reste affiché.
 * Les droits viennent du serveur (completable, annulable, reouvrable, avis_possible) ; il refait tous les contrôles
 * et un refus s'affiche, la saisie reste (ERG-09).
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, Radio, Space, Typography, message } from 'antd';
import api, { ApiError } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { type Avis, type Demande, type Piece, type PlafondsPieces, instant } from '../../demandes';
import { texteObligatoire } from '../../validation';
import PiecesDemande from './PiecesDemande';

type Action = 'completer' | 'annuler' | 'reouvrir';
/** Rôle ARIA du groupe : Form.Item y pose aria-required, permis seulement sur un radiogroup (axe-core). */
const GROUPE_RADIO = { role: 'radiogroup' } as Record<string, string>;
export const NOTES = [1, 2, 3, 4, 5] as const;

/** Boutons de la fiche du demandeur ; rien si la demande ne se complète ni ne s'annule plus. */
export function BoutonsDemandeur({ d, onChoisir }: { d: Demande; onChoisir: (a: Action) => void }) {
  const { t } = useI18n();
  if (!d.completable && !d.annulable && !d.reouvrable) return null;
  return (
    <div role="group" aria-label={t('demandeur.actions')} style={{ marginBottom: 16 }}>
      <Space wrap size={8}>
        {d.completable === 1 && <Button type="primary" onClick={() => onChoisir('completer')}>{t('demandeur.completer')}</Button>}
        {d.annulable === 1 && <Button danger onClick={() => onChoisir('annuler')}>{t('demandeur.annuler')}</Button>}
        {d.reouvrable === 1 && <Button onClick={() => onChoisir('reouvrir')}>{t('demandeur.reouvrir')}</Button>}
      </Space>
      {d.reouvrable === 1 && d.reouvrable_jusqu_au && (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 13 }}>
          {t('demandeur.reouvrir.jusqua').replace('{date}', instant(d.reouvrable_jusqu_au))}
        </Typography.Text>
      )}
    </div>
  );
}

/** Complément : texte facultatif si une photo a été jointe, sinon obligatoire ; photos envoyées aussitôt. */
export function CompleterForm({ d, onDone, onCancel }: { d: Demande; onDone: (d: Demande) => void; onCancel: () => void }) {
  const { t, lang, hint } = useI18n();
  const [form] = Form.useForm<{ complement?: string }>();
  const [plafonds, setPlafonds] = useState<PlafondsPieces | null>(null);
  const [pieces, setPieces] = useState<Piece[]>(d.pieces || []);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ajoutees = pieces.length > (d.pieces || []).length;

  useEffect(() => {
    api.get<{ plafonds: PlafondsPieces }>('/demandes/brouillon/pieces').then((r) => setPlafonds(r.plafonds)).catch(() => setPlafonds(null));
  }, []);

  const envoyer = async (v: { complement?: string }) => {
    const texte = (v.complement || '').trim();
    setErreur(null);
    if (!texte) { if (ajoutees) { message.success(t('demandeur.complete')); await rafraichir(); } return; }
    setEnvoi(true);
    try {
      const r = await api.put<Demande>(`/demandes/${d.id}`, { complement: texte, langue: lang });
      message.success(t('demandeur.complete'));
      onDone(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };
  const rafraichir = async () => { try { onDone(await api.get<Demande>(`/demandes/${d.id}`)); } catch { onCancel(); } };

  return (
    <Form form={form} layout="vertical" onFinish={envoyer}>
      <Typography.Paragraph type="secondary">{t('demandeur.completer.aide')}</Typography.Paragraph>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
      <Form.Item name="complement" label={t('demandeur.complement')} tooltip={hint('demandeur.complement')}
        rules={ajoutees ? [] : [texteObligatoire(t)]}>
        <Input.TextArea rows={4} maxLength={2000} lang={lang} />
      </Form.Item>
      <Form.Item label={t('demande.champ.pieces')}>
        <PiecesDemande pieces={pieces} plafonds={plafonds} onChange={setPieces} destination={`/demandes/${d.id}/pieces`} />
      </Form.Item>
      <Space wrap>
        <Button type="primary" htmlType="submit" loading={envoi}>{t('demandeur.completer.envoyer')}</Button>
        <Button onClick={ajoutees ? rafraichir : onCancel}>{ajoutees ? t('demandeur.fermer') : t('common.cancel')}</Button>
      </Space>
    </Form>
  );
}

/** Annulation par le demandeur : motif obligatoire, lu par le service technique. */
export function AnnulerForm({ d, onDone, onCancel }: { d: Demande; onDone: (d: Demande) => void; onCancel: () => void }) {
  const { t, hint } = useI18n();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async (v: { motif: string }) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.del<Demande>(`/demandes/${d.id}`, { motif: v.motif.trim() });
      message.success(t('demandeur.annulee'));
      onDone(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };
  return (
    <Form<{ motif: string }> layout="vertical" onFinish={envoyer}>
      <Typography.Paragraph type="secondary">{t('demandeur.annuler.aide')}</Typography.Paragraph>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
      <Form.Item name="motif" label={t('demandeur.motif')} tooltip={hint('demandeur.motif')} rules={[texteObligatoire(t)]}>
        <Input.TextArea rows={3} maxLength={2000} />
      </Form.Item>
      <Space wrap>
        <Button danger type="primary" htmlType="submit" loading={envoi}>{t('demandeur.annuler')}</Button>
        <Button onClick={onCancel}>{t('demandeur.garder')}</Button>
      </Space>
    </Form>
  );
}

/** Réouverture par le demandeur : ce qui ne va pas, obligatoire, lu par le service technique. */
export function ReouvrirForm({ d, onDone, onCancel }: { d: Demande; onDone: (d: Demande) => void; onCancel: () => void }) {
  const { t, hint } = useI18n();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const envoyer = async (v: { commentaire: string }) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<Demande>(`/demandes/${d.id}/transitions`, { etat: 'rouverte', commentaire: v.commentaire.trim() });
      message.success(t('demandeur.rouverte'));
      onDone(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };
  return (
    <Form<{ commentaire: string }> layout="vertical" onFinish={envoyer}>
      <Typography.Paragraph type="secondary">{t('demandeur.reouvrir.aide')}</Typography.Paragraph>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
      <Form.Item name="commentaire" label={t('demandeur.reouvrir.motif')} tooltip={hint('demandeur.reouvrir.motif')} rules={[texteObligatoire(t)]}>
        <Input.TextArea rows={3} maxLength={2000} />
      </Form.Item>
      <Space wrap>
        <Button type="primary" htmlType="submit" loading={envoi}>{t('demandeur.reouvrir')}</Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </Space>
    </Form>
  );
}

/** Avis donné, en mots et en note (« Satisfait, 4 sur 5 »). */
export function AvisDonne({ a }: { a: Avis }) {
  const { t } = useI18n();
  return (
    <div>
      <Typography.Text strong>{t(`avis.note.${a.note}`)}</Typography.Text>{' '}
      <Typography.Text type="secondary">{t('avis.sur5').replace('{n}', String(a.note))} · {instant(a.created_at)}</Typography.Text>
      {a.commentaire && <div style={{ whiteSpace: 'pre-wrap' }}>{a.commentaire}</div>}
    </div>
  );
}

/** Avis du demandeur à la clôture : cinq niveaux en boutons, commentaire facultatif ; ou l'avis déjà donné. */
export function AvisDemandeur({ d, onDone }: { d: Demande; onDone: (d: Demande) => void }) {
  const { t, hint } = useI18n();
  const [form] = Form.useForm<{ note?: number; commentaire?: string }>();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const dernier = (d.avis || [])[0];
  if (!d.avis_possible) {
    return dernier && d.etat === 'cloturee'
      ? <Card size="small" title={t('avis.titre.donne')} style={{ marginBottom: 16 }}><AvisDonne a={dernier} /></Card> : null;
  }
  const envoyer = async (v: { note?: number; commentaire?: string }) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<Demande>(`/demandes/${d.id}/avis`, { note: v.note, ...(v.commentaire?.trim() ? { commentaire: v.commentaire.trim() } : {}) });
      message.success(t('avis.merci'));
      onDone(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };
  return (
    <Card size="small" title={t('avis.titre')} style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" onFinish={envoyer}>
        {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
        <Form.Item name="note" label={t('avis.question')} tooltip={hint('avis.note')} rules={[{ required: true, message: t('avis.note.requise') }]}>
          <Radio.Group optionType="button" {...GROUPE_RADIO} aria-label={t('avis.question')} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
            options={NOTES.map((n) => ({ value: n, label: t(`avis.note.${n}`) }))} />
        </Form.Item>
        <Form.Item name="commentaire" label={t('avis.commentaire')} tooltip={hint('avis.commentaire')} extra={t('avis.commentaire.aide')}>
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={envoi}>{t('avis.envoyer')}</Button>
      </Form>
    </Card>
  );
}

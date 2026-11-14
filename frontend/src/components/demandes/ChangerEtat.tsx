/**
 * Changement d'état d'une demande par le service technique (version 0.14.0, étape 9, point 3 ; cahier des charges
 * CYC-01, CLO-01, GES-06 ; décision DV-118).
 * - ActionsDemande : un bouton par passage permis depuis l'état courant, tels que le serveur les rend sur la fiche
 *   (champ « transitions ») ; la qualification garde son bouton. Refuser et Annuler sont en rouge.
 * - ChangerEtatForm (le titre du volet nomme le passage) : motif choisi en boutons dans la liste du passage (motifs d'attente, motifs de refus, causes de
 *   panne), commentaire facultatif ou obligatoire avec la mention de qui le lira, compte rendu des travaux à la
 *   clôture. Le serveur refait tous les contrôles (services/cycle.js) ; un refus s'affiche et la saisie reste (ERG-09).
 * Choix exclusifs en boutons (standard, section 12.4) ; boutons qui passent à la ligne sur un téléphone (DV-102).
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Radio, Space, Spin, Typography, message } from 'antd';
import api, { ApiError, qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { cleAction, type Demande, type Transition } from '../../demandes';
import { obligatoire, texteObligatoire } from '../../validation';

/** Rôle ARIA du groupe : Form.Item y pose aria-required, permis seulement sur un radiogroup (axe-core). */
const GROUPE_RADIO = { role: 'radiogroup' } as Record<string, string>;
const DANGER = new Set(['refusee', 'refusee_validation', 'annulee', 'fusionnee']);

interface Valeur { id: number; code: string; libelle_fr: string; libelle_nl: string; is_active: number }
interface Saisie { motif_id?: number; commentaire?: string; compte_rendu?: string }

/**
 * Boutons des passages permis (sans la qualification, qui a son bouton). Rien si aucun passage. 0.16.0 : « passages »
 * donne ceux du chef de service (transitions_valideur) à la place de ceux du service technique.
 */
export function ActionsDemande({ d, onChoisir, passages: donnes, titre = 'cycle.actions' }: { d: Demande; onChoisir: (t: Transition) => void; passages?: Transition[]; titre?: string }) {
  const { t } = useI18n();
  // La qualification garde son bouton ; la fusion (0.16.0) a son bouton ici et son propre formulaire.
  const passages = (donnes || d.transitions || []).filter((x) => x.via !== 'qualifier');
  if (!passages.length) return null;
  return (
    <div role="group" aria-label={t(titre)} style={{ marginBottom: 16 }}>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>{t(titre)}</Typography.Text>
      {/* 0.16.0 : un libellé long (« Samenvoegen met een andere aanvraag ») passe à la ligne dans 320 px. */}
      <Space wrap size={8} style={{ maxWidth: '100%' }}>
        {passages.map((x) => (
          <Button key={x.vers} danger={DANGER.has(x.vers)} type={x.vers === 'cloturee' || (d.etat === 'en_validation' && x.vers === 'a_qualifier') ? 'primary' : 'default'} onClick={() => onChoisir(x)}
            style={{ whiteSpace: 'normal', height: 'auto', minHeight: 32, maxWidth: '100%', textAlign: 'start' }}>
            {t(cleAction(d.etat, x.vers))}
          </Button>
        ))}
      </Space>
    </div>
  );
}

/** Formulaire d'un passage : motif, commentaire, compte rendu selon la table des passages. */
export function ChangerEtatForm({ d, transition, onDone, onCancel, libelles = 'service' }: {
  d: Demande; transition: Transition; onDone: (d: Demande) => void; onCancel: () => void;
  /** 0.16.0 : « demandeur » nomme les états comme le demandeur les lit (chef de service). */
  libelles?: 'service' | 'demandeur';
}) {
  const { t, lang, hint } = useI18n();
  const [form] = Form.useForm<Saisie>();
  const [valeurs, setValeurs] = useState<Valeur[] | null>(transition.motif_liste ? null : []);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!transition.motif_liste) return;
    api.page<Valeur>(`/listes-valeurs${qs({ liste: transition.motif_liste, limit: 200 })}`)
      .then((r) => setValeurs(r.data.filter((v) => v.is_active === 1))).catch(() => setValeurs([]));
  }, [transition.motif_liste]);

  const envoyer = async (v: Saisie) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const corps: Record<string, unknown> = { etat: transition.vers };
      if (transition.motif_liste) corps.motif_id = v.motif_id;
      if (transition.commentaire !== 'interdit' && v.commentaire?.trim()) corps.commentaire = v.commentaire.trim();
      if (transition.compte_rendu && v.compte_rendu?.trim()) corps.compte_rendu = v.compte_rendu.trim();
      const r = await api.post<Demande>(`/demandes/${d.id}/transitions`, corps);
      message.success(t('cycle.fait'));
      onDone(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  const lbl = (o: Valeur) => (lang === 'nl' ? o.libelle_nl : o.libelle_fr);
  const titre = t(cleAction(d.etat, transition.vers));
  return (
    <Form<Saisie> form={form} layout="vertical" onFinish={envoyer} requiredMark>
      <Typography.Paragraph type="secondary">
        {t('cycle.passage').replace('{de}', t(`demande.${libelles === 'service' ? 'etat_service' : 'etat'}.${d.etat}`))
          .replace('{vers}', t(`demande.${libelles === 'service' ? 'etat_service' : 'etat'}.${transition.vers}`))}
      </Typography.Paragraph>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
      {transition.motif_liste && (
        <Form.Item name="motif_id" label={t(`cycle.motif.${transition.motif_liste}`)} tooltip={hint('cycle.motif')} rules={[obligatoire(t)]}>
          {valeurs === null ? <Spin size="small" />
            : valeurs.length === 0 ? <Alert type="warning" showIcon message={t('cycle.motif.vide')} />
              : (
                <Radio.Group optionType="button" {...GROUPE_RADIO} aria-label={t(`cycle.motif.${transition.motif_liste}`)}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} options={valeurs.map((v) => ({ value: v.id, label: lbl(v) }))} />
              )}
        </Form.Item>
      )}
      {transition.compte_rendu === 1 && (
        <Form.Item name="compte_rendu" label={t('cycle.compte_rendu')} tooltip={hint('cycle.compte_rendu')} extra={t('cycle.compte_rendu.aide')}>
          <Input.TextArea rows={4} maxLength={5000} />
        </Form.Item>
      )}
      {transition.commentaire !== 'interdit' && (
        <Form.Item name="commentaire" label={t('cycle.commentaire')} tooltip={hint('cycle.commentaire')}
          extra={t(transition.commentaire_public ? 'cycle.commentaire.public' : 'cycle.commentaire.interne')}
          rules={transition.commentaire === 'obligatoire' ? [texteObligatoire(t)] : []}>
          <Input.TextArea rows={3} maxLength={2000} />
        </Form.Item>
      )}
      <Space wrap>
        <Button type="primary" danger={DANGER.has(transition.vers)} htmlType="submit" loading={envoi}
          disabled={!!transition.motif_liste && (valeurs === null || valeurs.length === 0)}>{titre}</Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </Space>
    </Form>
  );
}

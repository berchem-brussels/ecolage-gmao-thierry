/**
 * Indisponibilités d'un ouvrier, dans sa fiche (Équipes, onglet Ouvriers) : 0.21.0, étape 17, point 2 ; PLA-04.
 * - Liste des indisponibilités des 30 derniers jours et à venir : du, au, journée ou demi-journée ; le motif (congé,
 *   formation, autre absence) n'est montré qu'au gestionnaire et au responsable (le serveur ne le rend qu'à eux).
 * - Avec « indisponibilites:gerer » : ajouter (du, au facultatif, période, motif en boutons, aucun texte libre) et supprimer
 *   une indisponibilité saisie par erreur (confirmation). Une modification se fait en supprimant puis en ressaisissant
 *   (l'API et le MCP savent aussi modifier).
 * - Le serveur refait tous les contrôles (dates, demi-journée sur un jour, chevauchement) ; un refus s'affiche et la saisie
 *   reste. Champs en 16 px et dates au calendrier sur téléphone (saisieDate).
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, List, Popconfirm, Radio, Space, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import api, { ApiError, qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { dateSouhaitee } from '../demandes';
import { saisieDate } from '../saisieDate';

export interface Indisponibilite { id: number; user_id: number; du: string; au: string; periode: 'journee' | 'matin' | 'apres_midi'; motif?: 'conge' | 'formation' | 'autre' }
/** Groupe de boutons nommé par aria-label : le type d'Ant Design refuse role en propriété directe (DV-145). */
const GROUPE_RADIO = { role: 'radiogroup' } as Record<string, string>;
interface Saisie { du?: Dayjs | null; au?: Dayjs | null; periode: Indisponibilite['periode']; motif?: Indisponibilite['motif'] }

export default function IndisponibilitesOuvrier({ ouvrierId, gerer }: { ouvrierId: number; gerer: boolean }) {
  const { t, lang, hint } = useI18n();
  const [liste, setListe] = useState<Indisponibilite[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form] = Form.useForm<Saisie>();
  const du = Form.useWatch('du', form);
  const au = Form.useWatch('au', form);
  const unJour = !au || !du || (au as Dayjs).isSame(du as Dayjs, 'day');

  const charger = useCallback(() => {
    api.page<Indisponibilite>(`/indisponibilites${qs({ user_id: ouvrierId, du: dayjs().subtract(30, 'day').format('YYYY-MM-DD'), limit: 200 })}`)
      .then((r) => setListe(r.data)).catch(() => setListe([]));
  }, [ouvrierId]);
  useEffect(() => { setAjout(false); setErreur(null); charger(); }, [charger]);
  // Une demi-journée ne porte que sur un jour : la période revient à la journée quand la fin s'écarte du début.
  useEffect(() => { if (!unJour && form.getFieldValue('periode') !== 'journee') form.setFieldValue('periode', 'journee'); }, [unJour, form]);

  const echec = (e: unknown) => setErreur(e instanceof ApiError ? e.message : t('common.error'));
  const enregistrer = async (v: Saisie) => {
    if (!v.du) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await api.post('/indisponibilites', { user_id: ouvrierId, du: v.du.format('YYYY-MM-DD'), au: (v.au || v.du).format('YYYY-MM-DD'), periode: v.periode, motif: v.motif });
      message.success(t('indispo.enregistree'));
      setAjout(false);
      charger();
    } catch (e) { echec(e); } finally { setEnvoi(false); }
  };
  const supprimer = async (i: Indisponibilite) => {
    setErreur(null);
    try {
      await api.del(`/indisponibilites/${i.id}`);
      message.success(t('indispo.supprimee'));
      charger();
    } catch (e) { echec(e); }
  };
  const ouvrirAjout = () => { form.setFieldsValue({ du: null, au: null, periode: 'journee', motif: undefined }); setErreur(null); setAjout(true); };
  const quand = (i: Indisponibilite) => (i.du === i.au
    ? `${dateSouhaitee(i.du, lang)} · ${t(`indispo.periode.${i.periode}`)}`
    : `${t('indispo.du')} ${dateSouhaitee(i.du, lang)} ${t('indispo.au')} ${dateSouhaitee(i.au, lang)}`);

  return (
    <Card size="small" className="indisponibilites" title={t('indispo.titre')} style={{ marginBottom: 16 }}
      extra={gerer && !ajout ? <Button size="small" icon={<PlusOutlined />} onClick={ouvrirAjout}>{t('indispo.ajouter')}</Button> : null}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>{t(gerer ? 'indispo.aide' : 'indispo.aide.lecture')}</Typography.Paragraph>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 8 }} role="alert" />}
      {ajout && (
        <Form<Saisie> form={form} layout="vertical" onFinish={enregistrer} requiredMark="optional" className="indispo-form" style={{ marginBottom: 12 }}>
          <Space wrap size={[16, 0]} align="start">
            <Form.Item name="du" label={t('indispo.field.du')} tooltip={hint('indispo.du')} rules={[{ required: true, message: t('form.obligatoire') }]}>
              <DatePicker format="DD/MM/YYYY" {...saisieDate()} />
            </Form.Item>
            <Form.Item name="au" label={t('indispo.field.au')} tooltip={hint('indispo.au')} dependencies={['du']}
              rules={[({ getFieldValue }) => ({ validator: (_, v: Dayjs | null) => (!v || !getFieldValue('du') || !v.isBefore(getFieldValue('du'), 'day') ? Promise.resolve() : Promise.reject(new Error(t('indispo.ordre')))) })]}>
              <DatePicker format="DD/MM/YYYY" {...saisieDate()} />
            </Form.Item>
          </Space>
          <Form.Item name="periode" label={t('indispo.field.periode')} tooltip={hint('indispo.periode')}>
            <Radio.Group optionType="button" {...GROUPE_RADIO} aria-label={t('indispo.field.periode')}
              options={(['journee', 'matin', 'apres_midi'] as const).map((p) => ({ value: p, label: t(`indispo.periode.${p}`), disabled: p !== 'journee' && !unJour }))} />
          </Form.Item>
          <Form.Item name="motif" label={t('indispo.field.motif')} tooltip={hint('indispo.motif')} rules={[{ required: true, message: t('form.obligatoire') }]}>
            <Radio.Group optionType="button" {...GROUPE_RADIO} aria-label={t('indispo.field.motif')}
              options={(['conge', 'formation', 'autre'] as const).map((m) => ({ value: m, label: t(`indispo.motif.${m}`) }))} />
          </Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit" loading={envoi}>{t('common.save')}</Button>
            <Button onClick={() => setAjout(false)} disabled={envoi}>{t('common.cancel')}</Button>
          </Space>
        </Form>
      )}
      <List<Indisponibilite> size="small" loading={liste === null} dataSource={liste || []} locale={{ emptyText: t('indispo.aucune') }}
        renderItem={(i) => (
          <List.Item style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Space direction="vertical" size={0} style={{ minWidth: 0, flex: 1 }}>
              <Typography.Text style={{ overflowWrap: 'anywhere' }}>{quand(i)}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>{i.motif ? t(`indispo.motif.${i.motif}`) : t('indispo.indisponible')}</Typography.Text>
            </Space>
            {gerer && (
              <Popconfirm title={t('indispo.supprimer.confirmer')} okText={t('indispo.supprimer')} cancelText={t('common.cancel')} onConfirm={() => supprimer(i)}>
                <Button size="small" danger style={{ flexShrink: 0 }}>{t('indispo.supprimer')}</Button>
              </Popconfirm>
            )}
          </List.Item>
        )} />
    </Card>
  );
}

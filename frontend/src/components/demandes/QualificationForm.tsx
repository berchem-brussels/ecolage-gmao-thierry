/**
 * Qualification d'une demande sur un seul écran (version 0.9.0 ; cahier des charges GES-04, PRI-01 ; DV-90, DV-91).
 * Catégorie (recherche dans le catalogue de l'entité), priorité en boutons avec la priorité proposée rappelée, motif
 * obligatoire quand la priorité diffère de la proposition, lieu précisé (même choix que le formulaire de demande),
 * durée estimée, date convenue pour une priorité sans délai de fin, consignes à l'ouvrier, photos du service visibles
 * ou non par le demandeur. Le serveur refait tous les contrôles (services/qualification.js) ; un refus s'affiche et la
 * saisie reste (ERG-09). Le corps de métier et les tâches arrivent aux étapes 15 et 21. Pas de compteur de caractères
 * sous les zones de texte : il recouvrirait l'explication (même choix que les Réglages de l'entité, 0.7.0).
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Radio, Space, Switch, TreeSelect, Typography, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import api, { ApiError } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import type { ArbreCategories, Categorie, PrioriteFiche } from '../../referentiel';
import { type Demande, type LieuChoisi } from '../../demandes';
import LieuPicker from './LieuPicker';
import { obligatoire } from '../../validation';

/** Rôle ARIA du groupe : Form.Item y pose aria-required, permis seulement sur un radiogroup (axe-core). */
const GROUPE_RADIO = { role: 'radiogroup' } as Record<string, string>;

interface Valeurs { priorite: string; motif_priorite?: string; duree_heures?: number | null; consignes?: string; photos_visibles: boolean; date_convenue?: Dayjs | null }

export default function QualificationForm({ d, onDone, onCancel }: { d: Demande; onDone: (d: Demande) => void; onCancel: () => void }) {
  const { t, lang } = useI18n();
  const [form] = Form.useForm<Valeurs>();
  const [arbre, setArbre] = useState<Categorie[] | null>(null);
  const [priorites, setPriorites] = useState<PrioriteFiche[]>([]);
  const [categorieId, setCategorieId] = useState<number>(d.categorie_id);
  const [lieu, setLieu] = useState<LieuChoisi | null>({ id: d.lieu_id, code: d.lieu_code, nom_fr: d.lieu_nom_fr, nom_nl: d.lieu_nom_nl, chemin: d.lieu_chemin });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const priorite = Form.useWatch('priorite', form);

  useEffect(() => {
    api.get<ArbreCategories>('/categories/arbre').then((r) => setArbre(r.domaines)).catch(() => setArbre([]));
    api.page<PrioriteFiche>('/priorites').then((r) => setPriorites(r.data)).catch(() => setPriorites([]));
  }, []);

  const lbl = (o: { libelle_fr: string; libelle_nl: string }) => (lang === 'nl' ? o.libelle_nl : o.libelle_fr);
  const categories = useMemo(() => (arbre || []).flatMap((dom) => [dom, ...(dom.natures || [])]), [arbre]);
  // Nature, ou domaine sans nature active : seules catégories admises (même règle que le dépôt).
  const arbreSelect = useMemo(() => (arbre || []).map((dom) => ({
    value: dom.id, title: lbl(dom), selectable: !(dom.natures || []).length,
    children: (dom.natures || []).map((n) => ({ value: n.id, title: `${lbl(n)}` })),
  })), [arbre, lang]);
  const cat = categories.find((c) => c.id === categorieId);
  // Priorité proposée : P1 si un danger est signalé, sinon celle de la catégorie choisie.
  const proposee = d.danger === 1 ? 'P1' : cat?.priorite_effective || (categorieId === d.categorie_id ? d.priorite_proposee : null) || null;
  const motifRequis = !!proposee && !!priorite && priorite !== proposee;
  const prio = priorites.find((p) => p.code === priorite);
  const sansFin = !!prio && prio.fin === null;

  const choisirCategorie = (id: number) => {
    setCategorieId(id);
    const c = categories.find((x) => x.id === id);
    // Tant que la personne suit la proposition, la priorité suit la nouvelle catégorie.
    const actuelle = form.getFieldValue('priorite');
    if (c && d.danger !== 1 && actuelle === proposee) form.setFieldsValue({ priorite: c.priorite_effective });
  };

  const envoyer = async (v: Valeurs) => {
    if (!lieu) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const corps: Record<string, unknown> = {
        categorie_id: categorieId, lieu_id: lieu.id, priorite: v.priorite,
        motif_priorite: motifRequis ? v.motif_priorite?.trim() || null : null,
        duree_estimee_minutes: v.duree_heures ? Math.round(v.duree_heures * 60) : null,
        consignes: v.consignes?.trim() || null,
        photos_visibles: v.photos_visibles ? 1 : 0,
        date_convenue: sansFin && v.date_convenue ? v.date_convenue.format('YYYY-MM-DD') : null,
      };
      const r = await api.post<Demande>(`/demandes/${d.id}/qualifier`, corps);
      message.success(t('qualif.ok'));
      onDone(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  return (
    <Form<Valeurs> form={form} layout="vertical" onFinish={envoyer} requiredMark="optional"
      initialValues={{
        priorite: d.priorite || proposee || 'P3', motif_priorite: d.motif_priorite || '', consignes: d.consignes || '',
        duree_heures: d.duree_estimee_minutes ? d.duree_estimee_minutes / 60 : null, photos_visibles: d.photos_visibles !== 0,
        date_convenue: d.date_convenue ? dayjs(d.date_convenue) : null,
      }}>
      <Typography.Paragraph type="secondary">{t('qualif.intro')}</Typography.Paragraph>
      <Form.Item label={t('qualif.categorie')} required>
        <TreeSelect<number> aria-label={t('qualif.categorie')} showSearch treeNodeFilterProp="title" treeDefaultExpandAll={false}
          value={categorieId} onChange={choisirCategorie} treeData={arbreSelect} loading={arbre === null} style={{ width: '100%' }}
          placeholder={t('qualif.categorie.placeholder')} />
      </Form.Item>
      <Form.Item name="priorite" label={t('qualif.priorite')} rules={[obligatoire(t)]}
        extra={proposee ? `${t('qualif.proposee')} ${proposee}${d.danger === 1 ? ` (${t('qualif.proposee.danger')})` : ''}` : undefined}>
        <Radio.Group {...GROUPE_RADIO} optionType="button" buttonStyle="solid" aria-label={t('qualif.priorite')}
          options={(priorites.length ? priorites.map((p) => p.code) : ['P1', 'P2', 'P3', 'P4']).map((code) => {
            const p = priorites.find((x) => x.code === code);
            return { value: code, label: p ? `${code} · ${lbl(p)}` : code };
          })} />
      </Form.Item>
      {motifRequis && (
        <Form.Item name="motif_priorite" label={t('qualif.motif')} extra={t('qualif.motif.aide')}
          rules={[{ required: true, whitespace: true, message: t('qualif.motif.requis') }]}>
          <Input.TextArea rows={2} maxLength={500} />
        </Form.Item>
      )}
      <Form.Item label={t('qualif.lieu')} required>
        <LieuPicker value={lieu} onChange={setLieu} />
      </Form.Item>
      <Form.Item name="duree_heures" label={t('qualif.duree')} extra={t('qualif.duree.aide')}>
        <InputNumber min={0.25} max={168} step={0.25} decimalSeparator="," addonAfter={t('qualif.duree.heures')} style={{ width: 200 }} />
      </Form.Item>
      {sansFin && (
        <Form.Item name="date_convenue" label={t('qualif.date_convenue')} extra={t('qualif.date_convenue.aide')}>
          <DatePicker format="DD/MM/YYYY" disabledDate={(j) => j.isBefore(dayjs(), 'day') || j.isAfter(dayjs().add(2, 'year'))} />
        </Form.Item>
      )}
      <Form.Item name="consignes" label={t('qualif.consignes')} extra={t('qualif.consignes.aide')}>
        <Input.TextArea rows={3} maxLength={2000} />
      </Form.Item>
      <Form.Item name="photos_visibles" label={t('qualif.photos')} valuePropName="checked" extra={t('qualif.photos.aide')}>
        <Switch aria-label={t('qualif.photos')} checkedChildren={t('qualif.oui')} unCheckedChildren={t('qualif.non')} />
      </Form.Item>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} role="alert" />}
      <Space wrap>
        <Button type="primary" htmlType="submit" loading={envoi}>{d.etat === 'a_qualifier' ? t('qualif.envoyer') : t('qualif.enregistrer')}</Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </Space>
    </Form>
  );
}

/**
 * Onglet Priorités et délais du référentiel des demandes (cahier des charges section 8.2, PRI-02 ; décision D-11).
 * Une carte par priorité P1 à P4 de l'entité active : libellés et description FR et NL, couleur, unité de décompte,
 * délais de prise en charge et de fin (« Date convenue » : pas de délai de fin), retour aux valeurs livrées.
 * Choix exclusifs en boutons (standard section 12.4). La cohérence des délais est contrôlée par le serveur.
 */
import { Button, Card, Checkbox, Form, Input, InputNumber, Popconfirm, Radio, Space, Tag, Typography, message } from 'antd';
import api, { ApiError } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { COULEURS, type PrioriteFiche, UNITES, type Unite } from '../../referentiel';
import TraceFiche from './TraceFiche';
import { obligatoire, texteObligatoire } from '../../validation';

interface FormValues {
  libelle_fr: string; libelle_nl: string; description_fr?: string; description_nl?: string; couleur: string; unite: Unite;
  prise_en_charge: number; fin?: number | null; convenue: boolean;
}

/** Texte d'un délai : « 4 heures calendaires », « date convenue ». */
export function texteDelai(t: (k: string) => string, n: number | null, unite: Unite) {
  return n === null ? t('ref.prio.convenue') : `${n} ${t(`ref.unite.${unite}`)}`;
}

function CartePriorite({ p, onSaved }: { p: PrioriteFiche; onSaved: (p: PrioriteFiche) => void }) {
  const { t, tField } = useI18n();
  const [form] = Form.useForm<FormValues>();
  const convenue = Form.useWatch('convenue', form);
  const fail = (e: unknown) => message.error(e instanceof ApiError ? `${e.message}${e.details ? ` (${e.details.join(', ')})` : ''}` : t('common.error'));
  const enregistrer = async (v: FormValues) => {
    try {
      onSaved(await api.put<PrioriteFiche>(`/priorites/${p.code}`, {
        libelle_fr: v.libelle_fr, libelle_nl: v.libelle_nl, description_fr: v.description_fr || null, description_nl: v.description_nl || null,
        couleur: v.couleur, unite: v.unite, prise_en_charge: v.prise_en_charge, fin: v.convenue ? null : (v.fin ?? null),
      }));
      message.success(t('common.saved'));
    } catch (e) { fail(e); }
  };
  const reset = async () => {
    try { onSaved(await api.del<PrioriteFiche>(`/priorites/${p.code}`)); message.success(t('common.saved')); } catch (e) { fail(e); }
  };
  const d = p.defaut;
  return (
    <Card size="small" title={<Space><Tag color={p.couleur}>{p.code}</Tag>{tField(p as unknown as Record<string, unknown>, 'libelle')}</Space>}
      extra={p.est_defaut ? <Tag>{t('ref.valeurs_livrees')}</Tag> : <Tag color="blue">{t('ref.modifie')}</Tag>}>
      <Form key={`${p.code}-${p.updated_at}`} form={form} layout="vertical" onFinish={enregistrer} preserve={false}
        initialValues={{ ...p, description_fr: p.description_fr ?? '', description_nl: p.description_nl ?? '', convenue: p.fin === null }}>
        <div className="ref-deux">
          <Form.Item name="libelle_fr" label={t('ref.prio.libelle_fr')} rules={[texteObligatoire(t), { max: 100 }]}><Input lang="fr" /></Form.Item>
          <Form.Item name="libelle_nl" label={t('ref.prio.libelle_nl')} rules={[texteObligatoire(t), { max: 100 }]}><Input lang="nl" /></Form.Item>
          <Form.Item name="description_fr" label={t('ref.prio.description_fr')} rules={[{ max: 500 }]}><Input.TextArea lang="fr" rows={2} /></Form.Item>
          <Form.Item name="description_nl" label={t('ref.prio.description_nl')} rules={[{ max: 500 }]}><Input.TextArea lang="nl" rows={2} /></Form.Item>
        </div>
        <Form.Item name="unite" label={t('ref.prio.unite')} extra={t('ref.prio.unite.help')}>
          <Radio.Group optionType="button" aria-label={t('ref.prio.unite')} options={UNITES.map((u) => ({ value: u, label: t(`ref.unite.${u}`) }))} />
        </Form.Item>
        <Space wrap align="start">
          <Form.Item name="prise_en_charge" label={t('ref.prio.prise')} rules={[obligatoire(t)]}><InputNumber min={1} max={720} /></Form.Item>
          <Form.Item name="fin" label={t('ref.prio.fin')}><InputNumber min={1} max={720} disabled={convenue} /></Form.Item>
          <Form.Item name="convenue" valuePropName="checked" label={t('ref.prio.convenue')}><Checkbox aria-label={t('ref.prio.convenue')} /></Form.Item>
        </Space>
        <Form.Item name="couleur" label={t('ref.prio.couleur')}>
          <Radio.Group aria-label={t('ref.prio.couleur')} className="ref-couleurs">
            {COULEURS.map((c) => <Radio key={c} value={c} aria-label={t(`ref.couleur.${c}`)}><Tag color={c}>{t(`ref.couleur.${c}`)}</Tag></Radio>)}
          </Radio.Group>
        </Form.Item>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          {t('ref.valeurs_livrees')} : {t('ref.prio.prise')} {texteDelai(t, d.prise_en_charge, d.unite)} · {t('ref.prio.fin')} {texteDelai(t, d.fin, d.unite)}
        </Typography.Paragraph>
        <Typography.Paragraph style={{ fontSize: 12, marginTop: -8 }}><TraceFiche trace={p.trace} /></Typography.Paragraph>
        <Space wrap>
          <Button type="primary" htmlType="submit">{t('common.save')}</Button>
          {!p.est_defaut && (
            <Popconfirm title={t('ref.reset.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={reset}>
              <Button>{t('ref.reset')}</Button>
            </Popconfirm>
          )}
        </Space>
      </Form>
    </Card>
  );
}

export default function PrioritesTab({ priorites, onChange }: { priorites: PrioriteFiche[]; onChange: (p: PrioriteFiche) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <Typography.Paragraph type="secondary">{t('ref.prio.intro')}</Typography.Paragraph>
      <div className="ref-grille">
        {priorites.map((p) => <CartePriorite key={p.code} p={p} onSaved={onChange} />)}
      </div>
    </div>
  );
}

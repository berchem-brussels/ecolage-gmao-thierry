/**
 * Onglet Simulateur du référentiel des demandes (cahier des charges PRI-02, PRI-03).
 * « Une demande reçue à tel moment, de telle priorité ou de telle catégorie, est à prendre en charge et à terminer
 * le … » : le calcul est celui du serveur (services/echeances.js), à l'heure de Bruxelles, avec l'horaire, les jours
 * fériés, les congés et les fermetures de l'entité active. Rien n'est enregistré.
 *
 * Version 0.4.1 (DV-04) : l'échéance et son délai s'affichent l'un sous l'autre (classe sim-echeance, colonne flex :
 * le contenu d'un élément de Descriptions est une rangée flex dans Ant Design 5). Sous 576 px (téléphones, iPhone et
 * Android), les libellés du résultat passent au-dessus des valeurs.
 */
import { useState } from 'react';
import { Button, Card, DatePicker, Descriptions, Form, Grid, Radio, Select, Tag, Typography, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import api, { ApiError, qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { type Categorie, type Echeance, PRIORITES, type PrioriteFiche } from '../../referentiel';
import { PrioriteTag } from './CategoriesTab';
import { texteDelai } from './PrioritesTab';
import { obligatoire } from '../../validation';

interface FormValues { mode: 'priorite' | 'categorie'; priorite?: string; categorie_id?: number; recu: Dayjs }

/** Une échéance : la date et l'heure en gras, le délai en dessous, en gris. */
function Echeance({ quand, delai }: { quand: string; delai: string }) {
  return (
    <div className="sim-echeance">
      <strong>{quand}</strong>
      <Typography.Text type="secondary">{delai}</Typography.Text>
    </div>
  );
}

export default function SimulateurTab({ priorites, categories }: { priorites: PrioriteFiche[]; categories: Categorie[] }) {
  const { t, tField, lang } = useI18n();
  const [form] = Form.useForm<FormValues>();
  const mode = Form.useWatch('mode', form);
  const [res, setRes] = useState<Echeance | null>(null);
  const ecrans = Grid.useBreakpoint();
  const lbl = (o: object) => tField(o as Record<string, unknown>, 'libelle');
  const quand = (local: string) => dayjs(local, 'YYYY-MM-DD HH:mm').locale(lang).format('dddd D MMMM YYYY, HH:mm');
  const options = categories.flatMap((d) => [d, ...(d.natures || [])]).map((c) => ({
    value: c.id, label: c.niveau === 'nature' ? `${lbl({ libelle_fr: c.parent_libelle_fr, libelle_nl: c.parent_libelle_nl })} › ${lbl(c)}` : lbl(c),
  }));

  const calculer = async (v: FormValues) => {
    try {
      setRes(await api.get<Echeance>(`/echeances/simulation${qs({
        recu_le: v.recu.toDate().toISOString(),
        ...(v.mode === 'priorite' ? { priorite: v.priorite } : { categorie_id: v.categorie_id }),
      })}`));
    } catch (e) { setRes(null); message.error(e instanceof ApiError ? e.message : t('common.error')); }
  };

  return (
    <div className="ref-grille">
      <Card size="small" title={t('ref.sim.question')}>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.sim.intro')}</Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={calculer} initialValues={{ mode: 'priorite', priorite: 'P3', recu: dayjs().second(0) }}>
          <Form.Item name="mode" label={t('ref.sim.selon')}>
            <Radio.Group optionType="button" aria-label={t('ref.sim.selon')}
              options={[{ value: 'priorite', label: t('ref.cat.priorite') }, { value: 'categorie', label: t('ref.sim.categorie') }]} />
          </Form.Item>
          {mode === 'categorie' ? (
            <Form.Item name="categorie_id" label={t('ref.sim.categorie')} rules={[obligatoire(t)]}>
              <Select showSearch optionFilterProp="label" options={options} aria-label={t('ref.sim.categorie')} />
            </Form.Item>
          ) : (
            <Form.Item name="priorite" label={t('ref.cat.priorite')}>
              <Radio.Group optionType="button" aria-label={t('ref.cat.priorite')} options={PRIORITES.map((p) => ({ value: p, label: p }))} />
            </Form.Item>
          )}
          <Form.Item name="recu" label={t('ref.sim.recu')} rules={[obligatoire(t)]}>
            <DatePicker showTime={{ format: 'HH:mm', minuteStep: 5 }} format="DD/MM/YYYY HH:mm" allowClear={false} aria-label={t('ref.sim.recu')} />
          </Form.Item>
          <Button type="primary" htmlType="submit">{t('ref.sim.calculer')}</Button>
        </Form>
      </Card>
      <Card size="small" title={t('ref.sim.resultat')} aria-live="polite">
        {res ? (
          <Descriptions column={1} size="small" layout={ecrans.sm === false ? 'vertical' : 'horizontal'} className="sim-resultat">
            <Descriptions.Item label={t('ref.cat.priorite')}><PrioriteTag code={res.priorite} priorites={priorites} /></Descriptions.Item>
            {res.categorie && <Descriptions.Item label={t('ref.sim.categorie')}>{lbl(res.categorie)}</Descriptions.Item>}
            <Descriptions.Item label={t('ref.sim.recu')}>{quand(res.recu_le.local)}</Descriptions.Item>
            <Descriptions.Item label={t('ref.sim.debut')}>{quand(res.debut_decompte.local)}</Descriptions.Item>
            <Descriptions.Item label={t('ref.prio.prise')}>
              <Echeance quand={quand(res.prise_en_charge_le.local)} delai={texteDelai(t, res.delai_prise_en_charge, res.unite)} />
            </Descriptions.Item>
            <Descriptions.Item label={t('ref.prio.fin')}>
              {res.fin_le ? (
                <Echeance quand={quand(res.fin_le.local)}
                  delai={`${texteDelai(t, res.delai_fin, res.unite)}${res.delai_fin_source === 'categorie' ? ` · ${t('ref.sim.delai_categorie')}` : ''}`} />
              ) : <Tag>{t('ref.prio.convenue')}</Tag>}
            </Descriptions.Item>
          </Descriptions>
        ) : <Typography.Text type="secondary">{t('ref.sim.vide')}</Typography.Text>}
      </Card>
    </div>
  );
}

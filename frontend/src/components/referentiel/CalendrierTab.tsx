/**
 * Onglet Calendrier du référentiel des demandes (cahier des charges PRI-02 ; décisions du 22/10/2026).
 * Horaire des sept jours de l'entité active (horaire des ouvriers, qui fait foi pour les délais), jours fériés légaux
 * de l'année calculés par le serveur, congés propres répétés chaque année et fermetures ponctuelles.
 * Un congé ou une fermeture se désactive avec un motif et redevient alors ouvrable pour les délais suivants.
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, DatePicker, Descriptions, Drawer, Form, Input, List, Modal, Popconfirm, Radio, Segmented, Space, Switch, Table, Tag, TimePicker, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import api, { ApiError, qs } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { type Ferie, type Horaire, type JourNonOuvre, moisJourDate } from '../../referentiel';
import TraceFiche from './TraceFiche';
import ErreurObligatoire from '../ErreurObligatoire';
import { obligatoire, seulementEspaces, texteObligatoire } from '../../validation';

const HM = 'HH:mm';

/** Une ligne de l'horaire : ouvré ou non, début et fin, enregistrement et retour à l'horaire livré. */
function LigneHoraire({ h, onSaved }: { h: Horaire; onSaved: () => void }) {
  const { t } = useI18n();
  const [ouvre, setOuvre] = useState(!!h.debut);
  const [debut, setDebut] = useState<Dayjs | null>(h.debut ? dayjs(h.debut, HM) : null);
  const [fin, setFin] = useState<Dayjs | null>(h.fin ? dayjs(h.fin, HM) : null);
  const valeur = { debut: ouvre && debut ? debut.format(HM) : null, fin: ouvre && fin ? fin.format(HM) : null };
  const modifie = valeur.debut !== h.debut || valeur.fin !== h.fin;
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));
  const enregistrer = async () => { try { await api.put(`/horaires/${h.jour}`, valeur); message.success(t('common.saved')); onSaved(); } catch (e) { fail(e); } };
  const reset = async () => { try { await api.del(`/horaires/${h.jour}`); message.success(t('common.saved')); onSaved(); } catch (e) { fail(e); } };
  const jour = t(`ref.jour.${h.jour}`);
  return (
    <div className="ref-horaire">
      <strong style={{ minWidth: 90 }}>{jour}</strong>
      <Switch checked={ouvre} onChange={(v) => { setOuvre(v); if (v && !debut) { setDebut(dayjs('08:00', HM)); setFin(dayjs('16:00', HM)); } }}
        aria-label={`${jour} : ${t('ref.cal.ouvre')}`} checkedChildren={t('ref.cal.ouvre')} unCheckedChildren={t('ref.cal.ferme')} />
      {ouvre && (
        <Space wrap>
          <TimePicker format={HM} minuteStep={5} value={debut} onChange={setDebut} aria-label={`${jour} : ${t('ref.cal.debut')}`} placeholder={t('ref.cal.debut')} allowClear={false} needConfirm={false} />
          <TimePicker format={HM} minuteStep={5} value={fin} onChange={setFin} aria-label={`${jour} : ${t('ref.cal.fin')}`} placeholder={t('ref.cal.fin')} allowClear={false} needConfirm={false} />
        </Space>
      )}
      <Space wrap>
        {modifie && <Button type="primary" size="small" onClick={enregistrer}>{t('common.save')}</Button>}
        {!h.est_defaut && !modifie && (
          <Popconfirm title={t('ref.reset.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={reset}>
            <Button size="small">{t('ref.reset')}</Button>
          </Popconfirm>
        )}
      </Space>
      <TraceFiche trace={h.trace} style={{ flexBasis: '100%', fontSize: 12 }} />
    </div>
  );
}

interface JourForm { nature: 'conge' | 'fermeture'; libelle_fr: string; libelle_nl: string; jour?: Dayjs; periode?: [Dayjs, Dayjs] }

export default function CalendrierTab() {
  const { t, tField, lang } = useI18n();
  const { user } = useAuth();
  const annee0 = dayjs().year();
  const [horaires, setHoraires] = useState<Horaire[]>([]);
  const [annee, setAnnee] = useState(annee0);
  const [feries, setFeries] = useState<Ferie[]>([]);
  const [jours, setJours] = useState<JourNonOuvre[]>([]);
  const [creer, setCreer] = useState(false);
  const [current, setCurrent] = useState<JourNonOuvre | null>(null);
  const [motif, setMotif] = useState('');
  const [form] = Form.useForm<JourForm>();
  const natureForm = Form.useWatch('nature', form);
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));
  const lbl = (o: object) => tField(o as Record<string, unknown>, 'libelle');
  const dateLongue = (iso: string, avecAnnee = true) => dayjs(iso).locale(lang).format(avecAnnee ? 'dddd D MMMM YYYY' : 'D MMMM');

  const loadHoraires = useCallback(async () => {
    try { setHoraires((await api.page<Horaire>('/horaires')).data); } catch (e) { fail(e); }
  }, [t]);
  const loadJours = useCallback(async () => {
    try { setJours((await api.page<JourNonOuvre>(`/jours-non-ouvres${qs({ limit: 200 })}`)).data); } catch (e) { fail(e); }
  }, [t]);
  useEffect(() => { loadHoraires(); loadJours(); }, [loadHoraires, loadJours, user?.entite_active_id]);
  useEffect(() => {
    api.page<Ferie>(`/jours-feries${qs({ annee })}`).then((r) => setFeries(r.data)).catch(fail);
  }, [annee]);

  const quand = (j: JourNonOuvre) => (j.nature === 'conge'
    ? `${dateLongue(moisJourDate(j.mois_jour as string), false)} · ${t('ref.cal.chaque_annee')}`
    : j.date_debut === j.date_fin ? dateLongue(j.date_debut as string) : `${dateLongue(j.date_debut as string)} → ${dateLongue(j.date_fin as string)}`);

  const ajouter = async (v: JourForm) => {
    const corps = v.nature === 'conge'
      ? { nature: 'conge', mois_jour: v.jour?.format('MM-DD') }
      : { nature: 'fermeture', date_debut: v.periode?.[0].format('YYYY-MM-DD'), date_fin: v.periode?.[1].format('YYYY-MM-DD') };
    try {
      await api.post('/jours-non-ouvres', { ...corps, libelle_fr: v.libelle_fr, libelle_nl: v.libelle_nl });
      message.success(t('common.saved'));
      setCreer(false);
      loadJours();
    } catch (e) { fail(e); }
  };
  const maj = async (j: JourNonOuvre) => { setCurrent(j); setMotif(''); await loadJours(); };
  const desactiver = async () => {
    if (!current || !motif.trim()) return;
    try { await maj(await api.del<JourNonOuvre>(`/jours-non-ouvres/${current.id}`, { motif: motif.trim() })); } catch (e) { fail(e); }
  };
  const reactiver = async () => {
    if (!current) return;
    try { await maj(await api.put<JourNonOuvre>(`/jours-non-ouvres/${current.id}`, { is_active: 1 })); } catch (e) { fail(e); }
  };
  const renommer = async (v: { libelle_fr: string; libelle_nl: string }) => {
    if (!current) return;
    try { await maj(await api.put<JourNonOuvre>(`/jours-non-ouvres/${current.id}`, v)); message.success(t('common.saved')); } catch (e) { fail(e); }
  };
  const statut = (j: JourNonOuvre) => (j.is_active ? <Tag color="green">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>);

  return (
    <div className="ref-grille">
      <Card size="small" title={t('ref.cal.horaire')}>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.cal.horaire.help')}</Typography.Paragraph>
        {horaires.map((h) => <LigneHoraire key={`${h.jour}-${h.debut}-${h.fin}`} h={h} onSaved={loadHoraires} />)}
      </Card>

      <Card size="small" title={t('ref.cal.feries')}
        extra={<Segmented size="small" aria-label={t('ref.cal.annee')} value={annee} onChange={(v) => setAnnee(Number(v))}
          options={[annee0 - 1, annee0, annee0 + 1].map((a) => ({ value: a, label: String(a) }))} />}>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.cal.feries.help')}</Typography.Paragraph>
        <List size="small" dataSource={feries} rowKey="code" renderItem={(f) => (
          <List.Item><span>{lbl(f)}</span><Typography.Text type="secondary">{dateLongue(f.date)}</Typography.Text></List.Item>
        )} />
      </Card>

      <Card size="small" title={t('ref.cal.jours')} style={{ gridColumn: '1 / -1' }}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreer(true)}>{t('common.create')}</Button>}>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.cal.jours.help')}</Typography.Paragraph>
        <Table<JourNonOuvre> rowKey="id" size="small" dataSource={jours} pagination={false} scroll={{ x: 'max-content' }}
          locale={{ emptyText: t('common.nodata') }} onRow={(r) => ({ onClick: () => { setCurrent(r); setMotif(''); }, style: { cursor: 'pointer' } })}
          columns={[
            { title: t('ref.cal.libelle'), key: 'libelle', render: (_, j) => lbl(j) },
            { title: t('ref.cal.nature'), key: 'nature', render: (_, j) => <Tag color={j.nature === 'conge' ? 'blue' : 'orange'}>{t(`ref.cal.nature.${j.nature}`)}</Tag> },
            { title: t('ref.cal.quand'), key: 'quand', render: (_, j) => quand(j) },
            { title: t('common.status'), key: 'statut', render: (_, j) => statut(j), width: 110 },
          ]} />
      </Card>

      <Modal open={creer} destroyOnClose title={t('ref.cal.nouveau')} okText={t('common.save')} cancelText={t('common.cancel')}
        onOk={() => form.submit()} onCancel={() => setCreer(false)}>
        <Form form={form} layout="vertical" onFinish={ajouter} preserve={false} initialValues={{ nature: 'fermeture' }}>
          <Form.Item name="nature" label={t('ref.cal.nature')}>
            <Radio.Group optionType="button" aria-label={t('ref.cal.nature')}
              options={[{ value: 'fermeture', label: t('ref.cal.nature.fermeture') }, { value: 'conge', label: t('ref.cal.nature.conge') }]} />
          </Form.Item>
          {natureForm === 'conge' ? (
            <Form.Item name="jour" label={t('ref.cal.jour')} extra={t('ref.cal.chaque_annee')} rules={[obligatoire(t)]}>
              <DatePicker format="D MMMM" aria-label={t('ref.cal.jour')} />
            </Form.Item>
          ) : (
            <Form.Item name="periode" label={t('ref.cal.periode')} rules={[obligatoire(t)]}>
              <DatePicker.RangePicker format="DD/MM/YYYY" aria-label={t('ref.cal.periode')} />
            </Form.Item>
          )}
          <Form.Item name="libelle_fr" label={t('ref.cal.libelle_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
          <Form.Item name="libelle_nl" label={t('ref.cal.libelle_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
        </Form>
      </Modal>

      <Drawer open={!!current} width="min(460px, 100vw)" destroyOnClose title={current ? lbl(current) : ''} onClose={() => setCurrent(null)}>
        {current && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('ref.cal.nature')}>{t(`ref.cal.nature.${current.nature}`)}</Descriptions.Item>
              <Descriptions.Item label={t('ref.cal.quand')}>{quand(current)}</Descriptions.Item>
              <Descriptions.Item label={t('common.status')}>{statut(current)}</Descriptions.Item>
              {current.motif_desactivation && <Descriptions.Item label={t('common.reason')}>{current.motif_desactivation}</Descriptions.Item>}
            </Descriptions>
            <Typography.Paragraph style={{ fontSize: 12, marginTop: -8 }}><TraceFiche trace={current.trace} /></Typography.Paragraph>
            <Form key={`${current.id}-${current.updated_at}`} layout="vertical" onFinish={renommer} preserve={false}
              initialValues={{ libelle_fr: current.libelle_fr, libelle_nl: current.libelle_nl }} disabled={!current.is_active}>
              <Form.Item name="libelle_fr" label={t('ref.cal.libelle_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
              <Form.Item name="libelle_nl" label={t('ref.cal.libelle_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
              <Button type="primary" htmlType="submit">{t('common.save')}</Button>
            </Form>
            {current.is_active ? (
              <Card size="small" style={{ marginTop: 24 }} title={t('ref.cal.desactiver')}>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.cal.desactiver.help')}</Typography.Paragraph>
                <Input.TextArea rows={2} aria-label={t('listes.motif')} placeholder={t('listes.motif')} value={motif} onChange={(e) => setMotif(e.target.value)}
                  aria-invalid={seulementEspaces(motif) || undefined} aria-describedby={seulementEspaces(motif) ? 'motif-cal-erreur' : undefined} />
                {seulementEspaces(motif) && <ErreurObligatoire id="motif-cal-erreur" />}
                <Popconfirm title={t('ref.cal.desactiver.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={desactiver} disabled={!motif.trim()}>
                  <Button danger style={{ marginTop: 8 }} disabled={!motif.trim()}>{t('ref.cal.desactiver')}</Button>
                </Popconfirm>
              </Card>
            ) : (
              <Button style={{ marginTop: 24 }} onClick={reactiver}>{t('ref.cal.reactiver')}</Button>
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}

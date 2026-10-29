/**
 * Onglet Catégories du référentiel des demandes (cahier des charges REF-06, DEM-02 ; décision D-11).
 * Arbre domaine, nature en tableau dépliable ; fiche latérale pour modifier, ajouter une nature, désactiver ou
 * réactiver ; aperçu des tuiles telles que le demandeur les verra à l'étape 5 (catégories actives seulement).
 * Une nature reprend la priorité, la validation et le délai de son domaine tant que « Comme le domaine » est choisi.
 * Choix exclusifs en boutons (standard section 12.4) ; la liste des domaines, catalogue, en liste déroulante.
 * 0.7.0 (DEM-05) : la fiche porte les questions du formulaire (QuestionsFiche) ; dans l'aperçu, une tuile de nature (ou
 * d'un domaine sans nature) montre les questions telles que le demandeur les verra.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Popconfirm, Radio, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { codeFromLabel } from '../../lieux';
import { type ArbreCategories, type Categorie, type PrioriteFiche, ICONE_CODES, Icone, PRIORITES } from '../../referentiel';
import TraceFiche from './TraceFiche';
import QuestionsFiche from './QuestionsFiche';
import QuestionsCategorie from '../demandes/QuestionsCategorie';
import type { ReponseDonnee } from '../../referentiel';
import ErreurObligatoire from '../ErreurObligatoire';
import { seulementEspaces, texteObligatoire } from '../../validation';

interface FormValues {
  libelle_fr: string; libelle_nl: string; code?: string; icone: string; parent_id?: number;
  priorite_defaut: string; validation: string; delai_fin_jours?: number | null; ordre?: number;
}

const HERITE = 'herite';

/** Tag de priorité aux couleurs réglées par le responsable. */
export function PrioriteTag({ code, priorites }: { code: string; priorites: PrioriteFiche[] }) {
  const { tField } = useI18n();
  const p = priorites.find((x) => x.code === code);
  return <Tag color={p?.couleur}>{code}{p ? ` · ${tField(p as unknown as Record<string, unknown>, 'libelle')}` : ''}</Tag>;
}

/** Aperçu des tuiles : domaines, puis natures du domaine choisi. */
function Tuiles({ arbre }: { arbre: Categorie[] }) {
  const { t, tField } = useI18n();
  const [domaine, setDomaine] = useState<Categorie | null>(null);
  // Aperçu des questions (0.7.0) : la catégorie dont on montre les questions et des réponses d'essai, jamais enregistrées.
  const [apercu, setApercu] = useState<Categorie | null>(null);
  const [essai, setEssai] = useState<ReponseDonnee[]>([]);
  const items = domaine ? (domaine.natures || []) : arbre;
  const lbl = (c: Categorie) => tField(c as unknown as Record<string, unknown>, 'libelle');
  const montrer = (c: Categorie) => { setApercu(c); setEssai([]); };
  // L'arbre rechargé (question ajoutée ou modifiée) met l'aperçu à jour.
  const enCours = apercu ? arbre.flatMap((d) => [d, ...(d.natures || [])]).find((c) => c.id === apercu.id) || null : null;
  return (
    <Card title={t('ref.cat.tuiles')} size="small">
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.cat.tuiles.help')}</Typography.Paragraph>
      {domaine && <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => { setDomaine(null); setApercu(null); }} style={{ paddingInline: 0 }}>{lbl(domaine)}</Button>}
      <div className="ref-tuiles">
        {items.map((c) => {
          const feuille = !!domaine || !(c.natures && c.natures.length);
          return (
            <button key={c.id} type="button" className={`ref-tuile${enCours?.id === c.id ? ' dem-tuile-choisie' : ''}`}
              onClick={() => (feuille ? montrer(c) : setDomaine(c))} aria-pressed={feuille ? enCours?.id === c.id : undefined}
              aria-label={feuille ? lbl(c) : `${lbl(c)} : ${t('ref.cat.tuiles.ouvrir')}`}>
              <Icone code={c.icone} style={{ fontSize: 28, color: 'var(--app-primary)' }} />
              <span>{lbl(c)}</span>
            </button>
          );
        })}
      </div>
      {!items.length && <Typography.Text type="secondary">{t('common.nodata')}</Typography.Text>}
      {enCours && (
        <div style={{ marginTop: 12 }}>
          {(enCours.questions || []).length
            ? <QuestionsCategorie questions={enCours.questions || []} value={essai} onChange={setEssai} prefixe="ref-apercu-q" />
            : <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('ref.q.apercu.aucune')}</Typography.Text>}
        </div>
      )}
    </Card>
  );
}

export default function CategoriesTab({ priorites }: { priorites: PrioriteFiche[] }) {
  const { t, tField } = useI18n();
  const { user } = useAuth();
  const simple = user?.ui_mode !== 'complet';
  const [arbre, setArbre] = useState<Categorie[]>([]);
  const [inactifs, setInactifs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<Categorie | null>(null);
  const [creation, setCreation] = useState<{ parent: Categorie | null } | null>(null);
  const [motif, setMotif] = useState('');
  const [form] = Form.useForm<FormValues>();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));
  const lbl = (c: { libelle_fr: string; libelle_nl: string }) => tField(c as unknown as Record<string, unknown>, 'libelle');

  const load = useCallback(async () => {
    setLoading(true);
    try { setArbre((await api.get<ArbreCategories>(`/categories/arbre${qs({ inclure_inactifs: inactifs ? 1 : 0 })}`)).domaines); } catch (e) { fail(e); } finally { setLoading(false); }
  }, [inactifs, t]);
  useEffect(() => { load(); }, [load, user?.entite_active_id]);

  const actifs = useMemo(() => arbre.filter((d) => d.is_active).map((d) => ({ ...d, natures: (d.natures || []).filter((n) => n.is_active) })), [arbre]);
  const domainesActifs = actifs;
  const ouvrir = (c: Categorie) => { setCreation(null); setCurrent(c); setMotif(''); };
  const nouveau = (parent: Categorie | null) => { setCurrent(null); setCreation({ parent }); };

  const valeurs = (c: Categorie | null, parent: Categorie | null): FormValues => (c ? {
    libelle_fr: c.libelle_fr, libelle_nl: c.libelle_nl, icone: c.icone, parent_id: c.parent_id ?? undefined,
    priorite_defaut: c.priorite_defaut || HERITE, validation: c.validation === null ? HERITE : String(c.validation),
    delai_fin_jours: c.delai_fin_jours, ordre: c.ordre,
  } : {
    libelle_fr: '', libelle_nl: '', icone: parent ? parent.icone : 'autre', parent_id: parent?.id,
    priorite_defaut: parent ? HERITE : 'P3', validation: parent ? HERITE : '0', delai_fin_jours: null,
  });

  const corps = (v: FormValues, nature: boolean) => ({
    libelle_fr: v.libelle_fr, libelle_nl: v.libelle_nl, icone: v.icone,
    priorite_defaut: v.priorite_defaut === HERITE ? null : v.priorite_defaut,
    validation: v.validation === HERITE ? null : Number(v.validation),
    delai_fin_jours: v.delai_fin_jours ?? null,
    ...(v.ordre !== undefined && v.ordre !== null ? { ordre: v.ordre } : {}),
    ...(nature && v.parent_id ? { parent_id: v.parent_id } : {}),
  });

  const enregistrer = async (v: FormValues) => {
    try {
      if (creation) {
        const c = await api.post<Categorie>('/categories', { ...corps(v, !!creation.parent), code: v.code || codeFromLabel(v.libelle_fr) });
        message.success(t('common.saved'));
        setCreation(null);
        await load();
        ouvrir(c);
      } else if (current) {
        const c = await api.put<Categorie>(`/categories/${current.id}`, corps(v, current.niveau === 'nature'));
        message.success(t('common.saved'));
        setCurrent(c);
        await load();
      }
    } catch (e) { fail(e); }
  };
  const desactiver = async () => {
    if (!current || !motif.trim()) return;
    try { setCurrent(await api.del<Categorie>(`/categories/${current.id}`, { motif: motif.trim() })); setMotif(''); await load(); } catch (e) { fail(e); }
  };
  const reactiver = async () => {
    if (!current) return;
    try { setCurrent(await api.put<Categorie>(`/categories/${current.id}`, { is_active: 1 })); await load(); } catch (e) { fail(e); }
  };

  const nature = creation ? !!creation.parent : current?.niveau === 'nature';
  const ouvert = !!current || !!creation;
  const statut = (c: Categorie) => (c.is_active ? <Tag color="green">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>);
  const validationTag = (v: number) => (v ? <Tag color="purple">{t('ref.cat.validation.chef')}</Tag> : <Tag>{t('ref.cat.validation.directe')}</Tag>);

  const lignes = arbre.map((d) => ({ ...d, children: d.natures && d.natures.length ? d.natures : undefined }));

  return (
    <div className="ref-grille-cat">
      <Card title={t('ref.cat.arbre')} size="small">
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.cat.intro')}</Typography.Paragraph>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Space>
            <Switch checked={inactifs} onChange={setInactifs} aria-label={t('ref.cat.inactifs')} />
            <span>{t('ref.cat.inactifs')}</span>
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => nouveau(null)}>{t('ref.cat.nouveau_domaine')}</Button>
        </div>
        <Table<Categorie> rowKey="id" size="small" loading={loading} dataSource={lignes} pagination={false}
          scroll={{ x: 'max-content' }} locale={{ emptyText: t('common.nodata') }} expandable={{ defaultExpandAllRows: false }}
          onRow={(r) => ({ onClick: () => ouvrir(r), style: { cursor: 'pointer' } })}
          columns={[
            { title: t('ref.cat.libelle'), key: 'libelle', render: (_, c) => <Space><Icone code={c.icone} />{lbl(c)}</Space> },
            { title: t('ref.cat.priorite'), key: 'prio', render: (_, c) => <PrioriteTag code={c.priorite_effective} priorites={priorites} /> },
            ...(simple ? [] : [
              { title: t('ref.cat.validation'), key: 'validation', render: (_: unknown, c: Categorie) => validationTag(c.validation_effective) },
              { title: t('ref.cat.delai'), key: 'delai', render: (_: unknown, c: Categorie) => (c.delai_fin_jours_effectif ? `${c.delai_fin_jours_effectif} ${t('ref.unite.jours_ouvrables')}` : '') },
              { title: t('ref.cat.code'), dataIndex: 'code', key: 'code' },
            ]),
            { title: t('common.status'), key: 'statut', render: (_, c) => statut(c), width: 110 },
          ]} />
      </Card>
      <Tuiles arbre={actifs} />

      <Drawer open={ouvert} width="min(520px, 100vw)" destroyOnClose onClose={() => { setCurrent(null); setCreation(null); }}
        title={creation ? (creation.parent ? `${t('ref.cat.nouvelle_nature')} · ${lbl(creation.parent)}` : t('ref.cat.nouveau_domaine')) : current ? lbl(current) : ''}>
        {current && (
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label={t('ref.cat.niveau')}>{t(`ref.cat.niveau.${current.niveau}`)}</Descriptions.Item>
            <Descriptions.Item label={t('common.status')}>{statut(current)}</Descriptions.Item>
            <Descriptions.Item label={t('ref.cat.en_vigueur')}>
              <Space wrap><PrioriteTag code={current.priorite_effective} priorites={priorites} />{validationTag(current.validation_effective)}</Space>
            </Descriptions.Item>
            <Descriptions.Item label={t('ref.cat.code')}>{current.code}</Descriptions.Item>
            {current.motif_desactivation && <Descriptions.Item label={t('common.reason')}>{current.motif_desactivation}</Descriptions.Item>}
          </Descriptions>
        )}
        {current && <Typography.Paragraph style={{ fontSize: 12, marginTop: -8 }}><TraceFiche trace={current.trace} /></Typography.Paragraph>}
        {ouvert && (
          <Form key={current?.id ?? `new-${creation?.parent?.id ?? 0}`} form={form} layout="vertical" onFinish={enregistrer} preserve={false}
            initialValues={valeurs(current, creation?.parent ?? null)} disabled={!!current && !current.is_active}>
            <Form.Item name="libelle_fr" label={t('ref.cat.libelle_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
            <Form.Item name="libelle_nl" label={t('ref.cat.libelle_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
            {creation && !simple && (
              <Form.Item name="code" label={t('ref.cat.code')} extra={t('listes.field.code.help')} rules={[{ pattern: /^[a-z][a-z0-9_]{1,39}$/, message: t('listes.field.code.help') }]}>
                <Input maxLength={40} autoComplete="off" />
              </Form.Item>
            )}
            {nature && current && (
              <Form.Item name="parent_id" label={t('ref.cat.domaine')} extra={t('ref.cat.domaine.help')}>
                <Select showSearch optionFilterProp="label" aria-label={t('ref.cat.domaine')}
                  options={domainesActifs.map((d) => ({ value: d.id, label: lbl(d) }))} />
              </Form.Item>
            )}
            <Form.Item name="icone" label={t('ref.cat.icone')}>
              <Radio.Group className="ref-icones" aria-label={t('ref.cat.icone')}>
                {ICONE_CODES.map((c) => (
                  <Radio.Button key={c} value={c} aria-label={t(`ref.icone.${c}`)} title={t(`ref.icone.${c}`)}><Icone code={c} /></Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
            <Form.Item name="priorite_defaut" label={t('ref.cat.priorite')} extra={t('ref.cat.priorite.help')}>
              <Radio.Group optionType="button" aria-label={t('ref.cat.priorite')}
                options={[...(nature ? [{ value: HERITE, label: t('ref.cat.herite') }] : []), ...PRIORITES.map((p) => ({ value: p, label: p }))]} />
            </Form.Item>
            <Form.Item name="validation" label={t('ref.cat.validation')} extra={t('ref.cat.validation.help')}>
              <Radio.Group optionType="button" aria-label={t('ref.cat.validation')}
                options={[...(nature ? [{ value: HERITE, label: t('ref.cat.herite') }] : []),
                  { value: '0', label: t('ref.cat.validation.directe') }, { value: '1', label: t('ref.cat.validation.chef') }]} />
            </Form.Item>
            <Form.Item name="delai_fin_jours" label={t('ref.cat.delai')} extra={t('ref.cat.delai.help')}>
              <InputNumber min={1} max={365} style={{ width: 160 }} />
            </Form.Item>
            {!simple && <Form.Item name="ordre" label={t('listes.field.ordre')} extra={t('listes.field.ordre.help')}><InputNumber min={0} max={100000} step={10} /></Form.Item>}
            <Space wrap>
              <Button type="primary" htmlType="submit">{t('common.save')}</Button>
              {current && current.niveau === 'domaine' && current.is_active === 1 && (
                <Button icon={<PlusOutlined />} onClick={() => nouveau(current)} disabled={false}>{t('ref.cat.nouvelle_nature')}</Button>
              )}
            </Space>
          </Form>
        )}
        {current && (
          <QuestionsFiche key={current.id} categorie={current} onChange={load}
            heritees={(arbre.flatMap((d) => d.natures || []).find((n) => n.id === current.id)?.questions || []).filter((q) => q.origine === 'domaine')} />
        )}
        {current && (current.is_active ? (
          <Card size="small" style={{ marginTop: 24 }} title={t('ref.cat.desactiver')}>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.cat.desactiver.help')}</Typography.Paragraph>
            <Input.TextArea rows={2} aria-label={t('listes.motif')} placeholder={t('listes.motif')} value={motif} onChange={(e) => setMotif(e.target.value)}
              aria-invalid={seulementEspaces(motif) || undefined} aria-describedby={seulementEspaces(motif) ? 'motif-cat-erreur' : undefined} />
            {seulementEspaces(motif) && <ErreurObligatoire id="motif-cat-erreur" />}
            <Popconfirm title={t('ref.cat.desactiver.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={desactiver} disabled={!motif.trim()}>
              <Button danger style={{ marginTop: 8 }} disabled={!motif.trim()}>{t('ref.cat.desactiver')}</Button>
            </Popconfirm>
          </Card>
        ) : (
          <Button style={{ marginTop: 24 }} onClick={reactiver}>{t('ref.cat.reactiver')}</Button>
        ))}
      </Drawer>
    </div>
  );
}

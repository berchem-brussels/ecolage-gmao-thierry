/**
 * Liste du service technique (version 0.9.0, étape 8 ; cahier des charges GES-01, GES-02, GES-04, PRI-01, PRI-03 ;
 * DV-88 à DV-93). Remplace la liste en lecture de la 0.5.0 (« Demandes de l'entité »).
 * - Tableau de bord en tête : quatre compteurs, chacun ouvre la liste filtrée.
 * - Filtres gardés dans l'adresse de la page : en cours ou toutes, échéance (en retard, dans les deux jours ouvrés,
 *   sans échéance), états, priorités, catégorie (un domaine compte ses natures), bâtiment (un site compte ses
 *   bâtiments), source, danger, recherche (numéro, description, lieu, demandeur). Tri par colonne : numéro, dépôt,
 *   priorité, échéance. Sans filtre d'état dans l'adresse, les demandes en cours.
 * - Vues enregistrées par personne : choisir une vue applique ses filtres ; « Enregistrer la vue » garde les filtres
 *   du moment sous un nom ; « Supprimer la vue » la retire.
 * - Fiche latérale (adresse ?demande=id) avec les échéances, la qualification et le bouton « Qualifier » pour qui a la
 *   permission « demandes:qualifier ».
 * Choix exclusifs en boutons ; listes déroulantes réservées aux choix multiples et à la recherche dans un catalogue
 * (standard, section 12.4). Sur téléphone, une carte par demande ; les filtres s'y replient sous « Filtres et vues ».
 * Colonnes : numéro, priorité, état et échéance d'abord, pour qu'ils restent visibles sans défiler.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Collapse, Drawer, Grid, Input, List, Modal, Popconfirm, Radio, Select, Space, Table, Tag, TreeSelect, Typography, message } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { ClearOutlined, DeleteOutlined, EditOutlined, SaveOutlined, WarningOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api, { ApiError, qs } from '../api';
import TableauBord from '../components/demandes/TableauBord';
import QualificationForm from '../components/demandes/QualificationForm';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { Icone, PRIORITES, type ArbreCategories, type Categorie } from '../referentiel';
import type { Lieu } from '../lieux';
import { flatten } from '../lieux';
import { hasPermission, useRoles } from '../useRoles';
import {
  CANAUX, CLES_FILTRES, ETATS, QUALIFIABLES, type Demande, type FiltresGestion, type VueDemandes,
  cheminTexte, dateDepot, extrait, filtresDepuisUrl, instant,
} from '../demandes';
import { DangerTag, EtatTag, FicheDemande } from './DemandesPage';

const TAILLE = 20;
const COULEUR_PRIO: Record<string, string> = { P1: 'red', P2: 'volcano', P3: 'blue', P4: 'default' };

/** Étiquette de priorité : le code dit la priorité, la couleur l'appuie. */
export function PrioriteTag({ p }: { p: string | null }) {
  return p ? <Tag color={COULEUR_PRIO[p] || 'default'} style={{ marginInlineEnd: 0 }}>{p}</Tag> : null;
}

/** Échéance qui compte, avec « En retard » en mots et en rouge (PRI-03). */
export function EcheanceCell({ d }: { d: Demande }) {
  const { t } = useI18n();
  if (!d.echeance_courante) return <Typography.Text type="secondary">{d.ouverte ? t('gest.echeance.aucune') : '—'}</Typography.Text>;
  return (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t(`gest.echeance.${d.echeance_type}`)}</Typography.Text>
      <div className={d.retard ? 'dem-retard' : undefined}>{d.retard ? <WarningOutlined aria-hidden /> : null} {instant(d.echeance_courante)}</div>
      {d.retard ? <Tag color="red" style={{ marginInlineEnd: 0 }}>{t('gest.retard')}</Tag> : null}
    </div>
  );
}

export default function GestionDemandesPage() {
  const { t, lang } = useI18n();
  const { user, roles } = useAuth();
  const catalogue = useRoles();
  const peutQualifier = hasPermission(catalogue, roles, 'demandes:qualifier');
  const mobile = Grid.useBreakpoint().md === false;
  const [params, setParams] = useSearchParams();
  const f = useMemo(() => filtresDepuisUrl(params), [params]);
  const page = Number(params.get('page') || 1);
  const vueId = params.get('vue') ? Number(params.get('vue')) : null;
  const [rows, setRows] = useState<Demande[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fiche, setFiche] = useState<Demande | null>(null);
  const [qualifier, setQualifier] = useState(false);
  const [arbre, setArbre] = useState<Categorie[]>([]);
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [vues, setVues] = useState<VueDemandes[]>([]);
  const [nomVue, setNomVue] = useState<string | null>(null);
  const [q, setQ] = useState(f.q || '');
  /** R1 (0.9.1, DV-94) : augmenté après une qualification pour recharger les compteurs du tableau de bord. */
  const [bordAJour, setBordAJour] = useState(0);

  /** Change des filtres dans l'adresse ; revient à la première page ; une vue choisie ne s'applique plus telle quelle. */
  const changer = (patch: Partial<Record<keyof FiltresGestion | 'page' | 'vue' | 'demande', string | number | undefined>>, garderVue = false) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v === undefined || v === '') p.delete(k); else p.set(k, String(v)); }
    if (!('page' in patch)) p.delete('page');
    if (!garderVue && !('vue' in patch)) p.delete('vue');
    setParams(p, { replace: true });
  };

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.page<Demande>(`/demandes${qs({ perimetre: 'entite', ...f, limit: TAILLE, offset: (page - 1) * TAILLE } as Record<string, string | number | undefined>)}`);
      setRows(r.data);
      setTotal(r.pagination.total);
    } catch { setRows([]); setTotal(0); } finally { setLoading(false); }
  }, [f, page]);
  useEffect(() => { charger(); }, [charger, user?.entite_active_id]);

  const chargerVues = useCallback(() => {
    api.page<VueDemandes>(`/vues-demandes${qs({ limit: 50 })}`).then((r) => setVues(r.data)).catch(() => setVues([]));
  }, []);
  useEffect(() => {
    chargerVues();
    api.get<ArbreCategories>('/categories/arbre').then((r) => setArbre(r.domaines || [])).catch(() => setArbre([]));
    api.get<{ racines: Lieu[] }>('/lieux/arbre').then((r) => setLieux(flatten(r.racines || []))).catch(() => setLieux([]));
  }, [user?.entite_active_id, chargerVues]);

  const ouverte = params.get('demande');
  const chargerFiche = useCallback(() => {
    if (!ouverte) { setFiche(null); setQualifier(false); return; }
    api.get<Demande>(`/demandes/${ouverte}`).then(setFiche).catch(() => setFiche(null));
  }, [ouverte]);
  useEffect(() => { chargerFiche(); }, [chargerFiche]);
  const ouvrir = (d: Demande) => changer({ demande: d.id }, true);
  const fermer = () => { setQualifier(false); changer({ demande: undefined }, true); };

  const lbl = (o: { libelle_fr: string; libelle_nl: string }) => (lang === 'nl' ? o.libelle_nl : o.libelle_fr);
  const nom = (o: { nom_fr: string; nom_nl: string }) => (lang === 'nl' ? o.nom_nl : o.nom_fr);
  const arbreSelect = useMemo(() => arbre.map((dom) => ({ value: dom.id, title: lbl(dom), children: (dom.natures || []).map((n) => ({ value: n.id, title: lbl(n) })) })), [arbre, lang]);
  const batiments = useMemo(() => lieux.filter((l) => l.nature === 'site' || l.nature === 'batiment').map((l) => ({ value: l.id, label: `${nom(l)} (${l.code})` })), [lieux, lang]);
  const vue = vues.find((v) => v.id === vueId) || null;
  const nbFiltres = CLES_FILTRES.filter((k) => !['tri', 'ordre', 'ouvertes'].includes(k) && f[k] !== undefined).length;

  const appliquerVue = (id: number | undefined) => {
    const v = vues.find((x) => x.id === id);
    const p = new URLSearchParams();
    if (v) {
      for (const [k, val] of Object.entries(v.filtres)) if (val !== undefined && val !== null && val !== '') p.set(k, String(val));
      if (v.filtres.ouvertes === undefined) p.set('ouvertes', 'tout');
      p.set('vue', String(v.id));
    }
    setQ(v?.filtres.q || '');
    setParams(p, { replace: true });
  };
  const filtresCourants = (): FiltresGestion => {
    const out: Record<string, unknown> = {};
    for (const k of CLES_FILTRES) if (f[k] !== undefined) out[k] = f[k];
    return out as FiltresGestion;
  };
  const enregistrerVue = async () => {
    const n = (nomVue || '').trim();
    if (!n) return;
    try {
      const v = await api.post<VueDemandes>('/vues-demandes', { nom: n, filtres: filtresCourants() });
      message.success(t('gest.vue.enregistree'));
      setNomVue(null);
      chargerVues();
      changer({ vue: v.id }, true);
    } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
  };
  const mettreAJourVue = async () => {
    if (!vue) return;
    try {
      await api.put<VueDemandes>(`/vues-demandes/${vue.id}`, { filtres: filtresCourants() });
      message.success(t('gest.vue.maj'));
      chargerVues();
    } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
  };
  const supprimerVue = async () => {
    if (!vue) return;
    try {
      await api.del(`/vues-demandes/${vue.id}`);
      message.success(t('gest.vue.supprimee'));
      chargerVues();
      changer({ vue: undefined }, true);
    } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
  };

  const ordre = (cle: string) => (f.tri === cle ? (f.ordre === 'asc' ? 'ascend' : f.ordre === 'desc' ? 'descend' : (cle === 'depot' || cle === 'numero' ? 'descend' : 'ascend')) : null);
  const surTri = (s: SorterResult<Demande> | SorterResult<Demande>[]) => {
    const x = Array.isArray(s) ? s[0] : s;
    if (!x || !x.order) { changer({ tri: undefined, ordre: undefined }, true); return; }
    changer({ tri: String(x.columnKey), ordre: x.order === 'ascend' ? 'asc' : 'desc' }, true);
  };
  const ouvertesValeur = f.ouvertes === 1 ? '1' : f.ouvertes === 0 ? '0' : 'tout';
  const cat = (d: Demande) => (lang === 'nl' ? d.categorie_libelle_nl : d.categorie_libelle_fr);
  const lieu = (d: Demande) => (lang === 'nl' ? d.lieu_nom_nl : d.lieu_nom_fr);
  const etatsServices = ETATS.filter((e) => e !== 'brouillon').map((e) => ({ value: e, label: t(`demande.etat_service.${e}`) }));

  const filtres = (
    <>
        <div className="gest-filtres">
          <Select<number> allowClear showSearch optionFilterProp="label" aria-label={t('gest.vue')} placeholder={t('gest.vue.choisir')}
            value={vue?.id} onChange={appliquerVue} options={vues.map((v) => ({ value: v.id, label: v.nom }))} style={{ minWidth: 220 }} />
          <Button icon={<SaveOutlined />} onClick={() => setNomVue('')}>{t('gest.vue.enregistrer')}</Button>
          {vue && <Button icon={<EditOutlined />} onClick={mettreAJourVue}>{t('gest.vue.maj.bouton')}</Button>}
          {vue && (
            <Popconfirm title={t('gest.vue.supprimer.confirme').replace('{nom}', vue.nom)} okText={t('gest.vue.supprimer')} cancelText={t('common.cancel')} onConfirm={supprimerVue}>
              <Button danger icon={<DeleteOutlined />}>{t('gest.vue.supprimer')}</Button>
            </Popconfirm>
          )}
          {(nbFiltres > 0 || vue) && <Button icon={<ClearOutlined />} onClick={() => { setQ(''); setParams(new URLSearchParams(), { replace: true }); }}>{t('gest.filtres.effacer')}</Button>}
        </div>
        <div className="gest-filtres">
          <Radio.Group optionType="button" aria-label={t('demande.filtre')} value={ouvertesValeur} onChange={(e) => changer({ ouvertes: e.target.value })}
            options={[{ value: '1', label: t('demande.filtre.ouvertes') }, { value: 'tout', label: t('demande.filtre.toutes') }, { value: '0', label: t('demande.filtre.closes') }]} />
          <Radio.Group optionType="button" aria-label={t('gest.filtre.echeance')} value={f.echeance || ''} onChange={(e) => changer({ echeance: e.target.value || undefined })}
            options={[{ value: '', label: t('gest.echeance.toutes') }, { value: 'retard', label: t('gest.echeance.retard') }, { value: 'proche', label: t('gest.echeance.proche') }, { value: 'sans', label: t('gest.echeance.sans') }]} />
          <Input.Search allowClear aria-label={t('demande.chercher')} placeholder={t('gest.chercher.placeholder')} style={{ width: mobile ? '100%' : 280 }}
            value={q} onChange={(e) => setQ(e.target.value)} onSearch={(v) => changer({ q: v.trim() || undefined })} />
        </div>
        <div className="gest-filtres">
          <Select<string[]> mode="multiple" allowClear aria-label={t('gest.filtre.etats')} placeholder={t('gest.filtre.etats')} maxTagCount="responsive"
            value={f.etats ? f.etats.split(',') : []} onChange={(v) => changer({ etats: v.join(',') || undefined })} options={etatsServices} optionFilterProp="label" />
          <Select<string[]> mode="multiple" allowClear aria-label={t('gest.filtre.priorites')} placeholder={t('gest.filtre.priorites')}
            value={f.priorites ? f.priorites.split(',') : []} onChange={(v) => changer({ priorites: v.join(',') || undefined })} options={PRIORITES.map((p) => ({ value: p, label: p }))} />
          <TreeSelect<number> allowClear showSearch treeNodeFilterProp="title" aria-label={t('gest.filtre.categorie')} placeholder={t('gest.filtre.categorie')}
            value={f.categorie_id} onChange={(v) => changer({ categorie_id: v })} treeData={arbreSelect} style={{ minWidth: 220 }} />
          <Select<number> allowClear showSearch optionFilterProp="label" aria-label={t('gest.filtre.batiment')} placeholder={t('gest.filtre.batiment')}
            value={f.batiment_id} onChange={(v) => changer({ batiment_id: v })} options={batiments} style={{ minWidth: 220 }} />
        </div>
        <Collapse ghost size="small" items={[{ key: 'plus', label: t('gest.filtres.plus'), children: (
          <div className="gest-filtres">
            <Radio.Group optionType="button" aria-label={t('gest.filtre.canal')} value={f.canal || ''} onChange={(e) => changer({ canal: e.target.value || undefined })}
              options={[{ value: '', label: t('gest.canal.tous') }, ...CANAUX.map((c) => ({ value: c, label: t(`gest.canal.${c}`) }))]} />
            <Radio.Group optionType="button" aria-label={t('gest.filtre.danger')} value={f.danger === undefined ? '' : String(f.danger)} onChange={(e) => changer({ danger: e.target.value === '' ? undefined : e.target.value })}
              options={[{ value: '', label: t('gest.danger.tous') }, { value: '1', label: t('gest.danger.oui') }, { value: '0', label: t('gest.danger.non') }]} />
          </div>
        ) }]} />
    </>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0 }}>{t('demande.entite.title')}</Typography.Title>
      </div>
      <Typography.Paragraph type="secondary">{t('gest.intro')}</Typography.Paragraph>
      <div style={{ marginBottom: 16 }}><TableauBord titre={false} rafraichir={bordAJour} /></div>

      <Card size="small" style={{ marginBottom: 12 }}>
        {mobile ? (
          <Collapse ghost size="small" items={[{ key: 'filtres', label: `${t('gest.filtres')}${nbFiltres ? ` (${nbFiltres})` : ''}${vue ? ` · ${vue.nom}` : ''}`, children: filtres }]} />
        ) : filtres}
      </Card>
      <Typography.Paragraph type="secondary" aria-live="polite" style={{ marginBottom: 8 }}>{t(total === 1 ? 'gest.total.un' : 'gest.total').replace('{n}', String(total))}</Typography.Paragraph>

      {mobile ? (
        <List<Demande> loading={loading} dataSource={rows} locale={{ emptyText: t('gest.vide') }}
          pagination={total > TAILLE ? { current: page, pageSize: TAILLE, total, onChange: (p) => changer({ page: p }, true), size: 'small' } : false}
          renderItem={(d) => (
            <List.Item style={{ padding: '6px 0' }}>
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                    <Button type="link" onClick={() => ouvrir(d)} style={{ paddingInline: 0, fontWeight: 600 }}>{d.numero}</Button>
                    <Space size={4} wrap>{d.danger === 1 && <DangerTag />}<PrioriteTag p={d.priorite} /><EtatTag etat={d.etat} service /></Space>
                  </Space>
                  <Typography.Text><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{lieu(d)} · {dateDepot(d.created_at)}</Typography.Text>
                  <Typography.Text style={{ fontSize: 13 }}>{`${d.demandeur_prenom} ${d.demandeur_nom}`}</Typography.Text>
                  <EcheanceCell d={d} />
                </Space>
              </Card>
            </List.Item>
          )} />
      ) : (
        <Table<Demande> rowKey="id" size="middle" loading={loading} dataSource={rows} locale={{ emptyText: t('gest.vide') }}
          scroll={{ x: 'max-content' }} onChange={(_p, _f, s) => surTri(s)}
          pagination={total > TAILLE ? { current: page, pageSize: TAILLE, total, onChange: (p) => changer({ page: p }, true), showSizeChanger: false } : false}
          rowClassName={(d) => (d.ouverte ? '' : 'dem-close')}
          columns={[
            { title: t('demande.champ.numero'), key: 'numero', sorter: true, sortOrder: ordre('numero'), showSorterTooltip: false,
              render: (_, d) => <Button type="link" onClick={() => ouvrir(d)} style={{ paddingInline: 0 }}>{d.numero}</Button> },
            { title: t('gest.col.priorite'), key: 'priorite', sorter: true, sortOrder: ordre('priorite'), showSorterTooltip: false,
              render: (_, d) => <Space size={4} wrap>{d.danger === 1 && <DangerTag />}<PrioriteTag p={d.priorite} /></Space> },
            { title: t('demande.champ.etat'), key: 'etat', render: (_, d) => <EtatTag etat={d.etat} service /> },
            { title: t('gest.col.echeance'), key: 'echeance', sorter: true, sortOrder: ordre('echeance'), showSorterTooltip: false, render: (_, d) => <EcheanceCell d={d} /> },
            { title: t('demande.champ.quoi'), key: 'quoi', render: (_, d) => (
              <div style={{ maxWidth: 320 }}>
                <div><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }} lang={d.langue}>{extrait(d.description, 70)}</Typography.Text>
              </div>
            ) },
            { title: t('demande.champ.ou'), key: 'ou', render: (_, d) => (
              <div>
                <div>{lieu(d)}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{cheminTexte(d.lieu_chemin.slice(0, -1), lang)}</Typography.Text>
              </div>
            ) },
            { title: t('demande.champ.demandeur'), key: 'demandeur', render: (_, d) => `${d.demandeur_prenom} ${d.demandeur_nom}` },
            { title: t('demande.champ.depot'), key: 'depot', sorter: true, sortOrder: ordre('depot'), showSorterTooltip: false, render: (_, d) => dateDepot(d.created_at) },
          ]} />
      )}

      <Drawer open={!!fiche} onClose={fermer} width={mobile ? '100%' : 560}
        title={fiche ? `${qualifier ? t('qualif.titre') : t('demande.fiche')} ${fiche.numero}` : ''}
        extra={fiche && !qualifier && peutQualifier && QUALIFIABLES.includes(fiche.etat)
          ? <Button type="primary" onClick={() => setQualifier(true)}>{fiche.etat === 'a_qualifier' ? t('qualif.bouton') : t('qualif.bouton.modifier')}</Button> : null}>
        {fiche && (qualifier
          ? <QualificationForm d={fiche} onCancel={() => setQualifier(false)} onDone={(d) => { setFiche(d); setQualifier(false); charger(); setBordAJour((n) => n + 1); }} />
          : <FicheDemande d={fiche} avecDemandeur service onChange={chargerFiche} />)}
      </Drawer>

      <Modal open={nomVue !== null} title={t('gest.vue.enregistrer')} onCancel={() => setNomVue(null)} onOk={enregistrerVue}
        okText={t('common.save')} cancelText={t('common.cancel')} okButtonProps={{ disabled: !(nomVue || '').trim() }}>
        <Typography.Paragraph type="secondary">{t('gest.vue.aide')}</Typography.Paragraph>
        <Input aria-label={t('gest.vue.nom')} placeholder={t('gest.vue.nom')} maxLength={60} value={nomVue || ''} onChange={(e) => setNomVue(e.target.value)} onPressEnter={enregistrerVue} />
      </Modal>
    </div>
  );
}

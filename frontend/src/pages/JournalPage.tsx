/**
 * Journal d'audit (administrateur ; standard v3.2, sections 15.8 et 17.3 ; écart E-12) : qui a fait quoi, quand, dans
 * quelle entité et par quel canal. Lecture seule. Filtres par action, personne, entité, canal et période, gardés dans
 * l'adresse de la page (standard section 12.9). Les dates de la base sont en UTC et s'affichent à l'heure locale.
 * Mode Simple : date, personne, action, entité ; mode Complet : objet et canal en plus. Détail en dépliant la ligne.
 * Sous 768 px, une seule colonne empile date, personne, action et entité (standard section 12.3).
 * Noms (0.7.4, DV-50) : un lieu ou une catégorie désigné par son identifiant s'affiche par son code et son nom dans la
 * langue de l'écran, l'identifiant entre parenthèses ; les noms viennent du serveur (« noms », par chemin du détail). Une
 * valeur composée (avant, après) s'affiche champ par champ au lieu du texte JSON.
 * 0.7.5 (DV-76) : une case à cocher (danger, actif, obligatoire…) s'affiche « Oui » ou « Non » au lieu de 1 ou 0 ; un
 * champ vide est masqué, sauf « Avant » et « Après », où le vide se dit « aucun ».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Descriptions, Grid, Radio, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { translations } from '../i18n';

interface Ligne {
  id: number; created_at: string; action: string; entity_type: string | null; entity_id: number | null; channel: string;
  details: Record<string, unknown> | null; entite_id: number | null; entite_code: string | null;
  user_id: number | null; user_email: string | null; user_first_name: string | null; user_last_name: string | null;
  noms?: Record<string, Nom>;
}
/** Lieu ou catégorie nommé par le serveur ; introuvable si l'identifiant ne correspond plus à aucune fiche. */
interface Nom { type: 'lieu' | 'categorie'; id: number; code?: string; nom_fr?: string; nom_nl?: string; entite_code?: string | null; introuvable?: number }
interface Personne { id: number; email: string; first_name: string; last_name: string }
interface Entite { id: number; code: string; nom_fr: string; nom_nl: string }

const PAGE = 50;
/** Champs du détail qui valent 0 ou 1 (cases à cocher) ; « reponses » est un nombre et n'en fait pas partie. */
const BOOLEENS = new Set(['danger', 'beneficiaire_texte', 'is_active', 'obligatoire', 'remarque', 'brouillon']);
const VIDE_DIT = new Set(['avant', 'apres']);
const vide = (v: unknown) => v === null || v === undefined || v === '';
/** Date de la base (UTC, « 2026-10-22 08:00:00 ») vers l'heure locale. */
export const depuisBase = (d: string) => dayjs(`${d.replace(' ', 'T')}Z`);

export default function JournalPage() {
  const { t, tField } = useI18n();
  const { user } = useAuth();
  const simple = user?.ui_mode !== 'complet';
  // Grid.useBreakpoint() est vide au premier rendu : on attend la vraie valeur (piège SAGA 84).
  const mobile = Grid.useBreakpoint().md === false;
  const [search, setSearch] = useSearchParams();
  const [rows, setRows] = useState<Ligne[]>([]);
  const [total, setTotal] = useState(0);
  const [actions, setActions] = useState<string[]>([]);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [entites, setEntites] = useState<Entite[]>([]);
  const [loading, setLoading] = useState(false);

  const f = useMemo(() => ({
    action: search.get('action') || undefined,
    user_id: search.get('personne') || undefined,
    entite_id: search.get('entite') || undefined,
    channel: search.get('canal') || '',
    du: search.get('du') || undefined,
    au: search.get('au') || undefined,
    page: Number(search.get('page') || 1),
  }), [search]);

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(search);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!('page' in patch)) next.delete('page');
    setSearch(next, { replace: true });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.page<Ligne>(`/audit${qs({
        limit: PAGE, offset: (f.page - 1) * PAGE, action: f.action, user_id: f.user_id, entite_id: f.entite_id, channel: f.channel || undefined,
        du: f.du ? dayjs(f.du).startOf('day').toISOString() : undefined, au: f.au ? dayjs(f.au).endOf('day').toISOString() : undefined,
      })}`);
      setRows(r.data);
      setTotal(r.pagination.total);
      setActions((r.meta?.actions as string[] | undefined) || []);
    } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); } finally { setLoading(false); }
  }, [f, t]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.page<Personne>(`/users${qs({ limit: 200 })}`).then((r) => setPersonnes(r.data)).catch(() => setPersonnes([]));
    api.page<Entite>(`/entites${qs({ limit: 200 })}`).then((r) => setEntites(r.data)).catch(() => setEntites([]));
  }, []);

  /** Libellé d'une action : traduction connue, sinon le code tel quel (une action nouvelle reste lisible). */
  const libelle = (a: string) => (translations[`audit.action.${a}`] ? t(`audit.action.${a}`) : a);
  const familles = useMemo(() => [...new Set(actions.map((a) => a.split('.')[0]))], [actions]);
  const actionOptions = [
    ...familles.map((fam) => ({ value: fam, label: `${translations[`audit.famille.${fam}`] ? t(`audit.famille.${fam}`) : fam} (${t('audit.toutes')})` })),
    ...actions.map((a) => ({ value: a, label: libelle(a) })),
  ];
  const personne = (l: Ligne) => (l.user_id ? `${l.user_first_name ?? ''} ${l.user_last_name ?? ''}`.trim() || l.user_email || `#${l.user_id}` : t('audit.systeme'));
  const canal = (c: string) => <Tag>{translations[`audit.canal.${c}`] ? t(`audit.canal.${c}`) : c}</Tag>;
  const cleDetail = (k: string) => (translations[`audit.detail.${k}`] ? t(`audit.detail.${k}`) : k);
  const brut = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const nomme = (n: Nom) => (n.introuvable
    ? `#${n.id} (${t('audit.introuvable')})`
    : `${n.code} — ${tField(n as unknown as Record<string, unknown>, 'nom')} (#${n.id})`);
  /** Valeur d'un champ du détail : nom si le serveur l'a trouvé, champ par champ pour un objet, sinon le texte brut. */
  const valeur = (l: Ligne, chemin: string, v: unknown): string => {
    const n = l.noms?.[chemin];
    if (n) return nomme(n);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${cleDetail(k)} : ${valeur(l, `${chemin}.${k}`, x)}`).join(' · ');
    }
    const cle = chemin.split('.').pop() || '';
    if (BOOLEENS.has(cle) && (v === 0 || v === 1 || typeof v === 'boolean')) return t(v ? 'yes' : 'no');
    if (vide(v)) return t('audit.aucun');
    return brut(v);
  };
  /** Champs affichés d'une ligne : les champs vides sont masqués, sauf « Avant » et « Après ». */
  const champs = (l: Ligne) => Object.entries(l.details || {}).filter(([k, v]) => !vide(v) || VIDE_DIT.has(k));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{t('audit.title')}</Typography.Title>
      </div>
      <Typography.Paragraph type="secondary">{t('audit.intro')}</Typography.Paragraph>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap size={[12, 12]} style={{ width: '100%' }}>
          <Select allowClear showSearch optionFilterProp="label" style={{ minWidth: 240, maxWidth: '100%' }} aria-label={t('audit.filtre.action')}
            placeholder={t('audit.filtre.action')} value={f.action} options={actionOptions} onChange={(v) => set({ action: v })} />
          <Select allowClear showSearch optionFilterProp="label" style={{ minWidth: 220, maxWidth: '100%' }} aria-label={t('audit.filtre.personne')}
            placeholder={t('audit.filtre.personne')} value={f.user_id ? Number(f.user_id) : undefined}
            options={personnes.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name} (${p.email})` }))} onChange={(v) => set({ personne: v ? String(v) : undefined })} />
          <Select allowClear showSearch optionFilterProp="label" style={{ minWidth: 160, maxWidth: '100%' }} aria-label={t('audit.filtre.entite')}
            placeholder={t('audit.filtre.entite')} value={f.entite_id ? Number(f.entite_id) : undefined}
            options={entites.map((e) => ({ value: e.id, label: `${e.code} · ${tField(e as unknown as Record<string, unknown>, 'nom')}` }))} onChange={(v) => set({ entite: v ? String(v) : undefined })} />
          <DatePicker.RangePicker aria-label={t('audit.filtre.periode')} format="L" allowEmpty={[true, true]}
            value={[f.du ? dayjs(f.du) : null, f.au ? dayjs(f.au) : null]}
            onChange={(v) => set({ du: v?.[0] ? (v[0] as Dayjs).format('YYYY-MM-DD') : undefined, au: v?.[1] ? (v[1] as Dayjs).format('YYYY-MM-DD') : undefined })} />
          <Radio.Group optionType="button" value={f.channel} onChange={(e) => set({ canal: e.target.value || undefined })}
            options={[{ value: '', label: t('common.all') }, ...['api', 'mcp', 'cli'].map((c) => ({ value: c, label: t(`audit.canal.${c}`) }))]} />
          <Button icon={<ClearOutlined />} onClick={() => setSearch({}, { replace: true })}>{t('audit.filtre.effacer')}</Button>
        </Space>
      </Card>
      <Card>
        <Table<Ligne> rowKey="id" size="middle" loading={loading} dataSource={rows} scroll={mobile ? undefined : { x: 'max-content' }}
          locale={{ emptyText: t('audit.vide') }}
          pagination={{ current: f.page, pageSize: PAGE, total, showSizeChanger: false, onChange: (p) => set({ page: p > 1 ? String(p) : undefined }) }}
          expandable={{
            columnTitle: <span className="sr-only">{t('audit.col.detail')}</span>,
            rowExpandable: (l) => champs(l).length > 0,
            expandedRowRender: (l) => (
              <Descriptions size="small" column={1} bordered>
                {champs(l).map(([k, v]) => <Descriptions.Item key={k} label={cleDetail(k)}>{valeur(l, k, v)}</Descriptions.Item>)}
              </Descriptions>
            ),
          }}
          columns={mobile ? [
            { title: t('audit.col.action'), key: 'tout', render: (_, l) => (
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{libelle(l.action)}{l.entite_code ? ` · ${l.entite_code}` : ''}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{depuisBase(l.created_at).format('L LTS')} · {personne(l)}</Typography.Text>
              </div>
            ) },
          ] : [
            { title: t('audit.col.date'), key: 'date', render: (_, l) => depuisBase(l.created_at).format('L LTS'), width: 170 },
            { title: t('audit.col.personne'), key: 'personne', render: (_, l) => personne(l) },
            { title: t('audit.col.action'), key: 'action', render: (_, l) => libelle(l.action) },
            { title: t('audit.col.entite'), key: 'entite', render: (_, l) => l.entite_code || '', width: 90 },
            ...(simple ? [] : [
              { title: t('audit.col.objet'), key: 'objet', render: (_: unknown, l: Ligne) => (l.entity_type ? `${l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ''}` : '') },
              { title: t('audit.col.canal'), key: 'canal', render: (_: unknown, l: Ligne) => canal(l.channel) },
            ]),
          ]} />
      </Card>
    </div>
  );
}

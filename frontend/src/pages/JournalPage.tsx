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
 * 0.9.1 (R2, DV-94) : un champ qui porte un code (l'état d'une demande, « a_qualifier », « qualifiee ») s'affiche par son
 * libellé du service technique, dans la langue de l'écran ; un code sans libellé reste affiché tel quel.
 * 0.12.0 (R4, DV-109) : plus de clé ni de code brut. Les champs des réglages de connexion (mode, annuaire, identifiant,
 * adresse publique, domaines, secret) et des tickets (champs modifiés, file, gravité…) ont un libellé ; les codes d'une
 * action donnée se traduisent par action (type d'un ticket, mode de connexion, méthode, motif d'un refus de Microsoft),
 * une liste de noms de champs s'affiche par leurs libellés, et le secret masqué se dit « masqué ».
 * 0.13.0 (point 2 ; défauts D2, D3, D9 et M5 du contrôle DV-113) : chaque champ que le serveur peut écrire au journal a
 * son libellé (test « tout champ écrit est nommé ») ; les codes se traduisent aussi par famille d'actions (nature et
 * statut d'un lieu, niveau et pictogramme d'une catégorie, unité d'une priorité, jour de l'horaire, type d'un fichier,
 * langue, rôle) ; un réglage et un type de lieu sont nommés par le serveur (« noms ») ; l'écran d'une question de la FAQ
 * par le titre de sa fiche ; les dates sans heure au format de la langue ; l'objet (mode Complet) par son libellé. Le
 * motif d'un ticket n'est plus écrit au journal (D8) : « Motif donné : Oui ».
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Descriptions, Grid, Radio, Select, Space, Table, Tag, Typography, message } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/fr';
import 'dayjs/locale/nl';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { translations } from '../i18n';
import { TOPICS } from '../help';
import { useRoles } from '../useRoles';

interface Ligne {
  id: number; created_at: string; action: string; entity_type: string | null; entity_id: number | null; channel: string;
  details: Record<string, unknown> | null; entite_id: number | null; entite_code: string | null;
  user_id: number | null; user_email: string | null; user_first_name: string | null; user_last_name: string | null;
  noms?: Record<string, Nom>;
}
/** Lieu ou catégorie nommé par le serveur ; introuvable si l'identifiant ne correspond plus à aucune fiche. */
interface Nom { type: 'lieu' | 'categorie' | 'valeur' | 'reglage'; id?: number; code?: string; nom_fr?: string; nom_nl?: string; entite_code?: string | null; introuvable?: number }
interface Personne { id: number; email: string; first_name: string; last_name: string }
interface Entite { id: number; code: string; nom_fr: string; nom_nl: string }

const PAGE = 50;
/** Champs du détail qui valent 0 ou 1 (cases à cocher) ; « reponses » est un nombre et n'en fait pas partie. */
// 0.9.0 : qualification d'une demande (première, priorité confirmée, photos visibles ; motif et consignes notés par 1).
// 0.13.0 : validation d'une catégorie, comptes (mot de passe à changer, accès de secours), motif d'un ticket donné (D8).
// 0.14.0 : commentaire et compte rendu donnés lors d'un changement d'état d'une demande (le texte reste sur la fiche).
export const BOOLEENS = new Set(['commentaire_donne', 'compte_rendu_donne', 'suspendu', 'danger', 'beneficiaire_texte', 'is_active', 'obligatoire', 'remarque', 'brouillon', 'premiere', 'priorite_confirmee', 'photos_visibles', 'motif_priorite', 'consignes', 'internal', 'interne',
  'validation', 'must_change_password', 'is_admin_local', 'motif_donne']);
const VIDE_DIT = new Set(['avant', 'apres']);
/** Champs du détail qui portent un code traduit (R2, 0.9.1) : nom du champ → préfixe de la clé de traduction. */
export const CODES: Record<string, string> = { etat: 'demande.etat_service' };
/**
 * Codes traduits selon l'action (R4, 0.12.0) : le même nom de champ porte des codes différents selon l'action (« type »
 * d'un ticket ou d'une pièce jointe), d'où une table par action : action → champ → préfixe de la clé de traduction.
 */
export const CODES_ACTION: Record<string, Record<string, string>> = {
  'ticket.create': { type: 'tickets.type' },
  'settings.auth': { mode: 'settings.mode' },
  'login.success': { method: 'audit.methode' },
  'sso.refused': { reason: 'audit.raison' },
  // 0.14.0 : états de départ et d'arrivée d'un changement d'état ; état dont l'entité change les libellés.
  'demande.transition': { de: 'demande.etat_service', vers: 'demande.etat_service' },
  'etat_demande.update': { code: 'demande.etat_service' },
  // 0.15.0 (point 5) : façon de suivre une demande.
  'demande.suivre': { source: 'suivi.source' },
  'demande.ne_plus_suivre': { source: 'suivi.source' },
};
/**
 * Codes traduits selon la famille de l'action (0.13.0, D2 et D9) : famille (« lieu » pour lieu.create, lieu.update…) →
 * champ → préfixe de la clé de traduction. CODES_ACTION l'emporte, puis cette table, puis CODES.
 */
export const CODES_FAMILLE: Record<string, Record<string, string>> = {
  lieu: { nature: 'lieux.nature', statut: 'lieux.statut', type: 'audit.mime' },
  jour_non_ouvre: { nature: 'ref.cal.nature' },
  categorie: { niveau: 'ref.cat.niveau', icone: 'ref.icone' },
  priorite: { unite: 'ref.unite', couleur: 'ref.couleur' },
  horaire: { jour: 'ref.jour' },
  question_categorie: { type: 'ref.q.type' },
  piece: { type: 'audit.mime' },
  user: { preferred_lang: 'audit.langue', ui_mode: 'layout.mode', theme: 'audit.theme' },
  install: { langue: 'audit.langue' },
  valeur: { liste: 'audit.liste' },
  module: { module: 'audit.module' },
};
/** Libellé d'un champ propre à une famille, quand le même nom veut dire autre chose ailleurs (« fin » d'une priorité ou de l'horaire). */
export const CHAMPS_FAMILLE: Record<string, Record<string, string>> = {
  priorite: { prise_en_charge: 'audit.detail.delai_prise_en_charge', fin: 'audit.detail.delai_fin' },
  horaire: { debut: 'audit.detail.heure_debut', fin: 'audit.detail.heure_fin' },
};
/** Champs qui portent un code de rôle, nommé par le catalogue des rôles. */
const ROLES_CHAMPS = new Set(['role', 'from', 'to', 'user_role']);
/** Champs de date sans heure : « 2026-12-26 » ou, pour un congé annuel, « 12-26 ». */
const DATES = new Set(['date_debut', 'date_fin', 'date_souhaitee', 'date_convenue']);
/** Instants de la base (UTC, « AAAA-MM-JJ HH:MM:SS ») montrés à l'heure du poste (0.14.0 : échéance repoussée). */
const INSTANTS = new Set(['echeance_le']);
/** Champs dont la valeur est une liste de noms de champs, affichés par leurs libellés (R4). */
const LISTES_CHAMPS = new Set(['fields']);
/** Valeur masquée par le serveur (secret client), dite en clair (R4). */
const MASQUE = '***';
const vide = (v: unknown) => v === null || v === undefined || v === '';
/** Date de la base (UTC, « 2026-10-22 08:00:00 ») vers l'heure locale. */
export const depuisBase = (d: string) => dayjs(`${d.replace(' ', 'T')}Z`);

export default function JournalPage() {
  const { t, tField, lang } = useI18n();
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
  const catalogue = useRoles();
  const cleDetail = (k: string, action = '') => {
    const propre = CHAMPS_FAMILLE[action.split('.')[0]]?.[k];
    if (propre && translations[propre]) return t(propre);
    return translations[`audit.detail.${k}`] ? t(`audit.detail.${k}`) : k;
  };
  const objet = (e: string) => (translations[`audit.objet.${e}`] ? t(`audit.objet.${e}`) : e);
  const brut = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  const nomme = (n: Nom) => {
    // 0.13.0 (D3) : un réglage se nomme par son libellé seul ; une clé disparue du catalogue reste lisible.
    if (n.type === 'reglage') return n.introuvable ? `${n.code} (${t('audit.introuvable')})` : tField(n as unknown as Record<string, unknown>, 'nom');
    // Un type de lieu (valeur de liste) se nomme par son libellé seul : son code n'apprend rien au lecteur.
    if (n.type === 'valeur' && !n.introuvable) return tField(n as unknown as Record<string, unknown>, 'nom');
    return n.introuvable
      ? `#${n.id} (${t('audit.introuvable')})`
      : `${n.code} — ${tField(n as unknown as Record<string, unknown>, 'nom')} (#${n.id})`;
  };
  /** Valeur d'un champ du détail : nom si le serveur l'a trouvé, champ par champ pour un objet, sinon le texte brut. */
  const valeur = (l: Ligne, chemin: string, v: unknown): string => {
    const n = l.noms?.[chemin];
    if (n) return nomme(n);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${cleDetail(k, l.action)} : ${valeur(l, `${chemin}.${k}`, x)}`).join(' · ');
    }
    const cle = chemin.split('.').pop() || '';
    if (BOOLEENS.has(cle) && (v === 0 || v === 1 || typeof v === 'boolean')) return t(v ? 'yes' : 'no');
    if (LISTES_CHAMPS.has(cle) && Array.isArray(v)) return v.map((x) => cleDetail(String(x), l.action)).join(', ');
    if (v === MASQUE) return t('audit.masque');
    const prefixe = CODES_ACTION[l.action]?.[cle] || CODES_FAMILLE[l.action.split('.')[0]]?.[cle] || CODES[cle];
    if (prefixe && (typeof v === 'string' || typeof v === 'number') && translations[`${prefixe}.${v}`]) return t(`${prefixe}.${v}`);
    if (ROLES_CHAMPS.has(cle) && typeof v === 'string') {
      const r = catalogue.find((x) => x.code === v);
      if (r) return tField(r as unknown as Record<string, unknown>, 'label');
    }
    if (cle === 'topic_id' && typeof v === 'string') {
      const tp = TOPICS.find((x) => x.id === v);
      if (tp) return t(tp.titleKey);
    }
    if (DATES.has(cle) && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return dayjs(v).locale(lang).format('L');
    if (INSTANTS.has(cle) && typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v)) return dayjs(`${v.replace(' ', 'T')}Z`).locale(lang).format('L LT');
    if (cle === 'mois_jour' && typeof v === 'string' && /^\d{2}-\d{2}$/.test(v)) return dayjs(`2000-${v}`).locale(lang).format('D MMMM');
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
                {champs(l).map(([k, v]) => <Descriptions.Item key={k} label={cleDetail(k, l.action)}>{valeur(l, k, v)}</Descriptions.Item>)}
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
              { title: t('audit.col.objet'), key: 'objet', render: (_: unknown, l: Ligne) => (l.entity_type ? `${objet(l.entity_type)}${l.entity_id ? ` #${l.entity_id}` : ''}` : '') },
              { title: t('audit.col.canal'), key: 'canal', render: (_: unknown, l: Ligne) => canal(l.channel) },
            ]),
          ]} />
      </Card>
    </div>
  );
}

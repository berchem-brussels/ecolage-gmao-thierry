/**
 * Planning du service technique (0.21.0, étape 17, point 3 ; cahier des charges PLA-03). Règles du serveur :
 * services/planning.js (lecture) et services/taches.js (affectation, seule écriture).
 * - Semaine (lundi à dimanche) ou jour ; une ligne par ouvrier ou par équipe ; dans chaque case, les tâches datées
 *   (numéro de la demande, rang, titre, heure, durée) ; charge en heures par jour ; jour non travaillé grisé ;
 *   indisponibilité dite sans sa cause (PLA-04). Une ligne « Sans affectation » (et, par équipe, « Hors équipe ») reprend
 *   les tâches datées qui ne tombent sur aucune ligne.
 * - Avec « demandes:traiter » (gestionnaire, responsable) : glisser-déposer natif du navigateur sur grand écran, bouton
 *   « Déplacer » partout (clavier, téléphone). Le déplacement envoie l'affectation complète de la tâche
 *   (PUT /api/taches/:id/affectation) : par ouvrier, l'ouvrier de départ est remplacé par celui d'arrivée ; par équipe,
 *   la tâche est confiée à l'équipe ; une tâche confiée à une équipe ne change que de jour dans la vue par ouvrier
 *   (« via l'équipe »). Le chef d'équipe lit sans déplacer.
 * - Sur téléphone (moins de 768 px), la vue jour seule, une colonne. Période, vue et lignes gardées dans l'adresse.
 * - 0.21.0 (point 4 ; PLA-05, PLA-06) : « Tâches non planifiées » au-dessus de la grille (ouvertes, sans date, par
 *   priorité puis échéance), à glisser sur une case ou à « Planifier » ; une tâche glissée sur un ouvrier lui est confiée
 *   à lui seul. Conflits d'une case dits par une icône et en mots (« Trop chargé », « Absent », « Jour non travaillé ») ;
 *   après un déplacement, les conflits rendus par le serveur s'affichent sans bloquer.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, DatePicker, Grid, Modal, Segmented, Select, Space, Spin, Tag, Typography, message, theme } from 'antd';
import { CalendarOutlined, LeftOutlined, RightOutlined, SwapOutlined, WarningOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { duree } from '../demandes';
import { type Conflit, type ConflitAffectation, texteConflits } from '../planning';
import { saisieDate } from '../saisieDate';
import { hasPermission, useRoles } from '../useRoles';
import PageHeader from '../components/PageHeader';

type Indispo = 'journee' | 'matin' | 'apres_midi' | null;
interface JourCase { travaille: 0 | 1; indisponible?: Indispo; charge_min: number; nb_taches: number; capacite_min?: number; conflits?: Conflit[] }
interface Jour { date: string; jour_semaine: number; ouvre_entite: 0 | 1 }
interface OuvrierP { id: number; prenom: string; nom: string; equipes: number[]; jours: Record<string, JourCase> }
interface EquipeP { id: number; code: string; nom_fr: string; nom_nl: string; membres: number[]; horaire_propre: 0 | 1; jours: Record<string, JourCase> }
export interface TacheP {
  id: number; demande_id: number; numero: string; rang: number; titre: string; etat: 'a_faire' | 'en_cours' | 'terminee'; date_prevue: string;
  heure_debut: string | null; duree_estimee_min: number | null; equipe_id: number | null; ouvriers: number[];
  lieu_code: string | null; lieu_nom_fr: string | null; lieu_nom_nl: string | null; priorite?: string | null;
}

interface Planning { du: string; au: string; aujourdhui: string; jours: Jour[]; ouvriers: OuvrierP[]; equipes: EquipeP[]; taches: TacheP[]; non_planifiees?: TacheP[] }
/** Ligne du planning : un ouvrier, une équipe, ou une ligne de reprise (sans affectation, hors équipe). */
type Ligne = { cle: string; type: 'ouvrier' | 'equipe' | 'aucun' | 'hors_equipe' | 'non_planifiee'; id: number | null; nom: string; jours?: Record<string, JourCase> };
/** Point de départ d'une tâche non planifiée. */
const NON_PLANIFIEE: Ligne = { cle: 'np', type: 'non_planifiee', id: null, nom: '' };
/** Cible d'un déplacement : la ligne et le jour d'arrivée, la ligne de départ. */
interface Deplacement { tache: TacheP; depuis: Ligne }

const lundiDe = (d: Dayjs) => d.subtract((d.day() + 6) % 7, 'day');
const COULEUR = { a_faire: 'default', en_cours: 'processing', terminee: 'success' } as const;

export default function PlanningPage() {
  const { t, lang, hint } = useI18n();
  const { roles } = useAuth();
  const catalogue = useRoles();
  const peutDeplacer = hasPermission(catalogue, roles, 'demandes:traiter');
  const voitDemandes = hasPermission(catalogue, roles, 'demandes:entite');
  const mobile = Grid.useBreakpoint().md === false;
  // Couleurs du thème (clair ou sombre), jamais écrites en dur.
  const { token } = theme.useToken();
  const [params, setParams] = useSearchParams();
  const vue = mobile ? 'jour' : params.get('vue') === 'jour' ? 'jour' : 'semaine';
  const lignesPar = params.get('lignes') === 'equipes' ? 'equipes' : 'ouvriers';
  const ancre = params.get('du') && dayjs(params.get('du')).isValid() ? dayjs(params.get('du')) : dayjs();
  const du = vue === 'jour' ? ancre : lundiDe(ancre);
  const au = vue === 'jour' ? du : du.add(6, 'day');
  const [data, setData] = useState<Planning | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [aDeplacer, setADeplacer] = useState<Deplacement | null>(null);
  const [cibleDate, setCibleDate] = useState<Dayjs | null>(null);
  const [cibleLigne, setCibleLigne] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);

  const changer = (p: Record<string, string | null>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(p)) { if (v === null) n.delete(k); else n.set(k, v); }
    setParams(n, { replace: true });
  };
  const charger = useCallback(() => {
    setErreur(null);
    api.get<Planning>(`/planning${qs({ du: du.format('YYYY-MM-DD'), au: au.format('YYYY-MM-DD') })}`)
      .then(setData).catch((e) => { setData(null); setErreur(e instanceof ApiError ? e.message : t('common.error')); });
  }, [du.format('YYYY-MM-DD'), au.format('YYYY-MM-DD')]);
  useEffect(() => { charger(); }, [charger]);

  const nomEquipe = (q: { nom_fr: string; nom_nl: string }) => (lang === 'nl' ? q.nom_nl : q.nom_fr);
  const lignes: Ligne[] = useMemo(() => {
    if (!data) return [];
    const base: Ligne[] = lignesPar === 'equipes'
      ? data.equipes.map((q) => ({ cle: `e${q.id}`, type: 'equipe' as const, id: q.id, nom: nomEquipe(q), jours: q.jours }))
      : data.ouvriers.map((o) => ({ cle: `o${o.id}`, type: 'ouvrier' as const, id: o.id, nom: `${o.prenom} ${o.nom}`, jours: o.jours }));
    if (lignesPar === 'equipes') base.push({ cle: 'hors', type: 'hors_equipe', id: null, nom: t('planning.hors_equipe') });
    base.push({ cle: 'aucun', type: 'aucun', id: null, nom: t('planning.sans_affectation') });
    return base;
  }, [data, lignesPar, lang]);

  /** Tâches d'une case ; « via » : confiée à une équipe dont l'ouvrier est membre. */
  const tachesDe = (l: Ligne, date: string): { tache: TacheP; via: boolean }[] => {
    if (!data) return [];
    const duJour = data.taches.filter((x) => x.date_prevue === date);
    if (l.type === 'aucun') return duJour.filter((x) => !x.equipe_id && !x.ouvriers.length).map((x) => ({ tache: x, via: false }));
    if (l.type === 'hors_equipe') return duJour.filter((x) => !x.equipe_id && x.ouvriers.length).map((x) => ({ tache: x, via: false }));
    if (l.type === 'equipe') return duJour.filter((x) => x.equipe_id === l.id).map((x) => ({ tache: x, via: false }));
    const o = data.ouvriers.find((x) => x.id === l.id);
    return duJour.filter((x) => x.ouvriers.includes(l.id as number) || (!!x.equipe_id && !!o?.equipes.includes(x.equipe_id)))
      .map((x) => ({ tache: x, via: !x.ouvriers.includes(l.id as number) }));
  };

  /** Corps de l'affectation après le déplacement de la tâche de « depuis » vers (ligne, date) ; null : refusé ou inchangé. */
  const corpsDeplacement = (x: TacheP, depuis: Ligne, vers: Ligne, date: string): { corps: Record<string, unknown> | null; refus?: string } => {
    const base = { ouvriers: x.ouvriers, equipe_id: x.equipe_id, date_prevue: date, heure_debut: x.heure_debut, duree_estimee_min: x.duree_estimee_min };
    let corps = base;
    if (vers.type === 'equipe') corps = { ...base, equipe_id: vers.id, ouvriers: [] };
    else if (vers.type === 'ouvrier') {
      if (x.equipe_id) {
        const o = data?.ouvriers.find((y) => y.id === vers.id);
        if (!o?.equipes.includes(x.equipe_id)) return { corps: null, refus: t('planning.refus.equipe') };
      } else if (depuis.type === 'non_planifiee') {
        corps = { ...base, ouvriers: [vers.id as number] };
      } else if (!x.ouvriers.includes(vers.id as number)) {
        const reste = x.ouvriers.filter((y) => !(depuis.type === 'ouvrier' && y === depuis.id));
        corps = { ...base, ouvriers: [...reste, vers.id as number].slice(0, 10) };
      }
    } else if (vers.type === 'aucun') corps = { ...base, ouvriers: [], equipe_id: null };
    else if (vers.type === 'hors_equipe' && x.equipe_id) return { corps: null, refus: t('planning.refus.hors_equipe') };
    const pareil = !!x.date_prevue && date === x.date_prevue && corps.equipe_id === x.equipe_id
      && JSON.stringify([...(corps.ouvriers as number[])].sort()) === JSON.stringify([...x.ouvriers].sort());
    return { corps: pareil ? null : corps };
  };

  /** Règle 8 du serveur : conflits rendus après l'enregistrement, sans bloquer. */
  const avertirConflits = (liste?: ConflitAffectation[]) => {
    if (!liste?.length) return;
    message.warning({ content: texteConflits(liste, t, lang, data?.equipes), duration: 8 });
  };

  const deplacer = async (x: TacheP, depuis: Ligne, vers: Ligne, date: string) => {
    const { corps, refus } = corpsDeplacement(x, depuis, vers, date);
    if (refus) { message.warning(refus); return false; }
    if (!corps) return true;
    setEnvoi(true);
    try {
      const r = await api.put<{ demande_passage_auto: string | null; conflits?: ConflitAffectation[] }>(`/taches/${x.id}/affectation`, corps);
      message.success(r.demande_passage_auto
        ? `${t('planning.deplacee')} · ${t('tache.demande_passee')} « ${t(`demande.etat_service.${r.demande_passage_auto}`)} »` : t('planning.deplacee'));
      avertirConflits(r.conflits);
      charger();
      return true;
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : t('common.error'));
      return false;
    } finally { setEnvoi(false); }
  };

  const ouvrirDeplacer = (x: TacheP, depuis: Ligne) => {
    setADeplacer({ tache: x, depuis });
    setCibleDate(dayjs(x.date_prevue));
    setCibleLigne(depuis.cle);
  };
  const ouvrirPlanifier = (x: TacheP) => {
    setADeplacer({ tache: x, depuis: NON_PLANIFIEE });
    setCibleDate(data && data.aujourdhui >= data.du && data.aujourdhui <= data.au ? dayjs(data.aujourdhui) : du);
    const ligne = x.equipe_id && lignesPar === 'equipes' ? `e${x.equipe_id}` : x.ouvriers.length === 1 && lignesPar === 'ouvriers' ? `o${x.ouvriers[0]}` : 'aucun';
    setCibleLigne(lignes.some((l) => l.cle === ligne) ? ligne : 'aucun');
  };
  const confirmerDeplacer = async () => {
    if (!aDeplacer || !cibleDate || !cibleLigne) return;
    const vers = lignes.find((l) => l.cle === cibleLigne);
    if (!vers) return;
    if (await deplacer(aDeplacer.tache, aDeplacer.depuis, vers, cibleDate.format('YYYY-MM-DD'))) setADeplacer(null);
  };

  const libelleJour = (j: Jour) => dayjs(j.date).locale(lang).format(vue === 'jour' ? 'dddd D MMMM YYYY' : 'ddd D/MM');
  const indispoTexte = (c?: JourCase) => (c?.indisponible ? t(`planning.indisponible.${c.indisponible}`) : null);

  const carte = (x: TacheP, via: boolean, l: Ligne) => {
    const np = l.type === 'non_planifiee';
    const lieu = (lang === 'nl' ? x.lieu_nom_nl : x.lieu_nom_fr) || x.lieu_code;
    return (
      <div key={`${x.id}-${l.cle}`} className="planning-tache" data-tache={x.id} draggable={peutDeplacer && !mobile && x.etat !== 'terminee'}
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ tache: x.id, depuis: l.cle })); e.dataTransfer.effectAllowed = 'move'; }}
        style={{ border: `1px solid ${token.colorBorder}`, borderRadius: 6, padding: '4px 6px', marginBottom: 4, background: token.colorBgContainer, fontSize: 13, overflowWrap: 'anywhere', cursor: peutDeplacer && !mobile ? 'grab' : 'default' }}>
        <div>
          {voitDemandes ? <Link to={`/demandes-entite?demande=${x.demande_id}`}>{`${x.numero} · ${x.rang}`}</Link> : <Typography.Text strong>{`${x.numero} · ${x.rang}`}</Typography.Text>}
        </div>
        <div>{x.titre}</div>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
          {[x.heure_debut, x.duree_estimee_min ? duree(x.duree_estimee_min) : null, lieu].filter(Boolean).join(' · ')}
        </Typography.Text>
        <Space size={[4, 4]} wrap style={{ marginTop: 2 }}>
          {np && x.priorite && <Tag style={{ whiteSpace: 'normal', marginInlineEnd: 0 }}>{x.priorite}</Tag>}
          <Tag color={COULEUR[x.etat]} style={{ whiteSpace: 'normal', marginInlineEnd: 0 }}>{t(`tache.etat.${x.etat}`)}</Tag>
          {via && <Tag style={{ whiteSpace: 'normal', marginInlineEnd: 0 }}>{t('planning.via_equipe')}</Tag>}
          {peutDeplacer && x.etat !== 'terminee' && (np ? (
            <Button size="small" type="text" className="planning-action" style={{ maxWidth: '100%', height: 'auto', whiteSpace: 'normal', overflowWrap: 'normal', paddingInline: 0, fontSize: 13 }} icon={<CalendarOutlined />} onClick={() => ouvrirPlanifier(x)} aria-label={`${t('planning.planifier')} ${x.numero} · ${x.rang}`}>
              {t('planning.planifier')}
            </Button>
          ) : (
            <Button size="small" type="text" className="planning-action" style={{ maxWidth: '100%', height: 'auto', whiteSpace: 'normal', overflowWrap: 'normal', paddingInline: 0, fontSize: 13 }} icon={<SwapOutlined />} onClick={() => ouvrirDeplacer(x, l)} aria-label={`${t('planning.deplacer')} ${x.numero} · ${x.rang}`}>
              {t('planning.deplacer')}
            </Button>
          ))}
        </Space>
      </div>
    );
  };

  const caseDe = (l: Ligne, j: Jour) => {
    const c = l.jours?.[j.date];
    const ferme = l.jours ? !c?.travaille : !j.ouvre_entite;
    const cle = `${l.cle}|${j.date}`;
    const contenu = tachesDe(l, j.date);
    return (
      <div key={cle} role="cell" className={`planning-case${ferme ? ' planning-ferme' : ''}`} data-case={cle}
        onDragOver={peutDeplacer ? (e) => { e.preventDefault(); setSurvol(cle); } : undefined}
        onDragLeave={peutDeplacer ? () => setSurvol((s) => (s === cle ? null : s)) : undefined}
        onDrop={peutDeplacer ? (e) => {
          e.preventDefault(); setSurvol(null);
          try {
            const { tache, depuis } = JSON.parse(e.dataTransfer.getData('text/plain')) as { tache: number; depuis: string };
            const x = data?.taches.find((y) => y.id === tache) || data?.non_planifiees?.find((y) => y.id === tache);
            const de = depuis === 'np' ? NON_PLANIFIEE : lignes.find((y) => y.cle === depuis);
            if (x && de) deplacer(x, de, l, j.date);
          } catch { /* glisser venu d'ailleurs : ignoré */ }
        } : undefined}
        style={{ minHeight: 64, padding: 4, borderInlineStart: `1px solid ${token.colorBorderSecondary}`, borderBlockStart: `1px solid ${token.colorBorderSecondary}`, minWidth: 0,
          background: survol === cle ? token.colorPrimaryBg : ferme ? token.colorFillTertiary : undefined }}>
        {c && (c.charge_min > 0 || indispoTexte(c)) && (
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
            {[c.charge_min ? `${t('planning.charge')} ${duree(c.charge_min)}` : null, indispoTexte(c)].filter(Boolean).join(' · ')}
          </Typography.Text>
        )}
        {!!c?.conflits?.length && (
          <Typography.Text type="danger" className="planning-conflit" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
            <WarningOutlined aria-hidden /> {c.conflits.map((k) => (k === 'trop_charge' && c.capacite_min !== undefined
              ? `${t('planning.conflit.trop_charge')} (${duree(c.charge_min)} ${t('planning.conflit.pour')} ${duree(c.capacite_min)})` : t(`planning.conflit.${k}`))).join(' · ')}
          </Typography.Text>
        )}
        {contenu.map(({ tache, via }) => carte(tache, via, l))}
      </div>
    );
  };

  const nbCol = data ? data.jours.length : vue === 'jour' ? 1 : 7;
  const grille = data && (
    <div className="planning-defile" style={{ overflowX: mobile ? 'visible' : 'auto' }}>
      <div role="table" aria-label={t('nav.planning')} className="planning-grille"
        style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : `minmax(140px, 1.1fr) repeat(${nbCol}, minmax(${vue === 'jour' ? 220 : 120}px, 1fr))`, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 8 }}>
        {!mobile && (
          <div role="row" style={{ display: 'contents' }}>
            <div role="columnheader" style={{ padding: 6, fontWeight: 600 }}>{t(lignesPar === 'equipes' ? 'planning.equipe' : 'planning.ouvrier')}</div>
            {data.jours.map((j) => (
              <div role="columnheader" key={j.date} style={{ padding: 6, fontWeight: 600, background: j.date === data.aujourdhui ? token.colorPrimaryBg : undefined }}>
                {libelleJour(j)}{!j.ouvre_entite && <Typography.Text type="secondary" style={{ fontWeight: 400 }}>{` · ${t('planning.non_ouvre')}`}</Typography.Text>}
              </div>
            ))}
          </div>
        )}
        {lignes.map((l) => (
          <div role="row" key={l.cle} style={{ display: 'contents' }}>
            <div role="rowheader" style={{ padding: 6, borderBlockStart: `1px solid ${token.colorBorderSecondary}`, fontWeight: mobile ? 600 : 500, overflowWrap: 'anywhere', background: mobile ? token.colorFillQuaternary : undefined }}>
              {l.nom}
            </div>
            {data.jours.map((j) => caseDe(l, j))}
          </div>
        ))}
      </div>
    </div>
  );

  const pas = vue === 'jour' ? 1 : 7;
  return (
    <div className="planning-page">
      <PageHeader title={t('nav.planning')} />
      <Typography.Paragraph type="secondary">{t(peutDeplacer ? (mobile ? 'planning.aide.mobile' : 'planning.aide') : 'planning.aide.lecture')}</Typography.Paragraph>
      <Space wrap size={[8, 8]} style={{ marginBottom: 12 }} className="planning-barre">
        <Button icon={<LeftOutlined />} aria-label={t('planning.precedent')} onClick={() => changer({ du: du.subtract(pas, 'day').format('YYYY-MM-DD') })} />
        <Button onClick={() => changer({ du: null })}>{t(vue === 'jour' ? 'planning.aujourdhui' : 'planning.cette_semaine')}</Button>
        <Button icon={<RightOutlined />} aria-label={t('planning.suivant')} onClick={() => changer({ du: du.add(pas, 'day').format('YYYY-MM-DD') })} />
        <Typography.Text strong className="planning-periode">
          {vue === 'jour' ? du.locale(lang).format('dddd D MMMM YYYY') : `${du.locale(lang).format('D MMMM')} – ${au.locale(lang).format('D MMMM YYYY')}`}
        </Typography.Text>
        {!mobile && (
          <Segmented<string> value={vue} onChange={(v) => changer({ vue: v === 'jour' ? 'jour' : null })} aria-label={t('planning.vue')}
            options={[{ value: 'semaine', label: t('planning.semaine') }, { value: 'jour', label: t('planning.jour') }]} />
        )}
        <Segmented<string> value={lignesPar} onChange={(v) => changer({ lignes: v === 'equipes' ? 'equipes' : null })} aria-label={t('planning.lignes')}
          options={[{ value: 'ouvriers', label: t('planning.par_ouvrier') }, { value: 'equipes', label: t('planning.par_equipe') }]} />
      </Space>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} role="alert" />}
      {data && (
        <Card size="small" className="planning-non-planifiees" style={{ marginBottom: 12 }}
          title={`${t('planning.non_planifiees')} (${data.non_planifiees?.length || 0})`}>
          {data.non_planifiees?.length
            ? <div role="list" aria-label={t('planning.non_planifiees')} style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                {data.non_planifiees.map((x) => <div role="listitem" key={x.id}>{carte(x, false, NON_PLANIFIEE)}</div>)}
              </div>
            : <Typography.Text type="secondary">{t('planning.non_planifiees.aucune')}</Typography.Text>}
        </Card>
      )}
      {!data && !erreur ? <Spin /> : grille}
      {data && !data.ouvriers.length && <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>{t('planning.aucun_ouvrier')}</Typography.Paragraph>}

      <Modal open={!!aDeplacer} onCancel={() => setADeplacer(null)} onOk={confirmerDeplacer} okText={t(aDeplacer?.depuis.type === 'non_planifiee' ? 'planning.planifier' : 'planning.deplacer')} cancelText={t('common.cancel')}
        okButtonProps={{ loading: envoi, disabled: !cibleDate || !cibleLigne }} destroyOnHidden width={440} className="planning-deplacer"
        title={aDeplacer ? `${t(aDeplacer.depuis.type === 'non_planifiee' ? 'planning.planifier' : 'planning.deplacer')} · ${aDeplacer.tache.numero} · ${aDeplacer.tache.rang}` : ''}>
        {aDeplacer && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text>{aDeplacer.tache.titre}</Typography.Text>
            <label htmlFor="planning-date">{t('planning.vers_jour')}</label>
            <DatePicker id="planning-date" format="DD/MM/YYYY" value={cibleDate} onChange={setCibleDate} allowClear={false} style={{ width: '100%' }} {...saisieDate()} />
            <label htmlFor="planning-ligne">{t(lignesPar === 'equipes' ? 'planning.vers_equipe' : 'planning.vers_ouvrier')}</label>
            <Select<string> id="planning-ligne" value={cibleLigne ?? undefined} onChange={setCibleLigne} showSearch optionFilterProp="label" style={{ width: '100%' }}
              disabled={lignesPar === 'ouvriers' && !!aDeplacer.tache.equipe_id}
              options={lignes.filter((l) => !(lignesPar === 'ouvriers' && aDeplacer.tache.equipe_id) || l.cle === aDeplacer.depuis.cle).map((l) => ({ value: l.cle, label: l.nom }))} />
            {lignesPar === 'ouvriers' && !!aDeplacer.tache.equipe_id && <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t('planning.refus.equipe')}</Typography.Text>}
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>{hint('planning.deplacer')}</Typography.Text>
          </Space>
        )}
      </Modal>
    </div>
  );
}

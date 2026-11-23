/**
 * Vue en colonnes par état de la liste du service technique (version 0.16.0, étape 12, point 6 ; GES-03).
 * - Une colonne par état ouvert où le service agit : À qualifier, Qualifiée, En attente, En cours, Travaux terminés,
 *   Rouverte ; les filtres de la liste s'appliquent (sauf les états), 200 demandes au plus (au-delà, la liste le dit).
 * - Déplacer une carte n'est permis que vers un état que la table des passages autorise depuis son état, pour un
 *   passage du service technique que la personne peut faire (sa permission) : sur grand écran par glisser-déposer
 *   (les colonnes permises s'éclairent, les autres refusent la carte) ; partout, au doigt ou au clavier, par le bouton
 *   « Déplacer » de la carte, qui ne propose que les états permis.
 * - Déplacer ouvre la fiche avec le formulaire du passage (motif, commentaire, compte rendu) ou la qualification : rien
 *   ne change sans confirmation, et le serveur refait tous les contrôles (services/cycle.js).
 * - Sur téléphone (DV-102) : une colonne à la fois, choisie en boutons avec son nombre de demandes ; le glisser-déposer
 *   n'y est pas proposé (le bouton « Déplacer » le remplace).
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Dropdown, Empty, Grid, Radio, Space, Spin, Typography } from 'antd';
import { DragOutlined } from '@ant-design/icons';
import api, { qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission, useRoles } from '../../useRoles';
import { Icone } from '../../referentiel';
import { type Demande, type Etat, type FiltresGestion, type Transition, dateDepot } from '../../demandes';
import { DangerTag, NonLusTag } from '../../pages/DemandesPage';
import { EcheanceCell, PrioriteTag } from '../../pages/GestionDemandesPage';

export const COLONNES: Etat[] = ['a_qualifier', 'qualifiee', 'en_attente', 'en_cours', 'terminee', 'rouverte'];
const MAX = 200;

interface Passage {
  de_etat: Etat; vers_etat: Etat; permission: string; acteur: 'service' | 'demandeur' | 'valideur'; via: Transition['via'];
  motif_liste: Transition['motif_liste']; commentaire: Transition['commentaire']; commentaire_public: 0 | 1; compte_rendu: 0 | 1; is_active: number;
}

export default function VueColonnes({ f, rafraichir, onDeplacer, onOuvrir }: {
  f: FiltresGestion; rafraichir: number;
  /** Déplacement choisi : la page ouvre la fiche avec le passage (ou la qualification). */
  onDeplacer: (d: Demande, vers: Etat) => void;
  onOuvrir: (d: Demande) => void;
}) {
  const { t, lang } = useI18n();
  const { roles } = useAuth();
  const catalogue = useRoles();
  const mobile = Grid.useBreakpoint().md === false;
  const [rows, setRows] = useState<Demande[] | null>(null);
  const [total, setTotal] = useState(0);
  const [table, setTable] = useState<Passage[]>([]);
  const [colonne, setColonne] = useState<Etat>('a_qualifier');
  const [glisse, setGlisse] = useState<Demande | null>(null);

  useEffect(() => {
    api.get<Passage[]>('/etats-demande/transitions').then(setTable).catch(() => setTable([]));
  }, []);
  useEffect(() => {
    setRows(null);
    const { etats: _e, ouvertes: _o, tri: _t, ordre: _r, ...reste } = f;
    api.page<Demande>(`/demandes${qs({ perimetre: 'entite', ...reste, etats: COLONNES.join(','), tri: 'echeance', limit: MAX } as Record<string, string | number | undefined>)}`)
      .then((r) => { setRows(r.data); setTotal(r.pagination.total); }).catch(() => { setRows([]); setTotal(0); });
  }, [JSON.stringify(f), rafraichir]);

  /** États vers lesquels la personne peut déplacer cette demande (passages du service permis). */
  const permis = (d: Demande): Etat[] => [...new Set(table
    .filter((p) => p.de_etat === d.etat && p.acteur === 'service' && p.is_active === 1 && (!p.via || p.via === 'qualifier')
      && COLONNES.includes(p.vers_etat) && hasPermission(catalogue, roles, p.permission))
    .map((p) => p.vers_etat))];
  const parEtat = useMemo(() => Object.fromEntries(COLONNES.map((e) => [e, (rows || []).filter((d) => d.etat === e)])) as Record<Etat, Demande[]>, [rows]);
  const titre = (e: Etat) => t(`demande.etat_service.${e}`);
  const cat = (d: Demande) => (lang === 'nl' ? d.categorie_libelle_nl : d.categorie_libelle_fr);
  const lieu = (d: Demande) => (lang === 'nl' ? d.lieu_nom_nl : d.lieu_nom_fr);

  const carte = (d: Demande) => {
    const cibles = permis(d);
    return (
      <Card key={d.id} size="small" className="col-carte" draggable={!mobile && cibles.length > 0}
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(d.id)); e.dataTransfer.effectAllowed = 'move'; setGlisse(d); }}
        onDragEnd={() => setGlisse(null)}>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
            <Button type="link" onClick={() => onOuvrir(d)} style={{ paddingInline: 0, fontWeight: 600 }}>{d.numero}</Button>
            <Space size={4} wrap>{d.danger === 1 && <DangerTag />}<PrioriteTag p={d.priorite} /><NonLusTag n={d.messages_non_lus} /></Space>
          </Space>
          <Typography.Text><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>{lieu(d)} · {dateDepot(d.created_at)}</Typography.Text>
          <EcheanceCell d={d} />
          {cibles.length > 0 && (
            <Dropdown trigger={['click']} menu={{ items: cibles.map((e) => ({ key: e, label: titre(e) })), onClick: ({ key }) => onDeplacer(d, key as Etat) }}>
              <Button size="small" icon={<DragOutlined aria-hidden />} aria-label={`${t('colonnes.deplacer')} ${d.numero}`}>{t('colonnes.deplacer')}</Button>
            </Dropdown>
          )}
        </Space>
      </Card>
    );
  };

  if (rows === null) return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>;
  const trop = total > MAX && <Typography.Paragraph type="warning">{t('colonnes.trop').split('{n}').join(String(MAX))}</Typography.Paragraph>;

  if (mobile) {
    return (
      <div>
        {trop}
        <div role="radiogroup" aria-label={t('colonnes.choisir')}>
          <Radio.Group optionType="button" value={colonne} onChange={(e) => setColonne(e.target.value)}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}
            options={COLONNES.map((e) => ({ value: e, label: `${titre(e)} (${parEtat[e].length})` }))} />
        </div>
        <section aria-label={titre(colonne)}>
          {parEtat[colonne].length ? <Space direction="vertical" size={8} style={{ width: '100%' }}>{parEtat[colonne].map(carte)}</Space>
            : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('colonnes.vide')} />}
        </section>
      </div>
    );
  }

  const cibles = glisse ? permis(glisse) : [];
  return (
    <div>
      {trop}
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>{t('colonnes.aide')}</Typography.Paragraph>
      <div className="col-tableau" role="list" aria-label={t('colonnes.titre')}>
        {COLONNES.map((e) => {
          const accepte = !!glisse && cibles.includes(e);
          return (
            <section key={e} role="listitem" aria-labelledby={`col-${e}`}
              className={`col-colonne${glisse ? (accepte ? ' col-permise' : glisse.etat === e ? '' : ' col-refusee') : ''}`}
              onDragOver={(ev) => { if (accepte) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } }}
              onDrop={(ev) => { ev.preventDefault(); const d = glisse; setGlisse(null); if (d && accepte) onDeplacer(d, e); }}>
              <Typography.Title level={2} id={`col-${e}`} style={{ fontSize: 15, margin: '0 0 8px' }}>{titre(e)} ({parEtat[e].length})</Typography.Title>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {parEtat[e].length ? parEtat[e].map(carte) : <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t('colonnes.vide')}</Typography.Text>}
              </Space>
            </section>
          );
        })}
      </div>
    </div>
  );
}

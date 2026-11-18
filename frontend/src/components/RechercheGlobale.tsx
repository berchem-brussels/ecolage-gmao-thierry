/**
 * Recherche globale de l'en-tête (0.18.0, point 1 ; cahier des charges ERG-04 ; décision du 17/11/2026 : le plus simple).
 * Une loupe ouvre une fenêtre de recherche. Aucune route nouvelle : on interroge les listes existantes de l'entité
 * active, avec leurs droits et leur cloison déjà testés côté serveur :
 *   - « Mes demandes » : GET /api/demandes?perimetre=miennes&q= (numéro, description, lieu) ;
 *   - « Demandes de l'entité » : GET /api/demandes?perimetre=entite&q= si la personne a « demandes:entite » ;
 *   - « Patrimoine » : GET /api/lieux?q= si la personne a « lieux:lire » et que le module Patrimoine est allumé.
 * Équipements, salles et articles s'ajouteront avec leurs modules (étapes 22, 25, 27, 33). Au moins 2 caractères ;
 * cinq résultats par groupe ; un résultat ouvre la fiche (volet) de son écran. Sur téléphone, la fenêtre prend la largeur
 * de l'écran et le champ est en 16 px (index.css) ; la loupe reste une icône avec son nom accessible.
 * Sous 360 px (iPhone SE de première génération, 320 px), l'en-tête ne tient pas avec la loupe (29 px de trop,
 * `mobile:check`) : AppLayout passe enTete={false} et met un bouton « Rechercher » en tête du menu latéral, qui ouvre
 * la même fenêtre par l'événement « app-recherche » (comme le choix de l'entité en 0.17.0).
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Empty, Grid, Input, List, Modal, Spin, Tag, Tooltip, Typography } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { hasPermission, useRoles } from '../useRoles';
import { routeActive, useModules } from '../moduleMap';
import type { Demande } from '../demandes';
import type { Lieu } from '../lieux';

/** Nombre de résultats montrés par groupe. */
export const PAR_GROUPE = 5;
/** Longueur minimale du texte cherché. */
export const MIN_CARACTERES = 2;
const DELAI_FRAPPE = 300;

export interface Resultats { miennes: Demande[]; entite: Demande[]; lieux: Lieu[] }
interface Ligne { cle: string; titre: string; detail: string; etat?: string; lien: string }

/** Les demandes de l'entité déjà présentes dans « Mes demandes » n'y sont pas répétées. */
export function sansDoublons(r: Resultats): Resultats {
  const miennes = new Set(r.miennes.map((d) => d.id));
  return { ...r, entite: r.entite.filter((d) => !miennes.has(d.id)) };
}

/** Ouvre la fenêtre de recherche depuis un autre endroit de l'écran (menu latéral sous 360 px). */
export const ouvrirRecherche = () => window.dispatchEvent(new Event('app-recherche'));

export default function RechercheGlobale({ enTete = true }: { enTete?: boolean }) {
  const { t, lang, tField } = useI18n();
  const { entite, roles } = useAuth();
  const catalogue = useRoles();
  const can = (p: string) => hasPermission(catalogue, roles, p);
  const { modules } = useModules();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const mobile = screens.md === false;
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState('');
  const [resultats, setResultats] = useState<Resultats | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  const champ = useRef<InputRef>(null);
  const tour = useRef(0);

  const voitEntite = can('demandes:entite');
  const voitLieux = can('lieux:lire') && routeActive(modules, '/patrimoine');

  useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener('app-recherche', ouvrir);
    return () => window.removeEventListener('app-recherche', ouvrir);
  }, []);

  useEffect(() => {
    const q = texte.trim();
    if (!ouvert || q.length < MIN_CARACTERES) { setResultats(null); setChargement(false); setErreur(false); return undefined; }
    const ici = ++tour.current;
    setChargement(true);
    const minuterie = window.setTimeout(async () => {
      try {
        const [miennes, ent, lieux] = await Promise.all([
          api.page<Demande>(`/demandes${qs({ perimetre: 'miennes', q, limit: PAR_GROUPE })}`),
          voitEntite ? api.page<Demande>(`/demandes${qs({ perimetre: 'entite', q, limit: PAR_GROUPE * 2 })}`) : Promise.resolve(null),
          voitLieux ? api.page<Lieu>(`/lieux${qs({ q, limit: PAR_GROUPE })}`) : Promise.resolve(null),
        ]);
        if (ici !== tour.current) return; // une frappe plus récente a pris la main
        setResultats(sansDoublons({ miennes: miennes.data, entite: ent ? ent.data : [], lieux: lieux ? lieux.data : [] }));
        setErreur(false);
      } catch {
        if (ici === tour.current) { setResultats(null); setErreur(true); }
      } finally {
        if (ici === tour.current) setChargement(false);
      }
    }, DELAI_FRAPPE);
    return () => window.clearTimeout(minuterie);
  }, [texte, ouvert, voitEntite, voitLieux]);

  if (!entite) return null;

  const fermer = () => { setOuvert(false); setTexte(''); setResultats(null); };
  const aller = (lien: string) => { fermer(); navigate(lien); };
  const nomLieu = (d: Demande) => `${d.lieu_code} · ${lang === 'nl' ? d.lieu_nom_nl : d.lieu_nom_fr}`;

  const groupes: { cle: string; titre: string; lignes: Ligne[] }[] = resultats ? [
    { cle: 'miennes', titre: t('nav.demandes'), lignes: resultats.miennes.map((d) => ({
      cle: `m${d.id}`, titre: d.numero, detail: nomLieu(d), lien: `/demandes?demande=${d.id}`,
      etat: (lang === 'nl' ? d.etat_libelle_nl : d.etat_libelle_fr) || t(`demande.etat.${d.etat}`) })) },
    { cle: 'entite', titre: t('nav.demandes.entite'), lignes: resultats.entite.slice(0, PAR_GROUPE).map((d) => ({
      cle: `e${d.id}`, titre: d.numero, detail: nomLieu(d), lien: `/demandes-entite?demande=${d.id}`,
      etat: t(`demande.etat_service.${d.etat}`) })) },
    { cle: 'lieux', titre: t('nav.patrimoine'), lignes: resultats.lieux.map((l) => ({
      cle: `l${l.id}`, titre: `${l.code} · ${tField(l as unknown as Record<string, unknown>, 'nom')}`,
      detail: t(`lieux.nature.${l.nature}`), lien: `/patrimoine?lieu=${l.id}` })) },
  ].filter((g) => g.lignes.length) : [];

  return (
    <>
      {enTete && (
        <Tooltip title={mobile ? undefined : t('recherche.bouton')}>
          <Button type="text" size={mobile ? 'middle' : 'small'} icon={<SearchOutlined />} aria-label={t('recherche.bouton')}
            aria-haspopup="dialog" onClick={() => setOuvert(true)} className="recherche-globale" data-visite="recherche" />
        </Tooltip>
      )}
      <Modal open={ouvert} onCancel={fermer} footer={null} title={t('recherche.titre')} destroyOnClose
        afterOpenChange={(o) => { if (o) champ.current?.focus(); }} width={mobile ? undefined : 560}>
        <Input ref={champ} allowClear prefix={<SearchOutlined aria-hidden />} value={texte} maxLength={100}
          onChange={(e) => setTexte(e.target.value)} placeholder={t('recherche.placeholder')} aria-label={t('recherche.titre')}
          onKeyDown={(e) => { if (e.key === 'Enter' && groupes[0]?.lignes[0]) aller(groupes[0].lignes[0].lien); }} />
        <div aria-live="polite" style={{ marginTop: 12, minHeight: 48 }}>
          {texte.trim().length < MIN_CARACTERES ? (
            <Typography.Text type="secondary">{t('recherche.min')}</Typography.Text>
          ) : chargement && !resultats ? (
            <div style={{ textAlign: 'center', padding: 12 }}><Spin aria-label={t('recherche.chargement')} /></div>
          ) : erreur ? (
            <Typography.Text type="danger">{t('common.error')}</Typography.Text>
          ) : !groupes.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('recherche.vide')} />
          ) : groupes.map((g) => (
            <section key={g.cle} aria-label={g.titre} style={{ marginBottom: 12 }}>
              <Typography.Text strong>{g.titre}</Typography.Text>
              <List size="small" dataSource={g.lignes} renderItem={(l) => (
                <List.Item style={{ paddingInline: 0 }}>
                  <Button type="link" onClick={() => aller(l.lien)} className="recherche-resultat"
                    style={{ height: 'auto', padding: '4px 0', textAlign: 'start', whiteSpace: 'normal', display: 'block', width: '100%' }}>
                    <span style={{ fontWeight: 600 }}>{l.titre}</span>
                    {l.etat && <Tag style={{ marginInlineStart: 8, whiteSpace: 'normal' }}>{l.etat}</Tag>}
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>{l.detail}</Typography.Text>
                  </Button>
                </List.Item>
              )} />
            </section>
          ))}
        </div>
      </Modal>
    </>
  );
}

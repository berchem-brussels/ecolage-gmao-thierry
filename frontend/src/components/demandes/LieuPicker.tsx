/**
 * Choix d'un lieu pour une demande (cahier des charges DEM-02 « Où », REF-03, REF-04) : le lieu proposé d'office
 * s'affiche avec son chemin ; « Changer » ouvre la recherche (nom FR ou NL, code, adresse, sans accents, noms des lieux
 * parents compris) et, au besoin, l'arbre des lieux de l'entité active. Un seul lieu par demande (DV-39).
 * Liste de résultats en boutons, pas en liste déroulante (standard v3.2, section 12.4).
 *
 * 0.5.1 (recette du 26/10/2026) : la liste des bâtiments se referme. « Parcourir la liste des bâtiments » ouvre et
 * referme la liste (aria-expanded) ; la carte de la liste a un bouton « Masquer la liste » ; « Annuler » apparaît dès
 * qu'une recherche ou la liste est ouverte, même sans lieu choisi. Le focus revient au bouton qui ouvre la liste.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button, Card, Input, Space, Spin, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { EnvironmentOutlined, SwapOutlined, ApartmentOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';
import api, { qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import type { Lieu } from '../../lieux';
import { type Etape, type LieuChoisi, cheminTexte } from '../../demandes';

interface LieuTrouve extends Lieu { chemin: Etape[] }

interface Props {
  value: LieuChoisi | null;
  onChange: (l: LieuChoisi) => void;
  /** Identifiant du titre qui nomme la zone (accessibilité). */
  labelledBy?: string;
}

const versChoix = (l: LieuTrouve): LieuChoisi => ({ id: l.id, code: l.code, nom_fr: l.nom_fr, nom_nl: l.nom_nl, chemin: l.chemin });

export default function LieuPicker({ value, onChange, labelledBy }: Props) {
  const { t, lang } = useI18n();
  const [ouvert, setOuvert] = useState(!value);
  const [q, setQ] = useState('');
  const [resultats, setResultats] = useState<LieuTrouve[] | null>(null);
  const [cherche, setCherche] = useState(false);
  const [arbre, setArbre] = useState<Lieu[] | null>(null);
  const [voirArbre, setVoirArbre] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout>>();
  const boutonArbre = useRef<HTMLButtonElement>(null);
  const idListe = useId();

  useEffect(() => { if (!value) setOuvert(true); }, [value]);

  // Recherche au fil de la frappe, une demande au serveur 300 ms après la dernière touche.
  useEffect(() => {
    clearTimeout(minuterie.current);
    if (!q.trim()) { setResultats(null); return undefined; }
    minuterie.current = setTimeout(async () => {
      setCherche(true);
      try { setResultats((await api.page<LieuTrouve>(`/lieux${qs({ q, is_active: 1, limit: 20 })}`)).data); } catch { setResultats([]); } finally { setCherche(false); }
    }, 300);
    return () => clearTimeout(minuterie.current);
  }, [q]);

  const ouvrirArbre = async () => {
    setVoirArbre(true);
    if (arbre) return;
    try { setArbre((await api.get<{ racines: Lieu[] }>('/lieux/arbre')).racines); } catch { setArbre([]); }
  };
  const masquerArbre = () => { setVoirArbre(false); boutonArbre.current?.focus(); };
  const basculerArbre = () => { if (voirArbre) masquerArbre(); else void ouvrirArbre(); };

  const nom = (l: { nom_fr: string; nom_nl: string; code: string }) => (lang === 'nl' ? l.nom_nl : l.nom_fr) || l.code;
  const choisir = (l: LieuChoisi) => { onChange(l); setOuvert(false); setQ(''); setResultats(null); setVoirArbre(false); };
  const annuler = () => { setQ(''); setResultats(null); setVoirArbre(false); if (value) setOuvert(false); };

  // Arbre : chaque nœud garde son chemin pour le choix.
  const { noeuds, parId } = useMemo(() => {
    const index = new Map<number, LieuChoisi>();
    const conv = (ls: Lieu[], parents: Etape[]): DataNode[] => ls.map((l) => {
      const chemin = [...parents, { id: l.id, code: l.code, nom_fr: l.nom_fr, nom_nl: l.nom_nl }];
      index.set(l.id, { id: l.id, code: l.code, nom_fr: l.nom_fr, nom_nl: l.nom_nl, chemin });
      return { key: l.id, title: `${nom(l)} (${l.code})`, children: conv(l.enfants || [], chemin) };
    });
    return { noeuds: conv(arbre || [], []), parId: index };
  }, [arbre, lang]);

  return (
    <div role="group" aria-labelledby={labelledBy}>
      {value && (
        <Card size="small" style={{ marginBottom: ouvert ? 12 : 0 }}>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Space align="start">
              <EnvironmentOutlined style={{ color: 'var(--app-primary)', fontSize: 20, marginTop: 2 }} aria-hidden />
              <div>
                <Typography.Text strong>{nom(value)}</Typography.Text>
                <div><Typography.Text type="secondary" style={{ fontSize: 13 }}>{cheminTexte(value.chemin, lang)}</Typography.Text></div>
                {value.source && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{t(`demande.lieu.source.${value.source}`)}</Typography.Text></div>}
              </div>
            </Space>
            {!ouvert && <Button icon={<SwapOutlined />} onClick={() => setOuvert(true)}>{t('demande.lieu.changer')}</Button>}
          </Space>
        </Card>
      )}
      {ouvert && (
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Input.Search allowClear value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('demande.lieu.chercher.placeholder')}
            aria-label={t('demande.lieu.chercher')} enterButton={false} size="large" />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('demande.lieu.chercher.aide')}</Typography.Text>
          {cherche && <Spin size="small" />}
          {resultats && !cherche && (
            resultats.length ? (
              <ul className="dem-resultats" aria-label={t('demande.lieu.resultats')}>
                {resultats.map((l) => (
                  <li key={l.id}>
                    <button type="button" className="dem-resultat" onClick={() => choisir(versChoix(l))}>
                      <span className="dem-resultat-nom">{nom(l)} <span className="dem-resultat-code">{l.code}</span></span>
                      <span className="dem-resultat-chemin">{cheminTexte(l.chemin, lang)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <Typography.Text type="secondary">{t('demande.lieu.aucun')}</Typography.Text>
          )}
          <Button ref={boutonArbre} type="link" onClick={basculerArbre} style={{ paddingInline: 0 }}
            aria-expanded={voirArbre} aria-controls={voirArbre ? idListe : undefined}
            icon={<ApartmentOutlined />}>
            {t('demande.lieu.arbre')} {voirArbre ? <UpOutlined aria-hidden style={{ fontSize: 11 }} /> : <DownOutlined aria-hidden style={{ fontSize: 11 }} />}
          </Button>
          {voirArbre && (
            <Card size="small" id={idListe} title={t('demande.lieu.arbre.titre')}
              extra={<Button size="small" icon={<UpOutlined />} onClick={masquerArbre}>{t('demande.lieu.arbre.masquer')}</Button>}>
              {arbre === null ? <Spin size="small" /> : arbre.length === 0
                ? <Typography.Text type="secondary">{t('demande.lieu.arbre.vide')}</Typography.Text>
                : (
                  <Tree treeData={noeuds} showLine blockNode selectable aria-label={t('demande.lieu.arbre.titre')}
                    onSelect={(keys) => { const l = parId.get(Number(keys[0])); if (l) choisir(l); }} />
                )}
            </Card>
          )}
          {(value || q || voirArbre) && <Button onClick={annuler}>{t('common.cancel')}</Button>}
        </Space>
      )}
    </div>
  );
}

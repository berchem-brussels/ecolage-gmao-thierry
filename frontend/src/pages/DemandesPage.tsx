/**
 * Listes des demandes d'intervention (version 0.5.0).
 * - « Mes demandes » (perimetre miennes ; cahier des charges SUI-01) : les demandes de la personne dans l'entité
 *   active, ouvertes en tête, état en libellé simple et couleur, date de dépôt, délai annoncé. Le filtre « Mon
 *   service » attend la lecture du service des agents (étape 39, DV-45, écart E-23).
 * - « Demandes de l'entité » (perimetre entite ; DV-46) : toutes les demandes de l'entité active, en lecture seule,
 *   pour le gestionnaire et le responsable, avec le nom du demandeur. La vraie liste du gestionnaire arrive à l'étape 8.
 * Une ligne s'ouvre en fiche latérale (adresse ?demande=id). Sur téléphone, une carte par demande.
 * 0.5.1 (recette du 26/10/2026) : plus de bouton « Nouvelle demande » dans la page ; restent celui du haut de l'écran
 * (AppLayout) et celui du menu.
 * 0.7.0 (DEM-04) : « Mes demandes » montre aussi les demandes suivies par « Moi aussi », marquées « Vous suivez aussi
 * cette demande », sans le nom du demandeur. La fiche du service technique cite les personnes qui suivent et leur remarque.
 * 0.7.0 (DEM-05) : la fiche montre les réponses aux questions de la catégorie, au demandeur comme au service technique.
 * 0.8.0 (DEM-09, DV-84) : la fiche montre les pièces jointes au demandeur, au bénéficiaire et au service technique
 * (pas à qui suit seulement) ; « Retirer » selon le droit rendu par le serveur, puis la fiche se recharge.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Grid, Input, List, Segmented, Space, Table, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import api, { ApiError, qs } from '../api';
import VignettesPieces from '../components/demandes/VignettesPieces';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { Icone } from '../referentiel';
import { type Demande, type Piece, COULEUR_ETAT, beneficiaireTexte, cheminTexte, dateDepot, dateSouhaitee, extrait, finAnnoncee } from '../demandes';

/** Mention « Danger » (0.7.0, DEM-06), à côté de l'état. */
export function DangerTag() {
  const { t } = useI18n();
  return <Tag color="red" style={{ marginInlineEnd: 0 }}>{t('demande.danger.tag')}</Tag>;
}

type Filtre = 'toutes' | 'ouvertes' | 'closes';

/** Étiquette d'état : libellé simple vu par le demandeur (cahier des charges, section 8.1). */
export function EtatTag({ etat }: { etat: Demande['etat'] }) {
  const { t } = useI18n();
  return <Tag color={COULEUR_ETAT[etat]} style={{ marginInlineEnd: 0 }}>{t(`demande.etat.${etat}`)}</Tag>;
}

/** Fiche d'une demande en lecture (0.5.0) ; la ligne du temps et les messages arrivent aux étapes 9 et 10. */
export function FicheDemande({ d, avecDemandeur, onChange }: { d: Demande; avecDemandeur: boolean; onChange?: () => void }) {
  const { t, lang } = useI18n();
  const retirer = async (p: Piece) => {
    try {
      await api.del(`/pieces/${p.id}`);
      message.success(t('demande.pieces.retiree'));
      onChange?.();
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : t('common.error'));
    }
  };
  const fin = finAnnoncee(d.delai_annonce, lang);
  const cat = lang === 'nl' ? d.categorie_libelle_nl : d.categorie_libelle_fr;
  const dom = lang === 'nl' ? d.domaine_libelle_nl : d.domaine_libelle_fr;
  return (
    <>
    {d.suivie === 1 && <Alert type="info" showIcon message={t('demande.suivie.fiche')} style={{ marginBottom: 12 }} />}
    {d.pour_moi === 1 && <Alert type="info" showIcon message={`${t('demande.pour_moi.fiche')} ${d.demandeur_prenom || ''} ${d.demandeur_nom || ''}.`} style={{ marginBottom: 12 }} />}
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label={t('demande.champ.numero')}><Typography.Text strong copyable>{d.numero}</Typography.Text></Descriptions.Item>
      <Descriptions.Item label={t('demande.champ.etat')}><EtatTag etat={d.etat} /></Descriptions.Item>
      {d.danger === 1 && <Descriptions.Item label={t('demande.champ.danger')}><Typography.Text type="danger" strong>{t('demande.danger.oui')}</Typography.Text></Descriptions.Item>}
      <Descriptions.Item label={t('demande.champ.quoi')}>{dom ? `${dom} › ${cat}` : cat}</Descriptions.Item>
      <Descriptions.Item label={t('demande.champ.ou')}>{cheminTexte(d.lieu_chemin, lang)}</Descriptions.Item>
      {(d.reponses || []).length > 0 && (
        <Descriptions.Item label={t('demande.champ.reponses')}>
          <Space direction="vertical" size={2}>
            {(d.reponses || []).map((r) => (
              <span key={r.question_id}>{lang === 'nl' ? r.question_nl : r.question_fr} <Typography.Text strong>{lang === 'nl' ? r.reponse_nl : r.reponse_fr}</Typography.Text></span>
            ))}
          </Space>
        </Descriptions.Item>
      )}
      <Descriptions.Item label={t('demande.champ.description')}>
        <span lang={d.langue} style={{ whiteSpace: 'pre-wrap' }}>{d.description}</span>
      </Descriptions.Item>
      {d.pieces && d.pieces.length > 0 && (
        <Descriptions.Item label={t('demande.champ.pieces')}>
          <VignettesPieces pieces={d.pieces} peutRetirer={(p) => p.peut_retirer === 1} onRetirer={retirer} label={t('demande.champ.pieces')} />
        </Descriptions.Item>
      )}
      {beneficiaireTexte(d) && d.pour_moi !== 1 && <Descriptions.Item label={t('demande.champ.pour')}>{beneficiaireTexte(d)}</Descriptions.Item>}
      <Descriptions.Item label={t('demande.champ.depot')}>{dateDepot(d.created_at)}</Descriptions.Item>
      {d.date_souhaitee && <Descriptions.Item label={t('demande.champ.date_souhaitee')}>{dateSouhaitee(d.date_souhaitee, lang)}</Descriptions.Item>}
      {d.creneau && <Descriptions.Item label={t('demande.champ.creneau')}>{d.creneau}</Descriptions.Item>}
      <Descriptions.Item label={t('demande.champ.delai')}>
        {d.danger === 1 && !d.delai_annonce ? t('demande.danger.envoyee') : fin ? `${t('demande.delai.indicatif')} ${fin}` : t('demande.delai.convenir')}
      </Descriptions.Item>
      {avecDemandeur && <Descriptions.Item label={t('demande.champ.demandeur')}>{d.demandeur_prenom} {d.demandeur_nom}</Descriptions.Item>}
      {avecDemandeur && d.suiveurs && d.suiveurs.length > 0 && (
        <Descriptions.Item label={t('demande.champ.suiveurs')}>
          <Space direction="vertical" size={6}>
            {d.suiveurs.map((s) => (
              <div key={s.user_id}>
                <div>{s.prenom} {s.nom} <Typography.Text type="secondary" style={{ fontSize: 12 }}>· {dateDepot(s.created_at)}</Typography.Text></div>
                {s.remarque && <Typography.Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>{s.remarque}</Typography.Text>}
              </div>
            ))}
          </Space>
        </Descriptions.Item>
      )}
    </Descriptions>
    </>
  );
}

export default function DemandesPage({ perimetre = 'miennes' }: { perimetre?: 'miennes' | 'entite' }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const mobile = screens.md === false;
  const [params, setParams] = useSearchParams();
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Demande[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fiche, setFiche] = useState<Demande | null>(null);
  const entiteMode = perimetre === 'entite';
  const taille = 20;

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const ouvertes = filtre === 'ouvertes' ? 1 : filtre === 'closes' ? 0 : undefined;
      const r = await api.page<Demande>(`/demandes${qs({ perimetre, ouvertes, q: q.trim() || undefined, limit: taille, offset: (page - 1) * taille })}`);
      setRows(r.data);
      setTotal(r.pagination.total);
    } catch { setRows([]); setTotal(0); } finally { setLoading(false); }
  }, [perimetre, filtre, q, page]);
  useEffect(() => { charger(); }, [charger, user?.entite_active_id]);

  const ouverte = params.get('demande');
  const chargerFiche = useCallback(() => {
    if (!ouverte) { setFiche(null); return; }
    api.get<Demande>(`/demandes/${ouverte}`).then(setFiche).catch(() => setFiche(null));
  }, [ouverte]);
  useEffect(() => { chargerFiche(); }, [chargerFiche]);
  const ouvrir = (d: Demande) => { const p = new URLSearchParams(params); p.set('demande', String(d.id)); setParams(p); };
  const fermer = () => { const p = new URLSearchParams(params); p.delete('demande'); setParams(p); };

  const cat = (d: Demande) => (lang === 'nl' ? d.categorie_libelle_nl : d.categorie_libelle_fr);
  const lieu = (d: Demande) => (lang === 'nl' ? d.lieu_nom_nl : d.lieu_nom_fr);
  const delai = (d: Demande) => (d.danger === 1 && !d.delai_annonce ? t('demande.danger.court') : finAnnoncee(d.delai_annonce, lang) || t('demande.delai.convenir.court'));
  const titre = entiteMode ? t('demande.entite.title') : t('demande.mes.title');

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0 }}>{titre}</Typography.Title>
      </div>
      <Typography.Paragraph type="secondary">{entiteMode ? t('demande.entite.intro') : t('demande.mes.intro')}</Typography.Paragraph>
      <Space wrap style={{ marginBottom: 12 }}>
        <Segmented aria-label={t('demande.filtre')} value={filtre} onChange={(v) => { setFiltre(v as Filtre); setPage(1); }}
          options={[{ value: 'toutes', label: t('demande.filtre.toutes') }, { value: 'ouvertes', label: t('demande.filtre.ouvertes') }, { value: 'closes', label: t('demande.filtre.closes') }]} />
        <Input.Search allowClear aria-label={t('demande.chercher')} placeholder={t('demande.chercher.placeholder')} style={{ width: mobile ? '100%' : 280 }}
          onSearch={(v) => { setQ(v); setPage(1); }} />
      </Space>
      {mobile ? (
        <List<Demande> loading={loading} dataSource={rows} locale={{ emptyText: t('demande.vide') }}
          pagination={total > taille ? { current: page, pageSize: taille, total, onChange: setPage, size: 'small' } : false}
          renderItem={(d) => (
            <List.Item style={{ padding: '6px 0' }}>
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
                    <Button type="link" onClick={() => ouvrir(d)} style={{ paddingInline: 0, fontWeight: 600 }}>{d.numero}</Button>
                    <Space size={4}>{d.danger === 1 && <DangerTag />}<EtatTag etat={d.etat} /></Space>
                  </Space>
                  <Typography.Text><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</Typography.Text>
                  {d.suivie === 1 && <Tag color="green" style={{ alignSelf: 'flex-start' }}>{t('demande.suivie.tag')}</Tag>}
                  {d.pour_moi === 1 && <Tag color="purple" style={{ alignSelf: 'flex-start' }}>{t('demande.pour_moi.tag')}</Tag>}
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{lieu(d)} · {dateDepot(d.created_at)}</Typography.Text>
                  {entiteMode && <Typography.Text style={{ fontSize: 13 }}>{d.demandeur_prenom} {d.demandeur_nom}</Typography.Text>}
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t('demande.champ.delai')} : {delai(d)}</Typography.Text>
                </Space>
              </Card>
            </List.Item>
          )} />
      ) : (
        <Table<Demande> rowKey="id" size="middle" loading={loading} dataSource={rows} locale={{ emptyText: t('demande.vide') }}
          scroll={{ x: 'max-content' }}
          pagination={total > taille ? { current: page, pageSize: taille, total, onChange: setPage, showSizeChanger: false } : false}
          rowClassName={(d) => (d.ouverte ? '' : 'dem-close')}
          columns={[
            { title: t('demande.champ.numero'), key: 'numero', render: (_, d) => <Button type="link" onClick={() => ouvrir(d)} style={{ paddingInline: 0 }}>{d.numero}</Button> },
            { title: t('demande.champ.quoi'), key: 'quoi', render: (_, d) => (
              <div style={{ maxWidth: 360 }}>
                <div><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</div>
                {d.suivie === 1 && <Tag color="green" style={{ marginBlock: 2 }}>{t('demande.suivie.tag')}</Tag>}
                {d.pour_moi === 1 && <Tag color="purple" style={{ marginBlock: 2 }}>{t('demande.pour_moi.tag')}</Tag>}
                <Typography.Text type="secondary" style={{ fontSize: 12 }} lang={d.langue}>{extrait(d.description)}</Typography.Text>
              </div>
            ) },
            { title: t('demande.champ.ou'), key: 'ou', render: (_, d) => (
              <div>
                <div>{lieu(d)}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{cheminTexte(d.lieu_chemin.slice(0, -1), lang)}</Typography.Text>
              </div>
            ) },
            ...(entiteMode ? [{ title: t('demande.champ.demandeur'), key: 'demandeur', render: (_: unknown, d: Demande) => `${d.demandeur_prenom} ${d.demandeur_nom}` }] : []),
            { title: t('demande.champ.etat'), key: 'etat', render: (_, d) => <Space size={4} wrap>{d.danger === 1 && <DangerTag />}<EtatTag etat={d.etat} /></Space> },
            { title: t('demande.champ.depot'), key: 'depot', render: (_, d) => dateDepot(d.created_at) },
            { title: t('demande.champ.delai'), key: 'delai', render: (_, d) => delai(d) },
          ]} />
      )}
      <Drawer open={!!fiche} onClose={fermer} width={mobile ? '100%' : 520} title={fiche ? `${t('demande.fiche')} ${fiche.numero}` : ''}>
        {fiche && <FicheDemande d={fiche} avecDemandeur={entiteMode} onChange={chargerFiche} />}
        {fiche && !entiteMode && <Typography.Paragraph type="secondary" style={{ marginTop: 12, fontSize: 13 }}>{t('demande.fiche.suite')}</Typography.Paragraph>}
      </Drawer>
    </div>
  );
}

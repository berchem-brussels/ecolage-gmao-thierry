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
 * 0.9.0 (étape 8) : « Demandes de l'entité » est la liste du service technique (GestionDemandesPage : tableau de
 * bord, filtres, tris, vues, qualification). La fiche du service montre l'état avec le libellé du service, les
 * échéances, le retard et la qualification (priorité proposée, motif, durée, consignes, qui a qualifié).
 * 0.13.0 (étape 8 ter, DV-101) : la fiche du service montre la photo de l'endroit, sous « Où ? ».
 * 0.14.0 (étape 9, point 5 ; SUI-02, SUI-05, CYC-04) : l'état vu par le demandeur porte le libellé réglé par l'entité ;
 * la fiche montre les compléments (au demandeur et au service) ; « Mes demandes » ajoute la ligne du temps et les
 * boutons « Compléter ma demande » et « Annuler ma demande » selon les droits rendus par le serveur.
 * 0.15.0 (étape 10, point 2 ; SUI-04) : fil de messages sur la fiche (FilMessages), entre la fiche et la ligne du temps ;
 * « n nouveaux messages » sur chaque demande de la liste ; ?messages=non_lus (lien de l'accueil) ne garde que les
 * demandes avec un message non lu, filtre retiré par la croix de son étiquette. Point 5 (SUI-09) : « Suivre cette
 * demande » et « Ne plus suivre » (SuiviDemande) ; la fiche du service dit si chaque personne suit par « Moi aussi » ou
 * par abonnement.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Grid, Input, List, Segmented, Space, Table, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { MessageOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../api';
import VignettesPieces from '../components/demandes/VignettesPieces';
import PhotoLieu from '../components/demandes/PhotoLieu';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { Icone } from '../referentiel';
import { type Demande, type Piece, COULEUR_ETAT, beneficiaireTexte, cheminTexte, dateDepot, dateSouhaitee, duree, extrait, finAnnoncee, instant } from '../demandes';
import GestionDemandesPage from './GestionDemandesPage';
import HistoriqueDemande from '../components/demandes/HistoriqueDemande';
import FilMessages from '../components/demandes/FilMessages';
import SuiviDemande from '../components/demandes/SuiviDemande';
import { AnnulerForm, AvisDemandeur, AvisDonne, BoutonsDemandeur, CompleterForm, ReouvrirForm } from '../components/demandes/ActionsDemandeur';

/** Mention « Danger » (0.7.0, DEM-06), à côté de l'état. */
export function DangerTag() {
  const { t } = useI18n();
  return <Tag color="red" style={{ marginInlineEnd: 0 }}>{t('demande.danger.tag')}</Tag>;
}

type Filtre = 'toutes' | 'ouvertes' | 'closes';

/** Messages non lus d'une demande (0.15.0, point 2) : « 1 nouveau message », « 3 nouveaux messages » ; rien à zéro. */
export function NonLusTag({ n }: { n?: number }) {
  const { t } = useI18n();
  if (!n) return null;
  return <Tag color="blue" icon={<MessageOutlined aria-hidden />} style={{ marginInlineEnd: 0 }}>{n === 1 ? t('fil.non_lus.un') : t('fil.non_lus').replace('{n}', String(n))}</Tag>;
}

/**
 * Étiquette d'état : libellé simple vu par le demandeur (cahier des charges, section 8.1) ; libellé du service
 * technique (« À qualifier », « Qualifiée »…) avec service (0.9.0).
 */
export function EtatTag({ etat, service = false, d }: { etat: Demande['etat']; service?: boolean; d?: Pick<Demande, 'etat_libelle_fr' | 'etat_libelle_nl'> }) {
  const { t, lang } = useI18n();
  // 0.14.0 (CYC-04) : le demandeur lit le libellé réglé par l'entité quand le serveur le rend.
  const entite = !service && d ? (lang === 'nl' ? d.etat_libelle_nl : d.etat_libelle_fr) : null;
  // Libellé long (« Reçue par le service technique ») : retour à la ligne permis, la fiche tient dans 320 px (0.14.0).
  return <Tag color={COULEUR_ETAT[etat]} style={{ marginInlineEnd: 0, whiteSpace: 'normal' }}>{entite || t(`demande.${service ? 'etat_service' : 'etat'}.${etat}`)}</Tag>;
}

/** Fiche d'une demande en lecture (0.5.0) ; la ligne du temps et les messages arrivent aux étapes 9 et 10. */
export function FicheDemande({ d, avecDemandeur, service = false, onChange }: { d: Demande; avecDemandeur: boolean; service?: boolean; onChange?: () => void }) {
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
      <Descriptions.Item label={t('demande.champ.etat')}>
        <EtatTag etat={d.etat} service={service} d={d} />
        {service && d.etat_depuis && <Typography.Text type="secondary" style={{ fontSize: 13 }}> {t('cycle.depuis')} {instant(d.etat_depuis)}</Typography.Text>}
      </Descriptions.Item>
      {service && d.cause_code && <Descriptions.Item label={t('cycle.motif.cause_panne')}>{lang === 'nl' ? d.cause_libelle_nl : d.cause_libelle_fr}</Descriptions.Item>}
      {service && (d.avis || []).length > 0 && (
        <Descriptions.Item label={t('avis.titre.service')}>
          <Space direction="vertical" size={8}>{(d.avis || []).map((a) => <AvisDonne key={a.id} a={a} />)}</Space>
        </Descriptions.Item>
      )}
      {service && d.compte_rendu && <Descriptions.Item label={t('cycle.compte_rendu')}><span style={{ whiteSpace: 'pre-wrap' }}>{d.compte_rendu}</span></Descriptions.Item>}
      {service && d.priorite && (
        <Descriptions.Item label={t('gest.col.priorite')}>
          <Space size={6} wrap>
            <Tag style={{ marginInlineEnd: 0 }}>{d.priorite}</Tag>
            {d.priorite_proposee && d.priorite_proposee !== d.priorite && <Typography.Text type="secondary">{t('qualif.proposee')} {d.priorite_proposee}</Typography.Text>}
          </Space>
          {d.motif_priorite && <div><Typography.Text type="secondary">{t('qualif.motif')} : </Typography.Text><span style={{ whiteSpace: 'pre-wrap' }}>{d.motif_priorite}</span></div>}
        </Descriptions.Item>
      )}
      {service && d.ouverte === 1 && (
        <Descriptions.Item label={t('gest.fiche.echeances')}>
          <Space direction="vertical" size={2}>
            {d.prise_en_charge_le && <span className={d.etat === 'a_qualifier' && d.retard ? 'dem-retard' : undefined}>{t('gest.echeance.prise_en_charge')} : {instant(d.prise_en_charge_le)}</span>}
            <span className={d.etat !== 'a_qualifier' && d.retard ? 'dem-retard' : undefined}>{t('gest.echeance.fin')} : {d.echeance_le ? instant(d.echeance_le) : t('demande.delai.convenir')}</span>
            {d.echeance_type === 'suspendu' && <Tag color="orange" style={{ alignSelf: 'flex-start' }}>{t('gest.echeance.suspendu')}</Tag>}
            {d.echeance_type === 'suspendu' && <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t('gest.echeance.suspendu.aide')}</Typography.Text>}
            {d.retard === 1 && <Tag color="red" style={{ alignSelf: 'flex-start' }}>{t('gest.retard')}</Tag>}
          </Space>
        </Descriptions.Item>
      )}
      {d.danger === 1 && <Descriptions.Item label={t('demande.champ.danger')}><Typography.Text type="danger" strong>{t('demande.danger.oui')}</Typography.Text></Descriptions.Item>}
      <Descriptions.Item label={t('demande.champ.quoi')}>{dom ? `${dom} › ${cat}` : cat}</Descriptions.Item>
      <Descriptions.Item label={t('demande.champ.ou')}>{cheminTexte(d.lieu_chemin, lang)}</Descriptions.Item>
      {service && d.photo_lieu && <Descriptions.Item label={t('demande.photo_lieu')}><PhotoLieu photo={d.photo_lieu} /></Descriptions.Item>}
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
      {(d.complements || []).length > 0 && (
        <Descriptions.Item label={t('demande.champ.complements')}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {(d.complements || []).map((c) => (
              <div key={c.id}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{dateDepot(c.created_at)}{c.auteur === 'beneficiaire' ? ` · ${t('demande.complement.beneficiaire')}` : ''}</Typography.Text>
                <div lang={c.langue} style={{ whiteSpace: 'pre-wrap' }}>{c.texte}</div>
              </div>
            ))}
          </Space>
        </Descriptions.Item>
      )}
      {d.pieces && d.pieces.length > 0 && (
        <Descriptions.Item label={t('demande.champ.pieces')}>
          <VignettesPieces pieces={d.pieces} peutRetirer={(p) => p.peut_retirer === 1} onRetirer={retirer} label={t('demande.champ.pieces')} />
        </Descriptions.Item>
      )}
      {beneficiaireTexte(d) && d.pour_moi !== 1 && <Descriptions.Item label={t('demande.champ.pour')}>{beneficiaireTexte(d)}</Descriptions.Item>}
      <Descriptions.Item label={t('demande.champ.depot')}>{dateDepot(d.created_at)}</Descriptions.Item>
      {d.date_souhaitee && <Descriptions.Item label={t('demande.champ.date_souhaitee')}>{dateSouhaitee(d.date_souhaitee, lang)}</Descriptions.Item>}
      {d.creneau && <Descriptions.Item label={t('demande.champ.creneau')}>{d.creneau}</Descriptions.Item>}
      {/* 0.15.0 (R3 de la recette de la 0.14.0) : plus de délai annoncé sur une demande fermée. */}
      {d.ouverte !== 0 && (
        <Descriptions.Item label={t('demande.champ.delai')}>
          {d.danger === 1 && !d.delai_annonce ? t('demande.danger.envoyee') : fin ? `${t('demande.delai.indicatif')} ${fin}` : t('demande.delai.convenir')}
        </Descriptions.Item>
      )}
      {avecDemandeur && <Descriptions.Item label={t('demande.champ.demandeur')}>{d.demandeur_prenom} {d.demandeur_nom}</Descriptions.Item>}
      {service && d.duree_estimee_minutes ? <Descriptions.Item label={t('qualif.duree')}>{duree(d.duree_estimee_minutes)}</Descriptions.Item> : null}
      {service && d.consignes ? <Descriptions.Item label={t('qualif.consignes')}><span style={{ whiteSpace: 'pre-wrap' }}>{d.consignes}</span></Descriptions.Item> : null}
      {service && d.qualifiee_le ? (
        <Descriptions.Item label={t('gest.fiche.qualifiee')}>
          {dateDepot(d.qualifiee_le)}{d.qualifiee_par_nom ? ` · ${d.qualifiee_par_prenom || ''} ${d.qualifiee_par_nom}` : ''}
          {d.photos_visibles === 0 && <div><Typography.Text type="secondary">{t('qualif.photos.masquees')}</Typography.Text></div>}
        </Descriptions.Item>
      ) : null}
      {avecDemandeur && d.suiveurs && d.suiveurs.length > 0 && (
        <Descriptions.Item label={t('demande.champ.suiveurs')}>
          <Space direction="vertical" size={6}>
            {d.suiveurs.map((s) => (
              <div key={s.user_id}>
                <div>{s.prenom} {s.nom} <Typography.Text type="secondary" style={{ fontSize: 12 }}>· {s.source === 'abonnement' ? t('suivi.source.abonnement') : t('suivi.source.moi_aussi')} · {dateDepot(s.created_at)}</Typography.Text></div>
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

/** « Mes demandes » (perimetre miennes) ou liste du service technique (perimetre entite, 0.9.0). */
export default function DemandesPage({ perimetre = 'miennes' }: { perimetre?: 'miennes' | 'entite' }) {
  return perimetre === 'entite' ? <GestionDemandesPage /> : <MesDemandes />;
}

function MesDemandes() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const screens = Grid.useBreakpoint();
  const mobile = screens.md === false;
  const [params, setParams] = useSearchParams();
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [q, setQ] = useState('');
  /** 0.15.0 (point 2) : ?messages=non_lus, lien « n demandes ont un nouveau message » de l'accueil. */
  const nonLus = params.get('messages') === 'non_lus';
  const sansFiltreMessages = () => { const p = new URLSearchParams(params); p.delete('messages'); setParams(p); };
  const [rows, setRows] = useState<Demande[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fiche, setFiche] = useState<Demande | null>(null);
  /** 0.14.0, point 5 : complément ou annulation en cours de saisie ; ligne du temps rechargée après. */
  const [action, setAction] = useState<'completer' | 'annuler' | 'reouvrir' | null>(null);
  const [histo, setHisto] = useState(0);
  const taille = 20;

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const ouvertes = filtre === 'ouvertes' ? 1 : filtre === 'closes' ? 0 : undefined;
      const r = await api.page<Demande>(`/demandes${qs({ perimetre: 'miennes', ouvertes, messages: nonLus ? 'non_lus' : undefined, q: q.trim() || undefined, limit: taille, offset: (page - 1) * taille })}`);
      setRows(r.data);
      setTotal(r.pagination.total);
    } catch { setRows([]); setTotal(0); } finally { setLoading(false); }
  }, [filtre, q, page, nonLus]);
  useEffect(() => { charger(); }, [charger, user?.entite_active_id]);

  const ouverte = params.get('demande');
  const chargerFiche = useCallback(() => {
    if (!ouverte) { setFiche(null); setAction(null); return; }
    api.get<Demande>(`/demandes/${ouverte}`).then(setFiche).catch(() => setFiche(null));
  }, [ouverte]);
  const apresAction = (d: Demande) => { setFiche(d); setAction(null); setHisto((n) => n + 1); charger(); };
  useEffect(() => { chargerFiche(); }, [chargerFiche]);
  const ouvrir = (d: Demande) => { const p = new URLSearchParams(params); p.set('demande', String(d.id)); setParams(p); };
  const fermer = () => { setAction(null); const p = new URLSearchParams(params); p.delete('demande'); setParams(p); };

  const cat = (d: Demande) => (lang === 'nl' ? d.categorie_libelle_nl : d.categorie_libelle_fr);
  const lieu = (d: Demande) => (lang === 'nl' ? d.lieu_nom_nl : d.lieu_nom_fr);
  const delai = (d: Demande) => (d.ouverte === 0 ? t('demande.delai.sans_objet')
    : d.danger === 1 && !d.delai_annonce ? t('demande.danger.court') : finAnnoncee(d.delai_annonce, lang) || t('demande.delai.convenir.court'));
  const titre = t('demande.mes.title');

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0 }}>{titre}</Typography.Title>
      </div>
      <Typography.Paragraph type="secondary">{t('demande.mes.intro')}</Typography.Paragraph>
      {nonLus && (
        <div style={{ marginBottom: 12 }}>
          <Tag color="blue" closable onClose={sansFiltreMessages} closeIcon={<span aria-label={t('common.close')}>×</span>} style={{ whiteSpace: 'normal' }}>{t('fil.filtre')}</Tag>
        </div>
      )}
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
                    <Space size={4} wrap>{d.danger === 1 && <DangerTag />}<EtatTag etat={d.etat} d={d} /><NonLusTag n={d.messages_non_lus} /></Space>
                  </Space>
                  <Typography.Text><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</Typography.Text>
                  {d.suivie === 1 && <Tag color="green" style={{ alignSelf: 'flex-start' }}>{t('demande.suivie.tag')}</Tag>}
                  {d.pour_moi === 1 && <Tag color="purple" style={{ alignSelf: 'flex-start' }}>{t('demande.pour_moi.tag')}</Tag>}
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{lieu(d)} · {dateDepot(d.created_at)}</Typography.Text>
                  {d.ouverte !== 0 && <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t('demande.champ.delai')} : {delai(d)}</Typography.Text>}
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
            { title: t('demande.champ.etat'), key: 'etat', render: (_, d) => <Space size={4} wrap>{d.danger === 1 && <DangerTag />}<EtatTag etat={d.etat} d={d} /><NonLusTag n={d.messages_non_lus} /></Space> },
            { title: t('demande.champ.depot'), key: 'depot', render: (_, d) => dateDepot(d.created_at) },
            { title: t('demande.champ.delai'), key: 'delai', render: (_, d) => delai(d) },
          ]} />
      )}
      <Drawer open={!!fiche} onClose={fermer} width={mobile ? '100%' : 520}
        title={fiche ? `${action ? t(`demandeur.${action}`) : t('demande.fiche')} ${fiche.numero}` : ''}>
        {fiche && (action === 'completer'
          ? <CompleterForm key={`c-${fiche.id}`} d={fiche} onCancel={() => setAction(null)} onDone={apresAction} />
          : action === 'annuler'
            ? <AnnulerForm key={`a-${fiche.id}`} d={fiche} onCancel={() => setAction(null)} onDone={apresAction} />
            : action === 'reouvrir'
              ? <ReouvrirForm key={`r-${fiche.id}`} d={fiche} onCancel={() => setAction(null)} onDone={apresAction} />
              : (
              <>
                <AvisDemandeur key={`v-${fiche.id}-${fiche.avis?.length || 0}`} d={fiche} onDone={apresAction} />
                <BoutonsDemandeur d={fiche} onChoisir={setAction} />
                <SuiviDemande d={fiche} onChange={(n) => { if (n) setFiche(n); else fermer(); charger(); }} />
                <FicheDemande d={fiche} avecDemandeur={false} onChange={chargerFiche} />
                <FilMessages key={`f-${fiche.id}`} d={fiche} service={false} onLu={charger} />
                <HistoriqueDemande demandeId={fiche.id} service={false} rafraichir={histo} />
              </>
            ))}
      </Drawer>
    </div>
  );
}

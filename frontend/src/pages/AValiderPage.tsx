/**
 * Demandes à valider (version 0.16.0, étape 11, point 2 ; cahier des charges DEM-15, ROL-04), pour le chef de service
 * (rôle « Valideur ») : les demandes « En validation » de ses services, les plus anciennes en tête, et pour chacune une
 * fiche avec « Valider et transmettre » (commentaire facultatif, lu par le demandeur) et « Refuser la demande » (motif
 * obligatoire, lu par le demandeur). Le serveur dit qui valide quoi (GET /api/demandes/a-valider, transitions_valideur
 * de la fiche) ; le suppléant les voit pendant sa période.
 * Sur téléphone : une carte par demande, fiche en plein écran, boutons qui passent à la ligne (DV-102).
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Drawer, Grid, Input, List, Space, Table, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import api, { qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { Icone } from '../referentiel';
import { type Demande, type Transition, cheminTexte, dateDepot, extrait } from '../demandes';
import { EtatTag, FicheDemande } from './DemandesPage';
import HistoriqueDemande from '../components/demandes/HistoriqueDemande';
import { ActionsDemande, ChangerEtatForm } from '../components/demandes/ChangerEtat';

export default function AValiderPage() {
  const { t, lang, tField } = useI18n();
  const { user } = useAuth();
  const mobile = Grid.useBreakpoint().md === false;
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState<Demande[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [fiche, setFiche] = useState<Demande | null>(null);
  const [passage, setPassage] = useState<Transition | null>(null);
  const [histo, setHisto] = useState(0);
  const taille = 20;

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.page<Demande>(`/demandes/a-valider${qs({ q: q.trim() || undefined, limit: taille, offset: (page - 1) * taille })}`);
      setRows(r.data);
      setTotal(r.pagination.total);
    } catch { setRows([]); setTotal(0); } finally { setLoading(false); }
  }, [q, page]);
  useEffect(() => { charger(); }, [charger, user?.entite_active_id]);

  const ouverte = params.get('demande');
  useEffect(() => {
    setPassage(null);
    if (!ouverte) { setFiche(null); return; }
    api.get<Demande>(`/demandes/${ouverte}`).then(setFiche).catch(() => setFiche(null));
  }, [ouverte]);
  const ouvrir = (d: Demande) => { const p = new URLSearchParams(params); p.set('demande', String(d.id)); setParams(p); };
  const fermer = () => { setPassage(null); const p = new URLSearchParams(params); p.delete('demande'); setParams(p); };
  const apres = (d: Demande) => { setFiche(d); setPassage(null); setHisto((n) => n + 1); charger(); };

  const cat = (d: Demande) => (lang === 'nl' ? d.categorie_libelle_nl : d.categorie_libelle_fr);
  const demandeur = (d: Demande) => `${d.demandeur_prenom || ''} ${d.demandeur_nom || ''}`.trim();
  const service = (d: Demande) => (d.service_nom_fr ? tField(d as unknown as Record<string, unknown>, 'service_nom') : '');
  const passages = fiche?.transitions_valideur || [];

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 8 }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0 }}>{t('nav.avalider')}</Typography.Title>
      </div>
      <Typography.Paragraph type="secondary">{t('avalider.intro')}</Typography.Paragraph>
      <Input.Search allowClear aria-label={t('demande.chercher')} placeholder={t('avalider.chercher')} style={{ width: mobile ? '100%' : 320, marginBottom: 12 }}
        onSearch={(v) => { setQ(v); setPage(1); }} />
      {mobile ? (
        <List<Demande> loading={loading} dataSource={rows} locale={{ emptyText: t('avalider.vide') }}
          pagination={total > taille ? { current: page, pageSize: taille, total, onChange: setPage, size: 'small' } : false}
          renderItem={(d) => (
            <List.Item style={{ padding: '6px 0' }}>
              <Card size="small" style={{ width: '100%' }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Button type="link" onClick={() => ouvrir(d)} style={{ paddingInline: 0, fontWeight: 600, alignSelf: 'flex-start' }}>{d.numero}</Button>
                  <Typography.Text><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</Typography.Text>
                  <Typography.Text style={{ fontSize: 13 }}>{demandeur(d)}{service(d) ? ` · ${service(d)}` : ''}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{cheminTexte(d.lieu_chemin, lang)} · {dateDepot(d.created_at)}</Typography.Text>
                </Space>
              </Card>
            </List.Item>
          )} />
      ) : (
        <Table<Demande> rowKey="id" size="middle" loading={loading} dataSource={rows} locale={{ emptyText: t('avalider.vide') }} scroll={{ x: 'max-content' }}
          pagination={total > taille ? { current: page, pageSize: taille, total, onChange: setPage, showSizeChanger: false } : false}
          columns={[
            { title: t('demande.champ.numero'), key: 'numero', render: (_, d) => <Button type="link" onClick={() => ouvrir(d)} style={{ paddingInline: 0 }}>{d.numero}</Button> },
            { title: t('demande.champ.quoi'), key: 'quoi', render: (_, d) => (
              <div style={{ maxWidth: 360 }}>
                <div><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }} lang={d.langue}>{extrait(d.description)}</Typography.Text>
              </div>
            ) },
            { title: t('demande.champ.demandeur'), key: 'demandeur', render: (_, d) => (
              <div><div>{demandeur(d)}</div>{service(d) && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{service(d)}</Typography.Text>}</div>
            ) },
            { title: t('demande.champ.ou'), key: 'ou', render: (_, d) => cheminTexte(d.lieu_chemin, lang) },
            { title: t('demande.champ.depot'), key: 'depot', render: (_, d) => dateDepot(d.created_at) },
          ]} />
      )}
      <Drawer open={!!fiche} onClose={fermer} width={mobile ? '100%' : 520}
        title={fiche ? `${passage ? t(passage.vers === 'a_qualifier' ? 'cycle.action.valider' : 'cycle.action.refusee_validation') : t('avalider.fiche')} ${fiche.numero}` : ''}>
        {fiche && (passage
          ? <ChangerEtatForm key={`p-${fiche.id}-${passage.vers}`} d={fiche} transition={passage} libelles="demandeur" onCancel={() => setPassage(null)} onDone={apres} />
          : (
            <>
              {passages.length > 0
                ? <ActionsDemande d={fiche} passages={passages} titre="avalider.decision" onChoisir={setPassage} />
                : <Alert type="info" showIcon style={{ marginBottom: 12 }} message={<span>{t('avalider.plus')} <EtatTag etat={fiche.etat} d={fiche} /></span>} />}
              <FicheDemande d={fiche} avecDemandeur />
              <HistoriqueDemande demandeId={fiche.id} service={false} rafraichir={histo} />
            </>
          ))}
      </Drawer>
    </div>
  );
}

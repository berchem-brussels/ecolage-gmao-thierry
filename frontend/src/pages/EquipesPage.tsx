/**
 * Équipes et ouvriers du service technique (version 0.19.0, étape 15, point 2 ; cahier des charges ROL-05 ; DV-28).
 * Lecture : gestionnaire, responsable, chef d'équipe (« equipes:lire ») ; réglage : responsable (« equipes:gerer »).
 * - Onglet Équipes : liste (tableau sur grand écran, une colonne empilée sous 768 px) ; fiche en volet : code, noms FR
 *   et NL, chef (personnes qui peuvent diriger), membres (ouvriers de l'entité), horaire de l'entité ou horaire propre,
 *   un créneau par jour, week-end compris. Désactivation avec motif, réactivation.
 * - Onglet Ouvriers : corps de métier, compétences et équipes de chaque ouvrier ; filtre par équipe ; fiche en volet.
 * - Onglet Prestataires (point 3, REF-07) : gestionnaire et responsable seulement (PrestatairesOnglet).
 * Le serveur refait chaque contrôle (rôles, cloison, horaire) ; un refus s'affiche dans le volet, la saisie reste (ERG-09).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Drawer, Form, Grid, Input, Modal, Radio, Select, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import api, { ApiError, qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { hasPermission, useRoles } from '../useRoles';
import { texteObligatoire } from '../validation';
import PrestatairesOnglet from '../components/PrestatairesOnglet';

interface Personne { id: number; prenom: string; nom: string }
interface Valeur { id: number; code: string; libelle_fr: string; libelle_nl: string; is_active: number }
interface Creneau { jour: number; debut: string; fin: string }
export interface Equipe {
  id: number; code: string; nom_fr: string; nom_nl: string; chef_id: number | null; chef_prenom: string | null; chef_nom: string | null;
  ordre: number; is_active: number; motif_desactivation: string | null; is_demo: number; nb_membres: number; membres: Personne[]; horaire: Creneau[];
}
export interface Ouvrier extends Personne {
  corps_metier: Valeur | null; competences: Valeur[]; equipes: { id: number; code: string; nom_fr: string; nom_nl: string }[];
  chef_de: { id: number; code: string; nom_fr: string; nom_nl: string }[]; peut_diriger: 0 | 1;
}
interface Saisie { code: string; nom_fr: string; nom_nl: string; chef_id?: number | null; membres?: number[] }

const JOURS = [1, 2, 3, 4, 5, 6, 7];
/** Une ligne par jour de la semaine : cochée = travaillé, avec son créneau. */
type Ligne = { actif: boolean; debut: string; fin: string };
const lignesDe = (h: Creneau[]): Record<number, Ligne> => Object.fromEntries(JOURS.map((j) => {
  const c = h.find((x) => x.jour === j);
  return [j, { actif: !!c, debut: c?.debut || '07:00', fin: c?.fin || (j >= 6 ? '13:00' : '15:30') }];
}));

export default function EquipesPage() {
  const { t, tField, hint } = useI18n();
  const { roles } = useAuth();
  const catalogue = useRoles();
  const gerer = hasPermission(catalogue, roles, 'equipes:gerer');
  const voitPrestataires = hasPermission(catalogue, roles, 'prestataires:lire');
  const gererPrestataires = hasPermission(catalogue, roles, 'prestataires:gerer');
  const [nbPrestataires, setNbPrestataires] = useState<number | null>(null);
  const mobile = Grid.useBreakpoint().md === false;
  const [params, setParams] = useSearchParams();
  const demande = params.get('onglet');
  const onglet = demande === 'ouvriers' ? 'ouvriers' : demande === 'prestataires' && voitPrestataires ? 'prestataires' : 'equipes';
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [ouvriers, setOuvriers] = useState<Ouvrier[]>([]);
  const [corps, setCorps] = useState<Valeur[]>([]);
  const [competences, setCompetences] = useState<Valeur[]>([]);
  const [filtreEquipe, setFiltreEquipe] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fiche, setFiche] = useState<Equipe | 'nouvelle' | null>(null);
  const [ficheOuvrier, setFicheOuvrier] = useState<Ouvrier | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [horairePropre, setHorairePropre] = useState(false);
  const [lignes, setLignes] = useState<Record<number, Ligne>>(lignesDe([]));
  const [desactiver, setDesactiver] = useState<Equipe | null>(null);
  const [motif, setMotif] = useState('');
  const [form] = Form.useForm<Saisie>();
  const [formOuvrier] = Form.useForm<{ corps_metier_id?: number | null; competences?: number[] }>();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, o] = await Promise.all([
        api.page<Equipe>(`/equipes${qs({ limit: 200 })}`),
        api.page<Ouvrier>(`/ouvriers${qs({ limit: 200 })}`),
      ]);
      setEquipes(e.data);
      setOuvriers(o.data);
    } catch (e) { fail(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!voitPrestataires) return;
    api.page<unknown>(`/prestataires${qs({ limit: 1 })}`).then((r) => setNbPrestataires(r.pagination.total)).catch(() => setNbPrestataires(null));
  }, [voitPrestataires]);
  useEffect(() => {
    api.page<Valeur>(`/listes-valeurs${qs({ liste: 'corps_metier', limit: 200 })}`).then((r) => setCorps(r.data)).catch(() => setCorps([]));
    api.page<Valeur>(`/listes-valeurs${qs({ liste: 'competence', limit: 200 })}`).then((r) => setCompetences(r.data)).catch(() => setCompetences([]));
  }, []);

  const libelle = (v: Valeur) => tField(v as unknown as Record<string, unknown>, 'libelle');
  const nomEquipe = (e: { nom_fr: string; nom_nl: string }) => tField(e as unknown as Record<string, unknown>, 'nom');
  const personne = (p: Personne) => `${p.prenom} ${p.nom}`;
  const courant = fiche && fiche !== 'nouvelle' ? fiche : null;

  /** Choix proposés : valeurs actives, plus celles déjà portées (gardées même désactivées, comme le serveur). */
  const choix = (liste: Valeur[], gardees: number[]) => liste.filter((v) => v.is_active || gardees.includes(v.id)).map((v) => ({ value: v.id, label: libelle(v) }));
  const optionsChef = ouvriers.filter((o) => o.peut_diriger).map((o) => ({ value: o.id, label: personne(o) }));
  const optionsMembres = ouvriers.map((o) => ({ value: o.id, label: personne(o) }));

  const resumeHoraire = (h: Creneau[]) => (h.length === 0
    ? <Typography.Text type="secondary">{t('equipes.horaire.entite')}</Typography.Text>
    : <span>{h.map((c) => `${t(`ref.jour.${c.jour}`).slice(0, 3)}. ${c.debut}–${c.fin}`).join(' · ')}</span>);

  const ouvrirEquipe = (e: Equipe | 'nouvelle') => {
    setErreur(null);
    form.resetFields();
    const h = e === 'nouvelle' ? [] : e.horaire;
    if (e !== 'nouvelle') form.setFieldsValue({ code: e.code, nom_fr: e.nom_fr, nom_nl: e.nom_nl, chef_id: e.chef_id, membres: e.membres.map((m) => m.id) });
    setHorairePropre(h.length > 0);
    setLignes(lignesDe(h));
    setFiche(e);
  };

  const horaireSaisi = (): Creneau[] | null => {
    if (!horairePropre) return [];
    const h = JOURS.filter((j) => lignes[j].actif).map((j) => ({ jour: j, debut: lignes[j].debut, fin: lignes[j].fin }));
    return h.every((c) => /^\d{2}:\d{2}$/.test(c.debut) && /^\d{2}:\d{2}$/.test(c.fin) && c.debut < c.fin) ? h : null;
  };

  const enregistrer = async (v: Saisie) => {
    const horaire = horaireSaisi();
    if (!horaire) { setErreur(t('equipes.horaire.invalide')); return; }
    setEnvoi(true);
    setErreur(null);
    const corpsEquipe = { code: v.code.trim(), nom_fr: v.nom_fr.trim(), nom_nl: v.nom_nl.trim(), chef_id: v.chef_id ?? null, membres: v.membres || [], horaire };
    try {
      if (fiche === 'nouvelle') await api.post<Equipe>('/equipes', corpsEquipe);
      else if (courant) await api.put<Equipe>(`/equipes/${courant.id}`, corpsEquipe);
      message.success(t('common.saved'));
      setFiche(null);
      await load();
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  const confirmerDesactivation = async () => {
    if (!desactiver || !motif.trim()) return;
    try {
      await api.del(`/equipes/${desactiver.id}`, { motif: motif.trim() });
      message.success(t('common.saved'));
      setDesactiver(null); setMotif(''); setFiche(null);
      await load();
    } catch (e) { fail(e); }
  };
  const reactiver = async (e: Equipe) => {
    try { await api.put(`/equipes/${e.id}`, { is_active: 1 }); message.success(t('common.saved')); setFiche(null); await load(); } catch (x) { fail(x); }
  };

  const ouvrirOuvrier = (o: Ouvrier) => {
    setErreur(null);
    formOuvrier.setFieldsValue({ corps_metier_id: o.corps_metier?.id ?? null, competences: o.competences.map((c) => c.id) });
    setFicheOuvrier(o);
  };
  const enregistrerOuvrier = async (v: { corps_metier_id?: number | null; competences?: number[] }) => {
    if (!ficheOuvrier) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await api.put<Ouvrier>(`/ouvriers/${ficheOuvrier.id}`, { corps_metier_id: v.corps_metier_id ?? null, competences: v.competences || [] });
      message.success(t('common.saved'));
      setFicheOuvrier(null);
      await load();
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  const titreEquipe = (e: Equipe) => (
    <span>
      <Button type="link" onClick={() => ouvrirEquipe(e)} style={{ paddingInline: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start' }}>{nomEquipe(e)}</Button>
      {' '}<Typography.Text type="secondary" style={{ fontSize: 12 }}>{e.code}</Typography.Text>
      {e.is_demo ? <Tag color="purple" style={{ marginInlineStart: 6 }}>{t('common.demo')}</Tag> : null}
      {!e.is_active && <Tag style={{ marginInlineStart: 6 }}>{t('equipes.inactive')}</Tag>}
    </span>
  );
  const chef = (e: Equipe) => (e.chef_id ? `${e.chef_prenom || ''} ${e.chef_nom || ''}`.trim() : <Typography.Text type="secondary">{t('equipes.chef.aucun')}</Typography.Text>);
  const membres = (e: Equipe) => (e.membres.length ? e.membres.map(personne).join(', ') : <Typography.Text type="secondary">{t('equipes.membres.vide')}</Typography.Text>);

  const ouvriersVus = filtreEquipe ? ouvriers.filter((o) => o.equipes.some((e) => e.id === filtreEquipe) || o.chef_de.some((e) => e.id === filtreEquipe)) : ouvriers;
  const tags = (o: Ouvrier) => (o.competences.length
    ? <Space size={[4, 4]} wrap>{o.competences.map((c) => <Tag key={c.id} style={{ marginInlineEnd: 0 }}>{libelle(c)}</Tag>)}</Space>
    : <Typography.Text type="secondary">{t('ouvriers.competences.aucune')}</Typography.Text>);
  const equipesDe = (o: Ouvrier) => {
    const noms = [...o.chef_de.map((e) => `${nomEquipe(e)} (${t('ouvriers.chef')})`), ...o.equipes.filter((e) => !o.chef_de.some((c) => c.id === e.id)).map(nomEquipe)];
    return noms.length ? noms.join(', ') : <Typography.Text type="secondary">{t('ouvriers.equipes.aucune')}</Typography.Text>;
  };
  const nomOuvrier = (o: Ouvrier) => <Button type="link" onClick={() => ouvrirOuvrier(o)} style={{ paddingInline: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start' }}>{personne(o)}</Button>;
  const corpsDe = (o: Ouvrier) => (o.corps_metier ? libelle(o.corps_metier) : <Typography.Text type="secondary">{t('ouvriers.corps.aucun')}</Typography.Text>);

  const optionsFiltre = useMemo(() => equipes.filter((e) => e.is_active).map((e) => ({ value: e.id, label: nomEquipe(e) })), [equipes, tField]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0 }}>{t('nav.equipes')}</Typography.Title>
        {gerer && onglet === 'equipes' && <Button type="primary" icon={<PlusOutlined />} onClick={() => ouvrirEquipe('nouvelle')}>{t('equipes.nouvelle')}</Button>}
      </div>
      <Typography.Paragraph type="secondary">{t('equipes.intro')}</Typography.Paragraph>
      <Radio.Group className="equipes-onglets" optionType="button" buttonStyle="solid" aria-label={t('equipes.onglets')} value={onglet}
        onChange={(e) => setParams(e.target.value === 'equipes' ? {} : { onglet: e.target.value })} style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}
        options={[{ value: 'equipes', label: `${t('equipes.onglet.equipes')} (${equipes.length})` }, { value: 'ouvriers', label: `${t('equipes.onglet.ouvriers')} (${ouvriers.length})` },
          ...(voitPrestataires ? [{ value: 'prestataires', label: `${t('equipes.onglet.prestataires')}${nbPrestataires === null ? '' : ` (${nbPrestataires})`}` }] : [])]} />

      {onglet === 'prestataires' ? <PrestatairesOnglet gerer={gererPrestataires} corps={corps} onCompte={setNbPrestataires} /> : onglet === 'equipes' ? (
        <Card>
          <Table<Equipe> rowKey="id" size="middle" loading={loading} dataSource={equipes} pagination={false} locale={{ emptyText: t('equipes.vide') }}
            rowClassName={(e) => (e.is_active ? '' : 'dem-close')} scroll={mobile ? undefined : { x: 'max-content' }}
            columns={mobile ? [
              { title: t('equipes.col.equipe'), key: 'pile', render: (_, e) => (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {titreEquipe(e)}
                  <div><Typography.Text type="secondary">{t('equipes.col.chef')} : </Typography.Text>{chef(e)}</div>
                  <div><Typography.Text type="secondary">{t('equipes.col.membres')} : </Typography.Text>{membres(e)}</div>
                  <div><Typography.Text type="secondary">{t('equipes.col.horaire')} : </Typography.Text>{resumeHoraire(e.horaire)}</div>
                </Space>
              ) },
            ] : [
              { title: t('equipes.col.equipe'), key: 'equipe', render: (_, e) => titreEquipe(e) },
              { title: t('equipes.col.chef'), key: 'chef', render: (_, e) => chef(e) },
              { title: t('equipes.col.membres'), key: 'membres', render: (_, e) => <div style={{ maxWidth: 320, whiteSpace: 'normal' }}>{membres(e)}</div> },
              { title: t('equipes.col.horaire'), key: 'horaire', render: (_, e) => resumeHoraire(e.horaire) },
            ]} />
        </Card>
      ) : (
        <Card>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Select<number> allowClear className="equipes-filtre" style={{ width: mobile ? '100%' : 280 }} aria-label={t('ouvriers.filtre')} placeholder={t('ouvriers.filtre')}
              value={filtreEquipe ?? undefined} onChange={(v) => setFiltreEquipe(v ?? null)} options={optionsFiltre} />
            <Table<Ouvrier> rowKey="id" size="middle" loading={loading} dataSource={ouvriersVus} pagination={false} locale={{ emptyText: t('ouvriers.vide') }}
              scroll={mobile ? undefined : { x: 'max-content' }}
              columns={mobile ? [
                { title: t('ouvriers.col.ouvrier'), key: 'pile', render: (_, o) => (
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {nomOuvrier(o)}
                    <div><Typography.Text type="secondary">{t('ouvriers.col.corps')} : </Typography.Text>{corpsDe(o)}</div>
                    <div>{tags(o)}</div>
                    <div><Typography.Text type="secondary">{t('ouvriers.col.equipes')} : </Typography.Text>{equipesDe(o)}</div>
                  </Space>
                ) },
              ] : [
                { title: t('ouvriers.col.ouvrier'), key: 'ouvrier', render: (_, o) => nomOuvrier(o) },
                { title: t('ouvriers.col.corps'), key: 'corps', render: (_, o) => corpsDe(o) },
                { title: t('ouvriers.col.competences'), key: 'competences', render: (_, o) => <div style={{ maxWidth: 360 }}>{tags(o)}</div> },
                { title: t('ouvriers.col.equipes'), key: 'equipes', render: (_, o) => equipesDe(o) },
              ]} />
          </Space>
        </Card>
      )}

      <Drawer open={!!fiche} onClose={() => setFiche(null)} width={mobile ? '100%' : 560}
        title={fiche === 'nouvelle' ? t('equipes.nouvelle') : courant ? `${t('equipes.fiche')} ${courant.code}` : ''}>
        {fiche && (
          <Form<Saisie> form={form} layout="vertical" onFinish={enregistrer} requiredMark disabled={!gerer}>
            {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
            {!gerer && <Alert type="info" showIcon message={t('equipes.lecture')} style={{ marginBottom: 12 }} />}
            {courant && !courant.is_active && <Alert type="warning" showIcon message={`${t('equipes.desactivee')} ${courant.motif_desactivation || ''}`} style={{ marginBottom: 12 }} />}
            <Form.Item name="code" label={t('equipes.field.code')} tooltip={hint('equipes.code')} rules={[texteObligatoire(t), { pattern: /^[A-Za-z0-9][A-Za-z0-9._+-]{1,19}$/, message: t('equipes.field.code.format') }]}>
              <Input maxLength={20} />
            </Form.Item>
            <Form.Item name="nom_fr" label={t('equipes.field.nom_fr')} tooltip={hint('equipes.nom_fr')} rules={[texteObligatoire(t)]}><Input maxLength={100} /></Form.Item>
            <Form.Item name="nom_nl" label={t('equipes.field.nom_nl')} tooltip={hint('equipes.nom_nl')} rules={[texteObligatoire(t)]}><Input maxLength={100} lang="nl" /></Form.Item>
            <Form.Item name="chef_id" label={t('equipes.field.chef')} tooltip={hint('equipes.chef')}>
              <Select<number> allowClear showSearch optionFilterProp="label" options={optionsChef} placeholder={t('equipes.choisir')}
                notFoundContent={t('equipes.chef.personne')} />
            </Form.Item>
            <Form.Item name="membres" label={t('equipes.field.membres')} tooltip={hint('equipes.membres')}>
              <Select<number[]> mode="multiple" allowClear showSearch optionFilterProp="label" options={optionsMembres} placeholder={t('equipes.choisir')}
                notFoundContent={t('equipes.membres.personne')} />
            </Form.Item>
            <Card size="small" title={t('equipes.field.horaire')} className="equipes-horaire" style={{ marginBottom: 16 }}>
              <Radio.Group disabled={!gerer} value={horairePropre ? 'propre' : 'entite'} onChange={(e) => setHorairePropre(e.target.value === 'propre')}
                aria-label={t('equipes.field.horaire')} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: horairePropre ? 12 : 0 }}
                options={[{ value: 'entite', label: t('equipes.horaire.entite') }, { value: 'propre', label: t('equipes.horaire.propre') }]} />
              {horairePropre && (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {JOURS.map((j) => (
                    <div key={j} className="equipes-jour" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Checkbox disabled={!gerer} checked={lignes[j].actif} style={{ minWidth: 104 }}
                        onChange={(e) => setLignes((l) => ({ ...l, [j]: { ...l[j], actif: e.target.checked } }))}>{t(`ref.jour.${j}`)}</Checkbox>
                      {lignes[j].actif && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Input type="time" disabled={!gerer} aria-label={`${t(`ref.jour.${j}`)} : ${t('equipes.horaire.debut')}`} value={lignes[j].debut} style={{ width: 112, fontSize: 16 }}
                            onChange={(e) => setLignes((l) => ({ ...l, [j]: { ...l[j], debut: e.target.value } }))} />
                          <span aria-hidden>–</span>
                          <Input type="time" disabled={!gerer} aria-label={`${t(`ref.jour.${j}`)} : ${t('equipes.horaire.fin')}`} value={lignes[j].fin} style={{ width: 112, fontSize: 16 }}
                            onChange={(e) => setLignes((l) => ({ ...l, [j]: { ...l[j], fin: e.target.value } }))} />
                        </span>
                      )}
                    </div>
                  ))}
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('equipes.horaire.aide')}</Typography.Text>
                </Space>
              )}
            </Card>
            {gerer && (
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={envoi}>{t('common.save')}</Button>
                <Button onClick={() => setFiche(null)}>{t('common.cancel')}</Button>
                {courant && (courant.is_active
                  ? <Button danger onClick={() => { setMotif(''); setDesactiver(courant); }}>{t('equipes.desactiver')}</Button>
                  : <Button onClick={() => reactiver(courant)}>{t('equipes.reactiver')}</Button>)}
              </Space>
            )}
          </Form>
        )}
      </Drawer>

      <Drawer open={!!ficheOuvrier} onClose={() => setFicheOuvrier(null)} width={mobile ? '100%' : 480} title={ficheOuvrier ? personne(ficheOuvrier) : ''}>
        {ficheOuvrier && (
          <Form form={formOuvrier} layout="vertical" onFinish={enregistrerOuvrier} disabled={!gerer}>
            {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
            {!gerer && <Alert type="info" showIcon message={t('equipes.lecture')} style={{ marginBottom: 12 }} />}
            <Form.Item name="corps_metier_id" label={t('ouvriers.field.corps')} tooltip={hint('ouvriers.corps')}>
              <Select<number> allowClear showSearch optionFilterProp="label" placeholder={t('equipes.choisir')}
                options={choix(corps, ficheOuvrier.corps_metier ? [ficheOuvrier.corps_metier.id] : [])} />
            </Form.Item>
            <Form.Item name="competences" label={t('ouvriers.field.competences')} tooltip={hint('ouvriers.competences')}>
              <Select<number[]> mode="multiple" allowClear showSearch optionFilterProp="label" placeholder={t('equipes.choisir')}
                options={choix(competences, ficheOuvrier.competences.map((c) => c.id))} />
            </Form.Item>
            <Card size="small" title={t('ouvriers.col.equipes')} style={{ marginBottom: 16 }}>{equipesDe(ficheOuvrier)}</Card>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ouvriers.aide')}</Typography.Paragraph>
            {gerer && (
              <Space wrap>
                <Button type="primary" htmlType="submit" loading={envoi}>{t('common.save')}</Button>
                <Button onClick={() => setFicheOuvrier(null)}>{t('common.cancel')}</Button>
              </Space>
            )}
          </Form>
        )}
      </Drawer>

      <Modal open={!!desactiver} title={desactiver ? `${t('equipes.desactiver')} ${desactiver.code}` : ''} okText={t('equipes.desactiver')} okButtonProps={{ danger: true, disabled: !motif.trim() }}
        cancelText={t('common.cancel')} onOk={confirmerDesactivation} onCancel={() => setDesactiver(null)}>
        <Typography.Paragraph type="secondary">{t('equipes.desactiver.aide')}</Typography.Paragraph>
        <Input.TextArea rows={2} maxLength={500} aria-label={t('equipes.motif')} placeholder={t('equipes.motif')} value={motif} onChange={(e) => setMotif(e.target.value)} />
      </Modal>
    </div>
  );
}

/**
 * Tâches d'une demande dans la fiche du service technique (version 0.20.0, étape 16, point 1 ; cahier des charges
 * CYC-03, GES-04 ; décision DV-160).
 * - Liste par rang : « Tâche n », titre, état, corps de métier, durée estimée, consignes ; motif d'annulation, ou état de
 *   la demande qui a annulé la tâche en se fermant.
 * - Avec le droit et dans un état de la demande qui le permet (taches_modifiables, rendu par le serveur) : ajouter une
 *   tâche (corps de métier de la demande proposé), modifier une tâche ouverte, la démarrer, la terminer, l'annuler avec
 *   un motif, la remettre à faire ou la rouvrir. Un seul formulaire ouvert à la fois, dans la fiche.
 * - Une tâche qui démarre peut faire passer la demande « En cours » ; la dernière qui se termine, « Travaux terminés »
 *   (le serveur décide par la table des passages) : la fiche est relue après chaque changement et le passage est dit.
 * - Le serveur refait tous les contrôles (services/taches.js) ; un refus s'affiche et la saisie reste (ERG-09).
 * - 0.20.0 (point 2 ; PLA-01, DV-161) : affectation d'une tâche ouverte à des ouvriers (dix au plus) ou à une équipe, avec
 *   la date prévue, l'heure de début et la durée ; une date fait passer la demande « Planifiée » (le serveur décide) ;
 *   « Personne » retire l'affectation. Les ouvriers et les équipes de l'entité active sont lus à l'ouverture du formulaire.
 * - 0.20.0 (point 3 ; PLA-02, DV-162) : « Ouvriers proposés » pour le jour choisi (ou aujourd'hui) : même corps de métier,
 *   disponibles, charge du jour ; un toucher ajoute ou retire l'ouvrier de la sélection ; le gestionnaire garde la main.
 * - 0.21.0 (point 1 ; R5 de la recette de la 0.20.0, DV-164) : « Démarrer » est le bouton mis en avant d'une tâche à faire,
 *   « Terminer » celui d'une tâche en cours ; « Terminer » une tâche à faire ouvre une petite fenêtre qui demande l'heure
 *   de début et l'heure de fin (préremplies avec l'heure actuelle, modifiables, fin après début, pas dans le futur), pour
 *   un encodage après coup. Les heures réelles s'affichent sur la tâche ; une tâche terminée sans heure le dit.
 * Boutons qui passent à la ligne et champs en 16 px sur téléphone (DV-102) ; rien n'est montré au demandeur.
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, List, Modal, Radio, Select, Space, Tag, TimePicker, Typography, message } from 'antd';
import { PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import api, { ApiError, qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { COULEUR_TACHE, type Demande, type EtatTache, type Tache, dateSouhaitee, duree, instant } from '../../demandes';
import { saisieDate, texteNonRetenu } from '../../saisieDate';
import { type ConflitAffectation, texteConflits } from '../../planning';

interface ValeurListe { id: number; libelle_fr: string; libelle_nl: string; is_active: number }
interface Saisie { titre: string; consignes?: string; corps_metier_id?: number | null; duree_heures?: number | null }
type Edition = { mode: 'ajout' } | { mode: 'modifier'; tache: Tache } | { mode: 'annuler'; tache: Tache } | { mode: 'affecter'; tache: Tache } | null;
interface Ouvrier { id: number; prenom: string; nom: string }
interface Equipe { id: number; code: string; nom_fr: string; nom_nl: string }
interface Propose { id: number; prenom: string; nom: string; corps_metier: { libelle_fr: string; libelle_nl: string } | null; meme_corps: 0 | 1; disponible: 0 | 1; indisponible?: 'journee' | 'matin' | 'apres_midi' | null; charge_min: number; nb_taches: number }
interface SaisieHeures { debut?: Dayjs | null; fin?: Dayjs | null }
/** Format des heures réelles de la fenêtre « Terminer la tâche » (affiché, tapé et comparé au texte retenu). */
const FORMAT_HEURES = 'DD/MM/YYYY HH:mm';
interface SaisieAffectation { qui: 'ouvriers' | 'equipe' | 'personne'; ouvriers?: number[]; equipe_id?: number | null; date?: Dayjs | null; heure?: Dayjs | null; duree_heures?: number | null }

/** Libellé du bouton d'un passage, selon l'état de départ (rouvrir une tâche fermée, remettre à faire une tâche en cours). */
const cleBouton = (de: EtatTache, vers: EtatTache) => (vers === 'a_faire' ? (de === 'en_cours' ? 'tache.action.remettre' : 'tache.action.rouvrir') : `tache.action.${vers}`);
/** 0.21.0 (R5) : bouton mis en avant : « Démarrer » d'une tâche à faire, « Terminer » d'une tâche en cours. */
const enAvant = (de: EtatTache, vers: EtatTache) => (de === 'a_faire' && vers === 'en_cours') || (de === 'en_cours' && vers === 'terminee');

export default function TachesDemande({ d, onChange }: { d: Demande; onChange: () => void }) {
  const { t, lang, hint } = useI18n();
  const [corps, setCorps] = useState<ValeurListe[]>([]);
  const [edition, setEdition] = useState<Edition>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [form] = Form.useForm<Saisie>();
  const [motif, setMotif] = useState('');
  const [formAff] = Form.useForm<SaisieAffectation>();
  const [formHeures] = Form.useForm<SaisieHeures>();
  const [aTerminer, setATerminer] = useState<Tache | null>(null);
  const qui = Form.useWatch('qui', formAff);
  const dateChoisie = Form.useWatch('date', formAff);
  const [ouvriersListe, setOuvriersListe] = useState<Ouvrier[]>([]);
  const [equipesListe, setEquipesListe] = useState<Equipe[]>([]);
  const [proposes, setProposes] = useState<Propose[] | null>(null);
  const choisis: number[] = Form.useWatch('ouvriers', formAff) || [];
  const tacheAffectee = edition?.mode === 'affecter' ? edition.tache.id : null;
  // Règle 12 du serveur : propositions pour le jour choisi (sinon celui de la tâche, sinon aujourd'hui), relues quand il change.
  useEffect(() => {
    if (!tacheAffectee) { setProposes(null); return; }
    setProposes(null);
    const date = dateChoisie ? (dateChoisie as Dayjs).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
    api.get<{ ouvriers: Propose[] }>(`/taches/${tacheAffectee}/suggestions${qs({ date })}`).then((r) => setProposes(r.ouvriers.slice(0, 6))).catch(() => setProposes([]));
  }, [tacheAffectee, dateChoisie ? (dateChoisie as Dayjs).format('YYYY-MM-DD') : '']);
  const basculer = (id: number) => formAff.setFieldsValue({ qui: 'ouvriers', ouvriers: choisis.includes(id) ? choisis.filter((x) => x !== id) : [...choisis, id].slice(0, 10) });
  const taches = d.taches || [];
  const modifiables = d.taches_modifiables === 1;
  /** La tâche x a un formulaire ouvert (modifier ou annuler). */
  const enEdition = (x: Tache) => !!edition && edition.mode !== 'ajout' && edition.tache.id === x.id;
  const lbl = (v: { libelle_fr: string | null; libelle_nl: string | null }) => (lang === 'nl' ? v.libelle_nl : v.libelle_fr) || '';

  useEffect(() => {
    if (!modifiables) return;
    api.page<ValeurListe>(`/listes-valeurs${qs({ liste: 'corps_metier', limit: 200 })}`).then((r) => setCorps(r.data)).catch(() => setCorps([]));
  }, [modifiables, d.entite_id]);

  const ouvrir = (e: Edition) => {
    setErreur(null);
    setMotif('');
    setEdition(e);
    if (e?.mode === 'ajout') form.setFieldsValue({ titre: '', consignes: '', corps_metier_id: d.corps_metier_id ?? null, duree_heures: null });
    if (e?.mode === 'affecter') {
      const x = e.tache;
      formAff.setFieldsValue({ qui: x.equipe_id ? 'equipe' : x.ouvriers.length ? 'ouvriers' : 'personne', ouvriers: x.ouvriers.map((o) => o.id), equipe_id: x.equipe_id,
        date: x.date_prevue ? dayjs(x.date_prevue) : null, heure: x.heure_debut ? dayjs(`2000-01-01T${x.heure_debut}`) : null,
        duree_heures: x.duree_estimee_min ? x.duree_estimee_min / 60 : null });
      api.page<Ouvrier>(`/ouvriers${qs({ limit: 200 })}`).then((r) => setOuvriersListe(r.data)).catch(() => setOuvriersListe([]));
      api.page<Equipe>(`/equipes${qs({ is_active: 1, limit: 200 })}`).then((r) => setEquipesListe(r.data)).catch(() => setEquipesListe([]));
    }
    if (e?.mode === 'modifier') {
      form.setFieldsValue({ titre: e.tache.titre, consignes: e.tache.consignes || '', corps_metier_id: e.tache.corps_metier_id,
        duree_heures: e.tache.duree_estimee_min ? e.tache.duree_estimee_min / 60 : null });
    }
  };

  const echec = (e: unknown) => setErreur(e instanceof ApiError ? e.message : t('common.error'));

  const enregistrer = async (v: Saisie) => {
    setEnvoi(true);
    setErreur(null);
    const corpsEnvoye = { titre: v.titre, consignes: v.consignes || null, corps_metier_id: v.corps_metier_id ?? null,
      duree_estimee_min: v.duree_heures ? Math.round(v.duree_heures * 60) : null };
    try {
      if (edition?.mode === 'modifier') await api.put(`/taches/${edition.tache.id}`, corpsEnvoye);
      else await api.post(`/demandes/${d.id}/taches`, corpsEnvoye);
      message.success(t(edition?.mode === 'modifier' ? 'tache.modifiee' : 'tache.ajoutee'));
      setEdition(null);
      onChange();
    } catch (e) { echec(e); } finally { setEnvoi(false); }
  };

  const passer = async (tache: Tache, vers: EtatTache, motifSaisi?: string, heures?: { debut: string; fin: string }) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<Tache & { demande_passage_auto: string | null }>(`/taches/${tache.id}/etat`, { etat: vers, ...(motifSaisi ? { motif: motifSaisi } : {}), ...(heures || {}) });
      message.success(r.demande_passage_auto
        ? `${t(`tache.etat.${vers}`)} · ${t('tache.demande_passee')} « ${t(`demande.etat_service.${r.demande_passage_auto}`)} »`
        : t(`tache.etat.${vers}`));
      setEdition(null);
      setATerminer(null);
      onChange();
    } catch (e) { echec(e); } finally { setEnvoi(false); }
  };

  /** 0.21.0 (R5) : « Terminer » une tâche à faire demande les heures ; une tâche en cours se termine tout de suite. */
  const terminer = (x: Tache) => {
    if (x.etat !== 'a_faire') { passer(x, 'terminee'); return; }
    const maintenant = dayjs().second(0).millisecond(0);
    formHeures.setFieldsValue({ debut: maintenant, fin: maintenant });
    setErreur(null);
    setATerminer(x);
  };
  const terminerAvecHeures = (v: SaisieHeures) => {
    if (!aTerminer || !v.debut || !v.fin) return;
    // 0.21.1 (DV-173) : rien ne part si un champ montrait un texte que le composant n'a pas retenu (saisieDate.ts).
    const refuses = (['debut', 'fin'] as const).filter((n) => texteNonRetenu(`tache-heures_${n}`, v[n], FORMAT_HEURES));
    if (refuses.length) {
      formHeures.setFields(refuses.map((n) => ({ name: n, errors: [t('tache.heures.illisible')] })));
      return;
    }
    passer(aTerminer, 'terminee', undefined, { debut: v.debut.toISOString(), fin: v.fin.toISOString() });
  };
  /** Heures réelles d'une tâche (règle 13 du serveur), à l'heure du poste. */
  const heuresReelles = (x: Tache) => {
    if (x.etat === 'en_cours' && x.debut_reel) return `${t('tache.heures.demarree')} ${instant(x.debut_reel)}`;
    if (x.etat !== 'terminee') return null;
    if (x.debut_reel && x.fin_reelle) return `${t('tache.heures.realisee')} ${instant(x.debut_reel)} ${t('tache.heures.au')} ${instant(x.fin_reelle)} (${duree(Math.max(1, Math.round((dayjs(`${x.fin_reelle.replace(' ', 'T')}Z`).diff(dayjs(`${x.debut_reel.replace(' ', 'T')}Z`), 'minute')))))})`;
    if (x.fin_reelle) return `${t('tache.heures.finie')} ${instant(x.fin_reelle)} · ${t('tache.heures.sans_debut')}`;
    return t('tache.heures.aucune');
  };
  const futur = (d: Dayjs) => d.isAfter(dayjs().endOf('day'));
  const fenetreHeures = (
    <Modal open={!!aTerminer} onCancel={() => setATerminer(null)} title={aTerminer ? `${t('tache.heures.titre')} · ${t('tache.numero')} ${aTerminer.rang}` : ''}
      okText={t('tache.action.terminee')} cancelText={t('common.cancel')} okButtonProps={{ loading: envoi, htmlType: 'submit', form: 'tache-heures' }}
      destroyOnHidden width={420} className="tache-heures">
      <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>{t('tache.heures.aide')}</Typography.Paragraph>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 8 }} role="alert" />}
      <Form<SaisieHeures> id="tache-heures" name="tache-heures" form={formHeures} layout="vertical" onFinish={terminerAvecHeures} requiredMark="optional">
        <Form.Item name="debut" label={t('tache.heures.debut')} tooltip={hint('tache.heures.debut')}
          rules={[{ required: true, message: t('form.obligatoire') },
            { validator: (_, v: Dayjs | null) => (!v || !v.isAfter(dayjs().add(1, 'minute')) ? Promise.resolve() : Promise.reject(new Error(t('tache.heures.futur')))) }]}>
          <DatePicker showTime={{ format: 'HH:mm', minuteStep: 5 }} format={FORMAT_HEURES} needConfirm={false} allowClear={false} disabledDate={futur} {...saisieDate()} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="fin" label={t('tache.heures.fin')} tooltip={hint('tache.heures.fin')} dependencies={['debut']}
          rules={[{ required: true, message: t('form.obligatoire') }, ({ getFieldValue }) => ({
            validator: (_, v: Dayjs | null) => {
              if (!v) return Promise.resolve();
              if (v.isAfter(dayjs().add(1, 'minute'))) return Promise.reject(new Error(t('tache.heures.futur')));
              const d0: Dayjs | null = getFieldValue('debut');
              return !d0 || v.isAfter(d0) ? Promise.resolve() : Promise.reject(new Error(t('tache.heures.ordre')));
            },
          })]}>
          <DatePicker showTime={{ format: 'HH:mm', minuteStep: 5 }} format={FORMAT_HEURES} needConfirm={false} allowClear={false} disabledDate={futur} {...saisieDate()} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );

  const affecter = async (v: SaisieAffectation) => {
    if (edition?.mode !== 'affecter') return;
    setEnvoi(true);
    setErreur(null);
    const corpsEnvoye = {
      ouvriers: v.qui === 'ouvriers' ? v.ouvriers || [] : [], equipe_id: v.qui === 'equipe' ? v.equipe_id ?? null : null,
      date_prevue: v.date ? v.date.format('YYYY-MM-DD') : null, heure_debut: v.date && v.heure ? v.heure.format('HH:mm') : null,
      duree_estimee_min: v.duree_heures ? Math.round(v.duree_heures * 60) : null,
    };
    try {
      const r = await api.put<Tache & { demande_passage_auto: string | null; conflits?: ConflitAffectation[] }>(`/taches/${edition.tache.id}/affectation`, corpsEnvoye);
      message.success(r.demande_passage_auto
        ? `${t('tache.affectee')} · ${t('tache.demande_passee')} « ${t(`demande.etat_service.${r.demande_passage_auto}`)} »` : t('tache.affectee'));
      // 0.21.0 (point 4, PLA-06) : conflits du jour, sans bloquer.
      if (r.conflits?.length) message.warning({ content: texteConflits(r.conflits, t, lang, equipesListe), duration: 8 });
      setEdition(null);
      onChange();
    } catch (e) { echec(e); } finally { setEnvoi(false); }
  };

  /** Ce qui est affecté : équipe ou ouvriers, date et heure. */
  const resumeAffectation = (x: Tache) => {
    const qui = x.equipe_id ? `${t('tache.equipe')} ${lbl({ libelle_fr: x.equipe_nom_fr, libelle_nl: x.equipe_nom_nl })}`
      : x.ouvriers.length ? x.ouvriers.map((o) => `${o.prenom} ${o.nom}`).join(', ') : null;
    const quand = x.date_prevue ? `${dateSouhaitee(x.date_prevue, lang)}${x.heure_debut ? ` ${t('tache.a')} ${x.heure_debut}` : ''}` : null;
    if (!qui && !quand) return null;
    return (
      <Typography.Text style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
        {x.equipe_id ? <TeamOutlined aria-hidden /> : <UserOutlined aria-hidden />} {[qui || t('tache.non_affectee'), quand].filter(Boolean).join(' · ')}
      </Typography.Text>
    );
  };

  const formulaireAffectation = (x: Tache) => (
    <Form<SaisieAffectation> form={formAff} className="tache-affectation" layout="vertical" onFinish={affecter} requiredMark="optional" style={{ marginTop: 8 }}>
      <Form.Item name="qui" label={t('tache.qui')} tooltip={hint('tache.qui')}>
        <Radio.Group optionType="button" options={[{ value: 'ouvriers', label: t('tache.qui.ouvriers') }, { value: 'equipe', label: t('tache.qui.equipe') }, { value: 'personne', label: t('tache.qui.personne') }]} />
      </Form.Item>
      {qui === 'ouvriers' && (
        <Form.Item name="ouvriers" label={t('tache.ouvriers')} tooltip={hint('tache.ouvriers')} rules={[{ required: true, type: 'array', min: 1, message: t('tache.ouvriers.requis') }]}>
          <Select<number[]> mode="multiple" maxCount={10} showSearch optionFilterProp="label" aria-label={t('tache.ouvriers')}
            options={ouvriersListe.map((o) => ({ value: o.id, label: `${o.prenom} ${o.nom}` }))} />
        </Form.Item>
      )}
      {qui === 'ouvriers' && (
        <div className="taches-proposes" style={{ marginTop: -8, marginBottom: 16 }}>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
            {t('tache.proposes')} {dateChoisie ? dateSouhaitee((dateChoisie as Dayjs).format('YYYY-MM-DD'), lang) : t('tache.proposes.aujourdhui')}
          </Typography.Text>
          <List<Propose> size="small" bordered loading={proposes === null} dataSource={proposes || []} locale={{ emptyText: t('tache.proposes.aucun') }}
            renderItem={(o) => (
              // 0.20.0 (point 5) : bouton toujours à droite, le texte passe à la ligne à sa gauche (vu sur la capture de l'aide :
              // avec les actions de List.Item et flex-wrap, le bouton tombait sous les étiquettes pour un nom long).
              <List.Item style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Space direction="vertical" size={2} style={{ minWidth: 0, flex: 1 }}>
                  <Typography.Text strong style={{ overflowWrap: 'anywhere' }}>{`${o.prenom} ${o.nom}`}</Typography.Text>
                  <Space size={[4, 4]} wrap>
                    {o.corps_metier && <Tag color={o.meme_corps ? 'green' : undefined}>{lang === 'nl' ? o.corps_metier.libelle_nl : o.corps_metier.libelle_fr}</Tag>}
                    <Tag color={o.disponible ? 'blue' : 'default'}>{t(o.indisponible === 'journee' ? 'tache.proposes.absent' : o.disponible ? 'tache.proposes.disponible' : 'tache.proposes.indisponible')}</Tag>
                    {o.indisponible && o.indisponible !== 'journee' && <Tag color="orange">{t(`tache.proposes.absent.${o.indisponible}`)}</Tag>}
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>{o.charge_min ? `${t('tache.proposes.charge')} ${duree(o.charge_min)}` : o.nb_taches ? `${o.nb_taches} ${t('tache.proposes.taches')}` : t('tache.proposes.libre')}</Typography.Text>
                  </Space>
                </Space>
                <Button size="small" style={{ flexShrink: 0 }} type={choisis.includes(o.id) ? 'primary' : 'default'} aria-pressed={choisis.includes(o.id)} onClick={() => basculer(o.id)}>
                  {t(choisis.includes(o.id) ? 'tache.proposes.retirer' : 'tache.proposes.choisir')}</Button>
              </List.Item>
            )} />
        </div>
      )}
      {qui === 'equipe' && (
        <Form.Item name="equipe_id" label={t('tache.qui.equipe')} tooltip={hint('tache.equipe')} rules={[{ required: true, message: t('tache.equipe.requise') }]}>
          <Select<number> showSearch optionFilterProp="label" aria-label={t('tache.qui.equipe')}
            options={equipesListe.map((q) => ({ value: q.id, label: `${lang === 'nl' ? q.nom_nl : q.nom_fr} (${q.code})` }))} />
        </Form.Item>
      )}
      <Space wrap size={[16, 0]} align="start">
        <Form.Item name="date" label={t('tache.date')} tooltip={hint('tache.date')}>
          <DatePicker format="DD/MM/YYYY" {...saisieDate()}
            disabledDate={(j) => j.isAfter(dayjs().add(2, 'year')) || (j.isBefore(dayjs(), 'day') && j.format('YYYY-MM-DD') !== x.date_prevue)} />
        </Form.Item>
        <Form.Item name="heure" label={t('tache.heure')} tooltip={hint('tache.heure')}>
          <TimePicker format="HH:mm" minuteStep={15} needConfirm={false} {...saisieDate()} disabled={!dateChoisie} />
        </Form.Item>
      </Space>
      <Form.Item name="duree_heures" label={t('qualif.duree')} tooltip={hint('tache.duree')} extra={t('qualif.duree.aide')}>
        <InputNumber min={0.25} max={168} step={0.25} decimalSeparator="," addonAfter={t('qualif.duree.heures')} style={{ width: 200, maxWidth: '100%' }} />
      </Form.Item>
      <Space wrap>
        <Button type="primary" htmlType="submit" loading={envoi}>{t('common.save')}</Button>
        <Button onClick={() => setEdition(null)} disabled={envoi}>{t('common.cancel')}</Button>
      </Space>
    </Form>
  );

  const formulaire = (
    <Form<Saisie> form={form} layout="vertical" onFinish={enregistrer} requiredMark="optional" style={{ marginTop: 8 }}>
      <Form.Item name="titre" label={t('tache.titre')} tooltip={hint('tache.titre')} rules={[{ required: true, whitespace: true, min: 3, message: t('tache.titre.requis') }]}>
        <Input maxLength={200} />
      </Form.Item>
      <Form.Item name="consignes" label={t('tache.consignes')} tooltip={hint('tache.consignes')}>
        <Input.TextArea rows={3} maxLength={2000} showCount />
      </Form.Item>
      <Form.Item name="corps_metier_id" label={t('qualif.corps')} tooltip={hint('tache.corps')}>
        <Select<number> allowClear showSearch optionFilterProp="label" aria-label={t('qualif.corps')} placeholder={t('qualif.corps.aucun')}
          options={corps.filter((v) => v.is_active || (edition?.mode === 'modifier' && v.id === edition.tache.corps_metier_id)).map((v) => ({ value: v.id, label: lbl(v) }))} />
      </Form.Item>
      <Form.Item name="duree_heures" label={t('qualif.duree')} tooltip={hint('tache.duree')} extra={t('qualif.duree.aide')}>
        <InputNumber min={0.25} max={168} step={0.25} decimalSeparator="," addonAfter={t('qualif.duree.heures')} style={{ width: 200, maxWidth: '100%' }} />
      </Form.Item>
      <Space wrap>
        <Button type="primary" htmlType="submit" loading={envoi}>{t(edition?.mode === 'modifier' ? 'common.save' : 'tache.ajouter')}</Button>
        <Button onClick={() => setEdition(null)} disabled={envoi}>{t('common.cancel')}</Button>
      </Space>
    </Form>
  );

  return (
    <section aria-labelledby={`taches-${d.id}`} className="taches" style={{ marginBottom: 16 }}>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 8 }} wrap>
        <Typography.Title level={2} id={`taches-${d.id}`} style={{ fontSize: 16, margin: 0 }}>
          {t('tache.titre_section')}{taches.length ? ` (${taches.length})` : ''}
        </Typography.Title>
        {modifiables && edition?.mode !== 'ajout' && (
          <Button icon={<PlusOutlined />} onClick={() => ouvrir({ mode: 'ajout' })}>{t('tache.ajouter')}</Button>
        )}
      </Space>
      {taches.length > 0 && <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>{t('tache.regle')}</Typography.Paragraph>}
      {!taches.length && edition?.mode !== 'ajout' && <Typography.Paragraph type="secondary">{t(modifiables ? 'tache.aucune' : 'tache.aucune.figee')}</Typography.Paragraph>}
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 8 }} role="alert" />}
      {edition?.mode === 'ajout' && <Card size="small" title={t('tache.nouvelle')} style={{ marginBottom: 8 }}>{formulaire}</Card>}
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {taches.map((x) => (
          <Card key={x.id} size="small" className="tache-carte">
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap align="start">
                <Typography.Text strong style={{ overflowWrap: 'anywhere' }}>{`${t('tache.numero')} ${x.rang} · ${x.titre}`}</Typography.Text>
                <Tag color={COULEUR_TACHE[x.etat]}>{t(`tache.etat.${x.etat}`)}</Tag>
              </Space>
              <Space size={[8, 4]} wrap style={{ fontSize: 13 }}>
                {x.corps_metier_id && <Tag>{lbl({ libelle_fr: x.corps_metier_libelle_fr, libelle_nl: x.corps_metier_libelle_nl })}</Tag>}
                {x.duree_estimee_min && <Typography.Text type="secondary">{`${t('qualif.duree')} : ${duree(x.duree_estimee_min)}`}</Typography.Text>}
              </Space>
              {heuresReelles(x) && <Typography.Text type="secondary" className="tache-heures-reelles" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{heuresReelles(x)}</Typography.Text>}
              {resumeAffectation(x)}
              {x.consignes && <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{x.consignes}</Typography.Paragraph>}
              {x.etat === 'annulee' && (
                <Typography.Text type="secondary" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
                  {x.annulation_auto ? `${t('tache.annulee_avec')} « ${t(`demande.etat_service.${x.annulation_auto}`)} »` : `${t('tache.motif')} : ${x.motif_annulation}`}
                </Typography.Text>
              )}
              {modifiables && edition?.mode === 'modifier' && enEdition(x) && formulaire}
              {modifiables && edition?.mode === 'affecter' && enEdition(x) && formulaireAffectation(x)}
              {modifiables && edition?.mode === 'annuler' && enEdition(x) && (
                <div>
                  <label htmlFor={`motif-${x.id}`} style={{ display: 'block', marginBottom: 4 }}>{t('tache.motif.label')}</label>
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{hint('tache.motif')}</Typography.Text>
                  <Input.TextArea id={`motif-${x.id}`} rows={2} maxLength={500} value={motif} onChange={(e) => setMotif(e.target.value)} />
                  <Space wrap style={{ marginTop: 8 }}>
                    <Button danger type="primary" loading={envoi} disabled={!motif.trim()} onClick={() => passer(x, 'annulee', motif.trim())}>{t('tache.action.annulee')}</Button>
                    <Button onClick={() => setEdition(null)} disabled={envoi}>{t('common.cancel')}</Button>
                  </Space>
                </div>
              )}
              {modifiables && !enEdition(x) && (
                <Space wrap size={8} style={{ maxWidth: '100%' }} role="group" aria-label={`${t('tache.numero')} ${x.rang}`}>
                  {x.passages.filter((v) => v !== 'annulee').map((v) => (
                    <Button key={v} size="small" type={enAvant(x.etat, v) ? 'primary' : 'default'} disabled={envoi} onClick={() => (v === 'terminee' ? terminer(x) : passer(x, v))}
                      style={{ whiteSpace: 'normal', height: 'auto', minHeight: 28 }}>{t(cleBouton(x.etat, v))}</Button>
                  ))}
                  {(x.etat === 'a_faire' || x.etat === 'en_cours') && (
                    <>
                      <Button size="small" disabled={envoi} onClick={() => ouvrir({ mode: 'affecter', tache: x })}>{t('tache.action.affecter')}</Button>
                      <Button size="small" disabled={envoi} onClick={() => ouvrir({ mode: 'modifier', tache: x })}>{t('common.edit')}</Button>
                    </>
                  )}
                  {x.passages.includes('annulee') && (
                    <Button size="small" danger disabled={envoi} onClick={() => ouvrir({ mode: 'annuler', tache: x })}>{t('tache.action.annulee')}</Button>
                  )}
                </Space>
              )}
            </Space>
          </Card>
        ))}
      </Space>
      {fenetreHeures}
    </section>
  );
}

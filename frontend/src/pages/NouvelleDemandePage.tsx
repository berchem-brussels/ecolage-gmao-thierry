/**
 * Nouvelle demande d'intervention (version 0.5.0 ; cahier des charges DEM-01, DEM-02, DEM-03, DEM-12 écran, REF-03,
 * REF-04, ERG-09 ; décisions DV-39 à DV-43). Un seul écran en trois blocs : Où (lieu proposé d'office, modifiable par
 * recherche ou par l'arbre), Quoi (tuiles), Description (10 caractères au moins). Le bouton d'envoi s'active dès que
 * les trois sont donnés ; une erreur du serveur ne fait rien perdre de la saisie. Après l'envoi : le numéro et le délai
 * indicatif, avec les liens vers « Mes demandes » et vers une nouvelle demande.
 * 0.7.0, point 1 (DEM-04) : sous « 1. Où ? », les demandes déjà ouvertes dans le même bâtiment ; « Moi aussi » suit
 * l'une d'elles au lieu d'en créer une nouvelle, et l'écran le confirme.
 * 0.7.0, point 2 (DEM-06) : case « Danger pour les personnes ou les biens » en tête du formulaire ; cochée, elle
 * affiche le numéro à appeler et la demande part en P1. Après l'envoi, « priorité absolue », sans heure promise.
 * 0.7.0, point 3 (DEM-07, DEM-08) : compléments facultatifs sous la description, « Pour quelqu'un d'autre ? » et
 * « Une date ou un moment à respecter ? », repliés par défaut.
 * 0.7.0, point 4 (DEM-11) : brouillon gardé sur le serveur, enregistré tout seul après chaque changement ; en rouvrant
 * le formulaire, « Reprendre » ou « Recommencer à zéro ». Tant que la personne n'a pas choisi, rien n'est enregistré.
 * 0.7.0, point 5 (DEM-05) : sous les tuiles, les questions propres à la catégorie choisie (domaine puis nature), en
 * boutons ; une question obligatoire sans réponse bloque l'envoi. Les réponses vont dans le brouillon et avec la demande ;
 * en changeant de catégorie, seules restent celles d'une question encore posée (questions du même domaine).
 * 0.7.0, point 6 (RGPD-10, DEM-16) : mention d'information courte de l'entité au-dessus du bouton d'envoi, « En savoir
 * plus » déplie le texte complet avec le contact du DPO (Réglages de l'entité) ; l'aide de la description rappelle de ne
 * citer ni nom ni donnée personnelle sur une autre personne.
 * 0.8.0, point 3 (DEM-09, DEM-16, DV-66, DV-83 à DV-85) : bloc « Photos et documents » sous la description. Chaque
 * pièce part au brouillon dès l'ajout et revient à la reprise ; elle passe à la demande à l'envoi. Une pièce ajoutée
 * compte comme une saisie (le brouillon est gardé) ; « Recommencer à zéro » et « Moi aussi » les effacent avec le
 * brouillon, et l'invite de reprise le dit.
 */
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Button, Card, Checkbox, Input, Result, Space, Tag, Typography } from 'antd';
import { SendOutlined, UnorderedListOutlined, PlusOutlined, TeamOutlined, PhoneOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api, { ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import LieuPicker from '../components/demandes/LieuPicker';
import TuilesCategories, { type CategorieChoisie } from '../components/demandes/TuilesCategories';
import DemandesVoisines from '../components/demandes/DemandesVoisines';
import ComplementsDemande, { type Complements, COMPLEMENTS_VIDES, champsComplements } from '../components/demandes/ComplementsDemande';
import QuestionsCategorie, { obligatoiresManquantes, reponsesValables } from '../components/demandes/QuestionsCategorie';
import PiecesDemande from '../components/demandes/PiecesDemande';
import type { ReponseDonnee } from '../referentiel';
import { type Demande, type LieuChoisi, type Piece, type PlafondsPieces, DESCRIPTION_MIN, beneficiaireTexte, cheminTexte, dateDepot, dateSouhaitee, finAnnoncee, lienTel } from '../demandes';

/** Brouillon du formulaire (DEM-11) : ce que l'écran affiche, pour le reprendre tel quel. */
interface ContenuBrouillon {
  danger?: 0 | 1; lieu?: LieuChoisi | null; categorie?: CategorieChoisie | null; description?: string | null;
  pour_mode?: 'collegue' | 'texte'; collegue?: { id: number; prenom: string; nom: string } | null;
  beneficiaire_texte?: string | null; date_souhaitee?: string | null; creneau?: string | null;
  reponses?: ReponseDonnee[];
}
interface Brouillon { entite_id: number; contenu: ContenuBrouillon; updated_at: string }
import ErreurObligatoire from '../components/ErreurObligatoire';
import { seulementEspaces } from '../validation';

export default function NouvelleDemandePage() {
  const { t, lang } = useI18n();
  const { user, entite, refresh } = useAuth();
  const [lieu, setLieu] = useState<LieuChoisi | null>(user?.lieu_propose || null);
  const [categorie, setCategorie] = useState<CategorieChoisie | null>(null);
  const [reponses, setReponses] = useState<ReponseDonnee[]>([]);
  const [description, setDescription] = useState('');
  const [danger, setDanger] = useState(false);
  const [complements, setComplements] = useState<Complements>(COMPLEMENTS_VIDES);
  const telephone = user?.telephone_urgence || null;
  const protection = user?.protection_donnees || null;
  const [rgpdOuvert, setRgpdOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [faite, setFaite] = useState<Demande | null>(null);
  // « Moi aussi » (0.7.0) : la demande rejointe, au lieu d'une demande nouvelle.
  const [suivie, setSuivie] = useState<Demande | null>(null);
  // Brouillon (0.7.0, DEM-11) : proposé à la reprise ; l'enregistrement automatique attend le choix de la personne.
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [brouillonPret, setBrouillonPret] = useState(false);
  const [enregistreA, setEnregistreA] = useState<string | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>();
  // Pièces jointes du brouillon (0.8.0) et plafonds de l'entité ; null tant qu'ils ne sont pas lus.
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [plafonds, setPlafonds] = useState<PlafondsPieces | null>(null);

  const formulaireVide = !danger && !categorie && !description.trim() && !complements.collegue && !complements.pourTexte.trim()
    && !complements.date && !complements.creneau.trim() && pieces.length === 0;

  useEffect(() => {
    let actif = true;
    setBrouillon(null);
    setBrouillonPret(false);
    setEnregistreA(null);
    setPieces([]);
    setPlafonds(null);
    api.get<Brouillon | null>('/demandes/brouillon')
      .then((b) => { if (!actif) return; if (b && b.contenu && b.updated_at) setBrouillon(b); else setBrouillonPret(true); })
      .catch(() => { if (actif) setBrouillonPret(true); });
    api.get<{ pieces: Piece[]; plafonds: PlafondsPieces }>('/demandes/brouillon/pieces')
      .then((r) => { if (actif) { setPieces(r.pieces); setPlafonds(r.plafonds); } })
      .catch(() => {});
    return () => { actif = false; };
  }, [user?.entite_active_id]);

  useEffect(() => {
    if (!brouillonPret || faite || suivie) return undefined;
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => {
      if (formulaireVide) {
        if (enregistreA) api.del('/demandes/brouillon').then(() => setEnregistreA(null)).catch(() => {});
        return;
      }
      // Le brouillon garde la catégorie sans ses questions : elles sont relues dans l'arbre à la reprise.
      const cat = categorie ? { id: categorie.id, libelle_fr: categorie.libelle_fr, libelle_nl: categorie.libelle_nl, icone: categorie.icone,
        domaine_fr: categorie.domaine_fr, domaine_nl: categorie.domaine_nl } : null;
      // Champs connus du schéma seuls : le lieu proposé par le profil porte aussi sa nature (défaut de recette 0.7.0).
      const lieuB = lieu ? { id: lieu.id, code: lieu.code, nom_fr: lieu.nom_fr, nom_nl: lieu.nom_nl, ...(lieu.source ? { source: lieu.source } : {}),
        chemin: (lieu.chemin || []).map((e) => ({ id: e.id, ...(e.nature ? { nature: e.nature } : {}), code: e.code, nom_fr: e.nom_fr, nom_nl: e.nom_nl })) } : null;
      const contenu: ContenuBrouillon = {
        danger: danger ? 1 : 0, lieu: lieuB, categorie: cat, reponses, description, pour_mode: complements.pourMode, collegue: complements.collegue,
        beneficiaire_texte: complements.pourTexte, date_souhaitee: complements.date ? complements.date.format('YYYY-MM-DD') : null, creneau: complements.creneau,
      };
      api.put('/demandes/brouillon', { contenu }).then(() => setEnregistreA(dayjs().format('HH:mm'))).catch(() => {});
    }, 1500);
    return () => clearTimeout(minuterie.current);
  }, [brouillonPret, danger, lieu, categorie, reponses, description, complements, faite, suivie, pieces]);

  const reprendre = () => {
    const c = brouillon?.contenu || {};
    setDanger(c.danger === 1);
    if (c.lieu) setLieu({ ...c.lieu, chemin: c.lieu.chemin || [] });
    setCategorie(c.categorie || null);
    setReponses(c.reponses || []);
    setDescription(c.description || '');
    setComplements({ pourMode: c.pour_mode || 'collegue', collegue: c.collegue || null, pourTexte: c.beneficiaire_texte || '',
      date: c.date_souhaitee ? dayjs(c.date_souhaitee) : null, creneau: c.creneau || '' });
    setBrouillon(null);
    setBrouillonPret(true);
  };
  const recommencerAZero = () => {
    // Le serveur efface aussi les pièces jointes du brouillon (DV-85).
    api.del('/demandes/brouillon').catch(() => {});
    setPieces([]);
    setBrouillon(null);
    setBrouillonPret(true);
  };

  // Changement d'entité active : le lieu et la catégorie de l'autre entité ne valent plus.
  useEffect(() => { setLieu(user?.lieu_propose || null); setCategorie(null); setReponses([]); }, [user?.entite_active_id]);

  /** Choix d'une catégorie : seules restent les réponses d'une question encore posée (même domaine). */
  const choisirCategorie = (c: CategorieChoisie) => {
    setCategorie(c);
    if (c.questions) { const posees = c.questions; setReponses((r) => reponsesValables(posees, r)); }
  };
  const questions = categorie?.questions || [];
  const valables = reponsesValables(questions, reponses);

  const texte = description.trim();
  const manque = [
    ...(!lieu ? [t('demande.manque.lieu')] : []),
    ...(!categorie ? [t('demande.manque.quoi')] : []),
    ...(obligatoiresManquantes(questions, valables).length ? [t('demande.manque.questions')] : []),
    ...(texte.length < DESCRIPTION_MIN ? [t('demande.manque.description')] : []),
  ];

  const envoyer = async () => {
    if (manque.length || !lieu || !categorie) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const d = await api.post<Demande>('/demandes', { lieu_id: lieu.id, categorie_id: categorie.id, description: texte, langue: lang, ...(danger ? { danger: 1 } : {}), ...champsComplements(complements),
        ...(valables.length ? { reponses: valables } : {}) });
      setFaite(d);
      setEnregistreA(null);
      refresh();
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  const recommencer = () => {
    setSuivie(null);
    setPieces([]);
    setFaite(null);
    setDanger(false);
    setComplements(COMPLEMENTS_VIDES);
    setCategorie(null);
    setReponses([]);
    setDescription('');
    setLieu(faite ? { id: faite.lieu_id, code: faite.lieu_code, nom_fr: faite.lieu_nom_fr, nom_nl: faite.lieu_nom_nl, chemin: faite.lieu_chemin } : lieu);
  };

  // Boutons de suite communs : l'un sous l'autre sur téléphone, 12 px entre eux (0.5.2).
  const suite = (
    <Space wrap size={[12, 12]} className="dem-suite" style={{ justifyContent: 'center' }}>
      <Link to="/demandes"><Button type="primary" icon={<UnorderedListOutlined />}>{t('demande.mes.title')}</Button></Link>
      <Button icon={<PlusOutlined />} onClick={recommencer}>{t('demande.envoyee.autre')}</Button>
    </Space>
  );

  if (suivie) {
    return (
      <div>
        <Typography.Title level={1} style={{ fontSize: 22, marginBottom: 16 }}>{t('demande.nouvelle.title')}</Typography.Title>
        <Card>
          <Result status="info" icon={<TeamOutlined />} title={<span role="status">{t('demande.suivie.title')}</span>}
            subTitle={(
              <Space direction="vertical" size={4}>
                <Typography.Text strong copyable style={{ fontSize: 22 }} className="dem-numero">{suivie.numero}</Typography.Text>
                <span>{lang === 'nl' ? suivie.categorie_libelle_nl : suivie.categorie_libelle_fr} · {cheminTexte(suivie.lieu_chemin, lang)}</span>
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t('demande.suivie.texte')}</Typography.Text>
              </Space>
            )}
            extra={suite} />
        </Card>
      </div>
    );
  }

  if (faite) {
    const fin = finAnnoncee(faite.delai_annonce, lang);
    return (
      <div>
        <Typography.Title level={1} style={{ fontSize: 22, marginBottom: 16 }}>{t('demande.nouvelle.title')}</Typography.Title>
        <Card>
          <Result status="success" title={<span role="status">{t('demande.envoyee.title')}</span>}
            subTitle={(
              <Space direction="vertical" size={4}>
                <span>{t('demande.envoyee.numero')}</span>
                <Typography.Text strong copyable style={{ fontSize: 22 }} className="dem-numero">{faite.numero}</Typography.Text>
                <span>{lang === 'nl' ? faite.categorie_libelle_nl : faite.categorie_libelle_fr} · {cheminTexte(faite.lieu_chemin, lang)}</span>
                {faite.danger ? (
                  <>
                    <Typography.Text strong type="danger">{t('demande.danger.envoyee')}</Typography.Text>
                    {telephone
                      ? <span>{t('demande.danger.alerte')} <a href={lienTel(telephone)}>{telephone}</a></span>
                      : <span>{t('demande.danger.alerte.sansnumero')}</span>}
                  </>
                ) : <span>{fin ? `${t('demande.delai.indicatif')} ${fin}` : t('demande.delai.convenir')}</span>}
                {beneficiaireTexte(faite) && <span>{t('demande.champ.pour')} : {beneficiaireTexte(faite)}</span>}
                {faite.date_souhaitee && <span>{t('demande.champ.date_souhaitee')} : {dateSouhaitee(faite.date_souhaitee, lang)}</span>}
                {(faite.reponses || []).map((r) => (
                  <span key={r.question_id}>{lang === 'nl' ? r.question_nl : r.question_fr} {lang === 'nl' ? r.reponse_nl : r.reponse_fr}</span>
                ))}
                {(faite.pieces || []).length > 0 && <span>{t('demande.envoyee.pieces').replace('{n}', String((faite.pieces || []).length))}</span>}
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t('demande.envoyee.suite')}</Typography.Text>
              </Space>
            )}
            extra={suite} />
        </Card>
      </div>
    );
  }

  return (
    <div className="dem-form">
      <Typography.Title level={1} style={{ fontSize: 22, marginBottom: 4 }}>{t('demande.nouvelle.title')}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {t('demande.nouvelle.intro')} {entite && <Tag>{entite.code}</Tag>}
      </Typography.Paragraph>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {brouillon && (
          <Alert type="info" showIcon className="dem-brouillon"
            message={t('demande.brouillon.propose').replace('{date}', dateDepot(brouillon.updated_at).slice(0, 10)).replace('{heure}', dateDepot(brouillon.updated_at).slice(11))}
            description={(
              <>
                {pieces.length > 0 && (
                  <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                    {t('demande.brouillon.zero.pieces').replace('{n}', String(pieces.length))}
                  </Typography.Text>
                )}
                <Space wrap size={[8, 8]} style={{ marginTop: 4 }}>
                  <Button type="primary" onClick={reprendre}>{t('demande.brouillon.reprendre')}</Button>
                  <Button onClick={recommencerAZero}>{t('demande.brouillon.zero')}</Button>
                </Space>
              </>
            )} />
        )}
        {/* 0.7.0 (DEM-06) : en tête du formulaire. */}
        <Card className={danger ? 'dem-danger dem-danger-actif' : 'dem-danger'}>
          <Checkbox checked={danger} onChange={(e) => setDanger(e.target.checked)} className="dem-danger-case" aria-describedby="dem-danger-aide">
            <span className="dem-danger-libelle">{t('demande.danger.case')}</span>
          </Checkbox>
          <Typography.Text id="dem-danger-aide" type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>{t('demande.danger.aide')}</Typography.Text>
          {danger && (
            <Alert type="error" showIcon icon={<PhoneOutlined />} style={{ marginTop: 12 }} role="alert"
              message={telephone
                ? <span>{t('demande.danger.alerte')} <a href={lienTel(telephone)} className="dem-danger-tel">{telephone}</a></span>
                : t('demande.danger.alerte.sansnumero')}
              description={t('demande.danger.priorite')} />
          )}
        </Card>
        <Card>
          <Typography.Title level={2} id="dem-ou" style={{ fontSize: 17 }}>{t('demande.ou.title')}</Typography.Title>
          <LieuPicker value={lieu} onChange={setLieu} labelledBy="dem-ou" />
          <DemandesVoisines lieuId={lieu?.id ?? null} categorieId={categorie?.id ?? null} remarque={description}
            onSuivie={(d) => { setSuivie(d); setEnregistreA(null); setPieces([]); api.del('/demandes/brouillon').catch(() => {}); refresh(); }} />
        </Card>
        <Card>
          <Typography.Title level={2} id="dem-quoi" style={{ fontSize: 17 }}>{t('demande.quoi.title')}</Typography.Title>
          <TuilesCategories value={categorie} onChange={choisirCategorie} labelledBy="dem-quoi" />
          <QuestionsCategorie questions={questions} value={valables} onChange={setReponses} montrerErreurs={texte.length >= DESCRIPTION_MIN} />
        </Card>
        <Card>
          <Typography.Title level={2} style={{ fontSize: 17 }}>
            <label htmlFor="dem-description">{t('demande.description.title')}</label>
          </Typography.Title>
          {/* Aide au-dessus du champ : sous le champ, le compteur de caractères la recouvrirait sur téléphone. */}
          <Typography.Text id="dem-description-aide" type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            {t('demande.description.aide')} {lang === 'nl' ? t('demande.langue.nl') : t('demande.langue.fr')}
          </Typography.Text>
          <Input.TextArea id="dem-description" value={description} onChange={(e) => setDescription(e.target.value)} lang={lang}
            autoSize={{ minRows: 4, maxRows: 12 }} maxLength={5000} showCount style={{ marginBottom: 20 }} placeholder={t('demande.description.placeholder')}
            status={seulementEspaces(description) ? 'error' : undefined} aria-invalid={seulementEspaces(description) || undefined}
            aria-describedby={seulementEspaces(description) ? 'dem-description-aide dem-description-erreur' : 'dem-description-aide'} />
          {/* 0.5.1 : seulement des espaces, message sous le champ (sous le compteur, qui occupe la marge du bas). */}
          {seulementEspaces(description) && <ErreurObligatoire id="dem-description-erreur" />}
        </Card>
        {plafonds && (plafonds.nombre > 0 || pieces.length > 0) && (
          <Card>
            <Typography.Title level={2} style={{ fontSize: 17 }}>{t('demande.pieces.title')}</Typography.Title>
            <PiecesDemande pieces={pieces} plafonds={plafonds} onChange={setPieces} />
          </Card>
        )}
        <Card size="small">
          <ComplementsDemande value={complements} onChange={setComplements} />
        </Card>
        {erreur && <Alert type="error" showIcon message={erreur} description={t('demande.erreur.garde')} />}
        {manque.length > 0 && (
          <Typography.Text type="secondary" id="dem-manque">{t('demande.manque')} {manque.join(', ')}</Typography.Text>
        )}
        {/* 0.7.0 (RGPD-10) : mention d'information de l'entité, texte complet sur demande, sans quitter la page. */}
        {protection && (
          <div className="dem-rgpd">
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {lang === 'nl' ? protection.mention_courte_nl : protection.mention_courte_fr}{' '}
              {/* Bouton en ligne, dans le fil du texte : un bouton Ant Design agrandirait l'interligne. */}
              <button type="button" className="dem-lien-texte" aria-expanded={rgpdOuvert} aria-controls="dem-rgpd-texte" onClick={() => setRgpdOuvert((o) => !o)}>
                {rgpdOuvert ? t('demande.rgpd.moins') : t('demande.rgpd.plus')}
              </button>
            </Typography.Text>
            <Typography.Paragraph id="dem-rgpd-texte" hidden={!rgpdOuvert} style={{ fontSize: 13, marginTop: 6, marginBottom: 0, whiteSpace: 'pre-wrap' }}>
              {lang === 'nl' ? protection.mention_nl : protection.mention_fr}
            </Typography.Paragraph>
          </div>
        )}
        <Button type="primary" size="large" icon={<SendOutlined />} block loading={envoi} disabled={manque.length > 0}
          aria-describedby={manque.length ? 'dem-manque' : undefined} onClick={envoyer}>
          {t('demande.envoyer')}
        </Button>
        <Typography.Text type="secondary" style={{ fontSize: 12 }} aria-live="polite">
          {enregistreA ? t('demande.brouillon.enregistre').replace('{heure}', enregistreA) : ''}
        </Typography.Text>
      </Space>
    </div>
  );
}

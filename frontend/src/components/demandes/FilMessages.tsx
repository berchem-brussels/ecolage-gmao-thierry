/**
 * Fil de messages d'une demande (version 0.15.0, étape 10, point 2 ; cahier des charges SUI-04, SEC-02, SUI-07).
 *   1. Messages du plus ancien au plus récent : les siens à droite, ceux des autres à gauche ; une note interne du
 *      service est encadrée et marquée « Note interne » (le serveur ne la rend jamais au demandeur). Le demandeur lit
 *      « Service technique » à la place du nom de l'agent ; le service lit les noms.
 *   2. Messages non lus : un repère « Nouveaux messages » avant le premier ; le fil est marqué lu dès qu'il est montré
 *      (POST /messages/lu) et la page est prévenue (onLu) pour remettre ses compteurs à jour.
 *   3. Écrire : texte (4 000 caractères) et photos ou documents, envoyés aussitôt (mêmes contrôles que les pièces
 *      jointes, PiecesDemande) puis rattachés au message à l'envoi ; une photo seule suffit. Le service choisit entre
 *      « Réponse au demandeur » et « Note interne ». Un refus du serveur s'affiche, la saisie reste.
 *   4. Demande fermée : le fil reste lisible, sans zone d'écriture. Qui suit seulement la demande ne voit pas le fil.
 *   5. Téléphones (DV-102) : bulles à 85 % de la largeur, mots longs coupés, champ à 16 px (règle commune), bouton
 *      « Envoyer » sous le champ ; tenu dans 320 px.
 *   6. Mentions (0.15.0, point 3 ; GES-08) : dans une note interne, « Prévenir un collègue » choisit des collègues du
 *      service de l'entité (liste du serveur, chargée au premier choix de « Note interne ») ; la note les nomme (@) et
 *      dit « Vous êtes mentionné » à la personne concernée.
 *   7. Modèles de réponse (0.15.0, point 4 ; GES-09) : dans une réponse au demandeur, « Insérer un modèle » ajoute au
 *      champ le texte du modèle choisi, dans la langue de la demande, variables remplacées (texteModele) ; le texte se
 *      relit et se modifie avant l'envoi. Liste des modèles actifs chargée à l'ouverture du fil, pour le service seul.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Divider, Form, Input, Radio, Select, Space, Tag, Typography, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import api, { ApiError } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { translations } from '../../i18n';
import { useAuth } from '../../contexts/AuthContext';
import { type Demande, type Message, type ModeleReponse, type PersonneMentionnee, type Piece, type PlafondsPieces, instant, texteModele } from '../../demandes';
import PiecesDemande from './PiecesDemande';
import VignettesPieces from './VignettesPieces';

interface Props {
  d: Demande;
  /** Fiche du service technique : noms des agents, notes internes, choix du destinataire. */
  service: boolean;
  /** Le fil a été lu ou un message envoyé : la page recharge ses compteurs. */
  onLu?: () => void;
}

export default function FilMessages({ d, service, onLu }: Props) {
  const { t, lang, hint } = useI18n();
  const [form] = Form.useForm<{ texte?: string }>();
  const [messages, setMessages] = useState<Message[] | null>(null);
  /** Premier message non lu au chargement : le repère reste à sa place pendant la lecture. */
  const [premierNonLu, setPremierNonLu] = useState<number | null>(null);
  const [interne, setInterne] = useState(false);
  const { user } = useAuth();
  /** Point 3 : collègues mentionnables (chargés au premier choix de « Note interne ») et collègues choisis. */
  const [collegues, setCollegues] = useState<PersonneMentionnee[] | null>(null);
  const [mentions, setMentions] = useState<number[]>([]);
  /** Point 4 : modèles de réponse actifs de l'entité (service qui écrit au demandeur). */
  const [modeles, setModeles] = useState<ModeleReponse[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [plafonds, setPlafonds] = useState<PlafondsPieces | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const droits = d.fil;
  // La page passe souvent une nouvelle fonction à chaque rendu : on garde la dernière sans relancer le chargement.
  const surLu = useRef(onLu);
  surLu.current = onLu;
  const ecrire = droits?.ecriture === 1;

  const charger = useCallback(async (marquer: boolean) => {
    try {
      const liste = await api.get<Message[]>(`/demandes/${d.id}/messages`);
      setMessages(liste);
      const nonLu = liste.find((m) => m.non_lu === 1);
      if (marquer) setPremierNonLu(nonLu ? nonLu.id : null);
      if (nonLu) { await api.post(`/demandes/${d.id}/messages/lu`, {}); surLu.current?.(); }
    } catch { setMessages([]); }
  }, [d.id]);

  useEffect(() => { if (droits?.lecture) charger(true); }, [droits?.lecture, charger]);
  useEffect(() => {
    if (!service || d.fil?.ecriture !== 1) return;
    api.page<ModeleReponse>('/modeles-reponse?is_active=1&limit=200').then((r) => setModeles(r.data)).catch(() => setModeles([]));
  }, [service, d.id, d.fil?.ecriture]);
  const inserer = (id: number) => {
    const m = modeles.find((x) => x.id === id);
    if (!m) return;
    const ajout = texteModele(m, d, (etat, l) => translations[`demande.etat.${etat}`]?.[l] || etat);
    const avant = (form.getFieldValue('texte') || '').trimEnd();
    form.setFieldsValue({ texte: avant ? `${avant}\n\n${ajout}` : ajout });
  };
  useEffect(() => {
    if (!interne || collegues !== null) return;
    api.get<PersonneMentionnee[]>(`/demandes/${d.id}/messages/mentionnables`).then(setCollegues).catch(() => setCollegues([]));
  }, [interne, collegues, d.id]);
  useEffect(() => {
    if (!ecrire) return;
    api.get<{ pieces: Piece[]; plafonds: PlafondsPieces }>(`/demandes/${d.id}/messages/pieces`)
      .then((r) => { setPieces(r.pieces); setPlafonds(r.plafonds); }).catch(() => setPlafonds(null));
  }, [d.id, ecrire]);

  if (!droits?.lecture) return null;

  const auteur = (m: Message) => {
    if (m.de_moi) return t('fil.auteur.moi');
    if (m.auteur === 'service') return service && m.auteur_nom ? `${m.auteur_prenom || ''} ${m.auteur_nom}`.trim() : t('fil.auteur.service');
    return service && m.auteur_nom ? `${m.auteur_prenom || ''} ${m.auteur_nom}`.trim() : t(`fil.auteur.${m.auteur}`);
  };

  const envoyer = async (v: { texte?: string }) => {
    const texte = (v.texte || '').trim();
    setErreur(null);
    if (!texte && !pieces.length) { setErreur(t('fil.vide.erreur')); return; }
    setEnvoi(true);
    try {
      await api.post<Message>(`/demandes/${d.id}/messages`, { texte: texte || null, interne: service && interne, langue: lang,
        ...(service && interne && mentions.length ? { mentions } : {}) });
      message.success(t(interne ? 'fil.envoye.interne' : 'fil.envoye'));
      form.resetFields();
      setPieces([]);
      setInterne(false);
      setMentions([]);
      await charger(false);
      surLu.current?.();
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  return (
    <section aria-labelledby={`fil-titre-${d.id}`} className="fil">
      <Typography.Title level={2} id={`fil-titre-${d.id}`} style={{ fontSize: 16, margin: '16px 0 12px' }}>{t('fil.titre')}</Typography.Title>
      {messages === null ? null : messages.length === 0 ? (
        <Typography.Paragraph type="secondary">{t(service ? 'fil.vide.service' : 'fil.vide')}</Typography.Paragraph>
      ) : (
        <ol className="fil-liste" aria-label={t('fil.titre')}>
          {messages.map((m) => (
            <li key={m.id} className={`fil-item${m.de_moi ? ' fil-moi' : ''}`}>
              {m.id === premierNonLu && <Divider plain className="fil-nouveaux">{t('fil.nouveaux')}</Divider>}
              <div className={`fil-bulle${m.de_moi ? ' fil-bulle-moi' : ''}${m.interne ? ' fil-bulle-interne' : ''}`}>
                <div className="fil-entete">
                  <Typography.Text strong style={{ fontSize: 13 }}>{auteur(m)}</Typography.Text>
                  {m.interne === 1 && <Tag color="orange" style={{ marginInlineEnd: 0 }}>{t('fil.interne')}</Tag>}
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>{instant(m.created_at)}</Typography.Text>
                </div>
                {m.mentions?.length > 0 && (
                  <div className="fil-mentions" aria-label={t('fil.mentions.liste')}>
                    {m.mentions.map((x) => <Tag key={x.user_id} style={{ marginInlineEnd: 0 }}>@{x.prenom} {x.nom}</Tag>)}
                    {m.mentions.some((x) => x.user_id === user?.id) && <Tag color="blue" style={{ marginInlineEnd: 0 }}>{t('fil.mentions.vous')}</Tag>}
                  </div>
                )}
                {m.texte && <div className="fil-texte" lang={m.langue}>{m.texte}</div>}
                {m.pieces.length > 0 && (
                  <VignettesPieces pieces={m.pieces} label={t('fil.pieces')} peutRetirer={() => service}
                    onRetirer={async (p) => {
                      try { await api.del(`/pieces/${p.id}`); await charger(false); } catch (e) { setErreur(e instanceof ApiError ? e.message : t('common.error')); }
                    }} />
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {!ecrire && d.ouverte === 0 && <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>{t('fil.ferme')}</Typography.Paragraph>}
      {ecrire && (
        <Form form={form} layout="vertical" onFinish={envoyer} className="fil-saisie">
          {service && droits?.interne === 1 && (
            <Form.Item label={t('fil.destinataire')} tooltip={hint('fil.destinataire')} style={{ marginBottom: 8 }}>
              <Radio.Group optionType="button" value={interne ? 'interne' : 'public'} onChange={(e) => setInterne(e.target.value === 'interne')}
                options={[{ value: 'public', label: t('fil.public') }, { value: 'interne', label: t('fil.interne.option') }]} />
            </Form.Item>
          )}
          <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
            {t(interne ? 'fil.aide.interne' : service ? 'fil.aide.service' : 'fil.aide.demandeur')}
          </Typography.Paragraph>
          {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
          {service && !interne && modeles.length > 0 && (
            <Form.Item label={t('fil.modele')} tooltip={hint('fil.modele')} htmlFor={`fil-modele-${d.id}`}>
              <Select<number> id={`fil-modele-${d.id}`} showSearch optionFilterProp="label" placeholder={t('fil.modele.placeholder')} value={null}
                onChange={inserer} options={modeles.map((m) => ({ value: m.id, label: lang === 'nl' ? m.titre_nl : m.titre_fr }))} />
            </Form.Item>
          )}
          {interne && (
            <Form.Item label={t('fil.mentions')} tooltip={hint('fil.mentions')} htmlFor={`fil-mentions-${d.id}`}>
              <Select<number[]> id={`fil-mentions-${d.id}`} mode="multiple" allowClear showSearch optionFilterProp="label" maxCount={10}
                placeholder={t('fil.mentions.placeholder')} loading={collegues === null} value={mentions} onChange={setMentions}
                options={(collegues || []).map((c) => ({ value: c.user_id, label: `${c.prenom} ${c.nom}` }))} />
            </Form.Item>
          )}
          <Form.Item name="texte" label={t('fil.message')} tooltip={hint('fil.message')}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 8 }} maxLength={4000} lang={lang} />
          </Form.Item>
          <Form.Item label={t('demande.champ.pieces')}>
            <PiecesDemande pieces={pieces} plafonds={plafonds} onChange={setPieces} destination={`/demandes/${d.id}/messages/pieces`} />
          </Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={envoi}>{t(interne ? 'fil.envoyer.interne' : 'fil.envoyer')}</Button>
          </Space>
        </Form>
      )}
    </section>
  );
}

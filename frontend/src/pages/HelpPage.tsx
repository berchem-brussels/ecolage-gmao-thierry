/**
 * Centre d'aide (standard, section 13.1 ; DV-100, 0.12.0) à la place de la page Aide : le gabarit 1.3.0 (HelpPage.tsx)
 * repris dans les onglets de la GMAO.
 *
 * - Mode d'emploi : une fiche par écran (help/topics), rangée comme le menu, montrée seulement si le rôle a accès à
 *   l'écran ; ?fiche=<id> ouvre une fiche (lien « Mode d'emploi complet » du bouton Aide, « Voir aussi ») ; rubriques
 *   transversales (protection des données, délais) ; les rubriques d'avant la 0.12.0 sont devenues des fiches ;
 * - Questions fréquentes : questions écrites dans le code (help.faq.qN) et FAQ locale en base, communes et de l'entité
 *   active ; ajout, modification, retrait avec motif et rétablissement par qui les gère ;
 * - recherche dans les fiches et les questions, FR ou NL selon l'écran ;
 * - impression complète (?print=1 : tout déplié, sans onglets ni boutons, impression lancée) ;
 * - nouveautés et contact, comme avant. L'onglet ouvert est dans l'adresse (?onglet=faq, nouveautes, contact).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Collapse, Descriptions, Empty, Input, List, Space, Switch, Tabs, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined, PrinterOutlined, StopOutlined, UndoOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api, { ApiError, qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, type NoteVersion } from '../contexts/AuthContext';
import { hasPermission, useRoles } from '../useRoles';
import { moduleActif, useModules } from '../moduleMap';
import { TOPICS, topicById, useHelpAccess } from '../help';
import TopicView, { type LocalFaq } from '../help/TopicView';
import FaqModal, { RetraitFaqModal } from '../help/FaqModal';
import { plain } from '../help/RichText';
import type { HelpTopic, L } from '../help/types';

/**
 * Questions écrites dans le code ; une question rattachée à un module n'apparaît que si le module est actif, une question
 * réservée (administrateur ou permission) seulement à qui peut agir.
 */
const FAQ: { n: number; module?: string; admin?: boolean; permission?: string; traitant?: boolean }[] = [
  { n: 1 }, { n: 2 }, { n: 3 }, { n: 4, module: 'patrimoine' }, { n: 5, module: 'patrimoine' }, { n: 6, module: 'patrimoine' }, { n: 7 },
  { n: 8, admin: true }, { n: 9, admin: true }, { n: 10 }, { n: 11, permission: 'parametres:gerer' },
  { n: 12 }, { n: 13 }, { n: 14, permission: 'delais:gerer' }, { n: 15, permission: 'categories:gerer' },
  // 0.5.0 : demandes d'intervention.
  { n: 16, module: 'demandes' }, { n: 17, module: 'demandes' }, { n: 18, module: 'demandes' }, { n: 19, permission: 'parametres:gerer' },
  // 0.7.0 : « Moi aussi », danger, brouillon, questions des catégories, protection des données.
  { n: 20, module: 'demandes' }, { n: 21, module: 'demandes' }, { n: 22, module: 'demandes' }, { n: 23, permission: 'categories:gerer' }, { n: 24, module: 'demandes' },
  // 0.8.0 : photos et pièces jointes des demandes.
  { n: 25, module: 'demandes' }, { n: 26, module: 'demandes' },
  // 0.9.0 : tableau de bord et qualification, pour le service technique.
  { n: 27, permission: 'demandes:entite' }, { n: 28, permission: 'demandes:entite' },
  // 0.11.0 : tickets ; le traitement pour qui traite une file (service technique ou administrateur).
  { n: 29 }, { n: 30, traitant: true },
];
const ONGLETS = ['guide', 'faq', 'nouveautes', 'contact'];
const GROUPES: HelpTopic['group'][] = ['demandeur', 'service', 'admin', 'aide'];
const sansAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function HelpPage() {
  const { t, tField, lang } = useI18n();
  const { settings } = useSettings();
  const [search, setSearch] = useSearchParams();
  const printMode = search.get('print') === '1';
  const fiche = search.get('fiche');
  const onglet = fiche ? 'guide' : ONGLETS.includes(search.get('onglet') || '') ? search.get('onglet')! : 'guide';
  const { isAdmin, roles, user, entite } = useAuth();
  const catalogue = useRoles();
  const can = (p: string) => hasPermission(catalogue, roles, p);
  const { modules } = useModules();
  const on = (m?: string) => moduleActif(modules, m);
  const voit = useHelpAccess();
  const gere = isAdmin || (!!entite && can('faq:gerer'));
  const [query, setQuery] = useState('');
  const q = sansAccents(query.trim());

  // Toutes les notes de version de la personne (filtrées par le serveur selon son rôle), de la plus récente à la plus ancienne.
  const [notes, setNotes] = useState<NoteVersion[] | null>(null);
  useEffect(() => {
    api.page<NoteVersion>(`/notes-version${qs({ limit: 200 })}`).then((r) => setNotes(r.data)).catch(() => setNotes([]));
  }, [user?.entite_active_id]);
  // Contact du service technique de l'entité active (paramètres de l'entité, ADM-03) ; absent quand rien n'est renseigné.
  const [contact, setContact] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!user?.entite_active_id) { setContact({}); return; }
    api.page<{ cle: string; valeur: string }>(`/parametres-entite${qs({ groupe: 'contact' })}`)
      .then((r) => setContact(Object.fromEntries(r.data.map((p) => [p.cle, p.valeur]))))
      .catch(() => setContact({}));
  }, [user?.entite_active_id]);
  const nomService = tField({ nom_fr: contact['contact.nom_fr'], nom_nl: contact['contact.nom_nl'] }, 'nom') || contact['contact.nom_fr'] || contact['contact.nom_nl'] || '';
  const contactVide = !nomService && !contact['contact.telephone'] && !contact['contact.courriel'];

  // FAQ locale : communes et de l'entité active ; avec les questions retirées pour qui les gère, s'il le demande.
  const [retirees, setRetirees] = useState(false);
  const [faq, setFaq] = useState<LocalFaq[]>([]);
  const loadFaq = useCallback(() => {
    api.page<LocalFaq>(`/faq${qs({ limit: 200, inclure_inactives: retirees ? 1 : undefined })}`).then((r) => setFaq(Array.isArray(r.data) ? r.data : [])).catch(() => setFaq([]));
  }, [retirees, user?.entite_active_id]);
  useEffect(() => { loadFaq(); }, [loadFaq]);
  const [edition, setEdition] = useState<{ faq?: LocalFaq | null; topicId?: string | null } | null>(null);
  const [retrait, setRetrait] = useState<LocalFaq | null>(null);
  const retablir = async (f: LocalFaq) => {
    try { await api.put(`/faq/${f.id}`, { is_active: 1 }); message.success(t('faq.retablie')); loadFaq(); }
    catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
  };
  const actions = (f: LocalFaq) => (printMode || !f.can_manage ? null : (
    <Space wrap size={4}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {f.entite_code ? `${t('faq.portee.entite')} ${f.entite_code}` : t('faq.portee.commune')}
        {f.source_ticket_reference ? ` · ${f.source_ticket_reference}` : ''}
        {!f.is_active && f.motif_desactivation ? ` · ${t('faq.motif')} : ${f.motif_desactivation}` : ''}
      </Typography.Text>
      {f.is_active
        ? <>
            <Button size="small" icon={<EditOutlined />} onClick={() => setEdition({ faq: f })}>{t('common.edit')}</Button>
            <Button size="small" danger icon={<StopOutlined />} onClick={() => setRetrait(f)}>{t('faq.remove')}</Button>
          </>
        : <Button size="small" icon={<UndoOutlined />} onClick={() => retablir(f)}>{t('faq.retablir')}</Button>}
    </Space>
  ));

  useEffect(() => {
    if (!printMode) return undefined;
    const id = window.setTimeout(() => window.print(), 800);
    return () => window.clearTimeout(id);
  }, [printMode]);
  // Fiche demandée par l'adresse : on la fait défiler à l'écran une fois affichée.
  useEffect(() => {
    if (!fiche) return;
    const id = window.setTimeout(() => document.getElementById(`help-${fiche}`)?.scrollIntoView?.({ block: 'start' }), 200);
    return () => window.clearTimeout(id);
  }, [fiche]);

  const tx = (l: L) => l[lang] || l.fr;
  const texteFiche = (tp: HelpTopic) => sansAccents([t(tp.titleKey), tx(tp.purpose), ...tp.layout.map(tx),
    ...tp.procedures.filter((p) => voit(p.acces)).flatMap((p) => [tx(p.title), tx(p.when), tx(p.result), ...p.steps.map(tx)]),
    ...tp.faq.filter((f) => voit(f.acces)).flatMap((f) => [tx(f.q), tx(f.a)])].map((s) => plain(s, t)).join(' '));
  const texteLocal = (f: LocalFaq) => sansAccents(lang === 'nl' ? `${f.question_nl} ${f.answer_nl}` : `${f.question_fr} ${f.answer_fr}`);

  const fiches = useMemo(() => TOPICS.filter((tp) => voit(tp.acces)), [voit]);
  const fichesTrouvees = fiches.filter((tp) => !q || texteFiche(tp).includes(q) || faq.some((f) => f.topic_id === tp.id && texteLocal(f).includes(q)));
  const localDe = (id: string) => faq.filter((f) => f.topic_id === id && (!q || texteLocal(f).includes(q) || texteFiche(topicById(id)!).includes(q)));

  // Rubriques transversales, hors écran : protection des données et délais.
  const rubriques = [
    ...(user?.protection_donnees ? [{ key: 'rgpd', label: t('help.guide.rgpd.titre'), texte: `${lang === 'nl' ? user.protection_donnees.mention_nl : user.protection_donnees.mention_fr}`, children: (
      <>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{lang === 'nl' ? user.protection_donnees.mention_nl : user.protection_donnees.mention_fr}</Typography.Paragraph>
        <Typography.Paragraph type="secondary">{t('help.guide.rgpd.dpo')} : {user.protection_donnees.dpo_contact || t('help.guide.rgpd.dpo.absent')}</Typography.Paragraph>
      </>
    ) }] : []),
    // Entité active et nouveautés : dans la fiche de l'accueil depuis le point 3 de la 0.12.0.
    { key: 'delais', label: t('help.guide.delais.titre'), texte: t('help.guide.delais') },
  ] as { key: string; label: string; texte: string; children?: React.ReactNode }[];
  const rubriquesTrouvees = rubriques.filter((r) => !q || sansAccents(`${r.label} ${r.texte}`).includes(q));

  const faqCode = FAQ.filter((f) => on(f.module) && (!f.admin || isAdmin) && (!f.permission || can(f.permission)) && (!f.traitant || !!user?.files_tickets?.length))
    .map(({ n }) => ({ key: `q${n}`, label: t(`help.faq.q${n}`), texte: t(`help.faq.a${n}`) }))
    .filter((f) => !q || sansAccents(`${f.label} ${f.texte}`).includes(q));
  const generales = faq.filter((f) => !f.topic_id && (!q || texteLocal(f).includes(q)));

  const guide = (
    <>
      {fichesTrouvees.length === 0 && rubriquesTrouvees.length === 0 && <Empty description={t('help.no_result')} />}
      <div className="help-topics">
        {GROUPES.map((g) => {
          const liste = fichesTrouvees.filter((tp) => tp.group === g);
          if (!liste.length) return null;
          return (
            <section key={g} aria-label={t(`help.groupe.${g}`)}>
              <Typography.Title level={2} style={{ fontSize: 16, marginTop: 8 }}>{t(`help.groupe.${g}`)}</Typography.Title>
              {printMode
                ? liste.map((tp) => <Card key={tp.id} style={{ marginBottom: 16, breakInside: 'avoid' }}><TopicView topic={tp} expanded localFaq={localDe(tp.id)} /></Card>)
                : <Collapse key={q ? `q-${q}` : 'tout'} style={{ marginBottom: 16 }} defaultActiveKey={fiche ? [fiche] : q ? liste.map((tp) => tp.id) : []}
                    items={liste.map((tp) => ({ key: tp.id, label: t(tp.titleKey), children: <TopicView topic={tp} localFaq={localDe(tp.id)} faqActions={actions} /> }))} />}
            </section>
          );
        })}
      </div>
      {rubriquesTrouvees.length > 0 && (
        <section aria-label={t('help.rubriques')}>
          <Typography.Title level={2} style={{ fontSize: 16, marginTop: 8 }}>{t('help.rubriques')}</Typography.Title>
          <Collapse defaultActiveKey={printMode ? rubriquesTrouvees.map((r) => r.key) : []}
            items={rubriquesTrouvees.map((r) => ({ key: r.key, label: r.label, children: r.children || <Typography.Paragraph>{r.texte}</Typography.Paragraph> }))} />
        </section>
      )}
    </>
  );

  const questions = (
    <>
      {gere && !printMode && (
        <Space wrap style={{ marginBottom: 12 }}>
          <Button icon={<PlusOutlined />} onClick={() => setEdition({ topicId: null })}>{t('help.faq.add')}</Button>
          <Space size={6}><Switch size="small" checked={retirees} onChange={setRetirees} aria-label={t('faq.voir_retirees')} /><span>{t('faq.voir_retirees')}</span></Space>
        </Space>
      )}
      {faqCode.length === 0 && generales.length === 0 ? <Empty description={t('help.no_result')} /> : (
        <Collapse defaultActiveKey={printMode ? [...generales.map((f) => `l${f.id}`), ...faqCode.map((f) => f.key)] : []} items={[
          ...generales.map((f) => ({
            key: `l${f.id}`,
            label: <span>{lang === 'nl' ? f.question_nl : f.question_fr}{!f.is_active && <Tag style={{ marginInlineStart: 8 }}>{t('faq.retiree')}</Tag>}</span>,
            children: <Space direction="vertical" style={{ width: '100%' }}><span style={{ whiteSpace: 'pre-wrap' }}>{lang === 'nl' ? f.answer_nl : f.answer_fr}</span>{actions(f)}</Space>,
          })),
          ...faqCode.map((f) => ({ key: f.key, label: f.label, children: <Typography.Paragraph>{f.texte}</Typography.Paragraph> })),
        ]} />
      )}
      {faq.some((f) => f.topic_id) && !printMode && <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>{t('faq.par_ecran')}</Typography.Paragraph>}
    </>
  );

  const nouveautes = (
    <List loading={notes === null} dataSource={notes || []} rowKey="version" locale={{ emptyText: t('common.nodata') }} renderItem={(n) => (
      <List.Item style={{ display: 'block' }}>
        <Typography.Title level={2} style={{ fontSize: 15 }}>
          {t('nouveautes.version').replace('{v}', n.version)} · {dayjs(n.date).format('L')}
        </Typography.Title>
        <ul style={{ paddingInlineStart: 20, margin: 0 }}>
          {n.lignes.map((l, i) => <li key={i}>{lang === 'nl' ? l.nl : l.fr}</li>)}
        </ul>
      </List.Item>
    )} />
  );

  const contactBloc = (
    <>
      <Typography.Title level={2} style={{ fontSize: 16 }}>{t('help.contact.technique')}{entite ? ` · ${entite.code}` : ''}</Typography.Title>
      {contactVide ? <Typography.Paragraph type="secondary">{t('help.contact.technique.absent')}</Typography.Paragraph> : (
        <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
          {nomService && <Descriptions.Item label={t('help.contact.service')}>{nomService}</Descriptions.Item>}
          {contact['contact.telephone'] && <Descriptions.Item label={t('help.contact.telephone')}><a href={`tel:${contact['contact.telephone'].replace(/[^+0-9]/g, '')}`}>{contact['contact.telephone']}</a></Descriptions.Item>}
          {contact['contact.courriel'] && <Descriptions.Item label={t('help.contact.courriel')}><a href={`mailto:${contact['contact.courriel']}`}>{contact['contact.courriel']}</a></Descriptions.Item>}
        </Descriptions>
      )}
      <Typography.Title level={2} style={{ fontSize: 16 }}>{t('help.contact.support')}</Typography.Title>
      <Typography.Paragraph>{settings.app.support_contact || t('help.contact.support.absent')}</Typography.Paragraph>
    </>
  );

  const setOnglet = (k: string) => setSearch(k === 'guide' ? {} : { onglet: k }, { replace: true });
  return (
    <div className={printMode ? 'help-print' : undefined}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{t('help.title')}</Typography.Title>
        {!printMode && (
          <Space wrap className="page-header-actions">
            <Button icon={<PrinterOutlined />} onClick={() => window.open(`/help?print=1&t=${Date.now()}`, '_blank')}>{t('help.print')}</Button>
          </Space>
        )}
      </div>
      {printMode ? (
        <>
          <Typography.Paragraph type="secondary">{t('help.print.entete').replace('{date}', dayjs().format('L')).replace('{version}', settings.version || '')}</Typography.Paragraph>
          {guide}
          <Typography.Title level={2} style={{ fontSize: 18, marginTop: 24 }}>{t('help.faq')}</Typography.Title>
          {questions}
          <Typography.Title level={2} style={{ fontSize: 18, marginTop: 24 }}>{t('help.contact')}</Typography.Title>
          {contactBloc}
        </>
      ) : (
        <Card>
          <Input.Search className="help-search" allowClear aria-label={t('help.search')} placeholder={t('help.search')} value={query}
            onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 420, marginBottom: 12 }} />
          <Tabs activeKey={onglet} onChange={setOnglet} items={[
            { key: 'guide', label: q ? `${t('help.guide')} (${fichesTrouvees.length + rubriquesTrouvees.length})` : t('help.guide'), children: guide },
            { key: 'faq', label: q ? `${t('help.faq')} (${faqCode.length + generales.length})` : t('help.faq'), children: questions },
            { key: 'nouveautes', label: t('help.nouveautes'), children: nouveautes },
            { key: 'contact', label: t('help.contact'), children: contactBloc },
          ]} />
        </Card>
      )}
      <FaqModal open={!!edition} faq={edition?.faq} topicId={edition?.topicId} onClose={() => setEdition(null)} onSaved={loadFaq} />
      <RetraitFaqModal faq={retrait} onClose={() => setRetrait(null)} onDone={loadFaq} />
    </div>
  );
}

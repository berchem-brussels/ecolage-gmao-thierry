/**
 * Affichage d'une fiche d'aide (gabarit 1.3.0, help/TopicView.tsx) : rôle de l'écran, à qui il sert, zones, capture,
 * procédures, questions (écrites dans le code et FAQ locale). GMAO (0.12.0) : rôles par leur libellé du catalogue,
 * procédures et questions réservées masquées à qui n'y a pas accès, actions de gestion sur les questions locales.
 */
import React from 'react';
import { Collapse, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { HelpTopic, L } from './types';
import RichText from './RichText';
import { topicById, useHelpAccess } from './index';
import { useI18n } from '../contexts/I18nContext';
import { useRoles } from '../useRoles';

export interface LocalFaq {
  id: number; entite_id: number | null; entite_code: string | null; topic_id: string | null;
  question_fr: string; question_nl: string; answer_fr: string; answer_nl: string;
  is_active: number; motif_desactivation: string | null; can_manage: boolean; source_ticket_reference?: string | null;
}

interface Props {
  topic: HelpTopic;
  localFaq?: LocalFaq[];
  /** Tout déplié (impression). */
  expanded?: boolean;
  /** Boutons de gestion d'une question locale (modifier, retirer), fournis par le centre d'aide. */
  faqActions?: (f: LocalFaq) => React.ReactNode;
}

/**
 * Adresse d'une capture. Pas sous /help (gabarit 1.3.0) : un dossier dist/help ferait servir par nginx le dossier au
 * lieu de l'écran /help de l'application (try_files $uri $uri/), d'où /aide-captures (0.12.0, E-37).
 */
export function shotSrc(lang: string, id: string) { return `/aide-captures/${lang}/${id}.jpg`; }

export default function TopicView({ topic, localFaq = [], expanded = false, faqActions }: Props) {
  const { t, lang } = useI18n();
  const voit = useHelpAccess();
  const catalogue = useRoles();
  const tx = (l: L) => l[lang] || l.fr;
  const role = (code: string) => {
    const r = catalogue.find((x) => x.code === code);
    return r ? (lang === 'nl' ? r.label_nl : r.label_fr) : code;
  };
  // Une capture absente (pas encore produite) ne laisse pas d'image cassée.
  // 0.13.0 (M1) : fiche dépliée pour l'impression, captures chargées tout de suite ; à l'écran, au fil du défilement.
  const img = (id: string, alt: string) => <img key={id} src={shotSrc(lang, id)} alt={alt} className="help-shot" loading={expanded ? 'eager' : 'lazy'} onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }} />;
  const procItems = topic.procedures.filter((p) => voit(p.acces)).map((p, i) => ({
    key: String(i),
    label: tx(p.title),
    children: (
      <div>
        <Typography.Paragraph type="secondary"><RichText text={tx(p.when)} /></Typography.Paragraph>
        <ol>{p.steps.map((s, j) => <li key={j}><RichText text={tx(s)} /></li>)}</ol>
        <Typography.Paragraph><strong>{t('help.result')}</strong> <RichText text={tx(p.result)} /></Typography.Paragraph>
        {p.errors?.map((e, j) => (
          <Typography.Paragraph key={j}><strong>{t('help.problem')}</strong> <RichText text={tx(e.problem)} /> <RichText text={tx(e.solution)} /></Typography.Paragraph>
        ))}
        {p.shots?.map((s) => img(s, tx(topic.shots.find((x) => x.id === s)?.caption || { fr: '', nl: '' })))}
      </div>
    ),
  }));
  const faq = [
    ...topic.faq.filter((f) => voit(f.acces)).map((f, i) => ({ key: `c${i}`, label: tx(f.q), children: <RichText text={tx(f.a)} /> })),
    ...localFaq.map((f) => ({
      key: `l${f.id}`,
      label: <span>{lang === 'nl' ? f.question_nl : f.question_fr}{!f.is_active && <Tag style={{ marginInlineStart: 8 }}>{t('faq.retiree')}</Tag>}</span>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <span style={{ whiteSpace: 'pre-wrap' }}>{lang === 'nl' ? f.answer_nl : f.answer_fr}</span>
          {faqActions?.(f)}
        </Space>
      ),
    })),
  ];
  return (
    <div className="help-topic" id={`help-${topic.id}`}>
      <Typography.Title level={2} style={{ fontSize: 18 }}>{t(topic.titleKey)}</Typography.Title>
      <Space wrap style={{ marginBottom: 8 }} aria-label={t('help.pour')}>{topic.roles.map((r) => <Tag key={r}>{role(r)}</Tag>)}</Space>
      <Typography.Paragraph><RichText text={tx(topic.purpose)} /></Typography.Paragraph>
      {topic.overviewShot && img(topic.overviewShot, tx(topic.shots.find((x) => x.id === topic.overviewShot)?.caption || { fr: '', nl: '' }) || t(topic.titleKey))}
      <ul className="help-zones">{topic.layout.map((l, i) => <li key={i}><RichText text={tx(l)} /></li>)}</ul>
      <Typography.Title level={3} style={{ fontSize: 15 }}>{t('help.procedures')}</Typography.Title>
      <Collapse items={procItems} defaultActiveKey={expanded ? procItems.map((p) => p.key) : []} />
      {faq.length > 0 && (
        <>
          <Typography.Title level={3} style={{ fontSize: 15, marginTop: 16 }}>{t('help.faq')}</Typography.Title>
          <Collapse items={faq} defaultActiveKey={expanded ? faq.map((f) => f.key) : []} />
        </>
      )}
      {topic.seeAlso.length > 0 && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
          {t('help.voir_aussi')} {topic.seeAlso.map((id, i) => <React.Fragment key={id}>{i > 0 && ', '}<Link to={`/help?fiche=${id}`}>{t(topicById(id)?.titleKey || id)}</Link></React.Fragment>)}
        </Typography.Paragraph>
      )}
    </div>
  );
}

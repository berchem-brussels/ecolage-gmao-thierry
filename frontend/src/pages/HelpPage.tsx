/**
 * Aide : mode d'emploi, FAQ, nouveautés et contact (patron SAGA HelpPage.tsx). Chaque fonctionnalité ajoute sa rubrique
 * et sa question. L'onglet ouvert est dans l'adresse (?onglet=faq, nouveautes, contact).
 */
import { useEffect, useState } from 'react';
import { Card, Collapse, Descriptions, List, Tabs, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api, { qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, type NoteVersion } from '../contexts/AuthContext';
import { hasPermission, useRoles } from '../useRoles';
import { moduleActif, useModules } from '../moduleMap';

/**
 * Questions de la FAQ ; une question rattachée à un module n'apparaît que si le module est actif, une question réservée
 * (administrateur ou permission) seulement à qui peut agir.
 */
const FAQ: { n: number; module?: string; admin?: boolean; permission?: string }[] = [
  { n: 1 }, { n: 2 }, { n: 3 }, { n: 4, module: 'patrimoine' }, { n: 5, module: 'patrimoine' }, { n: 6, module: 'patrimoine' }, { n: 7 },
  { n: 8, admin: true }, { n: 9, admin: true }, { n: 10 }, { n: 11, permission: 'parametres:gerer' },
  { n: 12 }, { n: 13 }, { n: 14, permission: 'delais:gerer' }, { n: 15, permission: 'categories:gerer' },
  // 0.5.0 : demandes d'intervention.
  { n: 16, module: 'demandes' }, { n: 17, module: 'demandes' }, { n: 18, module: 'demandes' }, { n: 19, permission: 'parametres:gerer' },
  // 0.7.0 : « Moi aussi », danger, brouillon, questions des catégories, protection des données.
  { n: 20, module: 'demandes' }, { n: 21, module: 'demandes' }, { n: 22, module: 'demandes' }, { n: 23, permission: 'categories:gerer' }, { n: 24, module: 'demandes' },
  // 0.8.0 : photos et pièces jointes des demandes.
  { n: 25, module: 'demandes' }, { n: 26, module: 'demandes' },
];
const ONGLETS = ['guide', 'faq', 'nouveautes', 'contact'];

export default function HelpPage() {
  const { t, tField, lang } = useI18n();
  const { settings } = useSettings();
  const [search, setSearch] = useSearchParams();
  const onglet = ONGLETS.includes(search.get('onglet') || '') ? search.get('onglet')! : 'guide';
  // Une rubrique n'apparaît que si le rôle a accès à l'écran (standard v3.2, section 13.1).
  const { isAdmin, roles, user, entite } = useAuth();
  // Toutes les notes de version de la personne (filtrées par le serveur selon son rôle), de la plus récente à la plus ancienne.
  const [notes, setNotes] = useState<NoteVersion[] | null>(null);
  useEffect(() => {
    api.page<NoteVersion>(`/notes-version${qs({ limit: 200 })}`).then((r) => setNotes(r.data)).catch(() => setNotes([]));
  }, [user?.entite_active_id]);
  const catalogue = useRoles();
  const can = (p: string) => hasPermission(catalogue, roles, p);
  // Une rubrique d'un module éteint n'apparaît pas (standard v3.2, section 6.2).
  const { modules } = useModules();
  const on = (m?: string) => moduleActif(modules, m);
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
  return (
    <div>
      <Typography.Title level={1} style={{ fontSize: 22, marginBottom: 16 }}>{t('help.title')}</Typography.Title>
      <Card>
        <Tabs activeKey={onglet} onChange={(k) => setSearch(k === 'guide' ? {} : { onglet: k }, { replace: true })} items={[
          { key: 'guide', label: t('help.guide'), children: (
            <Collapse items={[
              // 0.5.0 : déposer et suivre une demande, lieu de travail, demandes de l'entité, numérotation.
              ...(entite && on('demandes') ? [
                { key: 'demande', label: t('help.guide.demande.titre'), children: <Typography.Paragraph>{t('help.guide.demande')}</Typography.Paragraph> },
                { key: 'mesdemandes', label: t('nav.demandes'), children: <Typography.Paragraph>{t('help.guide.mesdemandes')}</Typography.Paragraph> },
                { key: 'lieuhabituel', label: t('profil.lieu.title'), children: <Typography.Paragraph>{t('help.guide.lieuhabituel')}</Typography.Paragraph> },
              ] : []),
              ...(can('demandes:entite') ? [{ key: 'demandesentite', label: t('nav.demandes.entite'), children: <Typography.Paragraph>{t('help.guide.demandesentite')}</Typography.Paragraph> }] : []),
              // 0.7.0 (RGPD-10) : mention complète de l'entité active et contact du DPO, réglés dans les Réglages de l'entité.
              ...(user?.protection_donnees ? [{ key: 'rgpd', label: t('help.guide.rgpd.titre'), children: (
                <>
                  <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{lang === 'nl' ? user.protection_donnees.mention_nl : user.protection_donnees.mention_fr}</Typography.Paragraph>
                  <Typography.Paragraph type="secondary">{t('help.guide.rgpd.dpo')} : {user.protection_donnees.dpo_contact || t('help.guide.rgpd.dpo.absent')}</Typography.Paragraph>
                </>
              ) }] : []),
              { key: 'entite', label: t('layout.entite'), children: <Typography.Paragraph>{t('help.guide.entite')}</Typography.Paragraph> },
              ...(can('lieux:lire') && on('patrimoine') ? [{ key: 'patrimoine', label: t('nav.patrimoine'), children: <Typography.Paragraph>{t('help.guide.patrimoine')}</Typography.Paragraph> }] : []),
              { key: 'nouveautes', label: t('help.nouveautes'), children: <Typography.Paragraph>{t('help.guide.nouveautes')}</Typography.Paragraph> },
              { key: 'delais', label: t('help.guide.delais.titre'), children: <Typography.Paragraph>{t('help.guide.delais')}</Typography.Paragraph> },
              ...(can('categories:gerer') ? [{ key: 'referentiel', label: t('nav.referentiel'), children: <Typography.Paragraph>{t('help.guide.referentiel')}</Typography.Paragraph> }] : []),
              ...(can('parametres:gerer') ? [
                { key: 'reglages', label: t('nav.reglages'), children: <Typography.Paragraph>{t('help.guide.reglages')}</Typography.Paragraph> },
                { key: 'numerotation', label: t('reglages.groupe.numerotation'), children: <Typography.Paragraph>{t('help.guide.numerotation')}</Typography.Paragraph> },
              ] : []),
              ...(can('listes:gerer') ? [{ key: 'listes', label: t('nav.listes'), children: <Typography.Paragraph>{t('help.guide.listes')}</Typography.Paragraph> }] : []),
              ...(isAdmin ? [
                { key: 'entites', label: t('nav.entites'), children: <Typography.Paragraph>{t('help.guide.entites')}</Typography.Paragraph> },
                { key: 'users', label: t('nav.users'), children: <Typography.Paragraph>{t('help.guide.users')}</Typography.Paragraph> },
                { key: 'parametres', label: t('nav.parametres'), children: <Typography.Paragraph>{t('help.guide.parametres')}</Typography.Paragraph> },
                { key: 'modules', label: t('parametres.tab.modules'), children: <Typography.Paragraph>{t('help.guide.modules')}</Typography.Paragraph> },
                { key: 'journal', label: t('nav.journal'), children: <Typography.Paragraph>{t('help.guide.journal')}</Typography.Paragraph> },
              ] : []),
            ]} />
          ) },
          { key: 'faq', label: t('help.faq'), children: (
            <Collapse items={FAQ.filter((f) => on(f.module) && (!f.admin || isAdmin) && (!f.permission || can(f.permission))).map(({ n }) => ({ key: String(n), label: t(`help.faq.q${n}`), children: <Typography.Paragraph>{t(`help.faq.a${n}`)}</Typography.Paragraph> }))} />
          ) },
          { key: 'nouveautes', label: t('help.nouveautes'), children: (
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
          ) },
          { key: 'contact', label: t('help.contact'), children: (
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
          ) },
        ]} />
      </Card>
    </div>
  );
}

/**
 * Chatbot local à intentions (patron SAGA Chatbot.tsx) : sans modèle de langage, sans appel sortant.
 * Bouton rond de 52 px fixé en bas à droite ; fenêtre de 380 sur 500 px, plein écran sur smartphone.
 * 0.18.0 (point 3 ; cahier des charges AID-02, AID-03 ; standard, section 13.3 ; DV-150) :
 *   - le bouton « Ouvrir l'écran » n'est proposé que pour un écran que la personne peut ouvrir (module, permission dans
 *     l'entité active, administrateur : ACCES_ECRANS, mêmes conditions que le menu et l'aide) ;
 *   - « où en est ma demande » : l'assistant lit les demandes de la personne par l'API (GET /api/demandes, périmètre
 *     « miennes », donc ses droits) : celle dont le numéro est cité, sinon ses trois demandes ouvertes les plus récentes,
 *     avec leur état et un lien vers la fiche ;
 *   - question sans intention : recherche dans les fiches d'aide que la personne voit ; jusqu'à trois fiches proposées,
 *     citées par leur titre (source), avec un lien vers la fiche.
 */
import { useState } from 'react';
import { Button, Card, Grid, Input, Space, Typography } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { intents } from '../i18n';
import { moduleActif, useModules } from '../moduleMap';
import { useAuth } from '../contexts/AuthContext';
import { TOPICS, useHelpAccess } from '../help';
import type { Acces, HelpTopic } from '../help/types';
import type { Demande } from '../demandes';

/** Condition d'ouverture de chaque écran que l'assistant propose (comme le menu) ; un écran absent est ouvert à tous. */
export const ACCES_ECRANS: [string, Acces][] = [
  ['/demandes-entite', { permission: 'demandes:entite', module: 'demandes' }],
  ['/demandes/encoder', { permission: 'demandes:traiter', module: 'demandes' }],
  ['/demandes', { entite: true, module: 'demandes' }],
  ['/a-valider', { permission: 'demandes:valider', module: 'demandes' }],
  ['/patrimoine', { permission: 'lieux:lire', module: 'patrimoine' }],
  ['/referentiel', { permission: 'categories:gerer' }],
  ['/listes', { permission: 'listes:gerer' }],
  ['/reglages-entite', { permission: 'parametres:gerer' }],
  ['/services', { admin: true }], ['/parametres', { admin: true }], ['/journal', { admin: true }], ['/entites', { admin: true }], ['/users', { admin: true }],
];
/** Condition de l'écran d'une adresse : la plus longue entrée qui la commence. */
export function accesEcran(route: string): Acces | undefined {
  const chemin = route.split(/[?#]/)[0];
  return ACCES_ECRANS.filter(([p]) => chemin === p || chemin.startsWith(`${p}/`)).sort((a, b) => b[0].length - a[0].length)[0]?.[1];
}

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Numéro de demande cité (« AC-DI-2026-00012 ») ou nombre de 3 chiffres et plus (« 00012 », « 12345 »). */
export function numeroCite(q: string): string | null {
  const complet = /\b[a-z]{2,6}-[a-z]{2}-\d{4}-\d{1,6}\b/i.exec(q);
  if (complet) return complet[0].toUpperCase();
  const nombre = /\b\d{3,6}\b/.exec(q);
  return nombre ? nombre[0] : null;
}

/** Réponse à une question ; les intentions d'un module éteint sont ignorées (standard v3.2, section 6.2). */
export function answer(q: string, actif: (module?: string) => boolean = () => true): { key: string; route?: string } {
  const s = q.toLowerCase();
  const hit = intents.find((i) => actif(i.module) && i.keys.some((k) => s.includes(k)));
  return hit ? { key: hit.answer, route: hit.route } : { key: 'chat.unknown' };
}

/**
 * Fiches d'aide qui répondent le mieux : mots de 4 lettres et plus de la question (sans accents) cherchés dans le titre,
 * l'objet, les procédures et la FAQ de la fiche ; une fiche se classe par le nombre de mots trouvés, le titre comptant
 * double. Trois fiches au plus.
 */
export function fichesPour(q: string, fiches: HelpTopic[], texte: (f: HelpTopic) => { titre: string; corps: string }): HelpTopic[] {
  const mots = [...new Set(sansAccents(q).split(/[^a-z0-9]+/).filter((m) => m.length >= 4))];
  if (!mots.length) return [];
  return fiches.map((f) => {
    const { titre, corps } = texte(f);
    const tt = sansAccents(titre);
    const cc = sansAccents(corps);
    return { f, score: mots.reduce((n, m) => n + (tt.includes(m) ? 2 : 0) + (cc.includes(m) ? 1 : 0), 0) };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.f);
}

interface Lien { libelle: string; route: string }
interface Msg { from: 'bot' | 'user'; text: string; brut?: boolean; route?: string; liens?: Lien[] }

const SUIVI = 'chat.intent.suivi';

export default function Chatbot() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const { modules } = useModules();
  const { entite } = useAuth();
  const voit = useHelpAccess();
  const peutOuvrir = (route?: string) => !!route && voit(accesEcran(route));
  const ajouter = (...m: Msg[]) => setMsgs((liste) => [...liste, ...m]);

  /** AID-03 : la demande citée, sinon les trois demandes ouvertes les plus récentes de la personne. */
  const suivi = async (question: string) => {
    const numero = numeroCite(question);
    try {
      const r = await api.page<Demande>(`/demandes${qs({ perimetre: 'miennes', q: numero || undefined, ouvertes: numero ? undefined : 1, limit: 3 })}`);
      if (!r.data.length) {
        ajouter({ from: 'bot', text: numero ? t('chat.suivi.introuvable').replace('{numero}', numero) : t('chat.suivi.aucune'), brut: true, route: '/demandes' });
        return;
      }
      const etat = (d: Demande) => (lang === 'nl' ? d.etat_libelle_nl : d.etat_libelle_fr) || t(`demande.etat.${d.etat}`);
      ajouter({ from: 'bot', text: t(numero ? 'chat.suivi.trouvee' : 'chat.suivi.ouvertes'), brut: true,
        liens: r.data.map((d) => ({ libelle: `${d.numero} : ${etat(d)}`, route: `/demandes?demande=${d.id}` })) });
    } catch {
      ajouter({ from: 'bot', text: SUIVI, route: '/demandes' });
    }
  };

  const send = () => {
    const question = q.trim();
    if (!question) return;
    setQ('');
    ajouter({ from: 'user', text: question, brut: true });
    const a = answer(question, (m) => moduleActif(modules, m));
    // « où en est ma demande », un numéro complet cité, ou un nombre sans autre intention : réponse lue dans les demandes
    // de la personne (AID-03). Un nombre seul avec une autre intention reste à celle-ci (« fuite au local 104 »).
    const numero = numeroCite(question);
    const complet = !!numero && numero.includes('-');
    if (entite && moduleActif(modules, 'demandes') && (a.key === SUIVI || complet || (a.key === 'chat.unknown' && numero))) {
      suivi(question);
      return;
    }
    if (a.key !== 'chat.unknown') {
      ajouter({ from: 'bot', text: a.key, route: peutOuvrir(a.route) ? a.route : undefined });
      return;
    }
    const tx = (l: { fr: string; nl: string }) => l[lang] || l.fr;
    const fiches = fichesPour(question, TOPICS.filter((f) => voit(f.acces)), (f) => ({
      titre: t(f.titleKey),
      corps: [tx(f.purpose), ...f.procedures.filter((p) => voit(p.acces)).flatMap((p) => [tx(p.title), tx(p.when), ...p.steps.map(tx)]),
        ...f.faq.filter((x) => voit(x.acces)).flatMap((x) => [tx(x.q), tx(x.a)])].join(' '),
    }));
    if (fiches.length) {
      ajouter({ from: 'bot', text: t('chat.aide.trouvee'), brut: true,
        liens: fiches.map((f) => ({ libelle: t('chat.aide.fiche').replace('{titre}', t(f.titleKey)), route: `/help?fiche=${f.id}` })) });
    } else ajouter({ from: 'bot', text: 'chat.unknown' });
  };

  const aller = (route: string) => { navigate(route); setOpen(false); };
  const mobile = screens.md === false;
  return (
    <div className="chatbot-widget">
      {!open && (
        <Button type="primary" shape="circle" aria-label={t('chat.open')} icon={<MessageOutlined />} onClick={() => setOpen(true)} data-visite="assistant"
          style={{ position: 'fixed', right: 20, bottom: 20, width: 52, height: 52, zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
      )}
      {open && (
        <Card title={t('chat.title')} role="dialog" aria-label={t('chat.title')}
          extra={<Button type="text" aria-label={t('common.close')} icon={<CloseOutlined />} onClick={() => setOpen(false)} />}
          style={mobile ? { position: 'fixed', inset: 0, zIndex: 30, borderRadius: 0, display: 'flex', flexDirection: 'column' } : { position: 'fixed', right: 20, bottom: 20, width: 380, height: 500, zIndex: 30, borderRadius: 16, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minHeight: 0 } }}>
          <div style={{ flex: 1, overflow: 'auto' }} aria-live="polite" className="chatbot-messages">
            <Typography.Paragraph type="secondary">{t('chat.hello')}</Typography.Paragraph>
            {msgs.map((m, i) => (
              <div key={i} style={{ textAlign: m.from === 'user' ? 'right' : 'left', marginBottom: 8, overflowWrap: 'anywhere' }}>
                <Typography.Text>{m.brut ? m.text : t(m.text)}</Typography.Text>
                {m.route && <div><Button size="small" type="link" onClick={() => aller(m.route!)} style={{ paddingInline: 0 }}>{t('chat.go')}</Button></div>}
                {m.liens && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
                    {m.liens.map((l) => (
                      <li key={l.route}>
                        <Button size="small" type="link" onClick={() => aller(l.route)}
                          style={{ paddingInline: 0, height: 'auto', whiteSpace: 'normal', textAlign: 'start' }}>{l.libelle}</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Input aria-label={t('chat.placeholder')} placeholder={t('chat.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} onPressEnter={send} />
            <Button type="primary" aria-label={t('chat.send')} icon={<SendOutlined />} onClick={send} />
          </Space.Compact>
        </Card>
      )}
    </div>
  );
}

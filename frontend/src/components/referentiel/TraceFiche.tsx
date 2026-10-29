/**
 * Mention de traçabilité d'une fiche du référentiel (version 0.4.1, DV-04) : « Modifié le JJ/MM/AAAA à HH:MM par <nom> »,
 * « Créé le … », « Valeur livrée, rétablie le … » ou « Valeur livrée ». La date est rendue en UTC par le serveur et
 * affichée à l'heure de Bruxelles. Le serveur ne rend le nom qu'aux personnes de l'entité ; sans nom, la date seule.
 */
import { Typography } from 'antd';
import { useI18n } from '../../contexts/I18nContext';
import type { Trace } from '../../referentiel';

// Parties de la date à l'heure de Bruxelles, assemblées à la main : JJ/MM/AAAA et HH:MM quel que soit le navigateur
// (Safari sur iPhone, Chrome sur Android) et la langue de l'écran.
const PARTIES = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
function bruxelles(d: Date) {
  const p = Object.fromEntries(PARTIES.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.day}/${p.month}/${p.year}`, heure: `${p.hour}:${p.minute}` };
}

/** Texte de la mention, dans la langue de l'écran. */
export function texteTrace(t: (k: string) => string, tr: Trace): string {
  if (tr.etat === 'livree' || !tr.le) return t('ref.trace.livree');
  const { date, heure } = bruxelles(new Date(tr.le));
  const base = t(`ref.trace.${tr.etat}`).replace('{date}', date).replace('{heure}', heure);
  return tr.par ? `${base} ${t('ref.trace.par').replace('{nom}', tr.par)}` : base;
}

export default function TraceFiche({ trace, style }: { trace?: Trace; style?: React.CSSProperties }) {
  const { t } = useI18n();
  if (!trace) return null;
  return <Typography.Text type="secondary" className="ref-trace" style={style}>{texteTrace(t, trace)}</Typography.Text>;
}

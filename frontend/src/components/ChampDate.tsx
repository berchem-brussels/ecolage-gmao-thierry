/**
 * Champs de date, d'heure et de période des formulaires (0.21.2, DV-177 ; règle commune de saisieDate.ts).
 *
 * Défaut constaté à la recette de la 0.21.1 sur NIXUS (24/11/2026), cause probable de l'anomalie du 23/11/2026 : sur un
 * PC, le calendrier d'Ant Design s'ouvrait dès qu'on touchait ou tapait dans le champ, et il recouvrait ce qui suit.
 * Dans « Terminer la tâche », le calendrier du début cachait le champ de fin et le bouton « Terminer » : un clic sur le
 * champ de fin tombait dans les heures du calendrier du début et changeait le début (08:00 tapé, 12:00 enregistré) ; la
 * fin tapée n'allait nulle part ; un clic sur « Terminer » ne faisait rien.
 *
 * Règle :
 * - au clavier et à la souris (PC) : on tape la date dans le champ, aucun calendrier ne s'affiche ; le calendrier
 *   s'affiche seulement par l'icône du champ (« Ouvrir le calendrier ») ou par Alt+Flèche bas, et se ferme par Échap,
 *   par un clic à côté ou quand une date est choisie. Le composant d'Ant Design garde son fonctionnement (texte retenu à
 *   Entrée et à la sortie du champ) : seul l'affichage de son calendrier est retenu ;
 * - sur écran tactile : comportement d'origine, calendrier au toucher, champ en lecture seule (pas de clavier) ;
 * - partout : Entrée dans le champ n'envoie jamais le formulaire (entreeSansEnvoi) ; le texte tapé est retenu avant tout
 *   clic ou envoi (installerSaisieDate).
 * Les formulaires utilisent ChampDate, ChampHeure et ChampPeriode à la place de DatePicker, TimePicker et RangePicker
 * (contrôlé par saisie-date.test.ts).
 */
import { useState, type ComponentProps, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { DatePicker, TimePicker } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useI18n } from '../contexts/I18nContext';
import { ecranTactile, entreeSansEnvoi } from '../saisieDate';

type PropsDate = ComponentProps<typeof DatePicker>;
type PropsHeure = ComponentProps<typeof TimePicker>;
type PropsPeriode = ComponentProps<typeof DatePicker.RangePicker>;

interface Commun {
  onOpenChange?: (o: boolean) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  suffixIcon?: ReactNode;
  inputReadOnly?: boolean;
  styles?: { popup?: { root?: CSSProperties } } & Record<string, unknown>;
}

/**
 * Propriétés d'ouverture. Le composant garde son fonctionnement (il retient le texte tapé à Entrée et quand il se
 * ferme) ; sur PC, son calendrier reste seulement caché tant qu'on ne l'a pas demandé par l'icône ou Alt+Flèche bas :
 * caché, il ne recouvre rien et ne reçoit aucun clic. Sur écran tactile : comportement d'origine.
 */
function useOuverture(p: Commun, icone: ReactNode, libelle: string): Commun {
  const [montrer, setMontrer] = useState(false);
  const tactile = ecranTactile();
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!tactile && e.altKey && e.key === 'ArrowDown') { e.preventDefault(); setMontrer(true); }
    // Échap ferme le calendrier affiché sans fermer aussi la fenêtre qui contient le champ (saisie gardée).
    if (!tactile && e.key === 'Escape' && montrer) { e.stopPropagation(); setMontrer(false); }
    entreeSansEnvoi(e);
    p.onKeyDown?.(e);
  };
  if (tactile) return { onKeyDown, inputReadOnly: true };
  const popup = { ...(p.styles?.popup ?? {}), root: { ...(p.styles?.popup?.root ?? {}), ...(montrer ? {} : { display: 'none' }) } };
  return {
    onOpenChange: (o) => { if (!o) setMontrer(false); p.onOpenChange?.(o); },
    onKeyDown,
    inputReadOnly: false,
    styles: { ...(p.styles ?? {}), popup },
    // Un appui sur l'icône montre le calendrier ; le composant l'ouvre lui-même (clic dans le champ). Ant Design rend
    // l'icône insensible au pointeur (.ant-picker-suffix) : pointerEvents « auto » la rend cliquable. Hors de l'ordre de
    // tabulation (tabIndex -1) : au clavier, on tape la date, ou Alt+Flèche bas ouvre le calendrier.
    suffixIcon: (
      <span role="button" tabIndex={-1} aria-label={libelle} title={libelle} className="champ-date-icone" onMouseDown={() => setMontrer(true)}
        style={{ cursor: 'pointer', pointerEvents: 'auto', display: 'inline-flex', padding: 4, margin: -4 }}>{icone}</span>
    ),
  };
}

export function ChampDate(props: PropsDate) {
  const { t } = useI18n();
  const o = useOuverture(props as Commun, <CalendarOutlined />, t('champ.calendrier.ouvrir'));
  return <DatePicker {...props} {...(o as Partial<PropsDate>)} />;
}

export function ChampHeure(props: PropsHeure) {
  const { t } = useI18n();
  const o = useOuverture(props as Commun, <ClockCircleOutlined />, t('champ.heures.ouvrir'));
  return <TimePicker {...props} {...(o as Partial<PropsHeure>)} />;
}

export function ChampPeriode(props: PropsPeriode) {
  const { t } = useI18n();
  const o = useOuverture(props as Commun, <CalendarOutlined />, t('champ.calendrier.ouvrir'));
  return <DatePicker.RangePicker {...props} {...(o as Partial<PropsPeriode>)} />;
}

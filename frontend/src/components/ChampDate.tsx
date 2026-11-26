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
 *   s'affiche seulement par l'icône du champ (« Ouvrir le calendrier », à gauche depuis la 0.21.3) ou par Alt+Flèche bas, et se ferme par Échap,
 *   par un clic à côté ou quand une date est choisie ; 0.21.3 : Alt+Flèche bas rouvre aussi après Échap, sans clic. Le composant d'Ant Design garde son fonctionnement (texte retenu à
 *   Entrée et à la sortie du champ) : seul l'affichage de son calendrier est retenu ;
 * - sur écran tactile : comportement d'origine, calendrier au toucher, champ en lecture seule (pas de clavier) ;
 * - partout : Entrée dans le champ n'envoie jamais le formulaire (entreeSansEnvoi) ; le texte tapé est retenu avant tout
 *   clic ou envoi (installerSaisieDate).
 * Les formulaires utilisent ChampDate, ChampHeure et ChampPeriode à la place de DatePicker, TimePicker et RangePicker
 * (contrôlé par saisie-date.test.ts).
 */
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { DatePicker, TimePicker, message } from 'antd';
import { CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useI18n } from '../contexts/I18nContext';
import { demarquer, ecranTactile, entreeSansEnvoi, estMarque, marquerNonRetenu, saisiesNonRetenues } from '../saisieDate';

type PropsDate = ComponentProps<typeof DatePicker>;
type PropsHeure = ComponentProps<typeof TimePicker>;
type PropsPeriode = ComponentProps<typeof DatePicker.RangePicker>;

interface Commun {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  suffixIcon?: ReactNode;
  prefix?: ReactNode;
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
  // 0.21.3 (D-0.21.2-1) : ouverture tenue ici (prop « open » du composant) ; Alt+Flèche bas ouvre le composant lui-même,
  // même s'il se tient pour fermé (après Échap, ou focus sans clic) : avant, il ne montrait que la partie cachée.
  const [ouvert, setOuvert] = useState(false);
  // Le composant annonce sa fermeture (Échap) une image plus tard : un Alt+Flèche bas tapé juste après serait défait par
  // cette annonce tardive. Une fermeture annoncée moins de 300 ms après une ouverture au clavier est donc ignorée ; Échap
  // ferme lui-même, tout de suite.
  const ouvertLe = useRef(0);
  const tactile = ecranTactile();
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!tactile && e.altKey && e.key === 'ArrowDown') { e.preventDefault(); ouvertLe.current = Date.now(); setOuvert(true); setMontrer(true); }
    // Échap ferme le calendrier affiché sans fermer aussi la fenêtre qui contient le champ (saisie gardée).
    if (!tactile && e.key === 'Escape' && montrer) { e.stopPropagation(); ouvertLe.current = 0; setOuvert(false); setMontrer(false); }
    entreeSansEnvoi(e);
    p.onKeyDown?.(e);
  };
  if (tactile) return { onKeyDown, inputReadOnly: true };
  const popup = { ...(p.styles?.popup ?? {}), root: { ...(p.styles?.popup?.root ?? {}), ...(montrer ? {} : { display: 'none' }) } };
  return {
    open: ouvert,
    onOpenChange: (o) => {
      if (!o && Date.now() - ouvertLe.current < 300) return;
      setOuvert(o); if (!o) setMontrer(false); p.onOpenChange?.(o);
    },
    onKeyDown,
    inputReadOnly: false,
    styles: { ...(p.styles ?? {}), popup },
    // Un appui sur l'icône ouvre et montre le calendrier. Hors de l'ordre de tabulation (tabIndex -1) : au clavier, on
    // tape la date, ou Alt+Flèche bas ouvre le calendrier. 0.21.3 : l'icône est à gauche du champ (prefix) ; à droite, sur
    // un champ rempli, Ant Design remplace l'icône par la croix d'effacement au survol : un clic sur « l'icône » effaçait
    // la date sans prévenir (constaté dans Chromium et WebKit, présent depuis la 0.21.2). À droite ne reste que la croix.
    prefix: (
      <span role="button" tabIndex={-1} aria-label={libelle} title={libelle} className="champ-date-icone"
        onMouseDown={() => { setOuvert(true); setMontrer(true); }}
        style={{ cursor: 'pointer', display: 'inline-flex', padding: 4, margin: '-4px 4px -4px -4px' }}>{icone}</span>
    ),
    suffixIcon: null,
  };
}

type Statut = 'error' | 'warning' | '' | undefined;
type RefChamp = { nativeElement?: HTMLElement } | null;

/**
 * 0.21.5 (R1 de la recette de la 0.21.4) : marque d'erreur d'une saisie non retenue rendue par `status="error"`, que
 * React garde à chaque rendu (la classe posée à la main était effacée au retour dans le champ ou dans la fenêtre).
 * La marque tombe à la frappe dans le champ (saisieDate.ts) ou quand la valeur change autrement (calendrier).
 */
function useMarque(valeur: unknown, statut: Statut): { ref: { current: RefChamp }; status: Statut } {
  const ref = useRef<RefChamp>(null);
  const [erreur, setErreur] = useState(false);
  const champs = () => Array.from(ref.current?.nativeElement?.querySelectorAll('input') ?? []);
  useEffect(() => {
    const suivre = (e: Event) => {
      const c = (e as CustomEvent<HTMLInputElement>).detail;
      if (ref.current?.nativeElement?.contains(c)) setErreur(champs().some(estMarque));
    };
    document.addEventListener('gmao-saisie-marque', suivre);
    return () => document.removeEventListener('gmao-saisie-marque', suivre);
  }, []);
  // Valeur changée (calendrier, autre champ du formulaire) : la saisie refusée ne vaut plus.
  const premiere = useRef(true);
  useEffect(() => {
    if (premiere.current) { premiere.current = false; return; }
    champs().filter(estMarque).forEach(demarquer);
  }, [valeur]);
  // rc-picker réécrit aria-invalid quand sa propre validation change : la marque est reposée après chaque rendu.
  useLayoutEffect(() => {
    if (erreur) champs().filter(estMarque).forEach((c) => c.setAttribute('aria-invalid', 'true'));
  });
  return { ref, status: erreur ? 'error' : statut };
}

export function ChampDate(props: PropsDate) {
  const { t } = useI18n();
  const o = useOuverture(props as Commun, <CalendarOutlined />, t('champ.calendrier.ouvrir'));
  const m = useMarque(props.value, props.status);
  return <DatePicker {...props} {...(o as Partial<PropsDate>)} ref={m.ref as never} status={m.status} />;
}

export function ChampHeure(props: PropsHeure) {
  const { t } = useI18n();
  const o = useOuverture(props as Commun, <ClockCircleOutlined />, t('champ.heures.ouvrir'));
  const m = useMarque(props.value, props.status);
  return <TimePicker {...props} {...(o as Partial<PropsHeure>)} ref={m.ref as never} status={m.status} />;
}

export function ChampPeriode(props: PropsPeriode) {
  const { t } = useI18n();
  const o = useOuverture(props as Commun, <CalendarOutlined />, t('champ.calendrier.ouvrir'));
  const m = useMarque(props.value, props.status);
  return <DatePicker.RangePicker {...props} {...(o as Partial<PropsPeriode>)} ref={m.ref as never} status={m.status} />;
}

/**
 * 0.21.3 (DV-176, audit M-04) : à appeler en tête de l'envoi de tout formulaire qui enregistre une date ou une heure.
 * Rend vrai (et l'écran le dit, le champ fautif reprend le focus et se marque en erreur) quand une date ou une heure
 * tapée n'a pas été retenue : rien ne doit partir. Sinon faux, sans délai quand aucun champ de date n'avait le focus.
 */
export function useSaisieRetenue(): () => Promise<boolean> {
  const { t } = useI18n();
  return async () => {
    const refuses = await saisiesNonRetenues();
    if (!refuses.length) return false;
    for (const c of refuses) marquerNonRetenu(c);
    refuses[0].focus();
    message.error(t('saisie.non_retenue'));
    return true;
  };
}

/**
 * 0.21.4 (contrôle 7 de la recette de la 0.21.3) : un texte refusé à la sortie d'un champ de date ou d'heure (Tab, clic
 * ailleurs, autre fenêtre) est dit tout de suite, pas seulement à l'enregistrement. Posé une fois, dans l'en-tête commun.
 */
export function useAvisSaisieRefusee(): void {
  const { t } = useI18n();
  useEffect(() => {
    const dire = () => { message.error({ content: t('saisie.non_retenue'), key: 'saisie-non-retenue' }); };
    document.addEventListener('gmao-saisie-refusee', dire);
    return () => document.removeEventListener('gmao-saisie-refusee', dire);
  }, [t]);
}

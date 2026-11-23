/**
 * Visite guidée à la première ouverture, propre à chaque rôle (0.18.0, point 4 ; cahier des charges ERG-07 ; standard,
 * section 17.2 ; DV-151, « le plus simple »). Composant `Tour` d'Ant Design : aucune dépendance nouvelle.
 *   - Étapes : accueil ; une étape par profil de la personne dans l'entité active (demandeur, service technique, chef de
 *     service, administrateur) ; puis les éléments de l'en-tête marqués data-visite (Nouvelle demande, recherche, cloche,
 *     Aide, Signaler, assistant). Un élément absent de l'écran (rôle, largeur) est sauté.
 *   - Ouverture automatique une fois par personne et par combinaison de profils (un rôle nouveau la relance), après la
 *     fenêtre « Nouveautés » et le changement de mot de passe imposé ; « déjà vue » est retenu dans ce navigateur
 *     (localStorage, sans migration) : sur un autre poste, elle revient une fois.
 *   - « Revoir la visite guidée » (Aide) l'ouvre à la demande par l'événement « app-visite ».
 *   - Sans masque : le masque SVG du Tour (rect en calc()) fait des erreurs de console dans WebKit (Safari, Edge sur
 *     iPhone) ; le panneau et sa flèche montrent l'élément. Panneau limité à la largeur de l'écran (index.css).
 *   - 0.19.0 (point 0, défaut 2 de la recette de la 0.18.0, DV-152) : compteur « 4 / 8 » au lieu des points d'avancement,
 *     qui passaient sur deux lignes sur iPhone ; libellés courts des boutons (Précédent, Suivant, Terminer) ; sous 544 px, marge de 12 px des deux côtés du panneau (index.css).
 *   - 0.20.0 (point 0, remarques 1 et 2 de la recette de la 0.19.0, DV-159) : cadre à la couleur de l'institution et titre
 *     plus visible (index.css) ; le calque transparent que le Tour pose même sans masque laisse passer les touchers
 *     (index.css) ; la visite se ferme à l'ouverture du menu sur téléphone (événement EVENEMENT_MENU d'AppLayout), notée vue.
 *   - Contrôles automatiques (tests, captures de l'aide, mobile:check) : localStorage « gmao.visite.auto » = « 0 » coupe
 *     l'ouverture automatique, jamais l'ouverture à la demande.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tour } from 'antd';
import type { TourProps } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { hasPermission, useRoles } from '../useRoles';

export type Profil = 'demandeur' | 'service' | 'valideur' | 'admin';
/** Éléments de l'en-tête présentés, dans l'ordre ; chacun porte l'attribut data-visite. */
export const CIBLES = ['nouvelle', 'recherche', 'cloche', 'aide', 'signaler', 'assistant'] as const;
export const CLE_AUTO = 'gmao.visite.auto';
export const cleVue = (userId: number | string, profils: Profil[]) => `gmao.visite.v1.${userId}.${profils.join('+')}`;

/** Lecture et écriture du navigateur protégées (navigation privée, stockage refusé). */
const lire = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const ecrire = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* sans stockage : elle reviendra */ } };

/** Ouvre la visite depuis un autre endroit de l'application (Aide). */
export const ouvrirVisite = () => window.dispatchEvent(new Event('app-visite'));
/** Envoyé par AppLayout à l'ouverture du menu sur téléphone : la visite se ferme (0.20.0, DV-159). */
export const EVENEMENT_MENU = 'app-menu-ouvert';

export default function VisiteGuidee() {
  const { t } = useI18n();
  const { user, entite, roles, isAdmin } = useAuth();
  const catalogue = useRoles();
  const [ouverte, setOuverte] = useState(false);
  const [etapes, setEtapes] = useState<TourProps['steps']>([]);
  const [courante, setCourante] = useState(0);

  const profils = useMemo<Profil[]>(() => {
    const can = (p: string) => hasPermission(catalogue, roles || [], p);
    return [
      ...(entite ? ['demandeur' as const] : []),
      ...(can('demandes:entite') ? ['service' as const] : []),
      ...(can('demandes:valider') ? ['valideur' as const] : []),
      ...(isAdmin ? ['admin' as const] : []),
    ];
  }, [catalogue, roles, entite, isAdmin]);

  const ouvrir = useCallback(() => {
    const cibles = CIBLES.map((c) => ({ c, el: document.querySelector<HTMLElement>(`[data-visite="${c}"]`) })).filter((x) => x.el);
    // 0.19.0 (point 0) : libellés courts ; ceux d'Ant Design (« Fin de la visite guidée ») sortaient du panneau à 320 px.
    const boutons = (dernier: boolean) => ({
      prevButtonProps: { children: t('visite.precedent') },
      nextButtonProps: { children: t(dernier ? 'visite.terminer' : 'visite.suivant') },
    });
    const liste = [
      { title: t('visite.accueil.titre'), description: t('visite.accueil.texte') },
      ...profils.map((p) => ({ title: t(`visite.profil.${p}.titre`), description: t(`visite.profil.${p}.texte`) })),
      ...cibles.map(({ c, el }) => ({ title: t(`visite.cible.${c}.titre`), description: t(`visite.cible.${c}.texte`), target: () => el! })),
    ];
    setEtapes(liste.map((e, k) => ({ ...e, ...boutons(k === liste.length - 1) })));
    setCourante(0);
    setOuverte(true);
  }, [profils, t]);

  // À la demande (Aide).
  useEffect(() => {
    window.addEventListener('app-visite', ouvrir);
    return () => window.removeEventListener('app-visite', ouvrir);
  }, [ouvrir]);

  // Première ouverture : rôles connus (catalogue chargé), aucune autre fenêtre imposée ouverte.
  const pret = !!user && !!entite && catalogue.length > 0 && user.must_change_password !== 1 && !(user.nouveautes?.length);
  const cle = user ? cleVue(user.id as number, profils) : '';
  useEffect(() => {
    if (!pret || lire(CLE_AUTO) === '0' || lire(cle)) return undefined;
    const id = window.setTimeout(ouvrir, 600); // l'en-tête est affiché
    return () => window.clearTimeout(id);
  }, [pret, cle, ouvrir]);

  const fermer = useCallback(() => { setOuverte(false); if (cle) ecrire(cle, new Date().toISOString()); }, [cle]);

  // 0.20.0 (DV-159) : le menu ouvert ferme la visite, qui ne le cache plus.
  useEffect(() => {
    if (!ouverte) return undefined;
    window.addEventListener(EVENEMENT_MENU, fermer);
    return () => window.removeEventListener(EVENEMENT_MENU, fermer);
  }, [ouverte, fermer]);
  return (
    <Tour open={ouverte} steps={etapes} current={courante} onChange={setCourante} onClose={fermer} onFinish={fermer}
      rootClassName="visite-guidee" scrollIntoViewOptions={false} mask={false}
      indicatorsRender={(n, total) => (
        <span className="visite-compteur" aria-label={t('visite.etape').replace('{n}', String(n + 1)).replace('{total}', String(total))}>
          {n + 1} / {total}
        </span>
      )} />
  );
}

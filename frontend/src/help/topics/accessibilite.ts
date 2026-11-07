/** Fiche d'aide de la déclaration d'accessibilité (ERG-06 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'accessibilite', path: '/accessibility', group: 'aide', titleKey: 'nav.accessibility', roles: ['agent', 'admin'],
  purpose: {
    fr: "Cette page dit le niveau d'accessibilité visé par l'application (WCAG 2.1 AA), comment il est contrôlé et à qui signaler un obstacle.",
    nl: 'Deze pagina vermeldt het toegankelijkheidsniveau dat de toepassing nastreeft (WCAG 2.1 AA), hoe het gecontroleerd wordt en bij wie u een hindernis meldt.',
  },
  layout: [{ fr: '[[1]] La déclaration.', nl: '[[1]] De verklaring.' }],
  procedures: [
    {
      title: { fr: 'Signaler un obstacle d’accessibilité', nl: 'Een toegankelijkheidshindernis melden' },
      when: { fr: 'Quand un écran ne se lit pas au clavier, avec un lecteur d’écran ou en grand zoom.', nl: 'Wanneer een scherm niet leesbaar is met het toetsenbord, met een schermlezer of met grote zoom.' },
      steps: [
        { fr: 'Allez sur l’écran concerné et cliquez sur {{tickets.report}}.', nl: 'Ga naar het betrokken scherm en klik op {{tickets.report}}.' },
        { fr: 'Choisissez {{tickets.type.bug}} et décrivez ce qui bloque : touche, lecteur d’écran, navigateur.', nl: 'Kies {{tickets.type.bug}} en beschrijf wat blokkeert: toets, schermlezer, browser.' },
      ],
      result: { fr: 'L’administrateur de l’application reçoit le ticket avec l’écran joint.', nl: 'De beheerder van de toepassing ontvangt het ticket met het scherm erbij.' },
    },
    {
      title: { fr: 'Lire plus confortablement', nl: 'Comfortabeler lezen' },
      when: { fr: 'Quand les textes sont trop petits ou trop clairs.', nl: 'Wanneer de teksten te klein of te licht zijn.' },
      steps: [
        { fr: 'Agrandissez avec Ctrl et + (Cmd et + sur Mac) : l’écran se réorganise jusqu’à 400 %.', nl: 'Vergroot met Ctrl en + (Cmd en + op Mac): het scherm herschikt zich tot 400 %.' },
        { fr: 'Le bouton lune ou soleil de l’en-tête passe en thème sombre ou clair.', nl: 'De maan- of zonknop in de kop schakelt naar donker of licht thema.' },
      ],
      result: { fr: 'Votre choix de thème est gardé à la prochaine connexion.', nl: 'Uw keuze van thema blijft bewaard bij de volgende aanmelding.' },
    },
  ],
  faq: [],
  seeAlso: ['help'],
  shots: [],
};
export default topic;

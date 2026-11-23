/** Fiche d'aide de la page de connexion (TEC-03, standard 8.6 ; 0.12.0). Hors de la mise en page : lue dans le centre d'aide. */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'connexion', path: '/login', group: 'aide', titleKey: 'login.title', roles: ['agent', 'admin'],
  purpose: {
    fr: "La page de connexion ouvre l'application avec votre compte Microsoft de l'administration, ou avec un mot de passe quand l'administrateur l'a prévu. Depuis Portal, l'application s'ouvre sans rien taper.",
    nl: 'De aanmeldpagina opent de toepassing met uw Microsoft-account van het bestuur, of met een wachtwoord wanneer de beheerder dat voorzag. Vanuit Portal opent de toepassing zonder iets te typen.',
  },
  layout: [
    { fr: '[[1]] {{login.microsoft}}.', nl: '[[1]] {{login.microsoft}}.' },
    { fr: '[[2]] {{login.password_option}} : adresse e-mail et mot de passe, s’ils sont prévus.', nl: '[[2]] {{login.password_option}}: e-mailadres en wachtwoord, als die voorzien zijn.' },
  ],
  overviewShot: 'connexion-overview',
  procedures: [
    {
      title: { fr: 'Se connecter avec son compte Microsoft', nl: 'Aanmelden met zijn Microsoft-account' },
      when: { fr: 'Chaque jour, depuis le poste de travail ou Portal.', nl: 'Elke dag, vanaf de werkpost of Portal.' },
      steps: [
        { fr: 'Cliquez sur {{login.microsoft}}, ou sur la tuile de l’application dans Portal.', nl: 'Klik op {{login.microsoft}}, of op de tegel van de toepassing in Portal.' },
        { fr: 'Si Microsoft le demande, choisissez votre compte de l’administration.', nl: 'Als Microsoft erom vraagt, kies uw account van het bestuur.' },
      ],
      result: { fr: 'L’application s’ouvre sur l’écran demandé, ou sur l’accueil.', nl: 'De toepassing opent op het gevraagde scherm, of op de startpagina.' },
      errors: [{ problem: { fr: 'Microsoft refuse la connexion.', nl: 'Microsoft weigert de aanmelding.' }, solution: { fr: 'Votre compte n’existe peut-être pas encore dans l’application : demandez-le au support (onglet {{help.contact}}).', nl: 'Uw account bestaat misschien nog niet in de toepassing: vraag het aan de support (tabblad {{help.contact}}).' } }],
    },
    {
      title: { fr: 'Se connecter avec un mot de passe', nl: 'Aanmelden met een wachtwoord' },
      when: { fr: 'Quand l’administrateur vous a donné un compte avec mot de passe.', nl: 'Wanneer de beheerder u een account met wachtwoord gaf.' },
      steps: [
        { fr: 'Encodez {{login.email}} et {{login.password}}.', nl: 'Vul {{login.email}} en {{login.password}} in.' },
        { fr: 'Cliquez sur {{login.submit}} ; un mot de passe provisoire doit être changé tout de suite.', nl: 'Klik op {{login.submit}}; een voorlopig wachtwoord moet meteen gewijzigd worden.' },
      ],
      result: { fr: 'Après plusieurs essais manqués, attendez quelques minutes avant de réessayer.', nl: 'Na meerdere mislukte pogingen wacht u enkele minuten voor u opnieuw probeert.' },
    },
  ],
  faq: [],
  seeAlso: ['accueil'],
  shots: [{ id: 'connexion-overview', path: '/login', marks: [{ sel: '.ant-btn-block' }], caption: { fr: 'Connexion', nl: 'Aanmelding' } }],
};
export default topic;

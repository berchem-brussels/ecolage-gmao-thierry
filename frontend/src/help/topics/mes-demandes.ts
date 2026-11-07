/** Fiche d'aide « Mes demandes » (SUI-01, DEM-04 ; 0.12.0), reprise de l'ancienne rubrique help.guide.mesdemandes. */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'mes-demandes', path: '/demandes', group: 'demandeur', titleKey: 'nav.demandes', roles: ['agent'],
  acces: { module: 'demandes', entite: true },
  purpose: {
    fr: 'Cet écran montre vos demandes au service technique dans l’entité active : celles que vous avez faites, celles faites pour vous par un collègue, et celles que vous suivez par « Moi aussi ». Les demandes en cours viennent en premier.',
    nl: 'Dit scherm toont uw aanvragen aan de technische dienst in de actieve entiteit: die u zelf indiende, die een collega voor u indiende, en die u volgt via « Ik ook ». De lopende aanvragen staan bovenaan.',
  },
  layout: [
    { fr: '[[1]] {{demande.filtre}} : {{demande.filtre.ouvertes}}, {{demande.filtre.closes}} ou {{demande.filtre.toutes}}.', nl: '[[1]] {{demande.filtre}}: {{demande.filtre.ouvertes}}, {{demande.filtre.closes}} of {{demande.filtre.toutes}}.' },
    { fr: '[[2]] {{demande.chercher}} : par numéro, mot de la description ou lieu.', nl: '[[2]] {{demande.chercher}}: op nummer, woord uit de beschrijving of plaats.' },
    { fr: '[[3]] La liste : numéro, problème, lieu, état en clair et délai annoncé ; sur téléphone, une carte par demande.', nl: '[[3]] De lijst: nummer, probleem, plaats, status in gewone woorden en aangekondigde termijn; op een telefoon een kaart per aanvraag.' },
  ],
  overviewShot: 'mes-demandes-overview',
  procedures: [
    {
      title: { fr: 'Retrouver une demande et voir où elle en est', nl: 'Een aanvraag terugvinden en zien hoever ze staat' },
      when: { fr: 'Quand vous voulez savoir si votre demande avance.', nl: 'Wanneer u wilt weten of uw aanvraag vordert.' },
      steps: [
        { fr: 'Ouvrez {{nav.demandes}} dans le menu ou sur l’accueil.', nl: 'Open {{nav.demandes}} in het menu of op de startpagina.' },
        { fr: 'Choisissez {{demande.filtre.ouvertes}} ou {{demande.filtre.closes}}, ou tapez un numéro, un mot ou un lieu dans {{demande.chercher}}.', nl: 'Kies {{demande.filtre.ouvertes}} of {{demande.filtre.closes}}, of typ een nummer, een woord of een plaats in {{demande.chercher}}.' },
        { fr: 'Cliquez sur le numéro pour ouvrir la fiche : état, délai annoncé, précisions, photos et documents.', nl: 'Klik op het nummer om de fiche te openen: status, aangekondigde termijn, verduidelijkingen, foto’s en documenten.' },
      ],
      result: { fr: 'L’état se lit en clair, par exemple « Reçue par le service technique », avec la date limite annoncée.', nl: 'De status staat in gewone woorden, bijvoorbeeld « Ontvangen door de technische dienst », met de aangekondigde uiterste datum.' },
      shots: ['mes-demandes-fiche'],
    },
    {
      title: { fr: 'Retirer une photo jointe par erreur', nl: 'Een per vergissing toegevoegde foto verwijderen' },
      when: { fr: 'Quand une photo ne devait pas être jointe à votre demande.', nl: 'Wanneer een foto niet bij uw aanvraag hoorde.' },
      steps: [
        { fr: 'Ouvrez la fiche de la demande.', nl: 'Open de fiche van de aanvraag.' },
        { fr: 'Sous la photo, cliquez sur {{demande.pieces.retirer}} et confirmez.', nl: 'Onder de foto klikt u op {{demande.pieces.retirer}} en bevestigt u.' },
      ],
      result: { fr: 'La pièce est effacée définitivement.', nl: 'Het stuk wordt definitief gewist.' },
      errors: [{ problem: { fr: 'Le bouton {{demande.pieces.retirer}} n’apparaît pas.', nl: 'De knop {{demande.pieces.retirer}} verschijnt niet.' }, solution: { fr: 'Une fois la demande prise en main par le service technique, demandez-lui de retirer la pièce, par {{tickets.report}}.', nl: 'Zodra de technische dienst de aanvraag behandelt, vraagt u hem het stuk te verwijderen, via {{tickets.report}}.' } }],
    },
  ],
  faq: [
    { q: { fr: 'Pourquoi une demande que je n’ai pas faite est-elle dans ma liste ?', nl: 'Waarom staat er een aanvraag in mijn lijst die ik niet indiende?' }, a: { fr: 'Elle a été faite pour vous par un collègue ({{demande.pour_moi.tag}}), ou vous la suivez par « Moi aussi » ({{demande.suivie.tag}}).', nl: 'Een collega diende ze voor u in ({{demande.pour_moi.tag}}), of u volgt ze via « Ik ook » ({{demande.suivie.tag}}).' } },
    { q: { fr: 'Je ne vois pas mes demandes de l’autre entité.', nl: 'Ik zie mijn aanvragen van de andere entiteit niet.' }, a: { fr: 'La liste suit l’entité active : changez d’entité dans l’en-tête.', nl: 'De lijst volgt de actieve entiteit: wissel van entiteit in de kop.' } },
  ],
  seeAlso: ['nouvelle-demande', 'accueil'],
  shots: [
    { id: 'mes-demandes-overview', path: '/demandes', marks: [{ sel: '.ant-segmented' }, { sel: '.ant-input-search' }, { sel: '.ant-table, .ant-list' }], caption: { fr: 'Mes demandes', nl: 'Mijn aanvragen' } },
    { id: 'mes-demandes-fiche', path: '/demandes', actions: [{ clickSel: '.ant-table-row .ant-btn-link' }, { wait: 600 }], clip: 'drawer', caption: { fr: 'Fiche d’une demande', nl: 'Fiche van een aanvraag' } },
  ],
};
export default topic;

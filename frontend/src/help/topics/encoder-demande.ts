/** Fiche d'aide « Encoder une demande reçue » (GES-05 ; 0.16.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'encoder-demande', path: '/demandes/encoder', group: 'service', titleKey: 'encoder.title', roles: ['gestionnaire', 'responsable'],
  acces: { module: 'demandes', permission: 'demandes:traiter' },
  purpose: {
    fr: "Pour une demande reçue par téléphone ou par courriel : vous la déposez au nom de la personne qui demande. Elle la retrouve dans ses demandes et en suit l'avancement, comme si elle l'avait faite elle-même.",
    nl: 'Voor een aanvraag die per telefoon of per e-mail ontvangen werd: u dient ze in namens de persoon die vraagt. Ze vindt ze terug in haar aanvragen en volgt de voortgang, alsof ze die zelf had ingediend.',
  },
  layout: [
    { fr: '[[1]] Le bloc {{encoder.recue.title}} : comment la demande est arrivée et qui demande.', nl: '[[1]] Het blok {{encoder.recue.title}}: hoe de aanvraag binnenkwam en wie vraagt.' },
    { fr: 'Ensuite le formulaire habituel : où, quoi, description, compléments.', nl: 'Daarna het gewone formulier: waar, wat, beschrijving, aanvullingen.' },
  ],
  overviewShot: 'encoder-demande-overview',
  procedures: [
    {
      title: { fr: 'Encoder un appel téléphonique', nl: 'Een telefoonoproep invoeren' },
      when: { fr: 'Quand un agent vous appelle pour un problème.', nl: 'Wanneer een medewerker u belt voor een probleem.' },
      steps: [
        { fr: 'Dans {{demande.entite.title}}, cliquez sur {{encoder.bouton}}.', nl: 'Klik in {{demande.entite.title}} op {{encoder.bouton}}.' },
        { fr: 'Choisissez {{gest.canal.telephone}}, cherchez la personne par son nom et cliquez sur elle.', nl: 'Kies {{gest.canal.telephone}}, zoek de persoon op naam en klik erop.' },
        { fr: 'Remplissez le lieu, la catégorie et la description, puis envoyez.', nl: 'Vul de plaats, de categorie en de beschrijving in en verstuur.' },
      ],
      result: { fr: 'La demande reçoit son numéro, au nom de la personne ; la fiche dit « Reçue par Téléphone » et qui l’a encodée.', nl: 'De aanvraag krijgt haar nummer, op naam van de persoon; de fiche zegt « Ontvangen via Telefoon » en wie ze invoerde.' },
    },
    {
      title: { fr: 'Encoder un courriel', nl: 'Een e-mail invoeren' },
      when: { fr: 'Quand une demande arrive par courriel au service technique.', nl: 'Wanneer een aanvraag per e-mail bij de technische dienst toekomt.' },
      steps: [
        { fr: 'Choisissez {{gest.canal.courriel}} et la personne qui a écrit.', nl: 'Kies {{gest.canal.courriel}} en de persoon die schreef.' },
        { fr: 'Recopiez l’essentiel du courriel dans la description, sans données personnelles inutiles.', nl: 'Neem het belangrijkste van de e-mail over in de beschrijving, zonder overbodige persoonsgegevens.' },
      ],
      result: { fr: 'Une demande d’aménagement, de déménagement ou d’achat attend d’abord l’accord du chef de service de la personne.', nl: 'Een aanvraag voor inrichting, verhuizing of aankoop wacht eerst op het akkoord van het diensthoofd van de persoon.' },
      errors: [{
        problem: { fr: 'La personne n’apparaît pas dans la recherche.', nl: 'De persoon verschijnt niet in de zoekresultaten.' },
        solution: { fr: 'Elle n’a pas de compte dans cette entité : choisissez la personne qui a transmis la demande et notez l’autre dans « Pour quelqu’un d’autre ? ».', nl: 'Ze heeft geen account in deze entiteit: kies de persoon die de aanvraag doorgaf en noteer de andere in « Voor iemand anders? ».' },
      }],
    },
  ],
  faq: [
    { q: { fr: 'La personne reçoit-elle un avis ?', nl: 'Krijgt de persoon een bericht?' }, a: { fr: 'Elle retrouve la demande dans {{nav.demandes}} et en suit l’avancement comme pour les siennes ; la fiche dit qu’elle a été reçue par téléphone ou par courriel.', nl: 'Ze vindt de aanvraag terug in {{nav.demandes}} en volgt de voortgang zoals voor de hare; de fiche zegt dat ze per telefoon of e-mail ontvangen werd.' } },
  ],
  seeAlso: ['demandes-entite'],
  shots: [{ id: 'encoder-demande-overview', path: '/demandes/encoder', marks: [{ sel: '.dem-encodage' }], caption: { fr: 'Encoder une demande reçue', nl: 'Een ontvangen aanvraag invoeren' } }],
};
export default topic;

/** Fiche d'aide « Services et valideurs » (ROL-04 ; 0.16.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'services', path: '/services', group: 'admin', titleKey: 'nav.services', roles: ['admin'],
  acces: { admin: true },
  purpose: {
    fr: "Les services de chaque entité et leur chef de service, qui valide les demandes d'aménagement, de déménagement et d'achat de ses agents avant qu'elles partent au service technique. Un suppléant peut valider pendant une période.",
    nl: 'De diensten van elke entiteit en hun diensthoofd, dat de aanvragen voor inrichting, verhuizing en aankoop van zijn medewerkers goedkeurt voor ze naar de technische dienst gaan. Een vervanger kan goedkeuren tijdens een periode.',
  },
  layout: [
    { fr: '[[1]] Le bouton {{services.nouveau}} et le choix de l’entité.', nl: '[[1]] De knop {{services.nouveau}} en de keuze van de entiteit.' },
    { fr: '[[2]] La liste des services : chef de service, suppléant et sa période, nombre de membres. Un clic sur le nom ouvre la fiche.', nl: '[[2]] De lijst van de diensten: diensthoofd, vervanger en zijn periode, aantal leden. Een klik op de naam opent de fiche.' },
  ],
  overviewShot: 'services-overview',
  procedures: [
    {
      title: { fr: 'Créer un service et désigner son chef', nl: 'Een dienst aanmaken en zijn hoofd aanduiden' },
      when: { fr: 'Pour qu’un chef de service valide les demandes de ses agents.', nl: 'Opdat een diensthoofd de aanvragen van zijn medewerkers goedkeurt.' },
      steps: [
        { fr: 'Donnez d’abord le rôle « Valideur » au chef dans {{nav.users}}, pour l’entité du service.', nl: 'Geef eerst de rol « Goedkeurder » aan het hoofd in {{nav.users}}, voor de entiteit van de dienst.' },
        { fr: 'Choisissez l’entité, cliquez sur {{services.nouveau}}, donnez le code et les noms, puis choisissez le chef de service.', nl: 'Kies de entiteit, klik op {{services.nouveau}}, geef de code en de namen, en kies dan het diensthoofd.' },
        { fr: 'Rattachez les agents au service dans {{nav.users}} (champ {{users.service}}).', nl: 'Verbind de medewerkers met de dienst in {{nav.users}} (veld {{users.service}}).' },
      ],
      result: { fr: 'Une demande d’aménagement, de déménagement ou d’achat d’un agent du service attend l’accord du chef dans ses {{nav.avalider}}.', nl: 'Een aanvraag voor inrichting, verhuizing of aankoop van een medewerker van de dienst wacht op het akkoord van het hoofd in zijn {{nav.avalider}}.' },
    },
    {
      title: { fr: 'Désigner un suppléant pour une absence', nl: 'Een vervanger aanduiden voor een afwezigheid' },
      when: { fr: 'Pendant un congé ou une absence du chef de service.', nl: 'Tijdens een verlof of een afwezigheid van het diensthoofd.' },
      steps: [
        { fr: 'Ouvrez le service, choisissez le suppléant (il doit aussi avoir le rôle « Valideur »).', nl: 'Open de dienst, kies de vervanger (hij moet ook de rol « Goedkeurder » hebben).' },
        { fr: 'Donnez le premier et le dernier jour, puis enregistrez.', nl: 'Geef de eerste en de laatste dag, en sla op.' },
      ],
      result: { fr: 'Pendant la période, le suppléant voit et valide les demandes du service ; le chef garde le droit.', nl: 'Tijdens de periode ziet en keurt de vervanger de aanvragen van de dienst goed; het hoofd behoudt het recht.' },
      errors: [{
        problem: { fr: 'La personne voulue n’est pas dans la liste du chef de service.', nl: 'De gewenste persoon staat niet in de lijst van het diensthoofd.' },
        solution: { fr: 'Elle n’a pas le rôle « Valideur » dans cette entité : donnez-le dans {{nav.users}}.', nl: 'Ze heeft de rol « Goedkeurder » niet in deze entiteit: geef hem in {{nav.users}}.' },
      }],
    },
  ],
  faq: [
    {
      q: { fr: 'Que devient une demande à valider si le service n’a pas de chef ?', nl: 'Wat gebeurt er met een goed te keuren aanvraag als de dienst geen hoofd heeft?' },
      a: { fr: 'Elle part directement au service technique, comme une autre demande ; le journal d’audit dit pourquoi.', nl: 'Ze gaat rechtstreeks naar de technische dienst, zoals een andere aanvraag; het auditlogboek zegt waarom.' },
    },
  ],
  seeAlso: ['users', 'entites'],
  shots: [{ id: 'services-overview', path: '/services', marks: [{ sel: '.page-header' }, { sel: '.ant-table' }], caption: { fr: 'Services et valideurs', nl: 'Diensten en goedkeurders' } }],
};
export default topic;

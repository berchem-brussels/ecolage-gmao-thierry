/** Fiche d'aide « Demandes de l'entité » : tableau de bord, liste du service et qualification (GES-01 à 04, PRI-01, 03 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'demandes-entite', path: '/demandes-entite', group: 'service', titleKey: 'nav.demandes.entite', roles: ['gestionnaire', 'responsable'],
  acces: { module: 'demandes', permission: 'demandes:entite' },
  purpose: {
    fr: "L'écran de travail du service technique : toutes les demandes de l'entité active, le tableau de bord, et la qualification de chaque demande (catégorie, lieu, priorité, consignes).",
    nl: 'Het werkscherm van de technische dienst: alle aanvragen van de actieve entiteit, het dashboard, en de kwalificatie van elke aanvraag (categorie, plaats, prioriteit, instructies).',
  },
  layout: [
    { fr: '[[1]] Le tableau de bord : à qualifier, en retard, P1 et P2 ouvertes, échéance dans les deux jours ouvrés ; un clic filtre la liste.', nl: '[[1]] Het dashboard: te kwalificeren, te laat, open P1 en P2, vervaldag binnen twee werkdagen; een klik filtert de lijst.' },
    { fr: '[[2]] Les filtres, la recherche et les vues enregistrées.', nl: '[[2]] De filters, het zoeken en de opgeslagen weergaven.' },
    { fr: '[[3]] La liste : un clic sur un titre de colonne trie, un clic sur un numéro ouvre la fiche.', nl: '[[3]] De lijst: een klik op een kolomtitel sorteert, een klik op een nummer opent de fiche.' },
  ],
  overviewShot: 'demandes-entite-overview',
  procedures: [
    {
      title: { fr: 'Trier les demandes du jour', nl: 'De aanvragen van de dag sorteren' },
      when: { fr: 'Chaque matin, pour voir ce qui presse.', nl: 'Elke ochtend, om te zien wat dringend is.' },
      steps: [
        { fr: 'Cliquez sur un compteur du tableau de bord, par exemple « à qualifier » ou « en retard ».', nl: 'Klik op een teller van het dashboard, bijvoorbeeld « te kwalificeren » of « te laat ».' },
        { fr: 'Affinez par état, priorité, catégorie (un domaine compte toutes ses natures), bâtiment (un site compte tous ses bâtiments), source ou danger ; cherchez un numéro, un mot, un lieu ou un demandeur.', nl: 'Verfijn op status, prioriteit, categorie (een domein telt al zijn soorten), gebouw (een site telt al zijn gebouwen), bron of gevaar; zoek een nummer, een woord, een plaats of een aanvrager.' },
        { fr: 'Pour garder ces filtres, cliquez sur {{gest.vue.enregistrer}} et nommez-la ; elle revient dans {{gest.vue}}, pour vous seul.', nl: 'Om deze filters te bewaren, klik op {{gest.vue.enregistrer}} en geef ze een naam; ze komt terug in {{gest.vue}}, enkel voor u.' },
      ],
      result: { fr: 'Les filtres restent dans l’adresse de la page : un lien envoyé à un collègue montre la même liste. « En retard » est en rouge quand l’échéance qui compte est passée.', nl: 'De filters blijven in het adres van de pagina: een link naar een collega toont dezelfde lijst. « Te laat » staat in het rood wanneer de geldende vervaldag voorbij is.' },
    },
    {
      title: { fr: 'Qualifier une demande', nl: 'Een aanvraag kwalificeren' },
      when: { fr: 'Pour chaque demande « À qualifier ».', nl: 'Voor elke aanvraag « Te kwalificeren ».' },
      steps: [
        { fr: 'Ouvrez la fiche et cliquez sur {{qualif.envoyer}}.', nl: 'Open de fiche en klik op {{qualif.envoyer}}.' },
        { fr: 'Vérifiez la catégorie et le lieu ; corrigez-les si le demandeur s’est trompé.', nl: 'Controleer de categorie en de plaats; verbeter ze als de aanvrager zich vergiste.' },
        { fr: 'Confirmez la priorité proposée, ou changez-la et écrivez {{qualif.motif}}.', nl: 'Bevestig de voorgestelde prioriteit, of wijzig ze en vul {{qualif.motif}} in.' },
        { fr: 'Estimez la durée et écrivez {{qualif.consignes}}, puis cliquez sur {{qualif.enregistrer}}.', nl: 'Schat de duur en vul {{qualif.consignes}} in, en klik daarna op {{qualif.enregistrer}}.' },
      ],
      result: { fr: 'La demande passe à « Qualifiée » ; le demandeur voit « Prise en charge » et le délai recalculé, jamais vos consignes ni le motif.', nl: 'De aanvraag gaat naar « Gekwalificeerd »; de aanvrager ziet « In behandeling » en de herberekende termijn, nooit uw instructies of de reden.' },
      errors: [{ problem: { fr: 'L’enregistrement est refusé.', nl: 'Het opslaan wordt geweigerd.' }, solution: { fr: 'Une priorité changée exige son motif ; une priorité P4 exige la date convenue avec le demandeur.', nl: 'Een gewijzigde prioriteit vereist een reden; een prioriteit P4 vereist de met de aanvrager afgesproken datum.' } }],
      shots: ['demandes-entite-qualifier'],
    },
  ],
  faq: [
    { q: { fr: 'Pourquoi le délai a-t-il changé après la qualification ?', nl: 'Waarom veranderde de termijn na de kwalificatie?' }, a: { fr: 'Le délai suit la priorité : une priorité changée recalcule les échéances, toujours comptées depuis la réception de la demande.', nl: 'De termijn volgt de prioriteit: een gewijzigde prioriteit herberekent de vervaldagen, altijd geteld vanaf de ontvangst van de aanvraag.' } },
    { q: { fr: 'Je ne vois pas les demandes du CPAS.', nl: 'Ik zie de aanvragen van het OCMW niet.' }, a: { fr: 'La liste suit l’entité active ; si vous avez un rôle dans l’autre entité, changez d’entité dans l’en-tête.', nl: 'De lijst volgt de actieve entiteit; als u een rol hebt in de andere entiteit, wissel van entiteit in de kop.' } },
  ],
  seeAlso: ['referentiel', 'patrimoine'],
  shots: [
    { id: 'demandes-entite-overview', path: '/demandes-entite', marks: [{ sel: '.bord-compteurs' }, { sel: '.gest-filtres' }, { sel: '.ant-table' }], caption: { fr: "Demandes de l'entité", nl: 'Aanvragen van de entiteit' } },
    { id: 'demandes-entite-qualifier', path: '/demandes-entite', actions: [{ clickSel: '.ant-table-row .ant-btn-link' }, { wait: 600 }], clip: 'drawer', caption: { fr: 'Qualification d’une demande', nl: 'Kwalificatie van een aanvraag' } },
  ],
};
export default topic;

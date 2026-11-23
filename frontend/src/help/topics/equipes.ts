/** Fiche d'aide « Équipes et prestataires » (ROL-05, REF-07 ; 0.19.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'equipes', path: '/equipes', group: 'service', titleKey: 'nav.equipes', roles: ['responsable', 'gestionnaire', 'chef_equipe'],
  acces: { permission: 'equipes:lire' },
  purpose: {
    fr: "Les équipes du service technique de l'entité : leur chef, leurs membres et leur horaire, week-end compris. L'onglet Ouvriers note le métier et les compétences de chacun, pour savoir à qui confier une intervention. L'onglet Prestataires réunit les sociétés extérieures, leur contact, leurs métiers et la référence de leur marché. Le responsable règle tout ; le gestionnaire consulte, comme les chefs d'équipe pour les équipes.",
    nl: 'De ploegen van de technische dienst van de entiteit: hun ploegbaas, hun leden en hun uurrooster, weekend inbegrepen. Het tabblad Arbeiders noteert het vak en de bekwaamheden van elke arbeider, om te weten aan wie een interventie toe te vertrouwen. Het tabblad Aannemers bundelt de externe ondernemingen, hun contactpersoon, hun vakken en de referentie van hun opdracht. De verantwoordelijke stelt alles in; de beheerder raadpleegt, net als de ploegbazen voor de ploegen.',
  },
  layout: [
    { fr: '[[1]] Le bouton {{equipes.nouvelle}} (responsable) et le choix entre {{equipes.onglet.equipes}}, {{equipes.onglet.ouvriers}} et {{equipes.onglet.prestataires}}.', nl: '[[1]] De knop {{equipes.nouvelle}} (verantwoordelijke) en de keuze tussen {{equipes.onglet.equipes}}, {{equipes.onglet.ouvriers}} en {{equipes.onglet.prestataires}}.' },
    { fr: '[[2]] La liste : chef, membres et horaire de chaque équipe. Un clic sur le nom ouvre la fiche.', nl: '[[2]] De lijst: ploegbaas, leden en uurrooster van elke ploeg. Een klik op de naam opent de fiche.' },
  ],
  overviewShot: 'equipes-overview',
  procedures: [
    {
      title: { fr: 'Créer une équipe', nl: 'Een ploeg aanmaken' },
      when: { fr: 'Pour regrouper les ouvriers qui travaillent ensemble.', nl: 'Om de arbeiders te groeperen die samenwerken.' },
      steps: [
        { fr: 'Donnez d’abord le rôle « Ouvrier » ou « Chef d’équipe » aux personnes dans {{nav.users}}, pour l’entité.', nl: 'Geef eerst de rol « Arbeider » of « Ploegbaas » aan de personen in {{nav.users}}, voor de entiteit.' },
        { fr: 'Cliquez sur {{equipes.nouvelle}}, donnez le code et les noms, choisissez le chef et les membres.', nl: 'Klik op {{equipes.nouvelle}}, geef de code en de namen, kies de ploegbaas en de leden.' },
        { fr: 'Gardez {{equipes.horaire.entite}}, ou choisissez {{equipes.horaire.propre}} et cochez les jours travaillés, avec leurs heures.', nl: 'Behoud {{equipes.horaire.entite}}, of kies {{equipes.horaire.propre}} en vink de werkdagen aan, met hun uren.' },
      ],
      result: { fr: 'L’équipe apparaît dans la liste, avec son horaire ; ses membres la voient dans leur fiche d’ouvrier.', nl: 'De ploeg verschijnt in de lijst, met haar uurrooster; haar leden zien ze in hun arbeidersfiche.' },
      errors: [{
        problem: { fr: 'La personne voulue n’est pas proposée comme chef ou comme membre.', nl: 'De gewenste persoon wordt niet voorgesteld als ploegbaas of als lid.' },
        solution: { fr: 'Elle n’a pas le rôle « Chef d’équipe » (pour diriger) ou « Ouvrier » (pour être membre) dans cette entité : donnez-le dans {{nav.users}}.', nl: 'Ze heeft de rol « Ploegbaas » (om te leiden) of « Arbeider » (om lid te zijn) niet in deze entiteit: geef hem in {{nav.users}}.' },
      }],
    },
    {
      title: { fr: 'Noter le métier et les compétences d’un ouvrier', nl: 'Het vak en de bekwaamheden van een arbeider noteren' },
      when: { fr: 'À l’arrivée d’un ouvrier, ou quand il obtient une habilitation (BA4, VCA…).', nl: 'Bij de komst van een arbeider, of wanneer hij een bevoegdheid behaalt (BA4, VCA…).' },
      steps: [
        { fr: 'Choisissez {{equipes.onglet.ouvriers}} et cliquez sur son nom.', nl: 'Kies {{equipes.onglet.ouvriers}} en klik op zijn naam.' },
        { fr: 'Choisissez son {{ouvriers.field.corps}} et ses {{ouvriers.field.competences}}, puis enregistrez.', nl: 'Kies zijn {{ouvriers.field.corps}} en zijn {{ouvriers.field.competences}}, en sla op.' },
      ],
      result: { fr: 'Le métier et les compétences s’affichent dans la liste ; le filtre par équipe retrouve les ouvriers d’une équipe.', nl: 'Het vak en de bekwaamheden verschijnen in de lijst; de filter op ploeg vindt de arbeiders van een ploeg terug.' },
    },
    // 0.21.0 (point 2 ; PLA-04) : absences d'un ouvrier.
    {
      title: { fr: 'Noter une absence d’un ouvrier', nl: 'Een afwezigheid van een arbeider noteren' },
      when: { fr: 'Dès qu’un congé, une formation ou une autre absence est connue.', nl: 'Zodra een verlof, een opleiding of een andere afwezigheid gekend is.' },
      steps: [
        { fr: 'Choisissez {{equipes.onglet.ouvriers}} et cliquez sur son nom ; la section {{indispo.titre}} est en bas de sa fiche.', nl: 'Kies {{equipes.onglet.ouvriers}} en klik op zijn naam; de sectie {{indispo.titre}} staat onderaan zijn fiche.' },
        { fr: 'Cliquez sur {{indispo.ajouter}} ; choisissez le premier jour, le dernier si l’absence dure plusieurs jours, le {{indispo.field.periode}} (journée, ou matin ou après-midi pour un seul jour) et le {{indispo.field.motif}}, puis cliquez sur {{common.save}}.', nl: 'Klik op {{indispo.ajouter}}; kies de eerste dag, de laatste als de afwezigheid meerdere dagen duurt, het {{indispo.field.periode}} (hele dag, of voormiddag of namiddag voor één dag) en de {{indispo.field.motif}}, en klik op {{common.save}}.' },
      ],
      result: { fr: 'L’ouvrier est marqué indisponible dans le planning et dans les ouvriers proposés, sans la cause. Le motif n’est visible que du gestionnaire et du responsable ; le chef d’équipe voit les jours seulement.', nl: 'De arbeider is als onbeschikbaar gemarkeerd in de planning en bij de voorgestelde arbeiders, zonder de oorzaak. De reden is enkel zichtbaar voor de beheerder en de verantwoordelijke; de ploegbaas ziet enkel de dagen.' },
      shots: ['equipes-indisponibilites'],
      errors: [{
        problem: { fr: 'L’absence est refusée parce qu’elle chevauche une autre.', nl: 'De afwezigheid wordt geweigerd omdat ze een andere overlapt.' },
        solution: { fr: 'Modifiez l’absence déjà notée plutôt que d’en ajouter une ; une absence saisie par erreur se supprime.', nl: 'Wijzig de reeds genoteerde afwezigheid in plaats van er een toe te voegen; een per vergissing ingevoerde afwezigheid wordt verwijderd.' },
      }],
    },
    {
      title: { fr: 'Ajouter un prestataire', nl: 'Een aannemer toevoegen' },
      when: { fr: 'Quand une société extérieure intervient pour le service technique (contrat de maintenance, marché).', nl: 'Wanneer een externe onderneming optreedt voor de technische dienst (onderhoudscontract, opdracht).' },
      steps: [
        { fr: 'Choisissez {{equipes.onglet.prestataires}} et cliquez sur {{prestataires.nouveau}}.', nl: 'Kies {{equipes.onglet.prestataires}} en klik op {{prestataires.nouveau}}.' },
        { fr: 'Donnez le nom, le numéro d’entreprise s’il est connu, la langue, les métiers couverts, la référence du marché et le contact, puis enregistrez.', nl: 'Geef de naam, het ondernemingsnummer als het gekend is, de taal, de gedekte vakken, de referentie van de opdracht en de contactpersoon, en sla op.' },
      ],
      result: { fr: 'Le prestataire apparaît dans la liste ; le filtre par corps de métier le retrouve.', nl: 'De aannemer verschijnt in de lijst; de filter op vakgebied vindt hem terug.' },
      errors: [{
        problem: { fr: 'Le numéro d’entreprise est refusé.', nl: 'Het ondernemingsnummer wordt geweigerd.' },
        solution: { fr: 'Vérifiez les dix chiffres sur une facture du prestataire : les deux derniers forment une clé de contrôle. Le même numéro ne peut servir qu’une fois dans l’entité.', nl: 'Controleer de tien cijfers op een factuur van de aannemer: de laatste twee vormen een controlegetal. Hetzelfde nummer kan maar één keer dienen in de entiteit.' },
      }],
    },
  ],
  faq: [
    {
      q: { fr: 'Que veut dire « Horaire de l’entité » ?', nl: 'Wat betekent « Uurrooster van de entiteit »?' },
      a: { fr: 'L’équipe travaille aux heures des ouvriers de l’entité, réglées dans Catégories et délais, onglet Calendrier. Un horaire propre sert aux équipes qui travaillent autrement, par exemple le samedi et le dimanche.', nl: 'De ploeg werkt op de uren van de arbeiders van de entiteit, ingesteld in Categorieën en termijnen, tabblad Kalender. Een eigen uurrooster dient voor ploegen die anders werken, bijvoorbeeld op zaterdag en zondag.' },
    },
    {
      q: { fr: 'Où ajouter un métier ou une compétence qui manque ?', nl: 'Waar een ontbrekend vak of een ontbrekende bekwaamheid toevoegen?' },
      a: { fr: 'Dans {{nav.listes}}, listes {{listes.liste.corps_metier}} et {{listes.liste.competence}} (responsable).', nl: 'In {{nav.listes}}, lijsten {{listes.liste.corps_metier}} en {{listes.liste.competence}} (verantwoordelijke).' },
    },
    {
      q: { fr: 'Le marché d’un prestataire est-il lu dans 3P Procura ?', nl: 'Wordt de opdracht van een aannemer gelezen in 3P Procura?' },
      a: { fr: 'Non : la référence du marché ou du contrat se saisit librement, pour le retrouver dans 3P Procura ; aucun échange automatique.', nl: 'Neen: de referentie van de opdracht of het contract wordt vrij ingevuld, om het terug te vinden in 3P Procura; geen automatische uitwisseling.' },
    },
  ],
  seeAlso: ['planning', 'listes', 'users', 'referentiel'],
  shots: [
    { id: 'equipes-overview', path: '/equipes', marks: [{ sel: '.page-header' }, { sel: '.ant-table' }], caption: { fr: 'Équipes', nl: 'Ploegen' } },
    { id: 'equipes-ouvriers', path: '/equipes?onglet=ouvriers', marks: [{ sel: '.equipes-filtre' }, { sel: '.ant-table' }], caption: { fr: 'Ouvriers, métiers et compétences', nl: 'Arbeiders, vakken en bekwaamheden' } },
    { id: 'equipes-indisponibilites', path: '/equipes?onglet=ouvriers', actions: [{ clickSel: '.ant-table-row .ant-btn-link' }, { wait: 800 }, { scrollSel: '.indisponibilites' }, { clickSel: '.indisponibilites .ant-card-extra .ant-btn' }, { wait: 500 }, { scrollSel: '.indisponibilites' }], clip: 'drawer', marks: [{ sel: '.indisponibilites .indispo-form' }, { sel: '.indisponibilites .ant-list' }], caption: { fr: 'Absences d’un ouvrier', nl: 'Afwezigheden van een arbeider' } },
    { id: 'equipes-prestataires', path: '/equipes?onglet=prestataires', marks: [{ sel: '.prestataires-recherche' }, { sel: '.ant-table' }], caption: { fr: 'Prestataires externes', nl: 'Externe aannemers' } },
  ],
};
export default topic;

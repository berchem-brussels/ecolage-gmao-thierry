/** Fiche d'aide « Demandes de l'entité » : tableau de bord, liste du service et qualification (GES-01 à 04, PRI-01, 03 ; 0.12.0). 0.14.0 : cycle de vie (CYC-01, CLO-01, PRI-03, SUI-06). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'demandes-entite', path: '/demandes-entite', group: 'service', titleKey: 'nav.demandes.entite', roles: ['gestionnaire', 'responsable'],
  acces: { module: 'demandes', permission: 'demandes:entite' },
  purpose: {
    fr: "L'écran de travail du service technique : toutes les demandes de l'entité active, le tableau de bord, et la qualification de chaque demande (catégorie, lieu, priorité, consignes).",
    nl: 'Het werkscherm van de technische dienst: alle aanvragen van de actieve entiteit, het dashboard, en de kwalificatie van elke aanvraag (categorie, plaats, prioriteit, instructies).',
  },
  layout: [
    { fr: '[[1]] Le tableau de bord : à qualifier (rouvertes comprises), en retard, P1 et P2 ouvertes, échéance dans les deux jours ouvrés, en attente depuis longtemps, à clôturer ; un clic filtre la liste.', nl: '[[1]] Het dashboard: te kwalificeren (heropende inbegrepen), te laat, open P1 en P2, vervaldag binnen twee werkdagen, lang in wacht, af te sluiten; een klik filtert de lijst.' },
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
        { fr: 'Vérifiez la catégorie et le lieu, avec la photo de l’endroit en tête du formulaire ; corrigez-les si le demandeur s’est trompé.', nl: 'Controleer de categorie en de plaats, met de foto van de plek bovenaan het formulier; verbeter ze als de aanvrager zich vergiste.' },
        { fr: 'Confirmez la priorité proposée, ou changez-la et écrivez {{qualif.motif}}.', nl: 'Bevestig de voorgestelde prioriteit, of wijzig ze en vul {{qualif.motif}} in.' },
        { fr: 'Estimez la durée et écrivez {{qualif.consignes}}, puis cliquez sur {{qualif.enregistrer}}.', nl: 'Schat de duur en vul {{qualif.consignes}} in, en klik daarna op {{qualif.enregistrer}}.' },
      ],
      result: { fr: 'La demande passe à « Qualifiée » ; le demandeur voit « Prise en charge » et le délai recalculé, jamais vos consignes ni le motif.', nl: 'De aanvraag gaat naar « Gekwalificeerd »; de aanvrager ziet « In behandeling » en de herberekende termijn, nooit uw instructies of de reden.' },
      errors: [{ problem: { fr: 'L’enregistrement est refusé.', nl: 'Het opslaan wordt geweigerd.' }, solution: { fr: 'Une priorité changée exige son motif ; une priorité P4 exige la date convenue avec le demandeur.', nl: 'Een gewijzigde prioriteit vereist een reden; een prioriteit P4 vereist de met de aanvrager afgesproken datum.' } }],
      shots: ['demandes-entite-qualifier'],
    },
    // 0.15.0 (point 6 ; SUI-04, GES-08, GES-09, SUI-09) : répondre, notes internes et mentions, suivre.
    {
      title: { fr: 'Répondre au demandeur, avec un modèle si besoin', nl: 'De aanvrager antwoorden, zo nodig met een model' },
      when: { fr: 'Quand le demandeur a écrit ({{bord.messages_a_lire}}) ou qu’il vous manque une précision.', nl: 'Wanneer de aanvrager schreef ({{bord.messages_a_lire}}) of u een verduidelijking mist.' },
      steps: [
        { fr: 'Ouvrez la fiche : {{fil.titre}} est sous la fiche ; le fil est marqué lu quand il s’affiche.', nl: 'Open de fiche: {{fil.titre}} staat onder de fiche; de berichten worden als gelezen gemarkeerd wanneer ze verschijnen.' },
        { fr: 'Laissez {{fil.public}} ; {{fil.modele}} ajoute un texte prêt, dans la langue de la demande, avec le numéro, le lieu et le prénom. Relisez et complétez.', nl: 'Laat {{fil.public}} staan; {{fil.modele}} voegt een klaar tekst toe, in de taal van de aanvraag, met nummer, plaats en voornaam. Lees na en vul aan.' },
        { fr: 'Joignez au besoin une photo, puis {{fil.envoyer}}.', nl: 'Voeg zo nodig een foto toe en klik op {{fil.envoyer}}.' },
      ],
      result: { fr: 'Le demandeur lit la réponse signée « Service technique », sans votre nom ; sa demande porte « 1 nouveau message ».', nl: 'De aanvrager leest het antwoord ondertekend « Technische dienst », zonder uw naam; zijn aanvraag draagt « 1 nieuw bericht ».' },
    },
    {
      title: { fr: 'Écrire une note interne et prévenir un collègue', nl: 'Een interne nota schrijven en een collega verwittigen' },
      when: { fr: 'Pour une information réservée au service : pièce à commander, accès, consigne entre collègues.', nl: 'Voor informatie enkel voor de dienst: onderdeel te bestellen, toegang, afspraak tussen collega’s.' },
      steps: [
        { fr: 'Sous {{fil.destinataire}}, choisissez {{fil.interne.option}}.', nl: 'Onder {{fil.destinataire}} kiest u {{fil.interne.option}}.' },
        { fr: 'Dans {{fil.mentions}}, choisissez les collègues à prévenir (10 au plus).', nl: 'Kies in {{fil.mentions}} de collega’s om te verwittigen (hoogstens 10).' },
        { fr: 'Écrivez la note, puis {{fil.envoyer.interne}}.', nl: 'Schrijf de nota en klik op {{fil.envoyer.interne}}.' },
      ],
      result: { fr: 'La note, encadrée et marquée {{fil.interne}}, n’est jamais montrée au demandeur. Chaque collègue prévenu retrouve la demande dans {{bord.mentions}} jusqu’à ce qu’il lise la note.', nl: 'De nota, omkaderd en gemarkeerd {{fil.interne}}, wordt nooit aan de aanvrager getoond. Elke verwittigde collega vindt de aanvraag terug in {{bord.mentions}} tot hij de nota leest.' },
      shots: ['demandes-entite-fil'],
    },
    {
      title: { fr: 'Suivre une demande', nl: 'Een aanvraag volgen' },
      when: { fr: 'Quand vous voulez garder un œil sur une demande que vous ne traitez pas vous-même.', nl: 'Wanneer u een aanvraag in het oog wilt houden die u niet zelf behandelt.' },
      steps: [
        { fr: 'Ouvrez la fiche et cliquez sur {{suivi.suivre}}.', nl: 'Open de fiche en klik op {{suivi.suivre}}.' },
        { fr: 'Pour arrêter : {{suivi.arreter}}.', nl: 'Om te stoppen: {{suivi.arreter}}.' },
      ],
      result: { fr: 'La demande apparaît dans {{nav.demandes}}. La fiche dit, pour chaque personne qui suit, si c’est un « Moi aussi » ou un simple suivi.', nl: 'De aanvraag verschijnt in {{nav.demandes}}. De fiche zegt, voor elke persoon die volgt, of het een « Ik ook » of gewoon volgen is.' },
    },
    // 0.14.0 (étape 9, point 7) : faire avancer une demande.
    {
      title: { fr: 'Faire avancer une demande jusqu’à la clôture', nl: 'Een aanvraag tot de afsluiting verder behandelen' },
      when: { fr: 'Après la qualification, à chaque étape des travaux.', nl: 'Na de kwalificatie, bij elke stap van de werken.' },
      steps: [
        { fr: 'Ouvrez la fiche : sous {{cycle.actions}}, seuls les passages permis depuis l’état actuel ont un bouton.', nl: 'Open de fiche: onder {{cycle.actions}} hebben enkel de toegestane overgangen vanuit de huidige status een knop.' },
        { fr: '{{cycle.action.en_cours}}, puis {{cycle.action.terminee}} quand les travaux sont faits.', nl: '{{cycle.action.en_cours}}, daarna {{cycle.action.terminee}} wanneer de werken klaar zijn.' },
        { fr: '{{cycle.action.en_attente}} : choisissez le motif ; le commentaire est lu par le demandeur. {{cycle.action.reprendre}} ou {{cycle.action.reprendre_travaux}} quand l’attente prend fin.', nl: '{{cycle.action.en_attente}}: kies de reden; de opmerking wordt door de aanvrager gelezen. {{cycle.action.reprendre}} of {{cycle.action.reprendre_travaux}} wanneer het wachten voorbij is.' },
        { fr: '{{cycle.action.cloturee}} : choisissez la cause de la panne, relisez ou écrivez le compte rendu (interne) et, si vous voulez, un mot pour le demandeur.', nl: '{{cycle.action.cloturee}}: kies de oorzaak van het defect, herlees of schrijf het verslag (intern) en, als u wilt, een woord voor de aanvrager.' },
      ],
      result: { fr: 'Chaque passage s’inscrit dans {{cycle.historique}} avec la date, l’auteur et le motif ; le demandeur voit l’état en clair et peut ensuite donner son avis.', nl: 'Elke overgang komt in {{cycle.historique}} met de datum, de auteur en de reden; de aanvrager ziet de status in gewone woorden en kan daarna zijn beoordeling geven.' },
      errors: [
        { problem: { fr: 'Le motif voulu n’est pas proposé.', nl: 'De gewenste reden wordt niet voorgesteld.' }, solution: { fr: 'Le responsable l’ajoute dans {{nav.listes}} (motifs d’attente, motifs de refus, causes de panne).', nl: 'De verantwoordelijke voegt ze toe in {{nav.listes}} (redenen van wachten, redenen van weigering, oorzaken van defect).' } },
        { problem: { fr: 'Une demande doit être refusée ou annulée.', nl: 'Een aanvraag moet geweigerd of geannuleerd worden.' }, solution: { fr: '{{cycle.action.refusee}} exige un motif de la liste ; {{cycle.action.annulee}} exige un commentaire. Rien n’est supprimé.', nl: '{{cycle.action.refusee}} vereist een reden uit de lijst; {{cycle.action.annulee}} vereist een opmerking. Niets wordt verwijderd.' } },
      ],
    },
  ],
  faq: [
    { q: { fr: 'Que veut dire « Délai suspendu » ?', nl: 'Wat betekent « Termijn opgeschort »?' }, a: { fr: 'La demande attend pour un motif extérieur au service (par défaut : réponse du demandeur, accès impossible ; réglé dans Réglages de l’entité). Elle n’est pas en retard ; à la reprise, son échéance est repoussée du temps d’attente, en heures d’ouverture.', nl: 'De aanvraag wacht om een reden buiten de dienst (standaard: antwoord van de aanvrager, toegang onmogelijk; ingesteld in Instellingen van de entiteit). Ze is niet te laat; bij de hervatting wordt de vervaldag verschoven met de wachttijd, in openingsuren.' } },
    { q: { fr: 'Une demande clôturée revient « Rouverte » : pourquoi ?', nl: 'Een afgesloten aanvraag komt terug als « Heropend »: waarom?' }, a: { fr: 'Le demandeur l’a rouverte dans le délai de l’entité en disant ce qui ne va pas (voir l’historique). Elle revient dans « À qualifier » ; ses délais repartent de la réouverture.', nl: 'De aanvrager heropende ze binnen de termijn van de entiteit en zei wat er niet in orde is (zie de historiek). Ze komt terug in « Te kwalificeren »; de termijnen beginnen opnieuw bij de heropening.' } },
    { q: { fr: 'Pourquoi le délai a-t-il changé après la qualification ?', nl: 'Waarom veranderde de termijn na de kwalificatie?' }, a: { fr: 'Le délai suit la priorité : une priorité changée recalcule les échéances, toujours comptées depuis la réception de la demande.', nl: 'De termijn volgt de prioriteit: een gewijzigde prioriteit herberekent de vervaldagen, altijd geteld vanaf de ontvangst van de aanvraag.' } },
    // 0.13.0 (étape 8 ter, DV-101) : photo de l'endroit.
    { q: { fr: 'D’où vient la photo de l’endroit sur la fiche ?', nl: 'Waar komt de foto van de plek op de fiche vandaan?' }, a: { fr: 'C’est la photo du lieu de la demande, prise dans Patrimoine ; si le local n’en a pas, celle de son bâtiment ou de son site, et la légende le dit. Un toucher l’agrandit. Le demandeur ne la voit pas sur sa demande. Pour compléter les photos : Patrimoine, case {{lieux.sans_photo.tag}}.', nl: 'Het is de foto van de plaats van de aanvraag, uit Patrimonium; heeft het lokaal er geen, dan die van zijn gebouw of site, en het onderschrift zegt het. Een tik vergroot ze. De aanvrager ziet ze niet bij zijn aanvraag. Om de foto’s aan te vullen: Patrimonium, vakje {{lieux.sans_photo.tag}}.' } },
    // 0.15.0 (point 6).
    { q: { fr: 'Le demandeur peut-il lire une note interne ?', nl: 'Kan de aanvrager een interne nota lezen?' }, a: { fr: 'Non, jamais : ni à l’écran, ni par l’assistant, ni par la GRC. Il ne voit pas non plus le nom des agents du service.', nl: 'Nee, nooit: niet op het scherm, niet via de assistent, niet via het KRM. Hij ziet ook de naam van de medewerkers van de dienst niet.' } },
    { q: { fr: 'Comment ajouter ou changer un modèle de réponse ?', nl: 'Hoe een antwoordmodel toevoegen of wijzigen?' }, a: { fr: 'Le responsable le fait dans {{nav.referentiel}}, onglet {{ref.tab.modeles}}.', nl: 'De verantwoordelijke doet het in {{nav.referentiel}}, tabblad {{ref.tab.modeles}}.' } },
    { q: { fr: 'Je ne vois pas les demandes du CPAS.', nl: 'Ik zie de aanvragen van het OCMW niet.' }, a: { fr: 'La liste suit l’entité active ; si vous avez un rôle dans l’autre entité, changez d’entité dans l’en-tête.', nl: 'De lijst volgt de actieve entiteit; als u een rol hebt in de andere entiteit, wissel van entiteit in de kop.' } },
  ],
  seeAlso: ['referentiel', 'patrimoine'],
  shots: [
    { id: 'demandes-entite-overview', path: '/demandes-entite', marks: [{ sel: '.bord-compteurs' }, { sel: '.gest-filtres' }, { sel: '.ant-table' }], caption: { fr: "Demandes de l'entité", nl: 'Aanvragen van de entiteit' } },
    { id: 'demandes-entite-fil', path: '/demandes-entite', actions: [{ clickSel: '.ant-table-row .ant-btn-link' }, { wait: 1000 }, { scrollSel: 'section.fil' }, { clickSel: '.fil-saisie .ant-radio-button-wrapper:nth-child(2)' }, { wait: 600 }, { scrollSel: '.fil-saisie' }],
      clip: 'drawer', marks: [{ sel: '.fil-bulle-interne' }, { sel: '.fil-saisie .ant-radio-group' }, { sel: '.fil-saisie .ant-select' }], caption: { fr: 'Note interne et collègue prévenu', nl: 'Interne nota en verwittigde collega' } },
    { id: 'demandes-entite-qualifier', path: '/demandes-entite', actions: [{ clickSel: '.ant-table-row .ant-btn-link' }, { wait: 600 }], clip: 'drawer', caption: { fr: 'Fiche d’une demande : passages permis et historique', nl: 'Fiche van een aanvraag: toegestane overgangen en historiek' } },
  ],
};
export default topic;

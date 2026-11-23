/** Fiche d'aide « Planning » (PLA-03, PLA-04 ; 0.21.0, étape 17).  */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'planning', path: '/planning', group: 'service', titleKey: 'nav.planning', roles: ['responsable', 'gestionnaire', 'chef_equipe'],
  acces: { permission: 'equipes:lire' },
  purpose: {
    fr: "La semaine ou le jour du service technique : les tâches datées, ouvrier par ouvrier ou équipe par équipe, avec la charge prévue de chaque jour. Les jours non travaillés sont grisés et une absence est indiquée sans sa cause. Le gestionnaire et le responsable déplacent une tâche d'un jour ou d'une personne à l'autre ; le chef d'équipe consulte.",
    nl: 'De week of de dag van de technische dienst: de geplande taken, arbeider per arbeider of ploeg per ploeg, met de geplande belasting van elke dag. Niet-gewerkte dagen zijn grijs en een afwezigheid wordt vermeld zonder oorzaak. De beheerder en de verantwoordelijke verplaatsen een taak van een dag of een persoon naar een andere; de ploegbaas raadpleegt.',
  },
  overviewShot: 'planning-overview',
  layout: [
    { fr: '[[1]] Les flèches changent de période, {{planning.cette_semaine}} y revient ; on choisit {{planning.semaine}} ou {{planning.jour}}, et {{planning.par_ouvrier}} ou {{planning.par_equipe}}.', nl: '[[1]] De pijlen veranderen van periode, {{planning.cette_semaine}} keert ernaar terug; men kiest {{planning.semaine}} of {{planning.jour}}, en {{planning.par_ouvrier}} of {{planning.par_equipe}}.' },
    { fr: '[[2]] {{planning.non_planifiees}} : les tâches ouvertes sans date, les plus urgentes d’abord ; {{planning.planifier}} leur donne un jour et une personne.', nl: '[[2]] {{planning.non_planifiees}}: de open taken zonder datum, de dringendste eerst; {{planning.planifier}} geeft ze een dag en een persoon.' },
    { fr: '[[3]] La grille : une ligne par ouvrier ou par équipe, une colonne par jour. Chaque case montre la charge prévue et les tâches ; une case en rouge signale un conflit (absent, jour non travaillé, trop chargé). La ligne {{planning.sans_affectation}} reprend les tâches datées confiées à personne.', nl: '[[3]] Het rooster: één rij per arbeider of per ploeg, één kolom per dag. Elke cel toont de geplande belasting en de taken; een rode cel meldt een conflict (afwezig, geen werkdag, te zwaar belast). De rij {{planning.sans_affectation}} herneemt de geplande taken die aan niemand toevertrouwd zijn.' },
  ],
  procedures: [
    {
      title: { fr: 'Déplacer une tâche', nl: 'Een taak verplaatsen' },
      when: { fr: 'Quand une intervention doit changer de jour ou d’ouvrier (absence, urgence, charge trop lourde).', nl: 'Wanneer een interventie van dag of van arbeider moet veranderen (afwezigheid, dringendheid, te zware belasting).' },
      steps: [
        { fr: 'Sur un ordinateur, glissez la tâche vers la case du jour et de la personne voulus.', nl: 'Op een computer sleept u de taak naar de cel van de gewenste dag en persoon.' },
        { fr: 'Ou cliquez sur {{planning.deplacer}} dans la tâche, choisissez le {{planning.vers_jour}} et la personne, puis confirmez (seule façon sur un téléphone).', nl: 'Of klik op {{planning.deplacer}} in de taak, kies de {{planning.vers_jour}} en de persoon, en bevestig (enige manier op een telefoon).' },
      ],
      shots: ['planning-deplacer'],
      result: { fr: 'La tâche apparaît à sa nouvelle place, comme si elle avait été affectée depuis la fiche de la demande ; le demandeur lit la nouvelle date prévue.', nl: 'De taak verschijnt op haar nieuwe plaats, alsof ze vanuit de fiche van de aanvraag toegewezen werd; de aanvrager leest de nieuwe geplande datum.' },
      errors: [{
        problem: { fr: 'Une tâche marquée {{planning.via_equipe}} ne change pas d’ouvrier.', nl: 'Een taak met {{planning.via_equipe}} verandert niet van arbeider.' },
        solution: { fr: 'Elle est confiée à toute une équipe : dans la vue {{planning.par_ouvrier}}, elle ne change que de jour. Passez par {{planning.par_equipe}} ou par « Affecter » dans la fiche de la demande pour la confier à une personne.', nl: 'Ze is aan een hele ploeg toevertrouwd: in de weergave {{planning.par_ouvrier}} verandert ze enkel van dag. Gebruik {{planning.par_equipe}} of « Toewijzen » in de fiche van de aanvraag om ze aan één persoon toe te vertrouwen.' },
      }, {
        problem: { fr: 'Le déplacement vers un jour passé est refusé.', nl: 'Het verplaatsen naar een voorbije dag wordt geweigerd.' },
        solution: { fr: 'Une date nouvelle n’est jamais dans le passé : choisissez aujourd’hui ou un jour à venir.', nl: 'Een nieuwe datum ligt nooit in het verleden: kies vandaag of een komende dag.' },
      }],
    },
    // 0.21.0 (point 4 ; PLA-05, PLA-06).
    {
      title: { fr: 'Planifier une tâche qui n’a pas de date', nl: 'Een taak zonder datum plannen' },
      when: { fr: 'Pour vider la liste {{planning.non_planifiees}}, en commençant par le haut.', nl: 'Om de lijst {{planning.non_planifiees}} leeg te maken, van boven af.' },
      steps: [
        { fr: 'Sur un ordinateur, glissez la tâche vers la case du jour et de l’ouvrier voulus.', nl: 'Op een computer sleept u de taak naar de cel van de gewenste dag en arbeider.' },
        { fr: 'Ou cliquez sur {{planning.planifier}}, choisissez le jour et la personne, puis confirmez.', nl: 'Of klik op {{planning.planifier}}, kies de dag en de persoon, en bevestig.' },
      ],
      result: { fr: 'La tâche quitte la liste et entre dans la grille ; la demande passe « Planifiée ». Si la personne est absente, ne travaille pas ce jour ou est trop chargée, un avertissement {{planning.conflit.titre}} le dit : l’affectation est gardée, à vous de la changer si besoin.', nl: 'De taak verlaat de lijst en komt in het rooster; de aanvraag wordt « Gepland ». Is de persoon afwezig, werkt ze die dag niet of is ze te zwaar belast, dan zegt een waarschuwing {{planning.conflit.titre}} het: de toewijzing blijft behouden, aan u om ze zo nodig te veranderen.' },
    },
    {
      title: { fr: 'Voir qui est disponible un jour donné', nl: 'Zien wie op een bepaalde dag beschikbaar is' },
      when: { fr: 'Avant de confier une intervention urgente.', nl: 'Voordat u een dringende interventie toevertrouwt.' },
      steps: [
        { fr: 'Choisissez {{planning.jour}} et allez au jour voulu avec les flèches.', nl: 'Kies {{planning.jour}} en ga met de pijlen naar de gewenste dag.' },
        { fr: 'Lisez la charge prévue de chaque ouvrier ; une case grisée ou marquée {{planning.indisponible.journee}} veut dire que la personne ne travaille pas ce jour-là.', nl: 'Lees de geplande belasting van elke arbeider; een grijze cel of een cel met {{planning.indisponible.journee}} betekent dat de persoon die dag niet werkt.' },
      ],
      result: { fr: 'Vous savez à qui confier le travail ; les absences se notent dans {{nav.equipes}}, onglet Ouvriers, fiche de l’ouvrier.', nl: 'U weet aan wie u het werk toevertrouwt; afwezigheden worden genoteerd in {{nav.equipes}}, tabblad Arbeiders, fiche van de arbeider.' },
    },
  ],
  faq: [
    {
      q: { fr: 'Pourquoi la cause d’une absence n’apparaît-elle pas ?', nl: 'Waarom verschijnt de oorzaak van een afwezigheid niet?' },
      a: { fr: 'Le planning dit seulement qu’une personne est indisponible. Le motif (congé, formation, autre) n’est visible que du gestionnaire et du responsable, dans la fiche de l’ouvrier.', nl: 'De planning zegt enkel dat een persoon onbeschikbaar is. De reden (verlof, opleiding, andere) is enkel zichtbaar voor de beheerder en de verantwoordelijke, in de fiche van de arbeider.' },
    },
    {
      q: { fr: 'D’où vient la charge prévue ?', nl: 'Waar komt de geplande belasting vandaan?' },
      a: { fr: 'C’est la somme des durées estimées des tâches à faire ou en cours de ce jour, confiées à la personne directement ou par son équipe. Une tâche sans durée compte pour zéro.', nl: 'Het is de som van de geschatte duur van de taken te doen of bezig van die dag, rechtstreeks of via de ploeg aan de persoon toevertrouwd. Een taak zonder duur telt voor nul.' },
    },
    {
      q: { fr: 'Quand une case dit-elle « Trop chargé » ?', nl: 'Wanneer zegt een cel « Te zwaar belast »?' },
      a: { fr: 'Quand la charge prévue dépasse la durée de la journée de la personne : du début à la fin de l’horaire de son équipe ou de l’entité ce jour-là, pause comprise (l’horaire ne connaît pas la pause), la moitié pour une demi-journée d’absence. L’avertissement ne bloque rien.', nl: 'Wanneer de geplande belasting de duur van de werkdag van de persoon overschrijdt: van het begin tot het einde van het uurrooster van zijn ploeg of van de entiteit die dag, pauze inbegrepen (het uurrooster kent geen pauze), de helft bij een halve dag afwezigheid. De waarschuwing blokkeert niets.' },
    },
  ],
  seeAlso: ['equipes', 'demandes-entite'],
  shots: [
    { id: 'planning-overview', path: '/planning', actions: [{ clickSel: '.planning-barre .anticon-right' }, { wait: 1000 }], marks: [{ sel: '.planning-barre' }, { sel: '.planning-non-planifiees' }, { sel: '.planning-grille' }], caption: { fr: 'Planning de la semaine', nl: 'Planning van de week' } },
    { id: 'planning-deplacer', path: '/planning', actions: [{ clickSel: '.planning-barre .anticon-right' }, { wait: 1000 }, { clickSel: '.planning-grille .planning-action' }, { wait: 800 }], clip: 'modal', marks: [{ sel: '#planning-date' }, { sel: '.planning-deplacer .ant-select' }], caption: { fr: 'Déplacer une tâche', nl: 'Een taak verplaatsen' } },
  ],
};
export default topic;

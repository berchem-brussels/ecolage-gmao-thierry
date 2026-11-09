/** Fiche d'aide « Catégories et délais » : catégories, questions, priorités, calendrier, simulateur (REF-06, PRI-02, DEM-05 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'referentiel', path: '/referentiel', group: 'service', titleKey: 'nav.referentiel', roles: ['responsable'],
  acces: { permission: 'categories:gerer' },
  purpose: {
    fr: "Les règles des demandes de l'entité active : les tuiles proposées au demandeur (domaines et natures), leurs questions, les priorités et leurs délais, l'horaire et les congés du service. Les réglages ne valent que pour l'entité active.",
    nl: 'De regels van de aanvragen van de actieve entiteit: de tegels voorgesteld aan de aanvrager (domeinen en soorten), hun vragen, de prioriteiten en hun termijnen, het uurrooster en de verlofdagen van de dienst. De instellingen gelden enkel voor de actieve entiteit.',
  },
  layout: [
    { fr: '[[1]] Les onglets : catégories, priorités et délais, calendrier, simulateur, états des demandes.', nl: '[[1]] De tabbladen: categorieën, prioriteiten en termijnen, kalender, simulator, statussen van de aanvragen.' },
    { fr: '[[2]] Les domaines et leurs natures ; à droite, l’aperçu des tuiles du demandeur.', nl: '[[2]] De domeinen en hun soorten; rechts, het voorbeeld van de tegels van de aanvrager.' },
  ],
  overviewShot: 'referentiel-overview',
  procedures: [
    {
      title: { fr: 'Adapter une catégorie', nl: 'Een categorie aanpassen' },
      when: { fr: 'Quand une tuile manque, est mal nommée ou propose une mauvaise priorité.', nl: 'Wanneer een tegel ontbreekt, slecht benoemd is of een verkeerde prioriteit voorstelt.' },
      steps: [
        { fr: 'Onglet catégories : cliquez sur un domaine ou une nature pour changer ses libellés, son pictogramme, sa priorité, son circuit ou son délai propre.', nl: 'Tabblad categorieën: klik op een domein of een soort om de labels, het pictogram, de prioriteit, het circuit of de eigen termijn te wijzigen.' },
        { fr: '{{ref.cat.nouveau_domaine}} crée un domaine ; {{ref.cat.nouvelle_nature}}, dans la fiche d’un domaine, ajoute une nature.', nl: '{{ref.cat.nouveau_domaine}} maakt een domein aan; {{ref.cat.nouvelle_nature}}, in de fiche van een domein, voegt een soort toe.' },
      ],
      result: { fr: 'L’aperçu montre aussitôt les tuiles du demandeur. Chaque fiche dit qui l’a modifiée et quand.', nl: 'Het voorbeeld toont meteen de tegels van de aanvrager. Elke fiche zegt wie ze wijzigde en wanneer.' },
    },
    {
      title: { fr: 'Poser une question au demandeur', nl: 'Een vraag stellen aan de aanvrager' },
      when: { fr: 'Quand une précision revient souvent : quel étage, quel appareil, depuis quand.', nl: 'Wanneer een verduidelijking vaak terugkomt: welke verdieping, welk toestel, sinds wanneer.' },
      steps: [
        { fr: 'Dans la fiche d’un domaine ou d’une nature, cliquez sur {{ref.q.ajouter}}.', nl: 'In de fiche van een domein of een soort klikt u op {{ref.q.ajouter}}.' },
        { fr: 'Choisissez oui ou non, ou un choix de 2 à 6 réponses, en français et en néerlandais ; cochez {{ref.q.obligatoire}} seulement si c’est indispensable.', nl: 'Kies ja of nee, of een keuze van 2 tot 6 antwoorden, in het Frans en het Nederlands; vink {{ref.q.obligatoire}} enkel aan als het onmisbaar is.' },
      ],
      result: { fr: 'Dix questions actives au plus par catégorie ; une nature pose d’abord celles de son domaine. Les demandes déjà déposées gardent le texte d’origine.', nl: 'Hoogstens tien actieve vragen per categorie; een soort stelt eerst die van haar domein. Reeds ingediende aanvragen behouden de oorspronkelijke tekst.' },
    },
    {
      title: { fr: 'Régler les délais et le calendrier, puis vérifier', nl: 'De termijnen en de kalender instellen, en daarna controleren' },
      when: { fr: 'Après l’atelier avec le service technique, ou avant une fermeture.', nl: 'Na de workshop met de technische dienst, of voor een sluiting.' },
      steps: [
        { fr: 'Onglet priorités et délais : pour chaque priorité, le décompte, la prise en charge et la fin ; {{ref.prio.convenue}} quand la fin se fixe avec le demandeur.', nl: 'Tabblad prioriteiten en termijnen: voor elke prioriteit het aftellen, de tenlasteneming en het einde; {{ref.prio.convenue}} wanneer het einde met de aanvrager wordt afgesproken.' },
        { fr: 'Onglet calendrier : l’horaire de chaque jour, les congés qui reviennent chaque année et les fermetures ; les jours fériés légaux sont calculés.', nl: 'Tabblad kalender: het uurrooster van elke dag, de jaarlijks terugkerende verlofdagen en de sluitingen; de wettelijke feestdagen worden berekend.' },
        { fr: 'Onglet simulateur : choisissez une priorité ou une catégorie et un moment de réception, puis {{ref.sim.calculer}}.', nl: 'Tabblad simulator: kies een prioriteit of een categorie en een ontvangstmoment, en daarna {{ref.sim.calculer}}.' },
      ],
      result: { fr: 'Les échéances calculées s’affichent ; {{ref.reset}} rétablit les valeurs d’origine. Chaque changement s’inscrit au journal d’audit.', nl: 'De berekende vervaldagen verschijnen; {{ref.reset}} herstelt de oorspronkelijke waarden. Elke wijziging komt in het auditlogboek.' },
    },
    // 0.14.0 (étape 9, point 7 ; CYC-04).
    {
      title: { fr: 'Changer le texte d’un état pour le demandeur', nl: 'De tekst van een status voor de aanvrager wijzigen' },
      when: { fr: 'Quand un état est mal compris par les agents, par exemple « Prise en charge ».', nl: 'Wanneer een status slecht begrepen wordt door de medewerkers, bijvoorbeeld « In behandeling ».' },
      steps: [
        { fr: 'Onglet {{ref.tab.etats}} : chaque carte porte le nom de l’état pour le service.', nl: 'Tabblad {{ref.tab.etats}}: elke kaart draagt de naam van de status voor de dienst.' },
        { fr: 'Changez le texte du demandeur en français et en néerlandais (et celui de la GRC si besoin), puis {{common.save}}.', nl: 'Wijzig de tekst voor de aanvrager in het Frans en het Nederlands (en die voor het KRM indien nodig), en daarna {{common.save}}.' },
      ],
      result: { fr: 'Le demandeur lit le nouveau texte dans {{nav.demandes}} et sur sa ligne du temps. {{ref.etat.retablir}} remet les textes livrés.', nl: 'De aanvrager leest de nieuwe tekst in {{nav.demandes}} en op zijn tijdlijn. {{ref.etat.retablir}} zet de geleverde teksten terug.' },
      shots: ['referentiel-etats'],
    },
  ],
  faq: [
    { q: { fr: 'Le demandeur et le service voient-ils le même nom d’état ?', nl: 'Zien de aanvrager en de dienst dezelfde naam van de status?' }, a: { fr: 'Non : le service garde ses libellés (« Qualifiée », « Terminée ») ; le demandeur lit ceux de l’onglet {{ref.tab.etats}}, en français ou en néerlandais selon sa langue.', nl: 'Nee: de dienst houdt zijn benamingen (« Gekwalificeerd », « Beëindigd »); de aanvrager leest die van het tabblad {{ref.tab.etats}}, in het Frans of het Nederlands volgens zijn taal.' } },
  ],
  seeAlso: ['demandes-entite', 'reglages-entite'],
  shots: [{ id: 'referentiel-overview', path: '/referentiel', marks: [{ sel: '.ant-tabs-nav' }, { sel: '.ref-grille-cat' }], caption: { fr: 'Catégories et délais', nl: 'Categorieën en termijnen' } },
    { id: 'referentiel-etats', path: '/referentiel?onglet=etats', marks: [{ sel: '.ref-grille .ant-card' }], caption: { fr: 'Textes des états vus par le demandeur', nl: 'Teksten van de statussen voor de aanvrager' } }],
};
export default topic;

/** Fiche d'aide « Paramètres » : identité, modules, tickets, connexion Microsoft (ADM-01, ADM-02, TEC-03 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'parametres', path: '/parametres', group: 'admin', titleKey: 'nav.parametres', roles: ['admin'],
  acces: { admin: true },
  purpose: {
    fr: "Les réglages de toute l'application, pour les deux entités : nom et contact du support, langue par défaut, modules, files des tickets et connexion Microsoft.",
    nl: 'De instellingen van de hele toepassing, voor beide entiteiten: naam en contact van de support, standaardtaal, modules, wachtrijen van de tickets en Microsoft-aanmelding.',
  },
  layout: [
    { fr: '[[1]] Les onglets {{parametres.tab.general}}, {{parametres.tab.modules}}, {{parametres.tab.tickets}} et {{parametres.tab.connexion}}.', nl: '[[1]] De tabbladen {{parametres.tab.general}}, {{parametres.tab.modules}}, {{parametres.tab.tickets}} en {{parametres.tab.connexion}}.' },
    { fr: '[[2]] Un bloc par sujet, avec son bouton {{common.save}} ; le « ? » de chaque champ l’explique.', nl: '[[2]] Een blok per onderwerp, met zijn knop {{common.save}}; het « ? » van elk veld legt het uit.' },
  ],
  overviewShot: 'parametres-overview',
  procedures: [
    {
      title: { fr: 'Changer un réglage', nl: 'Een instelling wijzigen' },
      when: { fr: 'Pour corriger le nom, le contact du support ou la langue par défaut.', nl: 'Om de naam, het contact van de support of de standaardtaal te verbeteren.' },
      steps: [
        { fr: 'Corrigez la valeur et cliquez sur {{common.save}} sous le bloc.', nl: 'Verbeter de waarde en klik op {{common.save}} onder het blok.' },
        { fr: '{{parametres.reset}} remet la valeur d’origine.', nl: '{{parametres.reset}} zet de oorspronkelijke waarde terug.' },
      ],
      result: { fr: 'Le menu et la page de connexion changent aussitôt ; la langue par défaut vaut pour les comptes créés ensuite.', nl: 'Het menu en de aanmeldpagina veranderen meteen; de standaardtaal geldt voor de daarna aangemaakte accounts.' },
      errors: [{ problem: { fr: 'Le réglage est refusé.', nl: 'De instelling wordt geweigerd.' }, solution: { fr: 'Le message sous le champ nomme la valeur fautive. Les codes de rôles des tickets s’écrivent en minuscules ou en majuscules, séparés par des virgules.', nl: 'Het bericht onder het veld noemt de foute waarde. De rolcodes van de tickets mogen in kleine of hoofdletters, gescheiden door komma’s.' } }],
    },
    {
      title: { fr: 'Éteindre ou rallumer un module', nl: 'Een module uit- of inschakelen' },
      when: { fr: 'Quand une partie de l’application ne doit pas encore servir.', nl: 'Wanneer een deel van de toepassing nog niet mag dienen.' },
      steps: [
        { fr: 'Onglet {{parametres.tab.modules}} : cliquez sur l’interrupteur du module.', nl: 'Tabblad {{parametres.tab.modules}}: klik op de schakelaar van de module.' },
        { fr: 'La fenêtre dit ce qui se ferme ; confirmez par {{modules.off}}.', nl: 'Het venster zegt wat sluit; bevestig met {{modules.off}}.' },
      ],
      result: { fr: 'Le module disparaît du menu, de l’aide et de l’assistant pour tout le monde. Le noyau ne s’éteint pas.', nl: 'De module verdwijnt uit het menu, de hulp en de assistent voor iedereen. De kern kan niet uitgeschakeld worden.' },
    },
    {
      title: { fr: 'Régler la connexion Microsoft', nl: 'De Microsoft-aanmelding instellen' },
      when: { fr: 'À la mise en service, et quand le secret client arrive à échéance.', nl: 'Bij de ingebruikname, en wanneer het clientgeheim vervalt.' },
      steps: [
        { fr: 'Onglet {{parametres.tab.connexion}} : encodez l’annuaire, l’identifiant de l’application et la colonne Valeur du secret client, jamais l’ID du secret.', nl: 'Tabblad {{parametres.tab.connexion}}: vul de directory, de toepassings-id en de kolom Waarde van het clientgeheim in, nooit de geheim-id.' },
        { fr: 'Déclarez dans Entra ID l’adresse de retour affichée, puis choisissez le mode et enregistrez.', nl: 'Geef in Entra ID het getoonde terugkeeradres op, kies daarna de modus en sla op.' },
      ],
      result: { fr: 'La ligne « Enregistré le … par … » le confirme ; un refus de Microsoft s’inscrit au journal avec son code.', nl: 'De regel « Opgeslagen op … door … » bevestigt het; een weigering van Microsoft komt in het logboek met haar code.' },
    },
  ],
  faq: [],
  seeAlso: ['users', 'journal'],
  shots: [{ id: 'parametres-overview', path: '/parametres', marks: [{ sel: '.ant-tabs-nav' }, { sel: '.ant-card' }], caption: { fr: 'Paramètres', nl: 'Parameters' } }],
};
export default topic;

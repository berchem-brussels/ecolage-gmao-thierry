/** Fiche d'aide « Paramètres » : identité, modules, tickets, connexion Microsoft (ADM-01, ADM-02, TEC-03 ; 0.12.0), courriel (NOT-02, NOT-04 ; 0.17.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'parametres', path: '/parametres', group: 'admin', titleKey: 'nav.parametres', roles: ['admin'],
  acces: { admin: true },
  purpose: {
    fr: "Les réglages de toute l'application, pour les deux entités : nom et contact du support, langue par défaut, modules, files des tickets, connexion Microsoft et courriel.",
    nl: 'De instellingen van de hele toepassing, voor beide entiteiten: naam en contact van de support, standaardtaal, modules, wachtrijen van de tickets, Microsoft-aanmelding en e-mail.',
  },
  layout: [
    { fr: '[[1]] Les onglets {{parametres.tab.general}}, {{parametres.tab.modules}}, {{parametres.tab.connexion}}, {{parametres.tab.tickets}} et {{parametres.tab.courriel}}.', nl: '[[1]] De tabbladen {{parametres.tab.general}}, {{parametres.tab.modules}}, {{parametres.tab.connexion}}, {{parametres.tab.tickets}} en {{parametres.tab.courriel}}.' },
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
    // 0.17.0 (étape 13, points 2 et 3) : courriel et modèles de courriel.
    {
      title: { fr: 'Régler le courriel et envoyer un essai', nl: 'De e-mail instellen en een test versturen' },
      when: { fr: 'À la mise en service, puis quand le serveur de courriel ou son mot de passe change.', nl: 'Bij de ingebruikname, en daarna wanneer de mailserver of het wachtwoord verandert.' },
      steps: [
        { fr: 'Onglet {{parametres.tab.courriel}} : encodez le serveur, le port, la sécurité, le compte, le mot de passe et l’adresse de l’expéditeur donnés par le service informatique.', nl: 'Tabblad {{parametres.tab.courriel}}: vul de server, de poort, de beveiliging, het account, het wachtwoord en het adres van de afzender in, gegeven door de informaticadienst.' },
        { fr: 'Choisissez {{courriel.mode.smtp}} et cliquez sur {{common.save}} ; sous {{courriel.essai.titre}}, cliquez sur {{courriel.essai.bouton}}.', nl: 'Kies {{courriel.mode.smtp}} en klik op {{common.save}}; onder {{courriel.essai.titre}} klikt u op {{courriel.essai.bouton}}.' },
      ],
      result: { fr: 'Le résultat de l’essai s’affiche aussitôt, avec l’explication d’un refus du serveur. Chaque courriel et son résultat se lisent dans {{courriel.journal}}.', nl: 'Het resultaat van de test verschijnt meteen, met de uitleg van een weigering door de server. Elke e-mail en het resultaat staan in {{courriel.journal}}.' },
      errors: [{ problem: { fr: 'L’essai échoue avec EAUTH.', nl: 'De test mislukt met EAUTH.' }, solution: { fr: 'Le serveur refuse le compte ou le mot de passe : encodez-le à nouveau ; vide, le mot de passe enregistré est gardé.', nl: 'De server weigert het account of het wachtwoord: vul het opnieuw in; leeg blijft het opgeslagen wachtwoord behouden.' } }],
    },
    {
      title: { fr: 'Changer le texte d’un courriel', nl: 'De tekst van een e-mail wijzigen' },
      when: { fr: 'Pour adapter ce que reçoivent les agents, en français et en néerlandais.', nl: 'Om aan te passen wat de medewerkers ontvangen, in het Frans en in het Nederlands.' },
      steps: [
        { fr: 'Onglet {{parametres.tab.courriel}}, {{modelec.titre}} : ouvrez le modèle et corrigez le sujet ou le texte, dans les deux langues.', nl: 'Tabblad {{parametres.tab.courriel}}, {{modelec.titre}}: open het model en verbeter het onderwerp of de tekst, in beide talen.' },
        { fr: 'Vérifiez avec {{modelec.apercu_fr}} et {{modelec.apercu_nl}}, puis cliquez sur {{common.save}}.', nl: 'Controleer met {{modelec.apercu_fr}} en {{modelec.apercu_nl}} en klik daarna op {{common.save}}.' },
      ],
      result: { fr: 'Les courriels suivants prennent le nouveau texte, dans la langue de chaque personne ; {{modelec.retablir}} rend le texte d’origine.', nl: 'De volgende e-mails krijgen de nieuwe tekst, in de taal van elke persoon; {{modelec.retablir}} geeft de oorspronkelijke tekst terug.' },
      errors: [{ problem: { fr: 'Une variable est refusée.', nl: 'Een variabele wordt geweigerd.' }, solution: { fr: 'Seules les variables listées dans la fiche sont admises : un courriel ne porte ni nom ni texte de la demande, qui se lisent après connexion.', nl: 'Alleen de variabelen in de fiche zijn toegelaten: een e-mail bevat geen naam of tekst van de aanvraag; die leest u na aanmelding.' } }],
    },
  ],
  faq: [
    // 0.17.0 (point 2) : mode test.
    { q: { fr: 'Les agents ne reçoivent aucun courriel.', nl: 'De medewerkers ontvangen geen e-mails.' }, a: { fr: 'En mode {{courriel.mode.test}}, rien ne part : les courriels sont retenus et se lisent dans {{courriel.journal}}. Passez en {{courriel.mode.smtp}} quand le serveur est réglé et l’essai réussi.', nl: 'In de modus {{courriel.mode.test}} vertrekt er niets: de e-mails worden bijgehouden en staan in {{courriel.journal}}. Kies {{courriel.mode.smtp}} wanneer de server is ingesteld en de test gelukt is.' } },
  ],
  seeAlso: ['users', 'journal'],
  shots: [{ id: 'parametres-overview', path: '/parametres', marks: [{ sel: '.ant-tabs-nav' }, { sel: '.ant-card' }], caption: { fr: 'Paramètres', nl: 'Parameters' } }],
};
export default topic;

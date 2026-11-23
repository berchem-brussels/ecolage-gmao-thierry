/** Fiche d'aide « Réglages de l'entité » : contact, urgence, numérotation, protection des données, pièces jointes (ADM-03 ; 0.12.0). */
import type { HelpTopic } from '../types';

const topic: HelpTopic = {
  id: 'reglages-entite', path: '/reglages-entite', group: 'service', titleKey: 'nav.reglages', roles: ['responsable'],
  acces: { permission: 'parametres:gerer' },
  purpose: {
    fr: "Les réglages propres à l'entité active : contact du service technique, téléphone d'urgence, numérotation des demandes, mentions de protection des données et pièces jointes. Ils ne valent que pour l'entité active.",
    nl: 'De instellingen eigen aan de actieve entiteit: contact van de technische dienst, noodnummer, nummering van de aanvragen, vermeldingen over gegevensbescherming en bijlagen. Ze gelden enkel voor de actieve entiteit.',
  },
  layout: [
    { fr: '[[1]] Un bloc par sujet, chacun avec son bouton {{common.save}}.', nl: '[[1]] Een blok per onderwerp, elk met zijn knop {{common.save}}.' },
    { fr: '[[2]] Sous chaque réglage, son explication et, s’il a été changé, la valeur livrée.', nl: '[[2]] Onder elke instelling de uitleg en, als ze gewijzigd werd, de geleverde waarde.' },
  ],
  overviewShot: 'reglages-entite-overview',
  procedures: [
    {
      title: { fr: 'Renseigner le contact et le téléphone d’urgence', nl: 'Het contact en het noodnummer invullen' },
      when: { fr: 'À la mise en service, et à chaque changement.', nl: 'Bij de ingebruikname, en bij elke wijziging.' },
      steps: [
        { fr: 'Encodez le nom du service en français et en néerlandais, son téléphone et son adresse électronique, jamais ceux d’une personne.', nl: 'Vul de naam van de dienst in het Frans en het Nederlands in, het telefoonnummer en het e-mailadres, nooit die van een persoon.' },
        { fr: 'Le téléphone d’urgence est celui que la case danger du formulaire affiche.', nl: 'Het noodnummer is het nummer dat het vakje gevaar van het formulier toont.' },
        { fr: 'Cliquez sur {{common.save}} sous le bloc.', nl: 'Klik op {{common.save}} onder het blok.' },
      ],
      result: { fr: 'Le contact apparaît aussitôt dans l’aide, onglet {{help.contact}}, pour les personnes de l’entité.', nl: 'Het contact verschijnt meteen in de hulp, tabblad {{help.contact}}, voor de personen van de entiteit.' },
      errors: [{ problem: { fr: 'Le réglage est refusé.', nl: 'De instelling wordt geweigerd.' }, solution: { fr: 'Le message sous le champ nomme la valeur fautive et ce qui est attendu.', nl: 'Het bericht onder het veld noemt de foute waarde en wat verwacht wordt.' } }],
    },
    {
      title: { fr: 'Régler la numérotation, la protection des données et les pièces jointes', nl: 'De nummering, de gegevensbescherming en de bijlagen instellen' },
      when: { fr: 'Une fois, avec le DPO et le service technique.', nl: 'Eenmalig, met de DPO en de technische dienst.' },
      steps: [
        { fr: 'Numérotation : le code des demandes (DI) et la remise à un chaque année ou continue ; un numéro donné ne change jamais.', nl: 'Nummering: de code van de aanvragen (DI) en het herbeginnen bij één elk jaar of doorlopend; een gegeven nummer verandert nooit.' },
        { fr: 'Protection des données : le contact du DPO ; dans les mentions, {entite} et {dpo} deviennent le nom de l’entité et ce contact.', nl: 'Gegevensbescherming: het contact van de DPO; in de vermeldingen worden {entite} en {dpo} de naam van de entiteit en dat contact.' },
        { fr: 'Pièces jointes : nombre par demande (0 retire les photos du formulaire), taille et formats.', nl: 'Bijlagen: aantal per aanvraag (0 verwijdert de foto’s uit het formulier), grootte en formaten.' },
      ],
      result: { fr: '{{parametres.reset}} remet la valeur d’origine. Un changement vaut pour les demandes suivantes.', nl: '{{parametres.reset}} zet de oorspronkelijke waarde terug. Een wijziging geldt voor de volgende aanvragen.' },
    },
    // 0.14.0 (étape 9, point 7 ; PRI-03, GES-01, SUI-06).
    {
      title: { fr: 'Régler l’attente, la suspension du délai et la réouverture', nl: 'De wachttijd, de opschorting van de termijn en de heropening instellen' },
      when: { fr: 'Une fois, avec le service technique, puis à l’usage.', nl: 'Eenmalig, met de technische dienst, daarna naargelang het gebruik.' },
      steps: [
        { fr: 'Bloc demandes : cochez les motifs d’attente qui suspendent le délai, ceux qui ne dépendent pas du service (par défaut : réponse du demandeur, accès impossible).', nl: 'Blok aanvragen: vink de redenen van wachten aan die de termijn opschorten, die niet van de dienst afhangen (standaard: antwoord van de aanvrager, toegang onmogelijk).' },
        { fr: 'Fixez le nombre de jours ouvrables après lequel une attente compte comme longue au tableau de bord (5 par défaut).', nl: 'Bepaal het aantal werkdagen waarna een wachttijd als lang telt op het dashboard (standaard 5).' },
        { fr: 'Fixez le délai pendant lequel le demandeur peut rouvrir une demande clôturée (7 jours par défaut ; 0 ferme la réouverture).', nl: 'Bepaal de termijn waarin de aanvrager een afgesloten aanvraag kan heropenen (standaard 7 dagen; 0 sluit de heropening).' },
      ],
      result: { fr: 'Le réglage vaut pour les attentes et les clôtures qui suivent ; une attente déjà commencée garde la règle de son début.', nl: 'De instelling geldt voor de volgende wachttijden en afsluitingen; een reeds begonnen wachttijd behoudt de regel van zijn begin.' },
    },
  ],
  faq: [
    { q: { fr: 'Un motif d’attente manque dans les cases à cocher.', nl: 'Een reden van wachten ontbreekt bij de vinkjes.' }, a: { fr: 'Ajoutez-le d’abord dans {{nav.listes}}, liste {{listes.liste.motif_attente}}.', nl: 'Voeg ze eerst toe in {{nav.listes}}, lijst {{listes.liste.motif_attente}}.' } },
  ],
  seeAlso: ['referentiel', 'parametres'],
  shots: [{ id: 'reglages-entite-overview', path: '/reglages-entite', marks: [{ sel: '.ant-card' }, { sel: '.ant-form-item-extra' }], caption: { fr: "Réglages de l'entité", nl: 'Instellingen van de entiteit' } }],
};
export default topic;

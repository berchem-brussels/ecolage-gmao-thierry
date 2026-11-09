# Architectuur

Versie van de toepassing: **0.14.0** · De Franse tekst is rechtsgeldig (`docs/fr/ARCHITECTURE.md`); dit bestand vat elke versie samen.

## Levenscyclus van de aanvragen (0.14.0)

Catalogus `backend/config/cycle-de-vie.json` (15 statussen, 25 overgangen), bij het opstarten gekopieerd naar `demande_transitions` en, per entiteit, naar `demande_etats` (benamingen voor de aanvrager en het KRM). Migratie `012_cycle_de_vie`: tabellen `demande_transitions`, `demande_etats`, `demande_historique`, `demande_complements`, `demande_avis`, zeven kolommen van `demandes`. Dienst `services/cycle.js`: volgorde van de controles (entiteit, aanvraag 404 of 403, toelating 403, module, overgang 409), nieuwe permissie `demandes:traiter`, opschorting van de termijn tijdens een wachttijd om een aangevinkte reden. Negen routes (`/api/demandes/:id/historique`, `/transitions`, `PUT` en `DELETE /api/demandes/:id`, `/pieces`, `/avis`, `/api/etats-demande`), acht MCP-tools. Interface: `ChangerEtat.tsx`, `HistoriqueDemande.tsx`, `ActionsDemandeur.tsx`, `EtatsTab.tsx`.

## Hulp per scherm en lokale FAQ (0.12.0)

Fiches per scherm in de interface (`frontend/src/help/`), uitleg van de velden in `hints.ts` (« ? »), blokkerende controles in `help.test.ts`; schermafbeeldingen via `npm run help:capture` in `frontend/public/aide-captures/` (nooit onder `public/help/`). Tabel `help_faq` (migratie `011_faq`) met `entite_id` (leeg: gemeenschappelijk), `topic_id`, vraag en antwoord FR en NL, `source_ticket_id`, deactivering met reden; routes `/api/faq`, `POST /api/tickets/:id/faq`, zes MCP-tools; permissie `faq:gerer`. Geweigerde instelling met naam en foute waarde (`refus-reglage.js`). Controles na installatie: `recette.sh` en `backend/src/recette-api.js`.

## Tickets (0.11.0)

Tabellen `tickets` (referentie `TCK-JJJJ-NNNNN`, soort, wachtrij `business` of `it`, prioriteit P1 tot P4, status, `entite_id` van de aanvrager bij het melden, schermafbeelding zonder metagegevens) en `ticket_messages` (berichten, gebeurtenissen, interne nota's), migratie `010_tickets`. Dienst, routes, schema's en negen MCP-tools uit het sjabloon 1.3.0; de functionele wachtrij volgt de rollen van de persoon in zijn actieve entiteit, de IT-wachtrij de beheerder voor alle entiteiten. Instellingen in de parameters van de installatie, groep `tickets`. Knop « Melden » in de kop, scherm Tickets in het menu Help.

## Microsoft-aanmelding (0.10.0)

Tabel `auth_pending`, kolommen `users.oid` en `users.is_admin_local` (migratie `009_sso`); `oidc.js`, `settings.js`, `routes/sso.js` uit het sjabloon 1.3.0; instellingen via `services/connexion.js`.

## Technische dienst: dashboard, lijst en kwalificatie (0.9.0)

Migratie `008_qualification`: tien kolommen van `demandes` (voorgestelde prioriteit, reden van een wijziging, vervaldata voor tenlasteneming en einde, afgesproken datum, geschatte duur, instructies, zichtbaarheid van de foto's van de dienst, wie en wanneer gekwalificeerd), een index, tabel `vues_demandes`; enkel toevoegingen. De vervaldata van bestaande aanvragen worden bij de migratie berekend en bij elke start aangevuld voor een aanvraag zonder vervaldatum. Vervaldata berekend bij het indienen en herberekend bij elke kwalificatie, telkens vanaf de ontvangst; de geldende vervaldatum is die van de tenlasteneming zolang de aanvraag « Te kwalificeren » is, daarna die van het einde. `POST /api/demandes/:id/qualifier` (permissie `demandes:qualifier`, beheerder en verantwoordelijke): categorie, plaats en prioriteit verplicht, reden verplicht als de prioriteit verschilt van de voorgestelde (409 `MOTIF_PRIORITE_REQUIS`); « Te kwalificeren » wordt « Gekwalificeerd »; andere statussen 409 `DEMANDE_ETAT`. Instructies en reden worden nooit aan de aanvrager getoond. `GET /api/demandes/tableau-bord`, filters en sortering van `GET /api/demandes?perimetre=entite`, opgeslagen weergaven `/api/vues-demandes` (per persoon en entiteit, twintig maximum). Scherm `GestionDemandesPage.tsx`, componenten `TableauBord.tsx` en `QualificationForm.tsx`. De groep `pieces` verschijnt in de Instellingen van de entiteit.

## Foto's en bijlagen bij aanvragen (0.8.0)

Migratie `007_pieces_jointes`: tabel `pieces_jointes` (`demande_id` NULL zolang de bijlage in het ontwerp zit, door de server gegenereerde bestandsnaam, opgeschoonde getoonde naam, type, grootte, afmetingen; geen `is_active`, echte verwijdering). Ontvangst door `backend/src/fichiers.js` op `multer` 2.x (in het geheugen, één bestand in het veld `fichier`, grens en types per entiteit, type op de eerste bytes, pdf met actieve inhoud geweigerd); de foto van een plaats gebruikt dezelfde lezer. Nieuwe routes: `GET` en `POST /api/demandes/brouillon/pieces`, `GET /api/pieces/:id`, `GET /api/pieces/:id/fichier`, `DELETE /api/pieces/:id`. Nieuwe permissie `pieces:supprimer` (beheerder, verantwoordelijke). Parametergroep `pieces`. Interface: `PiecesDemande.tsx`, `VignettesPieces.tsx`.

## Volledig aanvraagformulier (0.7.0)

Migratie `006_demandes_formulaire`: tabellen `demande_suiveurs` (« Ik ook », opmerking enkel voor de technische dienst), `brouillons` (één ontwerp per persoon en entiteit, 30 dagen, buiten het auditlogboek, afwijking E-27), `questions_categorie` (vragen per domein of soort, « oui_non » of « choix » met 2 tot 6 antwoorden FR en NL, hoogstens tien actief) en `demande_reponses` (antwoorden met kopie van de teksten bij het indienen); kolommen `demandes.danger`, `beneficiaire_id`, `beneficiaire_texte`, `date_souhaitee`, `creneau`. Enkel toevoegingen. Nieuwe routes: `GET /api/demandes/voisines`, `POST /api/demandes/:id/suivre`, `GET /api/demandes/beneficiaires`, `GET`, `PUT`, `DELETE /api/demandes/brouillon`, `GET` en `POST /api/categories/:id/questions`, `GET`, `PUT`, `DELETE /api/questions-categorie/:id`. Gevaar zet de prioriteit op P1, zonder uur voor de aanvrager. Het profiel geeft `telephone_urgence` en `protection_donnees` (AVG-vermeldingen per entiteit, groep `rgpd` van de parameters, type `texte_long` met variabelen `{entite}` en `{dpo}`). Rood van de foutmeldingen (E-26): `frontend/src/couleurs.ts` en `buildTheme()`, minstens 4,5:1 in licht en donker, gecontroleerd door `couleurs.test.tsx`.

## Velden op de telefoon en e-mailadres (0.5.2)

`frontend/src/index.css`: tot 768 px breed gebruiken invoervelden, tekstvakken en de invoervelden van lijsten, datums en getallen van Ant Design 16 px (`!important`), zodat Safari op de iPhone niet meer inzoomt wanneer een veld wordt aangeraakt. De `viewport`-tag laat zoomen met twee vingers toe (geen `maximum-scale`, geen `user-scalable`, WCAG 1.4.4). `validation.ts`: regel `courriel(t)`, één melding « Adresse e-mail non valide » / « Ongeldig e-mailadres »; e-mailvelden (gebruikers en rollen, installatieassistent, aanmelden, contact van de entiteit) gebruiken `texteObligatoire(t)`, `courriel(t)` en `validateFirst`, zodat een leeg veld alleen « Dit veld is verplicht » toont. Na het verzenden van een aanvraag staan de twee knoppen in een `Space` met terugloop (12 px tussenruimte).

## Verplichte velden in de interface (0.5.1)

`frontend/src/validation.ts`: gemeenschappelijke regels `texteObligatoire(t)` (tekst, ook alleen spaties geweigerd) en `obligatoire(t)` (keuze, getal, datum, wachtwoord), één melding « Dit veld is verplicht ». Velden buiten een formulier (redenen van deactivering, beschrijving van een aanvraag) gebruiken `seulementEspaces()` en `ErreurObligatoire.tsx`. De server blijft zelf weigeren. `LieuPicker.tsx`: de lijst van de gebouwen gaat open en dicht (`aria-expanded`, knop « Lijst verbergen »).

## Interventieaanvragen (0.5.0)

Migratie `005_demandes`: tabellen `sequences` (tellers per entiteit, type en jaar; jaar 0 voor de doorlopende teller) en `demandes` (uniek nummer `AC-DI-2026-00001`, plaats, categorie, beschrijving van 10 tot 5 000 tekens, status `a_qualifier` bij aanmaak, voorgestelde prioriteit, kanaal, aanvrager), kolom `users.lieu_habituel_id`; een JavaScript-stap (`src/nettoyage-espaces.js`) verwijdert overtollige spaties uit reeds opgeslagen teksten en noteert elke verbeterde fiche in het auditlogboek. `nettoyer()` van `src/validation.js` verwijdert spaties vooraan en achteraan in elke ontvangen tekst (routes en MCP), behalve wachtwoorden. Nummering in `services/numerotation.js`, toegekend in de registratietransactie. Routes `GET`, `POST /api/demandes`, `GET /api/demandes/:id`, `PUT /api/auth/lieu-habituel`; rechten `demandes:creer` (alle entiteitsrollen) en `demandes:entite` (beheerder, verantwoordelijke). Zoeken naar een plaats zonder accenten, ook via de namen van de bovenliggende plaatsen; elke rij geeft haar pad.

## Foto van de plek, filter « Zonder foto », telefoons (0.13.0)

`photo_lieu` van `GET /api/demandes/:id` enkel voor de technische dienst (de plaats van de aanvraag, of de dichtstbijzijnde plaats erboven met een foto), `PhotoLieu.tsx`; filter `has_photo` van `GET /api/lieux` en `list_lieux`, vakje « Zonder foto (n) » in Patrimonium (`?photo=sans`); het auditlogboek noemt instellingen en soorten plaatsen bij het lezen; reden van een ticket niet meer in het logboek (`motif_donne`, E-46); kop op telefoon: taal in het menu van de persoon onder 768 px, gecontroleerd door `npm run mobile:check`.

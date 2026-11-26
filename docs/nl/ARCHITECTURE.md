# Architectuur

Versie van de toepassing: **0.21.5** · De Franse tekst is rechtsgeldig (`docs/fr/ARCHITECTURE.md`); dit bestand vat elke versie samen.

## Feedback van tests en aanpassingen (0.21.5)

Rode rand van een geweigerde invoer via `status="error"` (`useMarque`); voorgestelde plaats te bevestigen (`lieuConfirme`, `LieuPicker`: `confirme`); `voisines` geeft `proches`, `meme_categorie`, `proche`; `derniere_activite` in de lijst van aanvragen (zonder interne nota's, zonder migratie); compacte kop onder 1200 px (`AppLayout.tsx`); paneel van de rondleiding binnen het scherm; `mobile:check` op 768 en 1280 px; `ci.yml` met `permissions: contents: read`. Zie de Franse tekst.

## Geweigerde datum gemeld bij het verlaten van het veld (0.21.4)

`saisieDate.ts`: `installerSaisieDate()` luistert ook naar `focusin` en `focusout`; bij het verlaten van een datumveld waarvan Ant Design de getypte tekst teruggezet heeft, wordt het veld gemarkeerd, wordt het event `gmao-saisie-refusee` verzonden en blijft `saisiesNonRetenues()` blokkeren tot de tekst verbeterd is of een datum gekozen is. `ChampDate.tsx`: `useAvisSaisieRefusee()`, eenmaal opgeroepen in `AppLayout`, toont de melding.

## Correctie na de audit van het lastenboek (0.21.3)

Twee overgangen van de levenscyclus `rouverte` → `terminee` en `en_attente` → `terminee`, toegevoegd bij het opstarten (geen migratie); een taak van een aanvraag `a_qualifier` start en eindigt niet (`DEMANDE_A_QUALIFIER`). Gebeurtenis `demande.nouvelle` (`services/avis.js`, regel 9) naar de technische dienst wanneer een aanvraag binnenkomt. `ChampDate.tsx`: gecontroleerde `open`, Alt+Pijl omlaag opent altijd, pictogram als `prefix`; `useSaisieRetenue()` vóór het opslaan van elk formulier met een datum of uur.

## Datumvelden: kalender via het pictogram op een pc (0.21.2)

`components/ChampDate.tsx` (`ChampDate`, `ChampHeure`, `ChampPeriode`) vervangt het rechtstreekse gebruik van `DatePicker`, `TimePicker` en `RangePicker`: op een pc blijft de kalender verborgen tot hij gevraagd wordt via het pictogram of Alt+Pijl omlaag; op een aanraakscherm het oorspronkelijke gedrag. `installerSaisieDate()` luistert ook naar `pointerdown` en `mousedown`.

## Getypte datums en uren bewaard vóór het verzenden (0.21.1)

`saisieDate.ts`: `installerSaisieDate()` (één keer opgeroepen in `main.tsx`) luistert in de capture-fase naar `click` en `submit` op het document; heeft een datum- of uurveld (rc-picker) nog de focus en komt de gebeurtenis van elders, dan krijgt het veld Enter (rc-picker bewaart een geldige tekst meteen; enkel de focus verliezen bewaart hem pas twee beelden later, te laat) en verliest het de focus. `texteNonRetenu()` vergelijkt de tekst die bij de klik getoond werd met de bewaarde waarde; « De taak beëindigen » verzendt niet als ze verschillen.

## Werkelijke uren, afwezigheden, planning, conflicten en aangekondigde datum (0.21.0)

Migratie `018_planning`: `demande_taches.debut_reel` en `fin_reelle` (UTC), tabel `indisponibilites` (arbeider, van, tot, hele dag / voormiddag / namiddag, reden verlof / opleiding / andere), drie kolommen van `demandes` voor de datum die de aanvrager leest en de vorige waarde. Diensten: `taches.js` regels 13 (werkelijke uren) en 14 (`suivreDate()`, bericht `demande.date_prevue`), `indisponibilites.js` (regels 1 tot 6), `planning.js` (regels 1 tot 9: periode van 1 tot 14 dagen, capaciteit, conflicten `absent` / `jour_non_travaille` / `trop_charge`, niet-geplande taken). Routes `/api/indisponibilites` en `GET /api/planning`; zes MCP-tools (180); toelating `indisponibilites:gerer`. De reden van een afwezigheid komt nooit in het logboek en wordt enkel aan de beheerder en de verantwoordelijke getoond. Interface: `PlanningPage.tsx` (slepen, venster « Verplaatsen » en « Plannen »), `IndisponibilitesOuvrier.tsx`, venster « De taak beëindigen » in `TachesDemande.tsx`, `saisieDate.ts`. Correcties van de test van 0.20.0 (DV-164). Telefooncontrole: 66 schermen.

## Taken, toewijzing, voorstel en filters per ploeg (0.20.0)

Migratie `017_taches`: `demande_taches` (rang in de aanvraag, titel, instructies, vakgebied, geschatte duur, status `a_faire` / `en_cours` / `terminee` / `annulee`, reden van annulering, `annulation_auto`, `equipe_id`, `date_prevue`, `heure_debut`), `tache_ouvriers`; tabel `demande_transitions` identiek heropgebouwd voor `via = 'affecter'` (tweeënveertig overgangen in die versie, negen nieuwe vanuit « Gepland », DV-161). Dienst `services/taches.js` (regels 1 tot 12), `cycle.passageAuto()` en `executer()`, `echeances.jourOuvre()`, filters `equipe_id` en `ouvrier_id` van de lijst (niet-geannuleerde taken, beperkt tot de actieve entiteit). Zeven routes onder `/api/demandes/:id/taches` en `/api/taches`, zeven MCP-tools (174). Interface: `TachesDemande.tsx`, lijsten « Ploeg » en « Arbeider » in `GestionDemandesPage.tsx`, « Interventie gepland op » voor de aanvrager; kalenderpaneel gecentreerd onder 480 px. Correcties van de test van 0.19.0 (DV-159). Telefooncontrole: 61 schermen.

## Ploegen, arbeiders, aannemers en vakgebieden (0.19.0)

Migratie `016_equipes_prestataires`: `equipes`, `equipe_membres`, `equipe_horaires` (één tijdvak per dag, 1 = maandag … 7 = zondag; geen tijdvak = uurrooster van de entiteit), `ouvrier_profils`, `ouvrier_competences`, `prestataires` (ondernemingsnummer 0123.456.789, uniek in de entiteit), `prestataire_corps`; kolommen `categories.corps_metier_id` en `demandes.corps_metier_id`; JavaScript-stap die de geleverde categorieën zonder vakgebied aanvult. Waardelijsten `corps_metier` en `competence`. Nieuwe permissies `equipes:lire`, `equipes:gerer`, `equipes:diriger`, `interventions:realiser`, `prestataires:lire`, `prestataires:gerer`. Diensten `equipes.js` en `prestataires.js` (controlegetal modulo 97); routes `/api/equipes`, `/api/ouvriers`, `/api/prestataires`; dertien MCP-tools. `categories.js` en `qualification.js`: vakgebied van de categorie (van het domein voor een aard), voorgesteld bij de kwalificatie, intern voor de dienst. Logboek: lijsten van id’s per element benoemd, uurrooster per dag. Interface: `EquipesPage.tsx`, `PrestatairesOnglet.tsx`, veld « Vakgebied » in `CategoriesTab.tsx` en `QualificationForm.tsx`. Correcties van de test van 0.18.0 (`exports.js`, `VisiteGuidee.tsx`). Controle van de telefoons: 57 schermen.

## Zoeken, exports, assistent en rondleiding (0.18.0)

Geen migratie. Server: `services/exports.js` (Excel via `exceljs`, CSV met BOM en « ; », `celluleCsv()`, maximum 5 000 regels, `export.liste` in het logboek) en drie routes die `demandes.list`, `demandes.aValider` en `tickets.list` aanroepen (zelfde rechten en scheiding), buiten MCP (E-17). Interface: `RechercheGlobale.tsx`, `BoutonExport.tsx` en `api.telecharger()`, `Chatbot.tsx` (`ACCES_ECRANS`, opvolging via de API, fiches van de hulp), `VisiteGuidee.tsx` (`Tour` van Ant Design, zonder masker). `mobile:check`: `charge()` en `ouvrir()`, schermen `#recherche`, `#chatbot`, `#visite`, trajecten 6 tot 8.

## Meldingen, e-mail en waarschuwingen (0.17.0)

Migratie `015_notifications` (meldingen, e-mails met wachtrij en logboek, e-mailmodellen, vervaldagwaarschuwingen). Catalogi `config/notifications.json` (NOT-01) en `config/modeles-courriel.json`. Diensten: `notifications.js` (bel, alleen de eigen meldingen), `courriel.js` (instellingen, wachtrij, test, `nodemailer` zonder toegang tot bestanden of URL's), `modeles-courriel.js` (samenstelling in de taal van de ontvanger), `avis.js` (wie wat ontvangt: indiening, statuswijziging via `cycle.ecrire`, berichten, tickets, vervaldagen elke 15 minuten). Interface: `NotificationsCloche.tsx`, `CourrielPanel.tsx`, `ModelesCourriel.tsx`.

## Goedkeurder, bijlagen en gevaar (0.16.1)

Eén regel « de persoon keurt vandaag de aanvragen van de dienst van deze aanvraag goed »: `valideurDe` van `services/services.js`, gebruikt bij het lezen, de overgangen en de bijlagen (R5: de goedkeurder opent de bijlagen). Een aanvraag met gevaar in een categorie met goedkeuring komt « Te kwalificeren » binnen in P1 (`validation: danger` in het logboek). Controle van de telefoons op Chromium en WebKit, met volledige parcours enkel op een lokale kopie.

## Berichten, vermeldingen, antwoordmodellen en volgen (0.15.0)

Migratie `013_messages`: tabellen `demande_messages` (auteur aanvrager, begunstigde of dienst; interne nota; tekst tot 4 000 tekens; taal; kanaal), `demande_messages_lus` (laatst gelezen bericht per persoon en aanvraag), `demande_mentions`, `modeles_reponse`; kolommen `pieces_jointes.message_id` en `attente_message`, `demande_suiveurs.source`. Diensten `services/messages.js` (gelezen door aanvrager, begunstigde en dienst, interne nota's enkel voor de dienst, schrijven enkel bij open aanvragen, ongelezen, vermeldingen), `services/modeles-reponse.js` (variabelen `{numero}`, `{lieu}`, `{etat}`, `{prenom}`, vier geleverde modellen). Routes `/api/demandes/:id/messages` (en `/lu`, `/pieces`, `/mentionnables`), `DELETE /api/demandes/:id/suivre`, `/api/modeles-reponse`; elf MCP-tools; bijlagen van berichten buiten MCP (E-17, zes routes). Interface: `FilMessages.tsx`, `SuiviDemande.tsx`, `ModelesTab.tsx`, tellers « Te lezen berichten » en « Nota's waarin u vermeld wordt ».

## Levenscyclus van de aanvragen (0.14.0)

Catalogus `backend/config/cycle-de-vie.json` (15 statussen, 44 overgangen; zeven toegevoegd in 0.16.0 voor de goedkeuring en de samenvoeging, negen in 0.20.0 voor « Gepland », DV-161, twee in 0.21.3 naar « Werken beëindigd » vanuit « Heropend » en « In wacht », DV-181), bij het opstarten gekopieerd naar `demande_transitions` en, per entiteit, naar `demande_etats` (benamingen voor de aanvrager en het KRM). Migratie `012_cycle_de_vie`: tabellen `demande_transitions`, `demande_etats`, `demande_historique`, `demande_complements`, `demande_avis`, zeven kolommen van `demandes`. Dienst `services/cycle.js`: volgorde van de controles (entiteit, aanvraag 404 of 403, toelating 403, module, overgang 409), nieuwe permissie `demandes:traiter`, opschorting van de termijn tijdens een wachttijd om een aangevinkte reden. Negen routes (`/api/demandes/:id/historique`, `/transitions`, `PUT` en `DELETE /api/demandes/:id`, `/pieces`, `/avis`, `/api/etats-demande`), acht MCP-tools. Interface: `ChangerEtat.tsx`, `HistoriqueDemande.tsx`, `ActionsDemandeur.tsx`, `EtatsTab.tsx`.

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

# MCP-server

Versie van de toepassing: **0.21.1** · Bijgewerkt op 24/11/2026 · De Franse tekst is rechtsgeldig (`docs/fr/MCP.md`).

## 0.21.1

Geen nieuwe tool, geen wijziging van de tools (correctie enkel op het scherm).

## 0.21.0

Zes nieuwe tools: `list_indisponibilites`, `get_indisponibilite`, `create_indisponibilite`, `update_indisponibilite` (afwezigheden van een arbeider; de reden wordt enkel aan de beheerder en de verantwoordelijke gegeven), `delete_indisponibilite` (twee oproepen), `get_planning` (enkel lezen: 1 tot 14 dagen, arbeiders, ploegen, belasting, capaciteit, conflicten, geplande en niet-geplande taken). `change_etat_tache` aanvaardt `debut` en `fin` en geeft `debut_reel`, `fin_reelle`; `affecter_tache` geeft `conflits` (nooit blokkerend); `suggerer_affectation_tache` geeft `indisponible`; `get_demande` bevat `intervention_prevue_avant` en `intervention_modifiee_le`. 180 tools. Geen nieuwe route buiten MCP.

## 0.20.0

Zeven nieuwe tools: `list_taches_demande`, `create_tache`, `get_tache`, `update_tache`, `change_etat_tache` (twee oproepen), `affecter_tache`, `suggerer_affectation_tache` (enkel lezen). `list_demandes` krijgt `equipe_id` en `ouvrier_id`; `get_demande` draagt `taches`, `taches_modifiables` en `intervention_prevue_le`; `change_etat_demande` weigert « Werken beëindigd » met een open taak. 174 tools.

## 0.19.0

Dertien nieuwe tools: `list_equipes`, `get_equipe`, `create_equipe`, `update_equipe`, `deactivate_equipe` (twee oproepen); `list_ouvriers`, `get_ouvrier`, `update_ouvrier`; `list_prestataires`, `get_prestataire`, `create_prestataire`, `update_prestataire`, `deactivate_prestataire` (twee oproepen). `qualifier_demande` ontvangt `corps_metier_id`; de categorieën dragen `corps_metier_id` en `corps_metier_effectif_id`.

## 0.18.0

Geen nieuwe tool. De drie exports naar Excel en CSV leveren een bestand en blijven buiten MCP (afwijking E-17, negen routes in de gesloten lijst); dezelfde regels lezen via `list_demandes`, `list_demandes_a_valider` en `list_tickets`. Zoeken, assistent en rondleiding zijn functies van het scherm.

## 0.17.0

Zestien nieuwe tools: meldingen van de aangemelde persoon (`list_notifications`, `get_compteur_notifications`, `get_notification`, `list_evenements_notification`, `marquer_notification_lue`, `marquer_notifications_lues`), e-mail voor de beheerder (`get_mail_settings`, `update_mail_settings` in twee oproepen, `send_test_mail`, `list_courriels`, `get_courriel`) en e-mailmodellen (`list_modeles_courriel`, `get_modele_courriel`, `update_modele_courriel`, `retablir_modele_courriel` in twee oproepen, `apercu_modele_courriel`).

## 0.16.1

Geen nieuwe tool. `get_piece` opent ook voor het diensthoofd de bijlagen van de aanvragen die het moet goedkeuren. `create_demande`: een aanvraag met `danger` in een categorie met goedkeuring komt « Te kwalificeren » binnen in P1.

## Toegang en regels

- Adres in acceptatie: `https://192.0.2.10:18443/api/mcp`; algemeen `https://<adres>:<HTTPS-poort>/api/mcp`.
- Protocol: JSON-RPC 2.0, zonder toestand, in het proces van de API.
- Authenticatie: de sessie, of het sessietoken in `Authorization: Bearer`. OAuth 2.1 met PKCE komt in stap 44 (afwijking E-10).
- Limiet: 60 oproepen per minuut en per persoon.
- Elke tool roept dezelfde dienstfunctie op als de REST-route, met de identiteit en de rechten van de persoon, in haar actieve entiteit. Een deactivering, intrekking of wissing gebeurt in twee oproepen (`prepare_*`, dan `confirm_*`). Geen tool voor vrije SQL.

## 0.16.0

Nieuwe tools: `list_demandes_a_valider` (aanvragen « Ter goedkeuring » van de diensten waarvan de persoon hoofd of vervanger tijdens zijn periode is; goedkeuren of weigeren met `change_etat_demande`), `list_services`, `get_service`, `create_service`, `update_service` en `deactivate_service` in twee oproepen (beheerder; hoofd en vervanger met de rol « Goedkeurder »), `fusionner_demande` (`principale_id`, `commentaire`) en `decouper_demande` (`parties`, één tot vijf, `commentaire`), elk in twee oproepen (`demandes:traiter`). Verrijkt: `create_demande` neemt `demandeur_id` en `canal` samen (aanvraag ontvangen door de technische dienst); `get_demande` geeft `service`, `valideur`, `encodee_par`, `fusionnee_dans`, `regroupees`, `issue_de`, `issues`, `decoupable`; `update_user` en `list_users` nemen `service_id`.

## 0.15.0

Nieuwe tools: `list_messages_demande` (berichten van een aanvraag; de aanvrager en de begunstigde krijgen geen interne nota's en geen namen van agenten van de dienst; wie alleen volgt, leest de berichten niet), `add_message_demande` (`texte`, `interne`, `mentions` van collega's van de dienst in een interne nota, enkel bij open aanvragen), `mark_messages_lus`, `list_mentionnables_demande`, `list_pieces_message`, `list_modeles_reponse`, `get_modele_reponse`, `create_modele_reponse`, `update_modele_reponse`, `deactivate_modele_reponse` in twee oproepen (enkel variabelen `{numero}`, `{lieu}`, `{etat}`, `{prenom}`), `ne_plus_suivre_demande` in twee oproepen. `suivre_demande` neemt `source` `abonnement`; `get_demande`, `list_demandes` (`messages`, `mentions`) en `get_tableau_bord` (`messages_a_lire`, `mentions`) zijn uitgebreid. Het opladen van een bijlage bij een bericht blijft buiten MCP (E-17).

## 0.14.0

Nieuwe tools: `get_historique_demande` (historiek van een aanvraag; de aanvrager ziet de interne notities niet), `change_etat_demande` in twee oproepen (`prepare_change_etat_demande`, `confirm_change_etat_demande`: eindstatus `etat`, `motif_id`, `commentaire`, `compte_rendu` volgens de overgang; ook heropenen door de aanvrager met `etat` `rouverte`), `list_etats_demande`, `list_transitions_demande`, `update_etat_demande` (benamingen per entiteit, verantwoordelijke), `complete_demande` (aanvulling door de aanvrager of de begunstigde), `cancel_demande` in twee oproepen (annuleren met een reden, zolang de werken niet begonnen zijn) en `give_avis_demande` (score 1 tot 5, één per afsluiting). `get_demande` geeft `transitions` (dienst), `complements`, `completable`, `annulable`, `reouvrable`, `reouvrable_jusqu_au`, `avis_possible`, `avis`. `get_tableau_bord` geeft `attente_longue` en `a_cloturer`; `list_demandes` krijgt `attente` = `longue`. Een foto toevoegen aan een verstuurde aanvraag blijft buiten de MCP (`POST /api/demandes/:id/pieces`, E-17, vijf routes).

## 0.13.0

Geen nieuw hulpmiddel. `list_lieux` krijgt `has_photo` (0: plaatsen zonder foto, 1: met foto, enkel de actieve entiteit). `get_demande` geeft enkel aan de technische dienst `photo_lieu`: de plaats waarvan de foto de plek toont (de plaats van de aanvraag, `du_lieu` 1, of de dichtstbijzijnde plaats erboven, `du_lieu` 0), `null` als geen plaats van het pad een foto heeft. Auditlogboek: `noms.cle` noemt een instelling; een statuswijziging van een ticket noteert `motif_donne` (0 of 1) in plaats van de tekst van de reden.

## 0.12.0

Nieuwe tools: `list_faq` (gemeenschappelijke vragen en die van de actieve entiteit; filters `topic_id`, `q`, `inclure_inactives`), `get_faq`, `create_faq` (`portee` « commune » of « entite »), `update_faq` (heractiveren met `is_active` = 1), `deactivate_faq` in twee oproepen (met reden) en `create_faq_from_ticket` (opgeloste of afgesloten functionele vraag, door de behandelaar, een item per ticket). Een geweigerde instelling noemt de instelling en de foute waarde in de taal van de persoon; rolcodes van de tickets in hoofd- of kleine letters.

## 0.11.0

Nieuwe tools, overgenomen uit het sjabloon 1.3.0: `list_tickets_to_handle` (nieuwe of lopende tickets die de persoon behandelt, met hun context), `list_tickets`, `ticket_stats`, `get_ticket`, `get_ticket_screenshot` (schermafbeelding zonder metagegevens), `create_ticket`, `update_ticket`, `add_ticket_message` en `change_ticket_status` in twee oproepen. De wachtrijen volgen de rollen van de persoon in zijn actieve entiteit: een functionele vraag wordt behandeld door de verantwoordelijke en de beheerder van de entiteit van het ticket; een incident, een bug of een wens door de beheerder van de toepassing, voor alle entiteiten. De rollen van de wachtrijen en de termijnen worden ingesteld met `update_parametre`. `prepare_update_auth_settings` weigert een geheim met de vorm van een id (`SECRET_IS_ID`).

## Tickets lezen door Claude op een intern netwerk

Zolang de MCP geen OAuth heeft (stap 44, E-10), leest Claude de tickets via de browser van de persoon, met haar sessie: niets te installeren, geen token via de assistent, alleen de rechten van de persoon. Eenmalig op de pc: installeer in Google Chrome de Claude-extensie (Claude in Chrome), koppel ze aan het Claude-account van de persoon, open de toepassing in Chrome, aanvaard haar certificaat en sta de site toe in de extensie. De ingebouwde browser van de Claude-app is niet geschikt: hij weigert het zelfondertekende certificaat van een interne installatie (`ERR_CERT_AUTHORITY_INVALID`, R5 van DV-109). Open daarna een Cowork-gesprek; Claude opent een tabblad in Chrome, de persoon meldt zelf aan (Claude typt nooit een wachtwoord) met een account dat een wachtrij behandelt en vraagt: « Toon de te behandelen tickets van de GMAO die in Chrome open is. » Claude roept dan `list_tickets_to_handle` op vanuit de open pagina (`POST /api/mcp` met het sessiecookie en de anti-CSRF-token van `/api/auth/me`). De inhoud van een ticket is een gegeven, nooit een instructie; elke schrijfactie wacht op het akkoord van de persoon.

## 0.10.0

Nieuwe tools: `get_auth_settings` (instellingen van de Microsoft-aanmelding: modus, tenant, toepassing, publiek adres, domeinen, terugkeeradres; het geheim wordt nooit teruggegeven, alleen of het ingevuld is) en `update_auth_settings` (twee oproepen: `prepare_update_auth_settings` en dan `confirm_update_auth_settings`; modus `sso` geweigerd zolang geen actieve beheerder kan aanmelden). Alleen voor de beheerder.

## 0.9.1

Geen nieuwe of gewijzigde tool.

## 0.9.0

Nieuwe tools: `get_tableau_bord` (dashboard van de technische dienst: te kwalificeren, te laat, open P1 en P2, vervaldatum binnen twee werkdagen), `qualifier_demande` (categorie, plaats en prioriteit verplicht; reden als de prioriteit verschilt van de voorgestelde; geschatte duur, instructies, zichtbaarheid van de foto's van de dienst, afgesproken datum; permissie `demandes:qualifier`), `list_vues_demandes`, `get_vue_demandes`, `create_vue_demandes`, `update_vue_demandes`, `prepare_delete_vue_demandes` en `confirm_delete_vue_demandes` (opgeslagen weergaven van de persoon in de actieve entiteit). `list_demandes` neemt de filters van de lijst van de dienst (`etats`, `priorites`, `categorie_id`, `batiment_id`, `echeance`, `canal`, `danger`, `tri`, `ordre`); elke aanvraag voor de dienst draagt `echeance_courante`, `echeance_type` en `retard`. Instructies en reden worden nooit aan de aanvrager gegeven.

## 0.8.0

Nieuwe tools: `list_pieces_brouillon` (bijlagen van het ontwerp van de persoon en grenzen van de entiteit), `get_piece` (fiche van een bijlage), `prepare_delete_piece` en `confirm_delete_piece` (definitieve verwijdering, bestand van de schijf gewist). `get_demande` geeft `pieces` (met `peut_retirer`), of `null` voor wie de aanvraag enkel volgt. `create_demande` koppelt de bijlagen van het ontwerp aan de aanvraag. Het opladen en downloaden van een bestand blijft buiten de MCP (afwijking E-17, vier routes).

## 0.7.1

Geen nieuwe tool. `save_brouillon` aanvaardt de soort van de plaats (`contenu.lieu.nature`), zoals `get_profile` die in `lieu_propose` geeft: een ontwerp met de voorgestelde plaats werd geweigerd. Elk ander onbekend veld blijft geweigerd.

## 0.7.0

Nieuwe tools: `list_demandes_voisines`, `suivre_demande`, `list_beneficiaires`, `get_brouillon`, `save_brouillon`, `delete_brouillon` (twee oproepen), `list_questions_categorie`, `get_question_categorie`, `create_question_categorie`, `update_question_categorie`, `deactivate_question_categorie` (twee oproepen). `create_demande` ontvangt `danger`, `beneficiaire_id` of `beneficiaire_texte`, `date_souhaitee`, `creneau` en `reponses`; eerst `list_demandes_voisines` voorstellen en de persoon informeren met `protection_donnees.mention_courte`. `get_profile` geeft `telephone_urgence` en `protection_donnees`; `get_categories_arbre` de `questions` van elke categorie.

## 0.5.2

Geen nieuwe of gewijzigde tools. De ene melding van een e-mailveld is een controle van de interface; de server controleert adressen nog steeds zelf.

## 0.5.1

Geen nieuwe of gewijzigde tools. Een verplicht veld met alleen spaties blijft door de server geweigerd.

## Nieuw in 0.5.0

`list_demandes`, `get_demande`, `create_demande` (een aanvraag indienen op naam van de aangemelde persoon; geeft het nummer terug, bijvoorbeeld AC-DI-2026-00001); `set_lieu_habituel` (gewone werkplek). `get_profile` geeft `lieu_propose`. `list_lieux` zoekt zonder accenten, ook via de namen van de bovenliggende plaatsen. Overtollige spaties rond elke tekst worden verwijderd, behalve in wachtwoorden.

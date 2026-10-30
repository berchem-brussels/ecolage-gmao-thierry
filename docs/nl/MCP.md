

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

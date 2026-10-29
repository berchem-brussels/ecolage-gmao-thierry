# Beveiliging

De Franse tekst (`docs/fr/SECURITE.md`) is rechtsgeldig en bevat het volledige rooster per versie.

## 0.7.2 (29/10/2026)

Versie zonder functionele wijziging: code klaar voor de openbare GitHub-repository (licentie EUPL-1.2). Geen nieuwe route, afhankelijkheid of migratie. Adres, poorten en mappen van de acceptatiehost in alle bestanden vervangen door voorbeeldwaarden (`192.0.2.10`, 18443, 18080, `/volume1/docker/monapp`); portabiliteitstest uitgebreid tot elk privé-IPv4-adres in de code; `.gitignore` aangevuld; `.github/workflows/ci.yml` toegevoegd (geen geheim, geen uitrol). `npm audit --omit=dev` van de server: 1 hoog, 2 matig, ongewijzigd (E-24); de audit-stap van de CI faalt zolang E-24 niet beslist is (E-30). Bewijs van falen: een privé-IP-adres in `backend/src/config.js` doet de portabiliteitstest falen.

## 0.7.1 (28/10/2026)

Correctieversie zonder nieuwe route, afhankelijkheid of migratie. Het schema van het ontwerp aanvaardt de soort van de plaats (`nature`), zoals het profiel ze geeft; elk ander onbekend veld blijft geweigerd (getest). De interface stuurt enkel de bekende velden van de plaats. Geleverde volledige vermelding herschreven (« Verwerkingsverantwoordelijke: … »), zelfde inhoud. Bewijs van falen: schema of interface in hun staat van 0.7.0 doen de nieuwe tests falen; hersteld: server 289/289, interface 127/127. `npm audit` ongewijzigd (E-24 open).

## 0.7.0 (28/10/2026)

Stap 7 met migratie `006_demandes_formulaire` (enkel toevoegingen) en elf nieuwe routes, elk met hun MCP-tool; geen nieuwe afhankelijkheid. Scheiding AC en CPAS getest op elke nieuwe route met identificator (lezen en schrijven geweigerd vanuit de andere entiteit, via API en MCP); ontwerp enkel leesbaar voor de persoon zelf; vragen enkel schrijfbaar met `categories:gerer`, vermeldingen met `parametres:gerer`. Minimalisatie: geen naam of nummer in de lijst van open aanvragen van hetzelfde gebouw, opmerking van « Ik ook » enkel voor de technische dienst, logboek zonder vrije tekst; ontwerpen buiten het logboek (E-27). Rood van de foutmeldingen minstens 4,5:1 (E-26 opgelost). `npm audit --omit=dev` server: 1 hoog, 2 matig (`body-parser`, `fast-uri` en, sinds 0.5.2 gepubliceerd, `qs`); E-24 open vóór de productie. Bewijs van falen: elke nieuwe controle afzonderlijk weggenomen doet tests falen; hersteld: server 287/287, interface 127/127.

## 0.5.2 (27/10/2026)

Correctieversie zonder nieuwe route, afhankelijkheid of migratie. Invoervelden gebruiken 16 px op kleine schermen zodat de iPhone niet meer inzoomt op een veld; zoomen met twee vingers blijft toegelaten (WCAG 1.4.4). Een e-mailveld toont één melding (verplicht, of « Ongeldig e-mailadres »); het aanmeldscherm controleert het formaat vóór het verzenden; de server controleert nog steeds zelf. Bewijs van falen: met de zeven interfacebestanden van 0.5.1 falen 5 van de 95 interfacetests. `npm audit` ongewijzigd (E-24 open, beslissing van Renaud). E-26 ongewijzigd.

## 0.5.1 (26/10/2026)

Correctieversie zonder nieuwe route, afhankelijkheid of migratie. Verplichte velden worden in de interface vóór het verzenden gemeld (ook alleen spaties); de server weigert nog steeds. Bewijs van falen: met de zeven schermbestanden van 0.5.0 falen 9 van de 89 interfacetests. `npm audit` ongewijzigd (E-24 open, beslissing van Renaud). Contrast van de foutkleur van Ant Design 3,3:1 (E-26).

## 0.5.0 (26/10/2026)

Nieuwe routes voor de aanvragen en de gewone werkplek, migratie `005_demandes`, geen nieuwe afhankelijkheid. Getest: schotten tussen entiteiten (aanvraag, plaats, categorie van de andere entiteit: 403, ook via MCP, zonder een nummer te verbruiken), een aanvrager leest enkel zijn aanvragen, de lijst van de entiteit enkel voor beheerder en verantwoordelijke, spaties verwijderd behalve in wachtwoorden, nummer toegekend in de transactie zonder gaten of dubbels. Bewijs van falen voor elke nieuwe controle. `npm audit --omit=dev`: server 1 hoge en 1 matige kwetsbaarheid (`body-parser`, `fast-uri`), gepubliceerd na 0.4.1, afwijking E-24, beslissing van Renaud; interface 3 matige (E-09). Details in `docs/fr/SECURITE.md`.

## 0.4.1 (23/10/2026)

Correctieversie, zonder nieuwe route, afhankelijkheid of migratie. Nieuw: de naam van wie een fiche wijzigde, wordt alleen gegeven aan personen met een rol in de entiteit van de fiche (anders enkel de datum; getest, bewijs van falen: 1 van 6 tests in `trace` faalt zonder de controle); de interne nummers van de auteurs worden niet meer teruggegeven; het auditlogboek noteert enkel de gewijzigde velden (6 tests, alle zes falen op de code van 0.4.0); geen tabelnaam in een SQL-query geïnterpoleerd. `npm audit --omit=dev`: server 0, interface 3 matige (E-09). Details in `docs/fr/SECURITE.md`.

## 0.4.0 (22/10/2026)

Rooster opnieuw uitgevoerd. Nieuw: categorieën enkel geschreven met `categories:gerer`, prioriteiten, uurrooster, verlofdagen en sluitingen enkel met `delais:gerer` (verantwoordelijke van de technische dienst van de actieve entiteit), via de API en MCP; categorieën en niet-werkdagen gescheiden per entiteit (403, getest); waarden gecontroleerd tegen gesloten catalogi; berekening van de vervaldag begrensd (`CALENDRIER_VIDE` in plaats van een lus); geen persoonsgegevens en geen afhankelijkheid toegevoegd; `npm audit --omit=dev` server 0, interface 3 matige (E-09). Bewijs van falen: zonder de rechtencontroles falen telkens 3 tests in `categories`, `priorites` en `calendrier`; zonder de entiteitscontroles 8 van de 30 in `cloison`. Details in `docs/fr/SECURITE.md`.

## 0.3.1 (22/10/2026)

Inhoudsversie (help, assistent, versienota). Geen nieuwe route, afhankelijkheid of migratie. Rooster opnieuw doorlopen via de volledige testsuites: conform. `npm audit --omit=dev`: server 0, interface 3 matige (E-09).

## 0.3.0 (22/10/2026)

Rooster opnieuw doorlopen. Nieuw: parameters en modules alleen door de beheerder; auditlogboek alleen leesbaar door de beheerder; instellingen van de entiteit alleen door de verantwoordelijke van de actieve entiteit (scheiding getest); uitgeschakelde module geweigerd (403 `MODULE_DISABLED`) na de rolcontrole, voor de API en de MCP; waarden gecontroleerd volgens de catalogus; geen nieuwe afhankelijkheid; `npm audit --omit=dev` server 0, interface 3 matige (E-09). Bewijs van falen: zonder de modulecontrole 3 van 8 tests rood, zonder de controle `parametres:gerer` 3 van 6, zonder de beheerdersreserve van het logboek 1 van 7. Details in `docs/fr/SECURITE.md`.

## 0.2.0 (21/10/2026)

Het rooster werd opnieuw uitgevoerd. Nieuwe controles: scheiding van plaatsen, foto's en waardelijsten tussen entiteiten, lezen en schrijven, via de API en MCP (403); opgeladen bestanden gecontroleerd op de eerste bytes, de structuur en de afmetingen, metagegevens verwijderd (EXIF, GPS-positie, toestel, commentaar, tekstblokken van PNG), echte verwijdering van vervangen of gewiste foto's, opslag buiten de webroot, geauthenticeerd lezen, CSRF bij het opladen, groottegrens (413 door de API en door nginx). `npm audit --omit=dev`: server 0; interface 3 matige (ongewijzigd, E-09). Volledige audit van de interface: 12 hoge, 7 matige en 1 lage, allemaal in de bouw- en testhulpmiddelen (E-18). Geen nieuwe afhankelijkheid; `multer` niet gebruikt (E-16). Bewijs van falen: zonder de entiteitscontrole op de plaatsen falen 11 van de 21 tests van `cloison.test.js`; zonder die op de waardelijsten falen er 4; zonder het verwijderen van de metagegevens of de typecontrole faalt telkens één test van `lieux.test.js`.

## 0.1.0 (15/10/2026)

Alle controles van sectie 10.2 van de standaard zijn uitgevoerd of als niet van toepassing gemarkeerd (wachtwoordherstel en bestandsupload bestaan nog niet). De drie controles die nooit « niet uitgevoerd » mogen blijven (gecommitte geheimen, toegangscontrole aan de serverkant, IDOR) zijn uitgevoerd. `npm audit --omit=dev`: server 0 kwetsbaarheden; interface 3 matige (`react-router-dom` 6, open omleiding, enkel opgelost in versie 7, generatiewissel verboden zonder akkoord van Renaud), geen hoge of kritieke. Bewijs van falen van de scheidingstests: zonder de controle falen 3 van de 6 tests in `cloison.test.js`.

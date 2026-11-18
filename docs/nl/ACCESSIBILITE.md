# Toegankelijkheid

Versie 0.18.0 (controles van 0.1.0 en 0.18.0) · De Franse tekst is rechtsgeldig.

`axe-core` op elk scherm in FR en NL: 0 overtredingen (contrastregel uitgeschakeld in jsdom). `eslint-plugin-jsx-a11y`: 0 fouten. Visuele controle op de gebouwde interface met de CSP van `nginx.conf` op 360, 768 en 1280 px, licht en donker thema: geen horizontale overloop op 360 px, geen CSP-overtreding. Beperkingen: het contrast wordt niet automatisch gemeten; onder 992 px verdwijnt de naam van de persoon uit de kop; op telefoon staat de schakelaar Eenvoudig of Volledig in het menu van de persoon. Sinds 0.7.0 (E-26) controleert `couleurs.test.tsx` het rood van de foutmeldingen: minstens 4,5:1 op elke achtergrond, in licht (`#cf1322`) en donker (`#dc7878` onder de velden).

## 0.18.0

`axe-core` op het zoekvenster met resultaten, de geopende assistent met een antwoord en de rondleiding: 0 overtredingen. Zoeken met benoemde knop, titel, veld en resultaatgroepen, aankondigingen via `aria-live`, Enter opent het eerste resultaat; rondleiding binnen de schermbreedte, zonder masker. `mobile:check`: 49 schermen, zes toestellen, FR en NL, geen fout.

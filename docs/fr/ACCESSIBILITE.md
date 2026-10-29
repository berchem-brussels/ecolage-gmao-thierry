# Accessibilité

Version 0.1.0 · Le français fait foi.

| Contrôle | Résultat 0.1.0 |
| --- | --- |
| `axe-core` sur chaque écran (accueil, entités, utilisateurs, aide, accessibilité, connexion et installation) en FR et en NL, plus l'en-tête | 0 violation ; règle de contraste désactivée en jsdom |
| `eslint-plugin-jsx-a11y` | 0 erreur |
| Contrôle visuel sur l'interface construite avec la CSP de `nginx.conf` | 360, 768 et 1280 px, thèmes clair et sombre, FR et NL ; aucun débordement horizontal à 360 px ; aucune violation de CSP dans la console |

Limites connues : le contraste n'est pas mesuré automatiquement par axe-core en jsdom ; il se vérifie à l'écran. Depuis la 0.7.0 (écart E-26), le rouge des messages d'erreur est contrôlé par `couleurs.test.tsx` : 4,5:1 au moins sur chaque fond, en clair (`#cf1322`) et en sombre (`#dc7878` sous les champs). Sous 992 px, le nom de la personne disparaît de l'en-tête et seule son initiale reste ; sur téléphone, la bascule Simple ou Complet passe dans le menu de la personne.

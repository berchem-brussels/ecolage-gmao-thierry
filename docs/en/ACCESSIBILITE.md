# Accessibility

Version 0.1.0 · The French text prevails.

`axe-core` on every screen in FR and NL: 0 violations (contrast rule disabled in jsdom). `eslint-plugin-jsx-a11y`: 0 errors. Visual check on the built interface with the `nginx.conf` CSP at 360, 768 and 1280 px, light and dark themes: no horizontal overflow at 360 px, no CSP violation. Limits: contrast is not measured automatically; below 992 px the person's name leaves the header; on phones the Simple or Complete switch moves to the person's menu. Since 0.7.0 (E-26), `couleurs.test.tsx` checks the error red: at least 4.5:1 on every background, light (`#cf1322`) and dark (`#dc7878` under fields).

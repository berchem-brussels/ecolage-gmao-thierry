# Accessibility

Version 0.18.0 (checks of 0.1.0 and 0.18.0) · The French text prevails.

`axe-core` on every screen in FR and NL: 0 violations (contrast rule disabled in jsdom). `eslint-plugin-jsx-a11y`: 0 errors. Visual check on the built interface with the `nginx.conf` CSP at 360, 768 and 1280 px, light and dark themes: no horizontal overflow at 360 px, no CSP violation. Limits: contrast is not measured automatically; below 992 px the person's name leaves the header; on phones the Simple or Complete switch moves to the person's menu. Since 0.7.0 (E-26), `couleurs.test.tsx` checks the error red: at least 4.5:1 on every background, light (`#cf1322`) and dark (`#dc7878` under fields).

## 0.18.0

`axe-core` on the search window with results, the open assistant with an answer and the guided tour: 0 violations. Search with a named button, title, field and result groups, announcements through `aria-live`, Enter opens the first result; guided tour within the screen width, without a mask. `mobile:check`: 49 screens, six devices, FR and NL, no defect.

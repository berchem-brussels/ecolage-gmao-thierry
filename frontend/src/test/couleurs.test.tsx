/**
 * Rouge des messages d'erreur (écart E-26, 0.7.0, point 6 bis) : contraste d'au moins 4,5:1 sur tous les fonds de
 * l'application, en clair et en sombre, à partir du thème réel (buildTheme) ; le rouge rendu par Ant Design sous un
 * champ et par « Ce champ est obligatoire » est bien celui du thème ; plus aucun rouge par défaut codé en dur.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Button, ConfigProvider, Form, Input, Typography, theme } from 'antd';
import { buildTheme } from '../App';
import { FALLBACK_SETTINGS } from '../contexts/SettingsContext';
import { I18nProvider } from '../contexts/I18nContext';
import ErreurObligatoire from '../components/ErreurObligatoire';
import { FONDS, contraste } from '../couleurs';

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

describe('rouge des erreurs (E-26)', () => {
  for (const [mode, sombre] of [['clair', false], ['sombre', true]] as const) {
    it(`${mode} : rouge d'erreur et texte des boutons de danger à 4,5:1 au moins`, () => {
      const th = buildTheme(FALLBACK_SETTINGS, sombre) as Parameters<typeof theme.getDesignToken>[0] & { components: { Button: { dangerColor: string } } };
      // Jetons tels qu'Ant Design les calcule (l'algorithme sombre retouche la graine).
      const jetons = theme.getDesignToken(th) as unknown as Record<string, string>;
      for (const cle of ['colorError', 'colorErrorText']) {
        for (const fond of FONDS[mode]) expect(contraste(jetons[cle], fond), `${cle} ${jetons[cle]} sur ${fond}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(contraste(th.components.Button.dangerColor, jetons.colorError)).toBeGreaterThanOrEqual(4.5);
    });

    it(`${mode} : le message sous un champ et « Ce champ est obligatoire » prennent le rouge du thème`, async () => {
      const th = buildTheme(FALLBACK_SETTINGS, sombre);
      const jetons = theme.getDesignToken(th as Parameters<typeof theme.getDesignToken>[0]) as unknown as Record<string, string>;
      render(
        <ConfigProvider theme={th}>
          <I18nProvider defaultLang="fr">
            <Form onFinish={() => {}}>
              <Form.Item name="x" label="Champ" rules={[{ required: true, message: 'Obligatoire ici' }]}><Input /></Form.Item>
              <Button htmlType="submit">Envoyer</Button>
            </Form>
            <ErreurObligatoire id="e" />
            <Typography.Text type="danger">Texte en danger</Typography.Text>
          </I18nProvider>
        </ConfigProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
      const sous = await screen.findByText('Obligatoire ici');
      expect(getComputedStyle(sous.closest('.ant-form-item-explain-error') as HTMLElement).color).toBe(rgb(jetons.colorError));
      expect(document.getElementById('e')!.style.color).toBe(rgb(jetons.colorError));
      expect(getComputedStyle(screen.getByText('Texte en danger')).color).toBe(rgb(jetons.colorErrorText));
    });
  }

  it('aucun rouge par défaut d’Ant Design (#ff4d4f) codé en dur dans les écrans', () => {
    const src = resolve(process.cwd(), 'src');
    const fichiers = (d: string): string[] => readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? (f === 'test' ? [] : fichiers(p)) : /\.(tsx?|css)$/.test(f) ? [p] : [];
    });
    for (const f of fichiers(src)) expect(readFileSync(f, 'utf8'), f).not.toMatch(/#ff4d4f/i);
  });
});

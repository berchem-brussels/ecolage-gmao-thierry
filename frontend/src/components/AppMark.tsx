/** Marque de l'application : nom et organisation issus des paramètres de l'instance (aucun logo en dur). */
import { useSettings } from '../contexts/SettingsContext';
import { useI18n } from '../contexts/I18nContext';

export default function AppMark({ collapsed = false, onDark = false }: { collapsed?: boolean; onDark?: boolean }) {
  const { settings } = useSettings();
  const { tField } = useI18n();
  const name = tField(settings.app as unknown as Record<string, unknown>, 'name');
  const org = tField(settings.app as unknown as Record<string, unknown>, 'organisation');
  const color = onDark ? '#ffffff' : 'var(--app-primary-text)';
  if (collapsed) return <div style={{ color, fontWeight: 700, fontSize: 18 }} aria-label={name}>{name.slice(0, 2).toUpperCase()}</div>;
  return (
    <div style={{ lineHeight: 1.2, overflow: 'hidden' }}>
      <div style={{ color, fontWeight: 700, fontSize: 16, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{name}</div>
      {org && <div style={{ color: onDark ? 'rgba(255,255,255,0.65)' : 'var(--app-text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{org}</div>}
    </div>
  );
}

/** Déclaration d'accessibilité FR et NL (patron SAGA AccessibilityPage.tsx). */
import { Card, Typography } from 'antd';
import { useI18n } from '../contexts/I18nContext';

export default function AccessibilityPage() {
  const { t } = useI18n();
  return (
    <div>
      <Typography.Title level={1} style={{ fontSize: 22, marginBottom: 16 }}>{t('a11y.title')}</Typography.Title>
      <Card><Typography.Paragraph>{t('a11y.body')}</Typography.Paragraph></Card>
    </div>
  );
}

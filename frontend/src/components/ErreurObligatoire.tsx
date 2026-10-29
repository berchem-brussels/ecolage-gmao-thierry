/**
 * Message « Ce champ est obligatoire » sous un champ hors formulaire Ant Design (motif de désactivation, description
 * d'une demande), quand on n'y a tapé que des espaces (version 0.5.1). Même apparence que les erreurs des formulaires ;
 * le champ pointe vers ce message par aria-describedby et porte aria-invalid.
 * 0.7.0 (E-26) : couleur prise au thème (rouge à 4,5:1 au moins), plus de repli codé en dur.
 */
import { theme } from 'antd';
import { useI18n } from '../contexts/I18nContext';

export default function ErreurObligatoire({ id }: { id: string }) {
  const { t } = useI18n();
  // Rouge du thème (E-26, 0.7.0) : la variable CSS d'Ant Design n'existe pas sans cssVar, le repli codé en dur valait le rouge par défaut.
  const { token } = theme.useToken();
  return (
    <div id={id} role="alert" className="ant-form-item-explain-error" style={{ color: token.colorError, fontSize: 14, marginTop: 4 }}>
      {t('form.obligatoire')}
    </div>
  );
}

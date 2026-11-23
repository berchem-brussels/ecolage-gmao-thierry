/**
 * Réglages de l'entité active (responsable du service technique ; cahier des charges ADM-03).
 * Contact du service technique, téléphone d'urgence, délai de réouverture et numérotation des demandes (0.5.0) : une valeur par entité, défaut livré
 * sinon. Le catalogue vient de l'API (config/parametres-entite.json). Changer d'entité active recharge l'écran.
 * 0.7.0 (RGPD-10) : groupe « Protection des données », mentions d'information FR et NL et contact du DPO.
 * 0.9.0 (contrôle 7 de la recette 0.8.0) : groupe « Pièces jointes des demandes », oublié en 0.8.0. GROUPES suit l'ordre
 * du catalogue du serveur (config/parametres-entite.json) ; un test vérifie que chaque groupe du catalogue y figure.
 */
import { Tag, Typography } from 'antd';
import ReglagesForm from '../components/ReglagesForm';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export const GROUPES = ['contact', 'urgence', 'demandes', 'pieces', 'numerotation', 'rgpd'];

export default function ReglagesEntitePage() {
  const { t, tField } = useI18n();
  const { entite, user } = useAuth();
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{t('reglages.title')}</Typography.Title>
        {entite && <Tag color="var(--app-primary)">{entite.code} · {tField(entite as unknown as Record<string, unknown>, 'nom')}</Tag>}
      </div>
      <Typography.Paragraph type="secondary">{t('reglages.intro')}</Typography.Paragraph>
      <ReglagesForm endpoint="/parametres-entite" groupes={GROUPES} prefixe="reglages" reloadKey={user?.entite_active_id} />
    </div>
  );
}

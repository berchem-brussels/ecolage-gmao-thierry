/**
 * Suivre une demande ou ne plus la suivre (version 0.15.0, étape 10, point 5 ; cahier des charges SUI-09).
 *   1. « Suivre cette demande » : proposé par le serveur (suivable) à qui voit une demande ouverte sans en être le
 *      demandeur ni le bénéficiaire et sans la suivre déjà ; abonnement sans remarque. La demande arrive dans « Mes
 *      demandes » ; les notifications aux personnes qui suivent viendront avec les notifications.
 *   2. « Ne plus suivre » : pour qui suit (« Moi aussi » ou abonnement), même une demande fermée, avec confirmation ;
 *      pour un « Moi aussi », la confirmation dit que la remarque sera effacée. Une personne hors du service ne lit plus
 *      ensuite la demande d'un autre : la page ferme la fiche (onChange reçoit null).
 */
import { useState } from 'react';
import { Button, Popconfirm, Space, message } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import api, { ApiError } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import type { Demande } from '../../demandes';

export default function SuiviDemande({ d, onChange }: { d: Demande; onChange: (d: Demande | null) => void }) {
  const { t } = useI18n();
  const [envoi, setEnvoi] = useState(false);
  if (!d.suivable && !d.suivie) return null;
  const faire = async (appel: () => Promise<Demande>, ok: string) => {
    setEnvoi(true);
    try {
      const r = await appel();
      message.success(t(ok));
      onChange(r && 'etat' in r ? r : null);
    } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); } finally { setEnvoi(false); }
  };
  return (
    <Space wrap style={{ marginBottom: 12 }}>
      {d.suivable === 1 && (
        <Button icon={<EyeOutlined />} loading={envoi}
          onClick={() => faire(() => api.post<Demande>(`/demandes/${d.id}/suivre`, { source: 'abonnement' }), 'suivi.suivre.ok')}>
          {t('suivi.suivre')}
        </Button>
      )}
      {d.suivie === 1 && (
        <Popconfirm title={t('suivi.arreter.confirm')} description={d.suivi_source === 'moi_aussi' ? t('suivi.arreter.remarque') : undefined}
          okText={t('suivi.arreter')} cancelText={t('common.cancel')}
          onConfirm={() => faire(() => api.del<Demande>(`/demandes/${d.id}/suivre`, {}), 'suivi.arreter.ok')}>
          <Button icon={<EyeInvisibleOutlined />} loading={envoi}>{t('suivi.arreter')}</Button>
        </Popconfirm>
      )}
    </Space>
  );
}

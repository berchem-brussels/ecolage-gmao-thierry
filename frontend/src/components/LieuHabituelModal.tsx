/**
 * « Mon lieu de travail » (version 0.5.0 ; cahier des charges REF-04, décision DV-42) : la personne choisit le lieu
 * proposé d'office dans ses demandes, parmi les lieux actifs de l'entité active. Sans choix, le lieu de sa dernière
 * demande est proposé. Le serveur contrôle le lieu (actif, d'une entité où la personne a un rôle).
 */
import { useEffect, useState } from 'react';
import { Button, Modal, Typography, message } from 'antd';
import api, { ApiError } from '../api';
import { type User, useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import LieuPicker from './demandes/LieuPicker';
import type { LieuChoisi } from '../demandes';

export default function LieuHabituelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const habituel = user?.lieu_propose?.source === 'habituel' ? user.lieu_propose : null;
  const [lieu, setLieu] = useState<LieuChoisi | null>(habituel);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setLieu(habituel); }, [open]);

  const enregistrer = async (id: number | null) => {
    setBusy(true);
    try {
      await api.put<User>('/auth/lieu-habituel', { lieu_id: id });
      message.success(t('common.saved'));
      await refresh();
      onClose();
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} title={t('profil.lieu.title')} onCancel={onClose} destroyOnClose
      footer={[
        ...(user?.lieu_habituel_id ? [<Button key="effacer" onClick={() => enregistrer(null)} disabled={busy}>{t('profil.lieu.effacer')}</Button>] : []),
        <Button key="annuler" onClick={onClose}>{t('common.cancel')}</Button>,
        <Button key="ok" type="primary" loading={busy} disabled={!lieu} onClick={() => lieu && enregistrer(lieu.id)}>{t('common.save')}</Button>,
      ]}>
      <Typography.Paragraph type="secondary" id="profil-lieu-aide">{t('profil.lieu.aide')}</Typography.Paragraph>
      <LieuPicker value={lieu} onChange={setLieu} labelledBy="profil-lieu-aide" />
    </Modal>
  );
}

/**
 * Note de version à la première connexion après une mise à jour (standard v3.2, sections 13.1 et 17.8 ; écart E-07).
 * Le profil donne les notes non lues ; « J'ai lu » ou la fermeture les marque lues côté serveur : la fenêtre ne revient
 * pas. Elle attend que le changement de mot de passe imposé soit fait. Toutes les notes restent dans Aide, Nouveautés.
 */
import { Button, Modal, Typography } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export default function NouveautesModal() {
  const { user, nouveautesLues } = useAuth();
  const { t, lang } = useI18n();
  const notes = user?.nouveautes || [];
  const open = notes.length > 0 && user?.must_change_password !== 1;
  return (
    <Modal open={open} title={t('nouveautes.title').replace('{v}', notes[0]?.version || '')} onCancel={nouveautesLues} closable
      footer={<Button type="primary" onClick={nouveautesLues}>{t('nouveautes.lu')}</Button>}>
      {notes.map((n) => (
        <div key={n.version} style={{ marginBottom: 12 }}>
          {notes.length > 1 && <Typography.Title level={2} style={{ fontSize: 15 }}>{t('nouveautes.version').replace('{v}', n.version)}</Typography.Title>}
          <ul style={{ paddingInlineStart: 20, margin: 0 }}>
            {n.lignes.map((l, i) => <li key={i} style={{ marginBottom: 6 }}>{lang === 'nl' ? l.nl : l.fr}</li>)}
          </ul>
        </div>
      ))}
      <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>{t('nouveautes.aide')}</Typography.Paragraph>
    </Modal>
  );
}

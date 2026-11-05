/**
 * Note de version à la première connexion après une mise à jour (standard v3.2, sections 13.1 et 17.8 ; écart E-07).
 * Le profil donne les notes non lues ; « J'ai lu » ou la croix les marque lues côté serveur : la fenêtre ne revient
 * pas. Elle attend que le changement de mot de passe imposé soit fait. Toutes les notes restent dans Aide, Nouveautés.
 *
 * 0.11.0 (recette de la 0.10.0, DV-106) : un clic hors de la fenêtre ne la ferme plus. Avant, un clic sur le sélecteur
 * de langue de l'en-tête tombait sur le fond de la fenêtre : elle se fermait, les notes étaient marquées lues et la
 * langue ne changeait pas. La langue se choisit maintenant dans la fenêtre même, sans la fermer.
 */
import { Button, Modal, Radio, Typography } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export default function NouveautesModal() {
  const { user, nouveautesLues, savePreferences } = useAuth();
  const { t, lang, setLang } = useI18n();
  const notes = user?.nouveautes || [];
  const open = notes.length > 0 && user?.must_change_password !== 1;
  const changeLang = (l: 'fr' | 'nl') => { setLang(l); savePreferences({ preferred_lang: l }); };
  return (
    <Modal open={open} title={t('nouveautes.title').replace('{v}', notes[0]?.version || '')} onCancel={nouveautesLues} closable maskClosable={false}
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Radio.Group size="small" optionType="button" aria-label={t('layout.lang')} value={lang}
            onChange={(e) => changeLang(e.target.value)}
            options={[{ value: 'fr', label: 'FR' }, { value: 'nl', label: 'NL' }]} />
          <Button type="primary" onClick={nouveautesLues}>{t('nouveautes.lu')}</Button>
        </div>
      )}>
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

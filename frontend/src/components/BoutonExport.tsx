/**
 * Bouton « Exporter » d'une liste (0.18.0, point 2 ; cahier des charges IMP-03 ; DV-149) : menu Excel (.xlsx) ou CSV.
 * Le fichier est produit par le serveur avec les filtres affichés (mêmes droits et même cloison que la liste) et
 * téléchargé sous le nom qu'il donne ; une erreur (plafond de 5 000 lignes, droits) s'affiche en message. Sur iPhone et
 * Android, le fichier s'ouvre ou s'enregistre selon le navigateur (Fichiers, Téléchargements).
 */
import { useState } from 'react';
import { Button, Dropdown, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../api';
import { useI18n } from '../contexts/I18nContext';

export type Filtres = Record<string, string | number | undefined>;

/** Adresse de l'export : chemin de la liste (sans /api) et filtres affichés, sans pagination. */
export function adresseExport(chemin: string, filtres: Filtres, format: 'xlsx' | 'csv'): string {
  const { limit: _l, offset: _o, ...reste } = filtres;
  return `${chemin}${qs({ ...reste, format })}`;
}

/** Remet le fichier au navigateur : lien temporaire, cliqué puis retiré. */
function remettre(blob: Blob, fichier: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function BoutonExport({ chemin, filtres = {}, size }: { chemin: string; filtres?: Filtres; size?: 'small' | 'middle' }) {
  const { t } = useI18n();
  const [enCours, setEnCours] = useState(false);
  const exporter = async (format: 'xlsx' | 'csv') => {
    setEnCours(true);
    try {
      const { blob, fichier } = await api.telecharger(adresseExport(chemin, filtres, format));
      remettre(blob, fichier);
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setEnCours(false);
    }
  };
  return (
    <Dropdown trigger={['click']} menu={{
      items: [{ key: 'xlsx', label: t('export.xlsx') }, { key: 'csv', label: t('export.csv') }],
      onClick: ({ key }) => exporter(key as 'xlsx' | 'csv'),
    }}>
      <Button icon={<DownloadOutlined aria-hidden />} loading={enCours} size={size} className="bouton-export">{t('export.bouton')}</Button>
    </Dropdown>
  );
}

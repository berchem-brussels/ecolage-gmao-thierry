/**
 * Photo de l'endroit d'une demande, pour le service technique (0.13.0, étape 8 ter, DV-101) : reconnaître le lieu avant
 * d'y envoyer un ouvrier. Photo du lieu choisi ; à défaut, celle du plus proche lieu au-dessus (niveau, bâtiment, site),
 * dite comme telle. Rien quand aucun lieu du chemin n'a de photo. Rendue par le serveur dans « photo_lieu » de la fiche,
 * au seul service technique ; le fichier se lit avec les droits et la cloison des lieux.
 * iPhone et Android (DV-102) : image de 100 % de la largeur au plus, 240 px de haut, agrandie au toucher (aperçu
 * d'Ant Design, fermé par la croix, le fond ou le geste de retour) ; pas de survol nécessaire.
 */
import { Image, Typography } from 'antd';
import { useI18n } from '../../contexts/I18nContext';
import type { PhotoLieu as Photo } from '../../demandes';

export const srcPhotoLieu = (p: Photo) => `/api/lieux/${p.lieu_id}/photo?v=${encodeURIComponent(p.photo_at || '')}`;

export default function PhotoLieu({ photo }: { photo: Photo | null | undefined }) {
  const { t, lang } = useI18n();
  if (!photo) return null;
  const nom = `${photo.code} — ${lang === 'nl' ? photo.nom_nl : photo.nom_fr}`;
  const legende = photo.du_lieu
    ? t('demande.photo_lieu.du_lieu')
    : t('demande.photo_lieu.parent').replace('{nature}', t(`lieux.nature.${photo.nature}`).toLowerCase()).replace('{nom}', nom);
  return (
    <figure className="dem-photo-lieu" style={{ margin: 0 }}>
      <Image src={srcPhotoLieu(photo)} alt={`${t('lieux.photo.alt')} ${nom}`}
        style={{ maxHeight: 240, maxWidth: '100%', width: 'auto', objectFit: 'cover', borderRadius: 6 }}
        preview={{ mask: t('demande.photo_lieu.agrandir') }} />
      <figcaption><Typography.Text type="secondary" style={{ fontSize: 13 }}>{legende}</Typography.Text></figcaption>
    </figure>
  );
}

/**
 * Vignettes des pièces jointes (version 0.8.0, points 3 et 4) : formulaire de demande et fiche d'une demande.
 * Photo : vignette de 96 pixels, aperçu agrandi au clic. PDF : icône, téléchargement. Nom, taille et, si la personne
 * en a le droit, « Retirer » avec confirmation (suppression réelle, DV-84). Le serveur contrôle chaque suppression.
 */
import { Button, Image, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useI18n } from '../../contexts/I18nContext';
import { type Piece, fichierPiece, taille } from '../../demandes';

interface Props {
  pieces: Piece[];
  peutRetirer: (p: Piece) => boolean;
  onRetirer: (p: Piece) => void;
  label?: string;
}

export default function VignettesPieces({ pieces, peutRetirer, onRetirer, label }: Props) {
  const { t, lang } = useI18n();
  if (!pieces.length) return null;
  return (
    <ul className="dem-pieces-liste" aria-label={label || t('demande.pieces.title')}>
      {pieces.map((p) => (
        <li key={p.id} className="dem-piece">
          {p.type === 'application/pdf' ? (
            <a href={fichierPiece(p.id)} className="dem-piece-pdf" aria-label={t('demande.pieces.ouvrir').replace('{nom}', p.nom)}>
              <FilePdfOutlined aria-hidden="true" style={{ fontSize: 36 }} />
            </a>
          ) : (
            <Image src={fichierPiece(p.id)} width={96} height={96} alt={p.nom} style={{ objectFit: 'cover', borderRadius: 6 }} />
          )}
          <Typography.Text className="dem-piece-nom" ellipsis={{ tooltip: p.nom }} style={{ width: 96, fontSize: 12 }}>{p.nom}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>{taille(p.octets, lang)}</Typography.Text>
          {peutRetirer(p) && (
            <Popconfirm title={t('demande.pieces.retirer.confirm').replace('{nom}', p.nom)} okText={t('demande.pieces.retirer')} cancelText={t('common.cancel')}
              onConfirm={() => onRetirer(p)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`${t('demande.pieces.retirer')} ${p.nom}`}>
                {t('demande.pieces.retirer')}
              </Button>
            </Popconfirm>
          )}
        </li>
      ))}
    </ul>
  );
}

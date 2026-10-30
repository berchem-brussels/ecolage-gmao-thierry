/**
 * Bloc « Photos et documents » du formulaire de demande (version 0.8.0, point 3 ; DEM-09, DEM-16, RGPD-01, RGPD-02 ;
 * décisions DV-66, DV-83 à DV-85).
 *   1. « Ajouter une photo ou un document » ouvre le sélecteur de fichiers ; sur téléphone, il propose l'appareil photo
 *      ou la galerie. Plusieurs fichiers d'un coup, dans la limite du nombre restant.
 *   2. Une photo est réduite et réencodée dans le navigateur (photo.ts : 1 600 pixels, sans métadonnées), puis envoyée
 *      aussitôt au brouillon ; un PDF part tel quel, s'il respecte la taille de l'entité. Le serveur contrôle à nouveau.
 *   3. Consigne sous le bouton (DV-66, DV-12) : ni personne, ni plaque lisible, ni dispositif de sécurité.
 *   4. Vignettes (aperçu agrandi au clic) ou icône pour un PDF (téléchargement) ; « Retirer » avec confirmation,
 *      suppression réelle sur le serveur.
 *   5. Compteur « n sur max » ; bouton désactivé au maximum ; bloc absent si l'entité ferme le dépôt (0) et qu'aucune
 *      pièce n'est là. Un refus du serveur s'affiche dans la langue de la personne, la saisie reste.
 * L'état (pièces et plafonds) est tenu par la page : il entre dans le brouillon et dans le rappel « Recommencer à zéro ».
 */
import { useRef, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import api, { ApiError } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { reduirePhoto } from '../../photo';
import { type Piece, type PlafondsPieces } from '../../demandes';
import VignettesPieces from './VignettesPieces';

interface Props {
  pieces: Piece[];
  plafonds: PlafondsPieces | null;
  onChange: (pieces: Piece[]) => void;
}

const PDF = 'application/pdf';
const sansExtension = (nom: string) => nom.replace(/\.[A-Za-z0-9]{1,5}$/, '');

export default function PiecesDemande({ pieces, plafonds, onChange }: Props) {
  const { t } = useI18n();
  const entree = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);

  if (!plafonds || (plafonds.nombre === 0 && pieces.length === 0)) return null;
  const pdfAdmis = plafonds.types.includes(PDF);
  const mo = Math.round(plafonds.octets / (1024 * 1024));
  const plein = pieces.length >= plafonds.nombre;
  const accept = pdfAdmis ? 'image/*,application/pdf' : 'image/*';

  /** Envoie les fichiers un à un ; chaque refus est dit avec le nom du fichier, les autres partent. */
  const ajouter = async (liste: FileList | null) => {
    if (!liste || !liste.length) return;
    const fichiers = Array.from(liste);
    let courantes = pieces;
    const refus: string[] = [];
    const place = plafonds.nombre - courantes.length;
    if (fichiers.length > place) refus.push(t('demande.pieces.trop').replace('{n}', String(fichiers.length - place)));
    for (const f of fichiers.slice(0, Math.max(0, place))) {
      setEnvoi(f.name);
      try {
        let blob: Blob;
        let nom = f.name;
        // Certains postes ne donnent pas le type d'un PDF : l'extension le dit, le serveur le vérifie sur le contenu.
        if (f.type === PDF || (!f.type && /\.pdf$/i.test(f.name))) {
          if (!pdfAdmis) { refus.push(t('demande.pieces.erreur.type').replace('{nom}', f.name)); continue; }
          if (f.size > plafonds.octets) { refus.push(t('demande.pieces.erreur.taille').replace('{nom}', f.name).replace('{mo}', String(mo))); continue; }
          blob = f.type === PDF ? f : new Blob([f], { type: PDF });
        } else if (f.type.startsWith('image/')) {
          try { blob = await reduirePhoto(f); } catch { refus.push(t('demande.pieces.erreur.lecture').replace('{nom}', f.name)); continue; }
          nom = `${sansExtension(f.name) || 'photo'}.jpg`;
        } else {
          refus.push(t('demande.pieces.erreur.type').replace('{nom}', f.name));
          continue;
        }
        const p = await api.upload<Piece>('/demandes/brouillon/pieces', blob, nom);
        courantes = [...courantes, p];
        onChange(courantes);
      } catch (e) {
        refus.push(`${f.name} : ${e instanceof ApiError ? e.message : t('common.error')}`);
      }
    }
    setEnvoi(null);
    setErreurs(refus);
    if (entree.current) entree.current.value = '';
  };

  const retirer = async (p: Piece) => {
    try {
      await api.del(`/pieces/${p.id}`);
      onChange(pieces.filter((x) => x.id !== p.id));
      setErreurs([]);
    } catch (e) {
      setErreurs([e instanceof ApiError ? e.message : t('common.error')]);
    }
  };

  return (
    <div className="dem-pieces">
      <Space wrap size={[12, 8]} align="center">
        <Button icon={<CameraOutlined />} onClick={() => entree.current?.click()} disabled={plein || !!envoi} loading={!!envoi}
          aria-describedby="dem-pieces-consigne dem-pieces-compteur">
          {pdfAdmis ? t('demande.pieces.ajouter') : t('demande.pieces.ajouter.photo')}
        </Button>
        <Typography.Text id="dem-pieces-compteur" type="secondary" aria-live="polite">
          {t('demande.pieces.compteur').replace('{n}', String(pieces.length)).replace('{max}', String(plafonds.nombre))}
        </Typography.Text>
      </Space>
      <input ref={entree} type="file" accept={accept} multiple hidden aria-hidden="true" tabIndex={-1}
        data-testid="dem-pieces-entree" onChange={(e) => { ajouter(e.target.files); }} />
      <Typography.Text id="dem-pieces-consigne" type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
        {t('demande.pieces.consigne')}{' '}
        {(pdfAdmis ? t('demande.pieces.formats') : t('demande.pieces.formats.photo')).replace('{mo}', String(mo))}
      </Typography.Text>
      {envoi && <Typography.Text type="secondary" role="status" style={{ display: 'block', marginTop: 6 }}>{t('demande.pieces.envoi').replace('{nom}', envoi)}</Typography.Text>}
      {plein && plafonds.nombre > 0 && <Typography.Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>{t('demande.pieces.plein')}</Typography.Text>}
      {erreurs.length > 0 && (
        <Alert type="warning" showIcon style={{ marginTop: 8 }} role="alert"
          message={erreurs.length === 1 ? erreurs[0] : <ul style={{ margin: 0, paddingInlineStart: 18 }}>{erreurs.map((x) => <li key={x}>{x}</li>)}</ul>} />
      )}
      <VignettesPieces pieces={pieces} peutRetirer={() => true} onRetirer={retirer} />
    </div>
  );
}

/**
 * Tableau de bord du service technique (version 0.9.0 ; cahier des charges GES-01, PRI-03 ; DV-92) : quatre compteurs
 * de l'entité active, chacun en lien vers la liste du service déjà filtrée (même total que le compteur). Les compteurs
 * « en attente depuis N jours », « à clôturer » et « échéances préventives » arrivent avec le cycle de vie (étape 9)
 * et le préventif. Le retard s'affiche en rouge et par une icône : la couleur n'est jamais seule à le dire.
 * 0.9.1 (R1, DV-94) : la page qui l'affiche peut demander un nouveau chargement par `rafraichir` (après une
 * qualification) ; les compteurs restent affichés pendant ce chargement, ils ne repassent à « … » qu'au changement
 * d'entité.
 */
import { useEffect, useRef, useState } from 'react';
import { Card, Typography } from 'antd';
import { ClockCircleOutlined, InboxOutlined, ThunderboltOutlined, WarningOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { COMPTEURS, type TableauBord as Bord, urlGestion } from '../../demandes';

const ICONES = { a_qualifier: InboxOutlined, en_retard: WarningOutlined, p1_p2: ThunderboltOutlined, echeance_proche: ClockCircleOutlined };

export default function TableauBord({ titre = true, rafraichir = 0 }: { titre?: boolean; rafraichir?: number }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [bord, setBord] = useState<Bord | null>(null);
  const [erreur, setErreur] = useState(false);
  const entite = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    let actif = true;
    if (entite.current !== user?.entite_active_id) { entite.current = user?.entite_active_id; setBord(null); }
    setErreur(false);
    api.get<Bord>('/demandes/tableau-bord')
      .then((b) => { if (actif) setBord(b && typeof b.a_qualifier === 'number' ? b : null); })
      .catch(() => { if (actif) setErreur(true); });
    return () => { actif = false; };
  }, [user?.entite_active_id, rafraichir]);

  if (erreur) return null;
  return (
    <section aria-labelledby="tableau-bord-titre">
      {titre ? (
        <Typography.Title level={2} id="tableau-bord-titre" style={{ fontSize: 16, marginBottom: 8 }}>{t('bord.titre')}</Typography.Title>
      ) : <span id="tableau-bord-titre" className="sr-only">{t('bord.titre')}</span>}
      <div className="bord-compteurs">
        {COMPTEURS.map(({ cle, filtres }) => {
          const Icone = ICONES[cle];
          const n = bord ? bord[cle] : null;
          const alerte = cle === 'en_retard' && !!n;
          return (
            <Link key={cle} to={urlGestion(filtres)} className={`bord-compteur${alerte ? ' bord-alerte' : ''}`}>
              <Card size="small" hoverable style={{ height: '100%' }}>
                <div className="bord-nombre"><Icone aria-hidden /> <span aria-busy={n === null}>{n === null ? '…' : n}</span></div>
                <div className="bord-libelle">{t(`bord.${cle}`)}</div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

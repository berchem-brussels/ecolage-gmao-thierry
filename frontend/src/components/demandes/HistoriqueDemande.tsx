/**
 * Historique d'une demande (version 0.14.0, étape 9 ; cahier des charges CYC-02, SUI-02) : chaque étape datée, de la
 * réception à l'état courant, avec le motif et le commentaire. Le service technique lit l'auteur, le canal et les
 * commentaires internes (marqués « Interne ») ; le demandeur lit le libellé de l'état réglé par l'entité, sans nom
 * d'agent ni commentaire interne (le serveur ne les lui rend pas). Rechargé quand « rafraichir » change.
 */
import { useEffect, useState } from 'react';
import { Tag, Timeline, Typography } from 'antd';
import api from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { COULEUR_ETAT, instant, type EtapeHistorique } from '../../demandes';

export default function HistoriqueDemande({ demandeId, service, rafraichir = 0 }: { demandeId: number; service: boolean; rafraichir?: number }) {
  const { t, lang } = useI18n();
  const [etapes, setEtapes] = useState<EtapeHistorique[] | null>(null);
  useEffect(() => {
    api.get<EtapeHistorique[]>(`/demandes/${demandeId}/historique`).then(setEtapes).catch(() => setEtapes([]));
  }, [demandeId, rafraichir]);
  if (!etapes) return null;
  if (!etapes.length) return <Typography.Text type="secondary">{t('cycle.historique.vide')}</Typography.Text>;

  const libelle = (e: EtapeHistorique) => (service ? t(`demande.etat_service.${e.vers_etat}`)
    : (lang === 'nl' ? e.etat_libelle_nl : e.etat_libelle_fr) || t(`demande.etat.${e.vers_etat}`));
  const auteur = (e: EtapeHistorique) => (service && e.auteur_nom ? `${e.auteur_prenom || ''} ${e.auteur_nom}`.trim() : t(`cycle.auteur.${e.auteur}`));
  return (
    <section aria-label={t('cycle.historique')}>
      <Typography.Title level={2} style={{ fontSize: 16, margin: '16px 0 12px' }}>{t('cycle.historique')}</Typography.Title>
      <Timeline items={[...etapes].reverse().map((e) => ({
        key: e.id,
        color: COULEUR_ETAT[e.vers_etat] === 'default' ? 'gray' : 'blue',
        children: (
          <div>
            <Typography.Text strong>{e.de_etat === null ? t('cycle.historique.depot') : libelle(e)}</Typography.Text>
            <div><Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {instant(e.created_at)} · {auteur(e)}{service && e.canal ? ` · ${t(`cycle.canal.${e.canal}`)}` : ''}
            </Typography.Text></div>
            {e.motif_code && <div>{lang === 'nl' ? e.motif_libelle_nl : e.motif_libelle_fr}</div>}
            {e.commentaire && (
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {service && !e.commentaire_public && <Tag style={{ marginInlineEnd: 6 }}>{t('cycle.interne')}</Tag>}
                {e.commentaire}
              </div>
            )}
          </div>
        ),
      }))} />
    </section>
  );
}

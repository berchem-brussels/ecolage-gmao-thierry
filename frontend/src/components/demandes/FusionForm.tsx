/**
 * Regrouper une demande avec une autre, la demande principale (version 0.16.0, étape 12, point 4 ; GES-06), dans la
 * fiche du service technique.
 * - Proposées d'office : les demandes ouvertes du même bâtiment (ou du même site), sauf celle-ci ; recherche par numéro,
 *   texte ou lieu dans les demandes ouvertes de l'entité. Une demande « En validation » n'est pas proposée.
 * - Une fois la principale choisie : ce qui va se passer (la demande est fermée et renvoie vers la principale, ses
 *   abonnés, son demandeur et son bénéficiaire suivent la principale), commentaire facultatif lu par le demandeur.
 * - Le serveur refait tous les contrôles (services/fusion.js) ; un refus s'affiche, la saisie reste (ERG-09).
 * Résultats en boutons pleine largeur, tenus au doigt dans 320 px (DV-102).
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Input, Space, Spin, Typography, message } from 'antd';
import api, { ApiError, qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { type Demande, dateDepot, extrait } from '../../demandes';

export default function FusionForm({ d, onDone, onCancel }: { d: Demande; onDone: (d: Demande) => void; onCancel: () => void }) {
  const { t, lang } = useI18n();
  const [proposees, setProposees] = useState<Demande[] | null>(null);
  const [q, setQ] = useState('');
  const [trouvees, setTrouvees] = useState<Demande[] | null>(null);
  const [choisie, setChoisie] = useState<Demande | null>(null);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>();
  const garder = (l: Demande[]) => l.filter((x) => x.id !== d.id && x.etat !== 'en_validation');

  // Bâtiment de la demande (sinon son site) : les doublons sont le plus souvent au même endroit.
  const zone = [...(d.lieu_chemin || [])].reverse().find((e) => e.nature === 'batiment') || (d.lieu_chemin || [])[0];
  useEffect(() => {
    if (!zone) { setProposees([]); return; }
    api.page<Demande>(`/demandes${qs({ perimetre: 'entite', ouvertes: 1, batiment_id: zone.id, limit: 20 })}`)
      .then((r) => setProposees(garder(r.data))).catch(() => setProposees([]));
  }, [d.id]);

  const chercher = (texte: string) => {
    setQ(texte);
    clearTimeout(minuterie.current);
    if (texte.trim().length < 2) { setTrouvees(null); return; }
    minuterie.current = setTimeout(() => {
      api.page<Demande>(`/demandes${qs({ perimetre: 'entite', ouvertes: 1, q: texte.trim(), limit: 10 })}`)
        .then((r) => setTrouvees(garder(r.data))).catch(() => setTrouvees([]));
    }, 250);
  };

  const envoyer = async () => {
    if (!choisie) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<Demande>(`/demandes/${d.id}/fusionner`, { principale_id: choisie.id, ...(commentaire.trim() ? { commentaire: commentaire.trim() } : {}) });
      message.success(t('fusion.faite').replace('{numero}', choisie.numero));
      onDone(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  const ligne = (x: Demande) => (
    <li key={x.id}>
      <button type="button" className="dem-resultat" aria-pressed={choisie?.id === x.id} onClick={() => setChoisie(x)}>
        <span className="dem-resultat-nom">{x.numero} · {lang === 'nl' ? x.categorie_libelle_nl : x.categorie_libelle_fr}</span>
        <span className="dem-resultat-chemin" lang={x.langue}>{lang === 'nl' ? x.lieu_nom_nl : x.lieu_nom_fr} · {dateDepot(x.created_at)} · {extrait(x.description)}</span>
      </button>
    </li>
  );

  return (
    <div>
      <Typography.Paragraph type="secondary">{t('fusion.intro').split('{numero}').join(d.numero)}</Typography.Paragraph>
      {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
      {choisie ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert type="warning" showIcon message={t('fusion.effet.titre').replace('{numero}', d.numero).replace('{principale}', choisie.numero)}
            description={t('fusion.effet')} />
          <div>
            <label htmlFor="fusion-commentaire" className="dem-complement-label">{t('cycle.commentaire')}</label>
            <Input.TextArea id="fusion-commentaire" rows={3} maxLength={2000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              aria-describedby="fusion-commentaire-aide" />
            <Typography.Text id="fusion-commentaire-aide" type="secondary" style={{ fontSize: 12 }}>{t('cycle.commentaire.public')}</Typography.Text>
          </div>
          <Space wrap>
            <Button type="primary" danger loading={envoi} onClick={envoyer}>{t('fusion.confirmer').replace('{principale}', choisie.numero)}</Button>
            <Button onClick={() => setChoisie(null)}>{t('fusion.autre')}</Button>
            <Button onClick={onCancel}>{t('common.cancel')}</Button>
          </Space>
        </Space>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong id="fusion-proposees">{t('fusion.proposees')}</Typography.Text>
            {proposees === null ? <div><Spin size="small" /></div> : proposees.length ? (
              <ul className="dem-resultats" aria-labelledby="fusion-proposees" style={{ marginTop: 6 }}>{proposees.map(ligne)}</ul>
            ) : <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>{t('fusion.proposees.vide')}</Typography.Paragraph>}
          </div>
          <div>
            <label htmlFor="fusion-q" className="dem-complement-label">{t('fusion.chercher')}</label>
            <Input id="fusion-q" allowClear value={q} onChange={(e) => chercher(e.target.value)} placeholder={t('fusion.chercher.placeholder')} />
            {trouvees && (trouvees.length
              ? <ul className="dem-resultats" aria-label={t('fusion.resultats')} style={{ marginTop: 6 }}>{trouvees.map(ligne)}</ul>
              : <Typography.Paragraph type="secondary" style={{ marginTop: 6, marginBottom: 0 }}>{t('fusion.aucune')}</Typography.Paragraph>)}
          </div>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
        </Space>
      )}
    </div>
  );
}

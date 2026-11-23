/**
 * Bloc « Demande reçue » du formulaire encodé par le service technique (version 0.16.0, étape 12, point 3 ;
 * cahier des charges GES-05) : canal (téléphone ou courriel) en boutons, puis le demandeur cherché par son nom parmi
 * les personnes de l'entité active (même recherche que « Pour un collègue », GET /api/demandes/beneficiaires) ;
 * la personne choisie s'affiche avec « Changer ». Le serveur refait les contrôles (DEMANDEUR_HORS_ENTITE).
 * Résultats en boutons pleine largeur : tenus au doigt dans 320 px (DV-102).
 */
import { useId, useRef, useState } from 'react';
import { Button, Input, Radio, Typography } from 'antd';
import { MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import api, { qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';

export interface Personne { id: number; prenom: string; nom: string }
export interface Encodage { canal: 'telephone' | 'courriel' | null; demandeur: Personne | null }
export const ENCODAGE_VIDE: Encodage = { canal: null, demandeur: null };

export default function EncodageDemande({ value, onChange }: { value: Encodage; onChange: (v: Encodage) => void }) {
  const { t } = useI18n();
  const id = useId();
  const [q, setQ] = useState('');
  const [trouves, setTrouves] = useState<Personne[] | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>();

  const chercher = (texte: string) => {
    setQ(texte);
    clearTimeout(minuterie.current);
    if (texte.trim().length < 2) { setTrouves(null); return; }
    minuterie.current = setTimeout(() => {
      api.get<Personne[]>(`/demandes/beneficiaires${qs({ q: texte.trim() })}`).then(setTrouves).catch(() => setTrouves([]));
    }, 250);
  };

  return (
    <div className="dem-complements">
      <div id={`${id}-canal-label`} className="dem-complement-label">{t('encoder.canal')}</div>
      <Radio.Group optionType="button" aria-labelledby={`${id}-canal-label`} value={value.canal} onChange={(e) => onChange({ ...value, canal: e.target.value })}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}
        options={[
          { value: 'telephone', label: <span><PhoneOutlined aria-hidden /> {t('gest.canal.telephone')}</span> },
          { value: 'courriel', label: <span><MailOutlined aria-hidden /> {t('gest.canal.courriel')}</span> },
        ]} />
      {value.demandeur ? (
        <div className="dem-pour-choisi">
          <span><UserOutlined aria-hidden /> {t('encoder.demandeur.choisi')} <strong>{value.demandeur.prenom} {value.demandeur.nom}</strong></span>
          <Button onClick={() => onChange({ ...value, demandeur: null })}>{t('encoder.demandeur.changer')}</Button>
        </div>
      ) : (
        <>
          <label htmlFor={`${id}-q`} className="dem-complement-label">{t('encoder.demandeur')}</label>
          <Input id={`${id}-q`} value={q} onChange={(e) => chercher(e.target.value)} placeholder={t('demande.pour.chercher.placeholder')} allowClear
            aria-describedby={`${id}-aide`} />
          {trouves && (trouves.length ? (
            <ul className="dem-resultats" aria-label={t('demande.pour.resultats')} style={{ marginTop: 8 }}>
              {trouves.map((c) => (
                <li key={c.id}>
                  <button type="button" className="dem-resultat" onClick={() => { onChange({ ...value, demandeur: c }); setQ(''); setTrouves(null); }}>
                    <span className="dem-resultat-nom">{c.prenom} {c.nom}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{t('demande.pour.aucun')}</Typography.Text>)}
          <Typography.Text id={`${id}-aide`} type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>{t('encoder.demandeur.aide')}</Typography.Text>
        </>
      )}
    </div>
  );
}

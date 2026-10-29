/**
 * Compléments facultatifs d'une demande (version 0.7.0, point 3 ; cahier des charges DEM-07, DEM-08).
 * Deux liens discrets, repliés par défaut :
 * - « Pour quelqu'un d'autre ? » : un collègue de l'entité (recherche par nom, 2 lettres au moins, résultats en
 *   boutons) ou un service ou une personne sans compte (texte libre, 200 caractères). L'un ou l'autre.
 * - « Une date ou un moment à respecter ? » : date souhaitée (d'aujourd'hui à un an) et créneau (200 caractères).
 * Le serveur contrôle les mêmes règles (backend/src/services/demandes.js).
 */
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Button, DatePicker, Input, Radio, Typography } from 'antd';
import { CalendarOutlined, CloseOutlined, DownOutlined, UpOutlined, UserOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import api, { qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';

export interface Collegue { id: number; prenom: string; nom: string }

export interface Complements {
  pourMode: 'collegue' | 'texte';
  collegue: Collegue | null;
  pourTexte: string;
  date: Dayjs | null;
  creneau: string;
}

export const COMPLEMENTS_VIDES: Complements = { pourMode: 'collegue', collegue: null, pourTexte: '', date: null, creneau: '' };

/** Champs envoyés au serveur : seulement ceux qui sont remplis. */
export function champsComplements(c: Complements): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.pourMode === 'collegue' && c.collegue) out.beneficiaire_id = c.collegue.id;
  if (c.pourMode === 'texte' && c.pourTexte.trim()) out.beneficiaire_texte = c.pourTexte.trim();
  if (c.date) out.date_souhaitee = c.date.format('YYYY-MM-DD');
  if (c.creneau.trim()) out.creneau = c.creneau.trim();
  return out;
}

interface Props { value: Complements; onChange: (c: Complements) => void }

export default function ComplementsDemande({ value, onChange }: Props) {
  const { t } = useI18n();
  const [voirPour, setVoirPour] = useState(false);
  const [voirQuand, setVoirQuand] = useState(false);
  const [q, setQ] = useState('');
  const [trouves, setTrouves] = useState<Collegue[] | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>();
  const idPour = useId();
  const idQuand = useId();
  const set = (p: Partial<Complements>) => onChange({ ...value, ...p });

  // Formulaire remis à zéro (« Faire une autre demande ») : les sections se referment.
  useEffect(() => {
    if (value === COMPLEMENTS_VIDES) { setVoirPour(false); setVoirQuand(false); setQ(''); setTrouves(null); }
  }, [value]);

  const chercher = (texte: string) => {
    setQ(texte);
    clearTimeout(minuterie.current);
    if (texte.trim().length < 2) { setTrouves(null); return; }
    minuterie.current = setTimeout(() => {
      api.get<Collegue[]>(`/demandes/beneficiaires${qs({ q: texte.trim() })}`).then(setTrouves).catch(() => setTrouves([]));
    }, 250);
  };

  const bascule = (ouvert: boolean, onClick: () => void, controls: string, icone: ReactNode, libelle: string) => (
    <Button type="link" className="dem-complement-bascule" aria-expanded={ouvert} aria-controls={controls} onClick={onClick}>
      <span className="dem-voisines-libelle">{icone}<span>{libelle} {ouvert ? <UpOutlined /> : <DownOutlined />}</span></span>
    </Button>
  );

  return (
    <div className="dem-complements">
      {bascule(voirPour, () => setVoirPour(!voirPour), idPour, <UserOutlined className="dem-voisines-icone" />, t('demande.pour.lien'))}
      {voirPour && (
        <div id={idPour} className="dem-complement">
          <Radio.Group optionType="button" value={value.pourMode} onChange={(e) => set({ pourMode: e.target.value })} aria-label={t('demande.pour.lien')}
            options={[{ value: 'collegue', label: t('demande.pour.collegue') }, { value: 'texte', label: t('demande.pour.texte') }]} />
          {value.pourMode === 'collegue' ? (
            value.collegue ? (
              <div className="dem-pour-choisi">
                <span><UserOutlined /> {t('demande.pour.pour')} <strong>{value.collegue.prenom} {value.collegue.nom}</strong></span>
                <Button icon={<CloseOutlined />} onClick={() => set({ collegue: null })}>{t('demande.pour.retirer')}</Button>
              </div>
            ) : (
              <>
                <label htmlFor={`${idPour}-q`} className="dem-complement-label">{t('demande.pour.chercher')}</label>
                <Input id={`${idPour}-q`} value={q} onChange={(e) => chercher(e.target.value)} placeholder={t('demande.pour.chercher.placeholder')} allowClear />
                {trouves && (trouves.length ? (
                  <ul className="dem-resultats" aria-label={t('demande.pour.resultats')} style={{ marginTop: 8 }}>
                    {trouves.map((c) => (
                      <li key={c.id}>
                        <button type="button" className="dem-resultat" onClick={() => { set({ collegue: c }); setQ(''); setTrouves(null); }}>
                          <span className="dem-resultat-nom">{c.prenom} {c.nom}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{t('demande.pour.aucun')}</Typography.Text>)}
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>{t('demande.pour.collegue.aide')}</Typography.Text>
              </>
            )
          ) : (
            <>
              <label htmlFor={`${idPour}-texte`} className="dem-complement-label">{t('demande.pour.texte.label')}</label>
              <Input id={`${idPour}-texte`} value={value.pourTexte} maxLength={200} onChange={(e) => set({ pourTexte: e.target.value })}
                placeholder={t('demande.pour.texte.placeholder')} />
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>{t('demande.pour.texte.aide')}</Typography.Text>
            </>
          )}
        </div>
      )}
      {bascule(voirQuand, () => setVoirQuand(!voirQuand), idQuand, <CalendarOutlined className="dem-voisines-icone" />, t('demande.quand.lien'))}
      {voirQuand && (
        <div id={idQuand} className="dem-complement">
          <label htmlFor={`${idQuand}-date`} className="dem-complement-label">{t('demande.quand.date')}</label>
          <DatePicker id={`${idQuand}-date`} value={value.date} onChange={(d) => set({ date: d })} format="DD/MM/YYYY" inputReadOnly
            placeholder={t('demande.quand.date.placeholder')} style={{ width: '100%', maxWidth: 260 }}
            disabledDate={(d) => d.isBefore(dayjs().startOf('day')) || d.isAfter(dayjs().add(1, 'year'))} />
          <label htmlFor={`${idQuand}-creneau`} className="dem-complement-label" style={{ marginTop: 12 }}>{t('demande.quand.creneau')}</label>
          <Input id={`${idQuand}-creneau`} value={value.creneau} maxLength={200} onChange={(e) => set({ creneau: e.target.value })}
            placeholder={t('demande.quand.creneau.placeholder')} />
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>{t('demande.quand.aide')}</Typography.Text>
        </div>
      )}
    </div>
  );
}

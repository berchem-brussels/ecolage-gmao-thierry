/**
 * Demandes déjà ouvertes dans le même bâtiment, avant l'envoi (cahier des charges DEM-04 ; version 0.7.0, point 1).
 * Le « même bâtiment » est celui du lieu choisi, avec tous ses locaux (un site entier si le lieu n'est dans aucun
 * bâtiment) : l'accueil du 33, l'accueil ETL et l'accueil Population font partie de la Maison communale.
 * Bloc discret et replié : « 2 demandes déjà ouvertes dans ce bâtiment · Voir ». Ouvert, des cartes légères (catégorie
 * et état, lieu et date, début de la description) et un bouton « Moi aussi », sous la carte sur téléphone.
 * Aucun nom de demandeur (règle du serveur). « Moi aussi » demande une confirmation ; le texte déjà tapé part comme
 * remarque pour le seul service technique. Rien ne s'affiche s'il n'y a aucune demande ouverte.
 */
import { useEffect, useId, useState } from 'react';
import { Button, Modal, Space, Tag, Typography } from 'antd';
import { DownOutlined, UpOutlined, TeamOutlined, InfoCircleOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { Icone } from '../../referentiel';
import { type Demande, type DemandeVoisine, type Voisines, COULEUR_ETAT, dateDepot } from '../../demandes';

interface Props {
  lieuId: number | null;
  categorieId: number | null;
  /** Texte déjà tapé : joint comme remarque pour le service technique si la personne rejoint une demande. */
  remarque: string;
  onSuivie: (d: Demande) => void;
}

const LIMITE = 5;

export default function DemandesVoisines({ lieuId, categorieId, remarque, onSuivie }: Props) {
  const { t, lang } = useI18n();
  const [data, setData] = useState<Voisines | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [tout, setTout] = useState(false);
  const [choisie, setChoisie] = useState<DemandeVoisine | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const zone = useId();

  useEffect(() => { setOuvert(false); setTout(false); }, [lieuId]);
  useEffect(() => {
    if (!lieuId) { setData(null); return; }
    let actif = true;
    api.get<Voisines>(`/demandes/voisines${qs({ lieu_id: lieuId, categorie_id: categorieId || undefined, limit: tout ? 50 : LIMITE })}`)
      .then((v) => { if (actif) setData(v); })
      .catch(() => { if (actif) setData(null); });
    return () => { actif = false; };
  }, [lieuId, categorieId, tout]);

  if (!data || !data.total) return null;

  const batiment = lang === 'nl' ? data.batiment.nom_nl : data.batiment.nom_fr;
  const resume = (data.total === 1 ? t('demande.voisines.une') : t('demande.voisines.plusieurs').replace('{n}', String(data.total)))
    .replace('{batiment}', batiment);
  const cat = (d: DemandeVoisine) => (lang === 'nl' ? d.categorie_libelle_nl : d.categorie_libelle_fr);
  const lieu = (d: DemandeVoisine) => (lang === 'nl' ? d.lieu_nom_nl : d.lieu_nom_fr);
  const texte = remarque.trim();

  const confirmer = async () => {
    if (!choisie) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const d = await api.post<Demande>(`/demandes/${choisie.id}/suivre`, texte ? { remarque: texte } : {});
      setChoisie(null);
      onSuivie(d);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  return (
    <div className="dem-voisines">
      <Button type="link" className="dem-voisines-bascule" aria-expanded={ouvert} aria-controls={zone} onClick={() => setOuvert(!ouvert)}>
        <span className="dem-voisines-libelle">
          <InfoCircleOutlined className="dem-voisines-icone" />
          <span>{resume} <span className="dem-voisines-voir">· {ouvert ? t('demande.voisines.masquer') : t('demande.voisines.voir')} {ouvert ? <UpOutlined /> : <DownOutlined />}</span></span>
        </span>
      </Button>
      {ouvert && (
        <div id={zone}>
          <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block', margin: '4px 0 8px' }}>{t('demande.voisines.aide')}</Typography.Text>
          <ul className="dem-voisines-liste" aria-label={resume}>
            {data.demandes.map((d) => (
              <li key={d.id} className="dem-voisine">
                <div className="dem-voisine-texte">
                  <div className="dem-voisine-ligne">
                    <span className="dem-voisine-cat"><Icone code={d.categorie_icone} style={{ color: 'var(--app-primary)' }} /> {cat(d)}</span>
                    <span className="dem-voisine-tags">
                      {d.danger === 1 && <Tag color="red" style={{ marginInlineEnd: 0 }}>{t('demande.danger.tag')}</Tag>}
                      <Tag color={COULEUR_ETAT[d.etat]} style={{ marginInlineEnd: 0 }}>{t(`demande.etat.${d.etat}`)}</Tag>
                    </span>
                  </div>
                  <div className="dem-voisine-meta">{lieu(d)} · {dateDepot(d.created_at).slice(0, 10)}</div>
                  <div className="dem-voisine-extrait">{d.extrait}</div>
                </div>
                <div className="dem-voisine-action">
                  {d.propre ? <Tag>{t('demande.voisines.votre')}</Tag>
                    : d.suivie ? <Tag color="green">{t('demande.voisines.suivie')}</Tag>
                      : <Button icon={<TeamOutlined />} onClick={() => { setErreur(null); setChoisie(d); }}
                        aria-label={`${t('demande.voisines.moiaussi')} : ${cat(d)}, ${lieu(d)}`}>{t('demande.voisines.moiaussi')}</Button>}
                </div>
              </li>
            ))}
          </ul>
          {!tout && data.total > data.demandes.length && (
            <Button type="link" style={{ paddingInline: 0 }} onClick={() => setTout(true)}>
              {t('demande.voisines.autres').replace('{n}', String(data.total - data.demandes.length))}
            </Button>
          )}
        </div>
      )}
      <Modal open={!!choisie} title={t('demande.voisines.confirmer.title')} onCancel={() => setChoisie(null)} onOk={confirmer}
        okText={t('demande.voisines.moiaussi')} cancelText={t('common.cancel')} confirmLoading={envoi} destroyOnClose>
        {choisie && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text>
              {t('demande.voisines.confirmer.texte').replace('{numero}', choisie.numero).replace('{quoi}', `${cat(choisie)} · ${lieu(choisie)}`)}
            </Typography.Text>
            <Typography.Text type="secondary">{texte ? t('demande.voisines.confirmer.remarque') : t('demande.voisines.confirmer.sansremarque')}</Typography.Text>
            {erreur && <Typography.Text type="danger" role="alert">{erreur}</Typography.Text>}
          </Space>
        )}
      </Modal>
    </div>
  );
}

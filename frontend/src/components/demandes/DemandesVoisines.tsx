/**
 * Demandes déjà ouvertes dans le même bâtiment, avant l'envoi (cahier des charges DEM-04 ; version 0.7.0, point 1).
 * Le « même bâtiment » est celui du lieu choisi, avec tous ses locaux (un site entier si le lieu n'est dans aucun
 * bâtiment) : l'accueil du 33, l'accueil ETL et l'accueil Population font partie de la Maison communale.
 * Bloc discret et replié : « 2 demandes déjà ouvertes dans ce bâtiment · Voir ». Ouvert, des cartes légères (catégorie
 * et état, lieu et date, début de la description) et un bouton « Moi aussi », sous la carte sur téléphone.
 * Aucun nom de demandeur (règle du serveur). « Moi aussi » demande une confirmation ; le texte déjà tapé part comme
 * remarque pour le seul service technique. Rien ne s'affiche s'il n'y a aucune demande ouverte.
 *
 * 0.21.5 (R6 du test orienté utilisateur du 26/11/2026, DV-202) : « 20 demandes déjà ouvertes dans ce bâtiment » ne se
 * lisait pas. Le bloc parle d'abord des demandes proches (même local, ou même catégorie quand elle est choisie) :
 * « 2 demandes déjà ouvertes à cet endroit ou pour le même type de problème » ; le reste du bâtiment est replié sous
 * « 18 autres demandes ailleurs dans le bâtiment (…) ». Sans demande proche, comme avant (bâtiment, replié).
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
  // 0.21.5 (R6) : reste du bâtiment, replié sous les demandes proches.
  const [voirAilleurs, setVoirAilleurs] = useState(false);
  const [toutesProches, setToutesProches] = useState(false);
  const zone = useId();

  useEffect(() => { setOuvert(false); setTout(false); setVoirAilleurs(false); setToutesProches(false); }, [lieuId]);
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
  // Serveur antérieur à la 0.21.5 (sans « proche ») : le même local seul.
  const estProche = (d: DemandeVoisine) => (d.proche ?? d.meme_lieu) === 1;
  const nbProches = data.proches ?? data.demandes.filter(estProche).length;
  const nbAilleurs = data.total - nbProches;
  const compte = (cle: string, n: number) => (n === 1 ? t(`${cle}.une`) : t(`${cle}.plusieurs`).replace('{n}', String(n))).replace('{batiment}', batiment);
  // Avec des demandes proches : elles seules dans le résumé, le reste du bâtiment replié dessous. Sans : comme avant.
  const resume = nbProches > 0 ? compte(categorieId ? 'demande.voisines.proches' : 'demande.voisines.proches.lieu', nbProches) : compte('demande.voisines', data.total);
  // Les proches au-delà des cinq premières attendent « Voir les autres », même quand le reste du bâtiment est chargé.
  const proches = data.demandes.filter(estProche).slice(0, toutesProches ? undefined : LIMITE);
  const ailleurs = data.demandes.filter((d) => !estProche(d));
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

  const liste = (ds: DemandeVoisine[], nom: string) => (
    <ul className="dem-voisines-liste" aria-label={nom}>
      {ds.map((d) => (
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
  );
  const resteAilleurs = compte('demande.voisines.ailleurs', nbAilleurs);

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
          {nbProches > 0 ? (
            <>
              {liste(proches, resume)}
              {!toutesProches && nbProches > proches.length && (
                <Button type="link" style={{ paddingInline: 0 }} onClick={() => { setTout(true); setToutesProches(true); }}>
                  {t('demande.voisines.autres').replace('{n}', String(nbProches - proches.length))}
                </Button>
              )}
              {nbAilleurs > 0 && (
                <div className="dem-voisines-ailleurs">
                  {/* Libellé long (NL, téléphone) : passe à la ligne comme le bouton du résumé (mobile:check, 320 px). */}
                  <Button type="link" className="dem-voisines-bascule" aria-expanded={voirAilleurs} aria-controls={`${zone}-ailleurs`}
                    onClick={() => { setVoirAilleurs(!voirAilleurs); setTout(true); }}>
                    <span>{resteAilleurs} <span className="dem-voisines-voir">· {voirAilleurs ? t('demande.voisines.masquer') : t('demande.voisines.voir')} {voirAilleurs ? <UpOutlined /> : <DownOutlined />}</span></span>
                  </Button>
                  {voirAilleurs && tout && <div id={`${zone}-ailleurs`}>{liste(ailleurs, resteAilleurs)}</div>}
                </div>
              )}
            </>
          ) : (
            <>
              {liste(data.demandes, resume)}
              {!tout && data.total > data.demandes.length && (
                <Button type="link" style={{ paddingInline: 0 }} onClick={() => setTout(true)}>
                  {t('demande.voisines.autres').replace('{n}', String(data.total - data.demandes.length))}
                </Button>
              )}
            </>
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

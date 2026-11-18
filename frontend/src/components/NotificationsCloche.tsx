/**
 * Cloche de notifications de l'en-tête (version 0.17.0, étape 13, point 1 ; standard section 12.3, `Badge` ; cahier des
 * charges NOT-01, NOT-02, NOT-06). Le compteur des non lues de l'entité active se relit à l'ouverture de l'écran, toutes
 * les 60 secondes tant que la page est visible, au retour sur l'onglet et au changement d'entité. Un clic ouvre le volet :
 * les notifications les plus récentes, « Non lues » ou « Toutes », « Tout marquer comme lu ». Une notification ouverte
 * est marquée lue et mène à son écran. Les textes viennent du serveur en FR et en NL (aucun texte libre, NOT-06).
 * Sur téléphone, le volet prend toute la largeur ; le bouton reste une icône avec son nom accessible.
 * Sans entité active, la cloche n'apparaît pas (le serveur répondrait 403).
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Drawer, Empty, Grid, Segmented, Spin, Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api, { qs } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { instant } from '../demandes';

export interface Notification {
  id: number; evenement: string; variante: string; objet: string; objet_id: number; numero: string; lien: string;
  lue: 0 | 1; lue_le: string | null; created_at: string; texte_fr: string; texte_nl: string; libelle_fr: string; libelle_nl: string;
}
interface Compteur { non_lues: number; autres_entites: number }

const PAS = 20;
const INTERVALLE = 60000;

export default function NotificationsCloche() {
  const { t, lang } = useI18n();
  const { entite } = useAuth();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const mobile = screens.md === false;
  const [compteur, setCompteur] = useState<Compteur>({ non_lues: 0, autres_entites: 0 });
  const [ouvert, setOuvert] = useState(false);
  const [filtre, setFiltre] = useState<'toutes' | 'non_lues'>('toutes');
  const [rows, setRows] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(false);
  const entiteId = entite?.id;

  const relireCompteur = useCallback(() => {
    if (!entiteId) return;
    api.get<Compteur>('/notifications/compteur').then(setCompteur).catch(() => undefined);
  }, [entiteId]);

  useEffect(() => {
    if (!entiteId) return undefined;
    relireCompteur();
    const tic = window.setInterval(() => { if (document.visibilityState !== 'hidden') relireCompteur(); }, INTERVALLE);
    const auRetour = () => { if (document.visibilityState !== 'hidden') relireCompteur(); };
    window.addEventListener('focus', auRetour);
    document.addEventListener('visibilitychange', auRetour);
    // Un écran qui vient de causer une notification peut demander de relire le compteur tout de suite.
    window.addEventListener('app-notifications', relireCompteur);
    return () => {
      window.clearInterval(tic);
      window.removeEventListener('focus', auRetour);
      document.removeEventListener('visibilitychange', auRetour);
      window.removeEventListener('app-notifications', relireCompteur);
    };
  }, [entiteId, relireCompteur]);

  const charger = useCallback(async (depuis: number, f: 'toutes' | 'non_lues') => {
    setChargement(true);
    setErreur(false);
    try {
      const r = await api.page<Notification>(`/notifications${qs({ limit: PAS, offset: depuis, non_lues: f === 'non_lues' ? 1 : undefined })}`);
      setRows((avant) => (depuis === 0 ? r.data : [...avant, ...r.data]));
      setTotal(r.pagination.total);
      if (r.meta) setCompteur({ non_lues: Number(r.meta.non_lues) || 0, autres_entites: Number(r.meta.autres_entites) || 0 });
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { if (ouvert) charger(0, filtre); }, [ouvert, filtre, entiteId, charger]);

  if (!entiteId) return null;

  const ouvrir = async (n: Notification) => {
    if (!n.lue) {
      try { await api.put<Notification>(`/notifications/${n.id}/lue`, {}); } catch { /* l'écran s'ouvre quand même */ }
      relireCompteur();
    }
    setOuvert(false);
    navigate(n.lien);
  };
  const toutLire = async () => {
    try {
      const r = await api.put<Compteur & { marquees: number }>('/notifications/lues', {});
      setCompteur({ non_lues: r.non_lues, autres_entites: r.autres_entites });
      charger(0, filtre);
    } catch { setErreur(true); }
  };

  const nom = compteur.non_lues === 1 ? t('notif.cloche.non_lue')
    : compteur.non_lues ? t('notif.cloche.non_lues').replace('{n}', String(compteur.non_lues)) : t('notif.cloche');
  return (
    <>
      <Button type="text" aria-label={nom} title={nom} onClick={() => setOuvert(true)} data-visite="cloche" style={{ paddingInline: mobile ? 6 : undefined }}
        icon={<Badge count={compteur.non_lues} size="small" overflowCount={99} offset={[2, -2]}><BellOutlined style={{ fontSize: 18 }} /></Badge>} />
      <Drawer open={ouvert} onClose={() => setOuvert(false)} width={mobile ? '100%' : 400} title={t('notif.titre')}
        closable={{ 'aria-label': t('common.close') }}>
        {/* « Tout marquer comme lu » sous le filtre, pas dans l'en-tête du volet : à 320 px, il coupait le titre. */}
        <Segmented block value={filtre} onChange={(v) => setFiltre(v as 'toutes' | 'non_lues')} style={{ marginBottom: 8 }} aria-label={t('notif.filtre')}
          options={[{ value: 'toutes', label: t('notif.filtre.toutes') }, { value: 'non_lues', label: compteur.non_lues ? `${t('notif.filtre.non_lues')} (${compteur.non_lues})` : t('notif.filtre.non_lues') }]} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button size="small" onClick={toutLire} disabled={!compteur.non_lues} style={{ whiteSpace: 'normal', height: 'auto' }}>{t('notif.tout_lire')}</Button>
        </div>
        {compteur.autres_entites > 0 && (
          <Alert type="info" showIcon style={{ marginBottom: 12 }}
            message={(compteur.autres_entites === 1 ? t('notif.autres_entites.une') : t('notif.autres_entites')).replace('{n}', String(compteur.autres_entites))} />
        )}
        {erreur && <Alert type="error" showIcon style={{ marginBottom: 12 }} message={t('notif.erreur')} />}
        {!rows.length && chargement && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}
        {!rows.length && !chargement && !erreur && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filtre === 'non_lues' ? t('notif.vide.non_lues') : t('notif.vide')} />
        )}
        {rows.length > 0 && (
          <ul aria-label={t('notif.titre')} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.map((n) => (
              <li key={n.id} style={{ borderBottom: '1px solid var(--app-border)' }}>
                <button type="button" onClick={() => ouvrir(n)} className="notif-item"
                  style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'start', background: 'none', border: 0, padding: '10px 4px', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
                  <span aria-hidden style={{ flex: '0 0 8px', width: 8, height: 8, marginTop: 7, borderRadius: 4, background: n.lue ? 'transparent' : 'var(--app-primary)' }} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    {!n.lue && <span className="sr-only">{t('notif.non_lue')} : </span>}
                    <span style={{ display: 'block', fontWeight: n.lue ? 400 : 600, overflowWrap: 'anywhere' }}>{lang === 'nl' ? n.texte_nl : n.texte_fr}</span>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{instant(n.created_at)}</Typography.Text>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && rows.length < total && (
          <Button block style={{ marginTop: 12 }} loading={chargement} onClick={() => charger(rows.length, filtre)}>{t('notif.plus')}</Button>
        )}
      </Drawer>
    </>
  );
}

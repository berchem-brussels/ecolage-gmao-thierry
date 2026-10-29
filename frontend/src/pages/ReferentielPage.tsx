/**
 * Référentiel des demandes de l'entité active (responsable du service technique ; cahier des charges REF-06, PRI-01,
 * PRI-02, ADM-03 ; décision D-11). Quatre onglets : catégories en arbre avec l'aperçu des tuiles, priorités et délais,
 * calendrier des jours ouvrables, simulateur d'échéance. L'onglet ouvert est dans l'adresse (?onglet=priorites).
 * Changer d'entité active recharge chaque onglet.
 */
import { useCallback, useEffect, useState } from 'react';
import { Tabs, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import api, { ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { type ArbreCategories, type Categorie, type PrioriteFiche } from '../referentiel';
import CategoriesTab from '../components/referentiel/CategoriesTab';
import PrioritesTab from '../components/referentiel/PrioritesTab';
import CalendrierTab from '../components/referentiel/CalendrierTab';
import SimulateurTab from '../components/referentiel/SimulateurTab';

const ONGLETS = ['categories', 'priorites', 'calendrier', 'simulateur'];

export default function ReferentielPage() {
  const { t, tField } = useI18n();
  const { entite, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const onglet = ONGLETS.includes(params.get('onglet') || '') ? (params.get('onglet') as string) : 'categories';
  const [priorites, setPriorites] = useState<PrioriteFiche[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);

  const loadPriorites = useCallback(async () => {
    try { setPriorites((await api.page<PrioriteFiche>('/priorites')).data); } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
  }, [t]);
  useEffect(() => { loadPriorites(); }, [loadPriorites, user?.entite_active_id]);
  useEffect(() => {
    if (onglet !== 'simulateur') return;
    api.get<ArbreCategories>('/categories/arbre').then((a) => setCategories(a.domaines)).catch(() => setCategories([]));
  }, [onglet, user?.entite_active_id]);

  const remplacer = (p: PrioriteFiche) => setPriorites((l) => l.map((x) => (x.code === p.code ? p : x)));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{t('ref.title')}</Typography.Title>
        {entite && <Tag color="var(--app-primary)">{entite.code} · {tField(entite as unknown as Record<string, unknown>, 'nom')}</Tag>}
      </div>
      <Typography.Paragraph type="secondary">{t('ref.intro')}</Typography.Paragraph>
      <Tabs activeKey={onglet} onChange={(k) => setParams(k === 'categories' ? {} : { onglet: k }, { replace: true })} destroyInactiveTabPane
        items={[
          { key: 'categories', label: t('ref.tab.categories'), children: <CategoriesTab priorites={priorites} /> },
          { key: 'priorites', label: t('ref.tab.priorites'), children: <PrioritesTab priorites={priorites} onChange={remplacer} /> },
          { key: 'calendrier', label: t('ref.tab.calendrier'), children: <CalendrierTab /> },
          { key: 'simulateur', label: t('ref.tab.simulateur'), children: <SimulateurTab priorites={priorites} categories={categories} /> },
        ]} />
    </div>
  );
}

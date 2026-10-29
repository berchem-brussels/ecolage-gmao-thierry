/**
 * Paramètres de l'instance (administrateur ; cahier des charges ADM-01, standard v3.2 section 17.3).
 * Libellés, descriptions, défauts et choix viennent du catalogue servi par l'API (config/parametres-instance.json) :
 * l'écran ne connaît aucune clé en dur. Chaque réglage s'applique sans redémarrage ; l'en-tête, le menu et la page de
 * connexion se rechargent aussitôt. Choix exclusif en boutons (standard section 12.4). Retour au défaut par réglage.
 * Onglet Modules (ADM-02) : activation pour toute l'instance ; noyau et modules à venir montrés sans réglage.
 * L'onglet ouvert est dans l'adresse de la page (?onglet=modules).
 */
import { useState } from 'react';
import { Card, List, Popconfirm, Space, Switch, Tabs, Tag, Typography, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import api, { ApiError } from '../api';
import ReglagesForm from '../components/ReglagesForm';
import { useI18n } from '../contexts/I18nContext';
import { useSettings } from '../contexts/SettingsContext';
import { type Module, reloadModules, useModules } from '../moduleMap';

const GROUPES = ['identite', 'affichage'];

/** Modules de l'instance : un interrupteur par module disponible ; extinction confirmée avec ce qui se ferme. */
function ModulesPanel() {
  const { t, tField } = useI18n();
  const { modules, loaded } = useModules();
  const [busy, setBusy] = useState<string | null>(null);
  const lbl = (o: object, f: string) => tField(o as Record<string, unknown>, f);
  const regler = async (m: Module, actif: boolean) => {
    setBusy(m.code);
    try {
      await api.put(`/modules/${m.code}`, { actif: actif ? 1 : 0 });
      message.success(actif ? t('modules.on.done') : t('modules.off.done'));
      reloadModules();
    } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); } finally { setBusy(null); }
  };
  const etat = (m: Module) => {
    if (m.noyau) return <Tag color="blue">{t('modules.noyau')}</Tag>;
    if (!m.disponible) return <Tag>{t('modules.avenir')}</Tag>;
    return m.actif ? <Tag color="green">{t('modules.actif')}</Tag> : <Tag color="orange">{t('modules.eteint')}</Tag>;
  };
  const interrupteur = (m: Module) => {
    // Un module à venir n'a pas d'interrupteur : il n'existe pas encore, un interrupteur allumé laisserait croire le contraire.
    if (!m.disponible && !m.noyau) return null;
    const sw = (onChange?: (v: boolean) => void) => (
      <Switch checked={m.actif} disabled={m.noyau || !m.disponible} loading={busy === m.code} onChange={onChange}
        aria-label={`${lbl(m, 'libelle')} : ${m.actif ? t('modules.actif') : t('modules.eteint')}`} />
    );
    if (m.noyau || !m.disponible || !m.actif) return sw((v) => regler(m, v));
    return (
      <Popconfirm title={t('modules.off.confirm')} description={<div style={{ maxWidth: 320 }}>{lbl(m, 'ferme')}</div>}
        okText={t('modules.off')} cancelText={t('common.cancel')} okButtonProps={{ danger: true }} onConfirm={() => regler(m, false)}>
        {sw()}
      </Popconfirm>
    );
  };
  return (
    <Card>
      <Typography.Paragraph type="secondary">{t('modules.intro')}</Typography.Paragraph>
      <List loading={!loaded} dataSource={modules} rowKey="code" renderItem={(m) => (
        <List.Item actions={m.disponible || m.noyau ? [interrupteur(m)] : []}>
          {/* Pas de List.Item.Meta : son titre est un h4 qui casserait l'ordre des titres (h1, puis h4). */}
          <div style={{ minWidth: 0 }}>
            <Space size={8} wrap style={{ fontWeight: 500 }}><span>{lbl(m, 'libelle')}</span>{etat(m)}</Space>
            <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>{lbl(m, 'description')}</Typography.Paragraph>
            {!m.disponible && !m.noyau && <Typography.Paragraph type="secondary" style={{ margin: 0 }}>{t('modules.avenir.etape').replace('{n}', String(m.etape))}</Typography.Paragraph>}
          </div>
        </List.Item>
      )} />
    </Card>
  );
}

export default function ParametresPage() {
  const { t } = useI18n();
  const { reload } = useSettings();
  const [search, setSearch] = useSearchParams();
  const onglet = search.get('onglet') === 'modules' ? 'modules' : 'general';
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{t('parametres.title')}</Typography.Title>
      </div>
      <Typography.Paragraph type="secondary">{t('parametres.intro')}</Typography.Paragraph>
      <Tabs activeKey={onglet} onChange={(k) => setSearch(k === 'general' ? {} : { onglet: k }, { replace: true })} items={[
        { key: 'general', label: t('parametres.tab.general'), children: <ReglagesForm endpoint="/parametres" groupes={GROUPES} prefixe="parametres" onSaved={reload} /> },
        { key: 'modules', label: t('parametres.tab.modules'), children: <ModulesPanel /> },
      ]} />
    </div>
  );
}

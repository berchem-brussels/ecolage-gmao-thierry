/**
 * Onglet « États des demandes » du référentiel (version 0.14.0, étape 9, point 7 ; cahier des charges CYC-04) : pour
 * chaque état en usage, le libellé vu par le demandeur et celui envoyé à la GRC, en FR et en NL, réglés par entité.
 * Les libellés livrés sont rappelés ; « Revenir aux libellés livrés » les remet. Chaque carte dit qui l'a modifiée et
 * quand. Les états qui ne servent pas encore (validation, planification, prestataire, fusion) arrivent avec leur étape.
 * Le serveur contrôle les droits (responsable : « parametres:gerer ») et la longueur (100 caractères).
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Input, Popconfirm, Space, Tag, Typography, message } from 'antd';
import api, { ApiError } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { COULEUR_ETAT, type Etat } from '../../demandes';
import type { Trace } from '../../referentiel';
import { texteObligatoire } from '../../validation';
import TraceFiche from './TraceFiche';

/** États en usage depuis la 0.14.0, dans l'ordre du cycle. */
export const ETATS_EN_USAGE: Etat[] = ['a_qualifier', 'qualifiee', 'en_cours', 'en_attente', 'terminee', 'cloturee', 'rouverte', 'refusee', 'annulee'];

export interface EtatFiche {
  id: number; code: Etat; libelle_fr: string; libelle_nl: string; grc_fr: string; grc_nl: string; updated_at: string;
  livre_fr: string; livre_nl: string; ferme: 0 | 1; compte_retard: 0 | 1; suspend: 'non' | 'selon_motif'; trace?: Trace;
}
type Valeurs = Pick<EtatFiche, 'libelle_fr' | 'libelle_nl' | 'grc_fr' | 'grc_nl'>;

function CarteEtat({ e, onSaved }: { e: EtatFiche; onSaved: (e: EtatFiche) => void }) {
  const { t, hint } = useI18n();
  const [form] = Form.useForm<Valeurs>();
  const fail = (x: unknown) => message.error(x instanceof ApiError ? x.message : t('common.error'));
  const enregistrer = async (v: Valeurs) => {
    try { onSaved(await api.put<EtatFiche>(`/etats-demande/${e.code}`, v)); message.success(t('common.saved')); } catch (x) { fail(x); }
  };
  const livre = e.libelle_fr === e.livre_fr && e.libelle_nl === e.livre_nl && e.grc_fr === e.livre_fr && e.grc_nl === e.livre_nl;
  const retablir = async () => {
    try {
      onSaved(await api.put<EtatFiche>(`/etats-demande/${e.code}`, { libelle_fr: e.livre_fr, libelle_nl: e.livre_nl, grc_fr: e.livre_fr, grc_nl: e.livre_nl }));
      message.success(t('common.saved'));
    } catch (x) { fail(x); }
  };
  const regle = [texteObligatoire(t), { max: 100 }];
  return (
    <Card size="small" title={<Tag color={COULEUR_ETAT[e.code]} style={{ whiteSpace: 'normal' }}>{t(`demande.etat_service.${e.code}`)}</Tag>}
      extra={livre ? <Tag>{t('ref.valeurs_livrees')}</Tag> : <Tag color="blue">{t('ref.modifie')}</Tag>}>
      <Form key={`${e.code}-${e.updated_at}`} form={form} layout="vertical" onFinish={enregistrer} preserve={false} initialValues={e}>
        <div className="ref-deux">
          <Form.Item name="libelle_fr" label={t('ref.etat.libelle_fr')} tooltip={hint('ref.etat.libelle')} rules={regle}><Input lang="fr" /></Form.Item>
          <Form.Item name="libelle_nl" label={t('ref.etat.libelle_nl')} tooltip={hint('ref.etat.libelle')} rules={regle}><Input lang="nl" /></Form.Item>
          <Form.Item name="grc_fr" label={t('ref.etat.grc_fr')} tooltip={hint('ref.etat.grc')} rules={regle}><Input lang="fr" /></Form.Item>
          <Form.Item name="grc_nl" label={t('ref.etat.grc_nl')} tooltip={hint('ref.etat.grc')} rules={regle}><Input lang="nl" /></Form.Item>
        </div>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          {t('ref.valeurs_livrees')} : {e.livre_fr} · <span lang="nl">{e.livre_nl}</span>
          {e.suspend === 'selon_motif' ? ` · ${t('ref.etat.suspend')}` : ''}{e.ferme ? ` · ${t('ref.etat.ferme')}` : ''}
        </Typography.Paragraph>
        <Typography.Paragraph style={{ fontSize: 12, marginTop: -8 }}><TraceFiche trace={e.trace} /></Typography.Paragraph>
        <Space wrap>
          <Button type="primary" htmlType="submit">{t('common.save')}</Button>
          {!livre && (
            <Popconfirm title={t('ref.etat.retablir.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={retablir}>
              <Button>{t('ref.etat.retablir')}</Button>
            </Popconfirm>
          )}
        </Space>
      </Form>
    </Card>
  );
}

export default function EtatsTab() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [etats, setEtats] = useState<EtatFiche[]>([]);
  const charger = useCallback(async () => {
    try { setEtats((await api.get<EtatFiche[]>('/etats-demande')).filter((e) => ETATS_EN_USAGE.includes(e.code))); } catch (e) { message.error(e instanceof ApiError ? e.message : t('common.error')); }
  }, [t]);
  useEffect(() => { charger(); }, [charger, user?.entite_active_id]);
  return (
    <div>
      <Typography.Paragraph type="secondary">{t('ref.etat.intro')}</Typography.Paragraph>
      <div className="ref-grille">
        {etats.map((e) => <CarteEtat key={e.code} e={e} onSaved={(n) => setEtats((l) => l.map((x) => (x.code === n.code ? n : x)))} />)}
      </div>
    </div>
  );
}

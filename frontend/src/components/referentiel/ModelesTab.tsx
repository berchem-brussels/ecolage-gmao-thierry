/**
 * Onglet « Modèles de réponse » du référentiel (version 0.15.0, étape 10, point 4 ; cahier des charges GES-09).
 *   1. Modèles de l'entité active, actifs d'abord, en cartes (tenues dans 320 px) : titre dans la langue de l'écran,
 *      début du texte, état, trace « Modifié le … par … ».
 *   2. Le responsable (« parametres:gerer ») ajoute un modèle (titre et texte en FR et en NL, ordre), le modifie, le
 *      désactive avec un motif ou le réactive ; le gestionnaire le lit seulement. Le serveur contrôle les droits.
 *   3. Variables admises, rappelées au-dessus des champs : {numero}, {lieu}, {etat}, {prenom}. Une autre est refusée par
 *      le serveur, qui nomme la variable fautive ; le message s'affiche au-dessus du formulaire, la saisie reste.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Drawer, Form, Grid, Input, InputNumber, Modal, Popconfirm, Space, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { hasPermission, useRoles } from '../../useRoles';
import { extrait, type ModeleReponse } from '../../demandes';
import { seulementEspaces, texteObligatoire } from '../../validation';
import ErreurObligatoire from '../ErreurObligatoire';
import TraceFiche from './TraceFiche';

type Valeurs = Pick<ModeleReponse, 'titre_fr' | 'titre_nl' | 'texte_fr' | 'texte_nl'> & { ordre?: number };

function ChampsModele({ lecture }: { lecture: boolean }) {
  const { t, hint } = useI18n();
  const titre = [texteObligatoire(t), { max: 100 }];
  const texte = [texteObligatoire(t), { max: 4000 }];
  return (
    <>
      <Form.Item name="titre_fr" label={t('modeles.titre_fr')} tooltip={hint('modeles.titre')} rules={titre}><Input lang="fr" disabled={lecture} /></Form.Item>
      <Form.Item name="titre_nl" label={t('modeles.titre_nl')} tooltip={hint('modeles.titre')} rules={titre}><Input lang="nl" disabled={lecture} /></Form.Item>
      <Form.Item name="texte_fr" label={t('modeles.texte_fr')} tooltip={hint('modeles.texte')} rules={texte}><Input.TextArea lang="fr" autoSize={{ minRows: 4, maxRows: 12 }} maxLength={4000} disabled={lecture} /></Form.Item>
      <Form.Item name="texte_nl" label={t('modeles.texte_nl')} tooltip={hint('modeles.texte')} rules={texte}><Input.TextArea lang="nl" autoSize={{ minRows: 4, maxRows: 12 }} maxLength={4000} disabled={lecture} /></Form.Item>
      <Form.Item name="ordre" label={t('listes.field.ordre')} tooltip={hint('ref.ordre')}><InputNumber min={0} max={100000} step={10} disabled={lecture} /></Form.Item>
    </>
  );
}

export default function ModelesTab() {
  const { t, tField } = useI18n();
  const { user, roles } = useAuth();
  const catalogue = useRoles();
  const gere = hasPermission(catalogue, roles, 'parametres:gerer');
  const mobile = Grid.useBreakpoint().md === false;
  const [modeles, setModeles] = useState<ModeleReponse[]>([]);
  const [variables, setVariables] = useState<string[]>(['numero', 'lieu', 'etat', 'prenom']);
  const [nouveau, setNouveau] = useState(false);
  const [courant, setCourant] = useState<ModeleReponse | null>(null);
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [formNouveau] = Form.useForm<Valeurs>();
  const [formFiche] = Form.useForm<Valeurs>();
  const texteErreur = (e: unknown) => (e instanceof ApiError ? e.message : t('common.error'));

  const charger = useCallback(async () => {
    try {
      const r = await api.page<ModeleReponse>(`/modeles-reponse${qs({ limit: 200 })}`);
      setModeles(r.data);
      if (Array.isArray(r.meta?.variables)) setVariables(r.meta.variables as string[]);
    } catch (e) { message.error(texteErreur(e)); }
  }, [t]);
  useEffect(() => { charger(); }, [charger, user?.entite_active_id]);

  const ouvrir = (m: ModeleReponse) => { setCourant(m); setMotif(''); setErreur(null); };
  const apres = async (m: ModeleReponse) => { setCourant(m); setMotif(''); setErreur(null); await charger(); };
  const creer = async (v: Valeurs) => {
    setErreur(null);
    try { await api.post('/modeles-reponse', v); message.success(t('common.saved')); setNouveau(false); charger(); } catch (e) { setErreur(texteErreur(e)); }
  };
  const enregistrer = async (v: Valeurs) => {
    if (!courant) return;
    setErreur(null);
    try { await apres(await api.put<ModeleReponse>(`/modeles-reponse/${courant.id}`, { ...v, ordre: v.ordre ?? courant.ordre })); message.success(t('common.saved')); } catch (e) { setErreur(texteErreur(e)); }
  };
  const desactiver = async () => {
    if (!courant || !motif.trim()) return;
    try { await apres(await api.del<ModeleReponse>(`/modeles-reponse/${courant.id}`, { motif: motif.trim() })); } catch (e) { setErreur(texteErreur(e)); }
  };
  const reactiver = async () => {
    if (!courant) return;
    try { await apres(await api.put<ModeleReponse>(`/modeles-reponse/${courant.id}`, { is_active: 1 })); } catch (e) { setErreur(texteErreur(e)); }
  };

  const etat = (m: ModeleReponse) => (m.is_active ? <Tag color="green">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>);
  const aideVariables = (
    <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
      {t('modeles.variables')} {variables.map((v) => <Tag key={v} style={{ marginInlineEnd: 4 }}>{`{${v}}`}</Tag>)}
    </Typography.Paragraph>
  );

  return (
    <div>
      <Space style={{ justifyContent: 'space-between', width: '100%', marginBottom: 8 }} wrap>
        <Typography.Paragraph type="secondary" style={{ margin: 0, maxWidth: 720 }}>{t('modeles.intro')}</Typography.Paragraph>
        {gere && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setErreur(null); setNouveau(true); }}>{t('modeles.nouveau')}</Button>}
      </Space>
      {aideVariables}
      <ul className="ref-grille modeles-liste" aria-label={t('ref.tab.modeles')}>
        {modeles.map((m) => (
          <li key={m.id}>
            <Card size="small" hoverable onClick={() => ouvrir(m)} style={{ height: '100%' }}
              title={<Button type="link" style={{ paddingInline: 0, whiteSpace: 'normal', textAlign: 'start', height: 'auto' }} onClick={(e) => { e.stopPropagation(); ouvrir(m); }}>{tField(m as unknown as Record<string, unknown>, 'titre')}</Button>}
              extra={etat(m)}>
              <Typography.Paragraph type="secondary" style={{ whiteSpace: 'pre-wrap', marginBottom: 6 }}>{extrait(tField(m as unknown as Record<string, unknown>, 'texte'), 140)}</Typography.Paragraph>
              <TraceFiche trace={m.trace} style={{ fontSize: 12 }} />
            </Card>
          </li>
        ))}
      </ul>

      <Modal open={nouveau} destroyOnClose title={t('modeles.nouveau')} okText={t('common.save')} cancelText={t('common.cancel')}
        onOk={() => formNouveau.submit()} onCancel={() => setNouveau(false)}>
        {aideVariables}
        {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
        <Form form={formNouveau} layout="vertical" onFinish={creer} preserve={false}><ChampsModele lecture={false} /></Form>
      </Modal>

      <Drawer open={!!courant} width={mobile ? '100%' : 560} title={courant ? tField(courant as unknown as Record<string, unknown>, 'titre') : ''} onClose={() => setCourant(null)} destroyOnClose>
        {courant && (
          <>
            <Space wrap style={{ marginBottom: 12 }}>{etat(courant)}<TraceFiche trace={courant.trace} style={{ fontSize: 12 }} /></Space>
            {courant.motif_desactivation && <Typography.Paragraph type="secondary">{t('common.reason')} : {courant.motif_desactivation}</Typography.Paragraph>}
            {aideVariables}
            {erreur && <Alert type="error" showIcon message={erreur} style={{ marginBottom: 12 }} />}
            <Form key={`${courant.id}-${courant.updated_at}`} form={formFiche} layout="vertical" onFinish={enregistrer} preserve={false} initialValues={courant}>
              <ChampsModele lecture={!gere} />
              {gere && <Button type="primary" htmlType="submit">{t('common.save')}</Button>}
            </Form>
            {gere && (courant.is_active ? (
              <Card size="small" style={{ marginTop: 24 }} title={t('modeles.desactiver')}>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('modeles.desactiver.aide')}</Typography.Paragraph>
                <Input.TextArea rows={2} aria-label={t('listes.motif')} placeholder={t('listes.motif')} value={motif} onChange={(e) => setMotif(e.target.value)}
                  aria-invalid={seulementEspaces(motif) || undefined} aria-describedby={seulementEspaces(motif) ? 'motif-modele-erreur' : undefined} />
                {seulementEspaces(motif) && <ErreurObligatoire id="motif-modele-erreur" />}
                <Popconfirm title={t('modeles.desactiver.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={desactiver} disabled={!motif.trim()}>
                  <Button danger style={{ marginTop: 8 }} disabled={!motif.trim()}>{t('modeles.desactiver')}</Button>
                </Popconfirm>
              </Card>
            ) : (
              <Button style={{ marginTop: 24 }} onClick={reactiver}>{t('modeles.reactiver')}</Button>
            ))}
          </>
        )}
      </Drawer>
    </div>
  );
}

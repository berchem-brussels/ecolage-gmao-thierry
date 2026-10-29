/**
 * Formulaire de réglages servi par un catalogue de l'API (paramètres de l'instance, paramètres de l'entité).
 * Libellés, descriptions, défauts, types et choix viennent du serveur ; l'écran ne connaît aucune clé en dur.
 * Une carte par groupe, un bouton Enregistrer par carte (un appel par réglage modifié : une ligne au journal chacun),
 * retour à la valeur livrée par réglage. Choix exclusif en boutons (standard v3.2, section 12.4).
 * 0.7.0 : type texte_long (zone de plusieurs lignes, sans compteur qui recouvrirait l'explication ; variables permises
 * rappelées et contrôlées comme au serveur).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Popconfirm, Radio, Space, Tag, Typography, message } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { courriel, obligatoire, texteObligatoire } from '../validation';

export interface Choix { valeur: string; libelle_fr: string; libelle_nl: string }
export interface Reglage {
  cle: string; groupe: string; type: 'texte' | 'texte_long' | 'choix' | 'telephone' | 'courriel' | 'entier'; requis?: boolean;
  max: number | null; min?: number | null; choix?: Choix[] | null; motif?: string | null;
  /** Variables permises dans un texte long (0.7.0), par exemple « entite » pour {entite}. */
  variables?: string[] | null;
  libelle_fr: string; libelle_nl: string; description_fr: string; description_nl: string;
  valeur: string; defaut: string; est_defaut: boolean; updated_at: string | null;
}

interface Props {
  /** Chemin de l'API, par exemple '/parametres' ou '/parametres-entite'. */
  endpoint: string;
  /** Groupes affichés, dans l'ordre ; leur titre est la clé de traduction `${prefixe}.groupe.${code}`. */
  groupes: string[];
  prefixe: string;
  /** Appelé après chaque enregistrement réussi (recharger les paramètres publics, par exemple). */
  onSaved?: () => Promise<void> | void;
  /** Clé qui force le rechargement (entité active). */
  reloadKey?: unknown;
}

export default function ReglagesForm({ endpoint, groupes, prefixe, onSaved, reloadKey }: Props) {
  const { t, tField } = useI18n();
  const [rows, setRows] = useState<Reglage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [form] = Form.useForm<Record<string, string | number>>();
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));
  const lbl = (o: object, f: string) => tField(o as Record<string, unknown>, f);
  const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.page<Reglage>(`${endpoint}${qs({ limit: 200 })}`)).data;
      setRows(data);
      form.setFieldsValue(Object.fromEntries(data.map((p) => [p.cle, p.type === 'entier' ? Number(p.valeur) : (p.valeur ?? '')])));
    } catch (e) { fail(e); } finally { setLoading(false); }
  }, [t, form, endpoint]);
  useEffect(() => { load(); }, [load, reloadKey]);

  const parGroupe = useMemo(() => groupes.map((g) => ({ g, items: rows.filter((p) => p.groupe === g) })), [rows, groupes]);

  const saveGroupe = async (g: string) => {
    const items = rows.filter((p) => p.groupe === g);
    try { await form.validateFields(items.map((p) => p.cle)); } catch { return; }
    const changed = items.filter((p) => texte(form.getFieldValue(p.cle)) !== (p.valeur ?? ''));
    if (!changed.length) { message.info(t('parametres.nochange')); return; }
    setSaving(g);
    try {
      for (const p of changed) await api.put(`${endpoint}/${p.cle}`, { valeur: texte(form.getFieldValue(p.cle)) });
      message.success(t('common.saved'));
      await load();
      await onSaved?.();
    } catch (e) { fail(e); } finally { setSaving(null); }
  };

  const reset = async (p: Reglage) => {
    try { await api.del(`${endpoint}/${p.cle}`); message.success(t('parametres.reset.done')); await load(); await onSaved?.(); } catch (e) { fail(e); }
  };

  const shown = (p: Reglage, v: string) => (p.type === 'choix' ? lbl(p.choix?.find((c) => c.valeur === v) || {}, 'libelle') || v : v || t('parametres.empty'));

  const rules = (p: Reglage) => {
    // Un choix a toujours une valeur, contrôlée par le serveur ; une règle « requis » poserait aria-required sur le groupe.
    if (p.type === 'choix') return [];
    if (p.type === 'entier') return [obligatoire(t)];
    if (p.type === 'courriel') return [courriel(t)];
    if (p.type === 'telephone') return [{ pattern: /^\+?[0-9][0-9 ./()-]{5,29}$/, message: t('parametres.telephone.invalide') }];
    return [
      ...(p.requis ? [texteObligatoire(t)] : []),
      ...(p.max ? [{ max: p.max }] : []),
      // Même motif que le serveur (catalogue) ; les espaces autour sont retirés avant le contrôle, comme au serveur (DV-37).
      ...(p.type === 'texte_long' ? [{ validator: (_: unknown, v: unknown) => {
        const inconnue = [...texte(v).matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]).find((x) => !(p.variables || []).includes(x));
        return inconnue === undefined ? Promise.resolve() : Promise.reject(new Error(t('parametres.variable.inconnue').replace('{nom}', `{${inconnue}}`)));
      } }] : []),
      ...(p.motif ? [{ validator: (_: unknown, v: unknown) => (!texte(v) || new RegExp(p.motif as string).test(texte(v)) ? Promise.resolve() : Promise.reject(new Error(t('parametres.motif.invalide')))) }] : []),
    ];
  };

  const control = (p: Reglage) => {
    if (p.type === 'choix') {
      return <Radio.Group optionType="button" buttonStyle="solid" options={(p.choix || []).map((c) => ({ value: c.valeur, label: lbl(c, 'libelle') }))} />;
    }
    if (p.type === 'entier') return <InputNumber min={p.min ?? undefined} max={p.max ?? undefined} precision={0} style={{ width: 140 }} />;
    const lang = p.cle.endsWith('_nl') ? 'nl' : p.cle.endsWith('_fr') ? 'fr' : undefined;
    if (p.type === 'texte_long') return <Input.TextArea autoSize={{ minRows: 2, maxRows: 12 }} maxLength={p.max ?? undefined} lang={lang} />;
    return <Input type={p.type === 'telephone' ? 'tel' : p.type === 'courriel' ? 'email' : 'text'} maxLength={p.max ?? undefined} lang={lang} />;
  };

  const field = (p: Reglage) => (
    <Form.Item key={p.cle} name={p.cle} rules={rules(p)}
      label={<Space size={8} wrap><span>{lbl(p, 'libelle')}</span>{p.est_defaut && <Tag>{t('parametres.default.tag')}</Tag>}</Space>}
      extra={<>
        <div>{lbl(p, 'description')}</div>
        {p.type === 'texte_long' && p.variables && p.variables.length > 0 && (
          <div>{t('parametres.variables')} {p.variables.map((v) => `{${v}}`).join(', ')}</div>
        )}
        {!p.est_defaut && (
          <Space size={4} wrap style={{ marginTop: 4 }}>
            <span>{t('parametres.default.value')} : {shown(p, p.defaut)}</span>
            <Popconfirm title={t('parametres.reset.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={() => reset(p)}>
              <Button size="small" type="link" icon={<UndoOutlined />}>{t('parametres.reset')}</Button>
            </Popconfirm>
          </Space>
        )}
      </>}>
      {control(p)}
    </Form.Item>
  );

  return (
    <Form form={form} layout="vertical" requiredMark={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {parGroupe.map(({ g, items }) => (
          <Card key={g} loading={loading} title={<Typography.Title level={2} style={{ fontSize: 16, margin: 0 }}>{t(`${prefixe}.groupe.${g}`)}</Typography.Title>}>
            {items.map(field)}
            <Button type="primary" loading={saving === g} onClick={() => saveGroupe(g)}>{t('common.save')}</Button>
          </Card>
        ))}
      </Space>
    </Form>
  );
}

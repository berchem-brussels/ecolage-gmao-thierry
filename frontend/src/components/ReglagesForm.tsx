/**
 * Formulaire de réglages servi par un catalogue de l'API (paramètres de l'instance, paramètres de l'entité).
 * Libellés, descriptions, défauts, types et choix viennent du serveur ; l'écran ne connaît aucune clé en dur.
 * Une carte par groupe, un bouton Enregistrer par carte (un appel par réglage modifié : une ligne au journal chacun),
 * retour à la valeur livrée par réglage. Choix exclusif en boutons (standard v3.2, section 12.4).
 * 0.7.0 : type texte_long (zone de plusieurs lignes, sans compteur qui recouvrirait l'explication ; variables permises
 * rappelées et contrôlées comme au serveur).
 * 0.12.0 (DV-109) : R1, « valeur par défaut » est un état, écrit en texte discret à côté du libellé, et non une étiquette
 * qui ressemblait à un bouton ; R2, un refus du serveur s'affiche sous le réglage refusé, avec le message du serveur qui
 * nomme le réglage et la valeur fautive, au lieu de « Données invalides ».
 * 0.14.0 (DV-119) : type codes_liste, cases à cocher des valeurs d'une liste de l'entité (motifs d'attente qui
 * suspendent le délai) ; la valeur reste le texte des codes séparés par des virgules, comme au serveur.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, InputNumber, Popconfirm, Radio, Space, Typography, message } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { courriel, obligatoire, texteObligatoire } from '../validation';

export interface Choix { valeur: string; libelle_fr: string; libelle_nl: string }
export interface Reglage {
  cle: string; groupe: string; type: 'texte' | 'texte_long' | 'choix' | 'telephone' | 'courriel' | 'entier' | 'codes_liste'; requis?: boolean;
  /** Liste de valeurs de l'entité d'un réglage codes_liste (0.14.0). */
  liste?: string | null;
  max: number | null; min?: number | null; choix?: Choix[] | null; motif?: string | null;
  /** Variables permises dans un texte long (0.7.0), par exemple « entite » pour {entite}. */
  variables?: string[] | null;
  libelle_fr: string; libelle_nl: string; description_fr: string; description_nl: string;
  valeur: string; defaut: string; est_defaut: boolean; updated_at: string | null;
}

interface ValeurListe { code: string; libelle_fr: string; libelle_nl: string; is_active: number }

/** Cases à cocher d'un réglage codes_liste : la valeur du formulaire est le texte « code1,code2 ». */
function CasesCodes({ value, onChange, options, label }: { value?: string; onChange?: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  const coches = (value || '').split(',').filter(Boolean);
  return (
    <div role="group" aria-label={label}>
      <Checkbox.Group value={coches} onChange={(v) => onChange?.((v as string[]).slice().sort().join(','))}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }} options={options} />
    </div>
  );
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
  const [listes, setListes] = useState<Record<string, ValeurListe[]>>({});
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));
  const lbl = (o: object, f: string) => tField(o as Record<string, unknown>, f);
  const texte = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api.page<Reglage>(`${endpoint}${qs({ limit: 200 })}`)).data;
      setRows(data);
      // 0.14.0 : valeurs des listes nommées par les réglages codes_liste.
      const noms = [...new Set(data.filter((p) => p.type === 'codes_liste' && p.liste).map((p) => p.liste as string))];
      const lues = await Promise.all(noms.map((l) => api.page<ValeurListe>(`/listes-valeurs${qs({ liste: l, limit: 200 })}`).then((r) => [l, r.data] as const).catch(() => [l, []] as const)));
      setListes(Object.fromEntries(lues));
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
    let enCours: Reglage | null = null;
    try {
      for (const p of changed) { enCours = p; await api.put(`${endpoint}/${p.cle}`, { valeur: texte(form.getFieldValue(p.cle)) }); }
      enCours = null;
      message.success(t('common.saved'));
      await load();
      await onSaved?.();
    } catch (e) {
      // R2 : le refus est montré sous le réglage concerné ; les réglages enregistrés avant lui le restent (un appel chacun).
      const refuse = enCours as Reglage | null;
      if (refuse && e instanceof ApiError && e.code === 'VALIDATION') form.setFields([{ name: refuse.cle, errors: [e.message] }]);
      fail(e);
    } finally { setSaving(null); }
  };

  const reset = async (p: Reglage) => {
    try { await api.del(`${endpoint}/${p.cle}`); message.success(t('parametres.reset.done')); await load(); await onSaved?.(); } catch (e) { fail(e); }
  };

  const nomsCodes = (p: Reglage, v: string) => v.split(',').filter(Boolean).map((c) => lbl((listes[p.liste || ''] || []).find((x) => x.code === c) || {}, 'libelle') || c).join(', ');
  const shown = (p: Reglage, v: string) => (p.type === 'choix' ? lbl(p.choix?.find((c) => c.valeur === v) || {}, 'libelle') || v
    : p.type === 'codes_liste' ? nomsCodes(p, v) || t('parametres.aucun') : v || t('parametres.empty'));

  const rules = (p: Reglage) => {
    // Un choix a toujours une valeur, contrôlée par le serveur ; une règle « requis » poserait aria-required sur le groupe.
    if (p.type === 'choix' || p.type === 'codes_liste') return [];
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
    if (p.type === 'codes_liste') {
      // Valeurs actives, plus une valeur désactivée encore cochée (pour pouvoir la décocher).
      const coches = String(form.getFieldValue(p.cle) || '').split(',');
      const options = (listes[p.liste || ''] || []).filter((v) => v.is_active === 1 || coches.includes(v.code)).map((v) => ({ value: v.code, label: lbl(v, 'libelle') }));
      return <CasesCodes options={options} label={lbl(p, 'libelle')} />;
    }
    if (p.type === 'entier') return <InputNumber min={p.min ?? undefined} max={p.max ?? undefined} precision={0} style={{ width: 140 }} />;
    const lang = p.cle.endsWith('_nl') ? 'nl' : p.cle.endsWith('_fr') ? 'fr' : undefined;
    if (p.type === 'texte_long') return <Input.TextArea autoSize={{ minRows: 2, maxRows: 12 }} maxLength={p.max ?? undefined} lang={lang} />;
    return <Input type={p.type === 'telephone' ? 'tel' : p.type === 'courriel' ? 'email' : 'text'} maxLength={p.max ?? undefined} lang={lang} />;
  };

  const field = (p: Reglage) => (
    <Form.Item key={p.cle} name={p.cle} rules={rules(p)} tooltip={lbl(p, 'description')}
      label={<Space size={8} wrap><span>{lbl(p, 'libelle')}</span>{p.est_defaut && <Typography.Text type="secondary" className="reglage-defaut" style={{ fontWeight: 'normal', fontSize: 12 }}>({t('parametres.default.tag')})</Typography.Text>}</Space>}
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

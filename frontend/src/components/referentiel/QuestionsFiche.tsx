/**
 * Questions du formulaire sur la fiche d'une catégorie (cahier des charges DEM-05 ; version 0.7.0, point 5).
 * Le responsable du service technique ajoute, modifie, range, désactive (avec un motif) ou réactive les questions
 * propres du domaine ou de la nature. Une nature montre aussi, en lecture, les questions de son domaine, posées avant
 * les siennes. Deux types : « Oui ou non » et « Un choix parmi 2 à 6 réponses », textes FR et NL ; « Obligatoire »
 * décoché par défaut. Les demandes déjà déposées gardent le texte d'origine (contrôle serveur).
 */
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Checkbox, Form, Input, List, Modal, Popconfirm, Radio, Space, Tag, Typography, message } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import api, { ApiError, qs } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import type { Categorie, QuestionCategorie, QuestionPosee } from '../../referentiel';
import TraceFiche from './TraceFiche';
import ErreurObligatoire from '../ErreurObligatoire';
import { seulementEspaces, texteObligatoire } from '../../validation';

interface Valeurs {
  question_fr: string; question_nl: string; type: 'oui_non' | 'choix'; obligatoire: boolean;
  reponses?: { fr: string; nl: string }[];
}

const MAX = 10;

export default function QuestionsFiche({ categorie, heritees, onChange }: {
  categorie: Categorie; heritees: QuestionPosee[]; onChange: () => void;
}) {
  const { t, lang } = useI18n();
  const [questions, setQuestions] = useState<QuestionCategorie[]>([]);
  const [edition, setEdition] = useState<QuestionCategorie | 'nouvelle' | null>(null);
  const [motif, setMotif] = useState('');
  const [form] = Form.useForm<Valeurs>();
  const type = Form.useWatch('type', form);
  const fail = (e: unknown) => message.error(e instanceof ApiError ? e.message : t('common.error'));
  const texte = (q: { question_fr: string; question_nl: string }) => (lang === 'nl' ? q.question_nl : q.question_fr);

  const charger = useCallback(async () => {
    try {
      const r = await api.get<QuestionCategorie[]>(`/categories/${categorie.id}/questions${qs({ inclure_inactives: 1 })}`);
      setQuestions(Array.isArray(r) ? r : []);
    } catch (e) { fail(e); }
  }, [categorie.id]);
  useEffect(() => { charger(); }, [charger]);

  const actives = questions.filter((q) => q.is_active);
  const apres = async () => { await charger(); onChange(); };

  const ouvrir = (q: QuestionCategorie | 'nouvelle') => { setMotif(''); setEdition(q); };
  const initiales = (q: QuestionCategorie | 'nouvelle' | null): Valeurs => (q && q !== 'nouvelle' ? {
    question_fr: q.question_fr, question_nl: q.question_nl, type: q.type, obligatoire: q.obligatoire === 1,
    reponses: q.type === 'choix' ? q.reponses.map((r) => ({ fr: r.fr, nl: r.nl })) : [{ fr: '', nl: '' }, { fr: '', nl: '' }],
  } : { question_fr: '', question_nl: '', type: 'oui_non', obligatoire: false, reponses: [{ fr: '', nl: '' }, { fr: '', nl: '' }] });

  const enregistrer = async (v: Valeurs) => {
    const corps = {
      question_fr: v.question_fr, question_nl: v.question_nl, type: v.type, obligatoire: v.obligatoire ? 1 : 0,
      reponses: v.type === 'choix' ? (v.reponses || []).map((r) => ({ fr: r.fr, nl: r.nl })) : null,
    };
    try {
      if (edition === 'nouvelle') await api.post(`/categories/${categorie.id}/questions`, corps);
      else if (edition) await api.put(`/questions-categorie/${edition.id}`, corps);
      message.success(t('common.saved'));
      setEdition(null);
      await apres();
    } catch (e) { fail(e); }
  };

  /** Range une question d'un cran : les questions actives sont renumérotées 10, 20, 30… */
  const deplacer = async (q: QuestionCategorie, sens: -1 | 1) => {
    const liste = [...actives];
    const i = liste.findIndex((x) => x.id === q.id);
    const j = i + sens;
    if (j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j], liste[i]];
    try {
      for (let k = 0; k < liste.length; k += 1) {
        if (liste[k].ordre !== (k + 1) * 10) await api.put(`/questions-categorie/${liste[k].id}`, { ordre: (k + 1) * 10 });
      }
      await apres();
    } catch (e) { fail(e); }
  };

  const desactiver = async () => {
    if (!edition || edition === 'nouvelle' || !motif.trim()) return;
    try { await api.del(`/questions-categorie/${edition.id}`, { motif: motif.trim() }); setEdition(null); await apres(); } catch (e) { fail(e); }
  };
  const reactiver = async (q: QuestionCategorie) => {
    try { await api.put(`/questions-categorie/${q.id}`, { is_active: 1 }); await apres(); } catch (e) { fail(e); }
  };

  const enEdition = edition && edition !== 'nouvelle' ? edition : null;
  return (
    <Card size="small" style={{ marginTop: 24 }} title={t('ref.q.title')}>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.q.intro')}</Typography.Paragraph>
      {heritees.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {t('ref.q.heritees').replace('{domaine}', (lang === 'nl' ? categorie.parent_libelle_nl : categorie.parent_libelle_fr) || '')}
          </Typography.Text>
          <ul style={{ margin: '4px 0 0', paddingInlineStart: 20 }}>
            {heritees.map((q) => <li key={q.id}>{texte(q)}</li>)}
          </ul>
        </div>
      )}
      <List<QuestionCategorie> size="small" dataSource={questions} locale={{ emptyText: t('ref.q.aucune') }}
        renderItem={(q) => {
          const rang = actives.findIndex((x) => x.id === q.id);
          return (
            <List.Item style={{ flexWrap: 'wrap', gap: 8 }}>
              <div style={{ flex: '1 1 220px', minWidth: 0, opacity: q.is_active ? 1 : 0.6 }}>
                <div>{texte(q)}</div>
                <Space size={4} wrap style={{ marginTop: 2 }}>
                  <Tag>{q.type === 'oui_non' ? t('ref.q.type.oui_non') : `${t('ref.q.type.choix.court')} (${q.reponses.length})`}</Tag>
                  {q.obligatoire === 1 && <Tag color="orange">{t('ref.q.obligatoire.tag')}</Tag>}
                  {!q.is_active && <Tag>{t('common.inactive')}</Tag>}
                </Space>
              </div>
              {q.is_active ? (
                <Space size={4}>
                  <Button size="small" icon={<ArrowUpOutlined />} aria-label={`${t('ref.q.monter')} : ${texte(q)}`} disabled={rang <= 0} onClick={() => deplacer(q, -1)} />
                  <Button size="small" icon={<ArrowDownOutlined />} aria-label={`${t('ref.q.descendre')} : ${texte(q)}`} disabled={rang < 0 || rang >= actives.length - 1} onClick={() => deplacer(q, 1)} />
                  <Button size="small" icon={<EditOutlined />} aria-label={`${t('common.edit')} : ${texte(q)}`} onClick={() => ouvrir(q)} />
                </Space>
              ) : (
                <Button size="small" onClick={() => reactiver(q)} disabled={!categorie.is_active}>{t('ref.q.reactiver')}</Button>
              )}
            </List.Item>
          );
        }} />
      <Button icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => ouvrir('nouvelle')} disabled={!categorie.is_active || actives.length >= MAX}>
        {t('ref.q.ajouter')}
      </Button>
      {actives.length >= MAX && <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>{t('ref.q.max')}</Typography.Paragraph>}

      <Modal open={!!edition} onCancel={() => setEdition(null)} destroyOnClose footer={null} width="min(560px, 100vw)"
        title={edition === 'nouvelle' ? t('ref.q.ajouter') : t('ref.q.modifier')}>
        {enEdition && <Typography.Paragraph style={{ fontSize: 12 }}><TraceFiche trace={enEdition.trace} /></Typography.Paragraph>}
        <Form key={enEdition?.id ?? 'nouvelle'} form={form} layout="vertical" onFinish={enregistrer} preserve={false} initialValues={initiales(edition)}>
          <Form.Item name="question_fr" label={t('ref.q.question_fr')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="fr" /></Form.Item>
          <Form.Item name="question_nl" label={t('ref.q.question_nl')} rules={[texteObligatoire(t), { max: 200 }]}><Input lang="nl" /></Form.Item>
          <Form.Item name="type" label={t('ref.q.type')}>
            <Radio.Group optionType="button" aria-label={t('ref.q.type')}
              options={[{ value: 'oui_non', label: t('ref.q.type.oui_non') }, { value: 'choix', label: t('ref.q.type.choix') }]} />
          </Form.Item>
          {type === 'choix' && (
            <Form.List name="reponses">
              {(champs, { add, remove }) => (
                <div role="group" aria-labelledby="ref-q-reponses">
                  <Typography.Text id="ref-q-reponses" strong style={{ display: 'block', marginBottom: 8 }}>{t('ref.q.reponses')}</Typography.Text>
                  {/* Une ligne par réponse, français et néerlandais côte à côte, même sur téléphone (360 px). */}
                  <div aria-hidden className="ref-q-ligne" style={{ marginBottom: 4 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('ref.q.col_fr')}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t('ref.q.col_nl')}</Typography.Text>
                    <span style={{ width: 32 }} />
                  </div>
                  {champs.map((c, i) => (
                    <div key={c.key} className="ref-q-ligne">
                      <Form.Item name={[c.name, 'fr']} rules={[texteObligatoire(t), { max: 100 }]} style={{ marginBottom: 8, minWidth: 0 }}>
                        <Input lang="fr" aria-label={`${t('ref.q.reponse_fr')} ${i + 1}`} placeholder={`${t('ref.q.reponse_fr')} ${i + 1}`} />
                      </Form.Item>
                      <Form.Item name={[c.name, 'nl']} rules={[texteObligatoire(t), { max: 100 }]} style={{ marginBottom: 8, minWidth: 0 }}>
                        <Input lang="nl" aria-label={`${t('ref.q.reponse_nl')} ${i + 1}`} placeholder={`${t('ref.q.reponse_nl')} ${i + 1}`} />
                      </Form.Item>
                      <Button icon={<DeleteOutlined />} aria-label={`${t('ref.q.retirer')} ${i + 1}`} disabled={champs.length <= 2} onClick={() => remove(c.name)} />
                    </div>
                  ))}
                  <Button icon={<PlusOutlined />} disabled={champs.length >= 6} onClick={() => add({ fr: '', nl: '' })} style={{ marginBottom: 16 }}>
                    {t('ref.q.ajouter_reponse')}
                  </Button>
                </div>
              )}
            </Form.List>
          )}
          <Form.Item name="obligatoire" valuePropName="checked" extra={t('ref.q.obligatoire.help')}>
            <Checkbox>{t('ref.q.obligatoire')}</Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit">{t('common.save')}</Button>
        </Form>
        {enEdition && (
          <Card size="small" style={{ marginTop: 24 }} title={t('ref.q.desactiver')}>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>{t('ref.q.desactiver.help')}</Typography.Paragraph>
            <Input.TextArea rows={2} aria-label={t('listes.motif')} placeholder={t('listes.motif')} value={motif} onChange={(e) => setMotif(e.target.value)}
              aria-invalid={seulementEspaces(motif) || undefined} aria-describedby={seulementEspaces(motif) ? 'motif-q-erreur' : undefined} />
            {seulementEspaces(motif) && <ErreurObligatoire id="motif-q-erreur" />}
            <Popconfirm title={t('ref.q.desactiver.confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={desactiver} disabled={!motif.trim()}>
              <Button danger style={{ marginTop: 8 }} disabled={!motif.trim()}>{t('ref.q.desactiver')}</Button>
            </Popconfirm>
          </Card>
        )}
      </Modal>
    </Card>
  );
}

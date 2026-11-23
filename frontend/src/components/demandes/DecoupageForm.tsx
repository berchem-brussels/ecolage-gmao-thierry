/**
 * Découper une demande en plusieurs (version 0.16.0, étape 12, point 5 ; GES-06), dans la fiche du service technique.
 * - La demande d'origine garde son premier problème ; chaque autre problème devient une demande nouvelle (une à cinq) :
 *   description obligatoire (10 caractères au moins), catégorie et lieu facultatifs (« Comme la demande d'origine »).
 * - Commentaire facultatif, lu par le demandeur sur chaque demande nouvelle.
 * - Après l'envoi : les numéros créés ; la fiche de l'origine les liste (« Demandes issues de celle-ci »).
 * - Le serveur refait tous les contrôles (services/decoupage.js) ; un refus s'affiche, la saisie reste (ERG-09).
 * Une carte par demande nouvelle, champs pleine largeur : tenu dans 320 px (DV-102).
 */
import { useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Select, Space, TreeSelect, Typography, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import api, { ApiError } from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import type { Categorie } from '../../referentiel';
import type { Lieu } from '../../lieux';
import { type Demande, DESCRIPTION_MIN } from '../../demandes';

interface Partie { description: string; categorie_id: number | null; lieu_id: number | null }
const VIDE: Partie = { description: '', categorie_id: null, lieu_id: null };
const MAX = 5;

export default function DecoupageForm({ d, arbre, lieux, onDone, onCancel }: {
  d: Demande; arbre: Categorie[]; lieux: Lieu[]; onDone: (d: Demande) => void; onCancel: () => void;
}) {
  const { t, lang } = useI18n();
  const [parties, setParties] = useState<Partie[]>([{ ...VIDE }]);
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const lbl = (o: { libelle_fr: string; libelle_nl: string }) => (lang === 'nl' ? o.libelle_nl : o.libelle_fr);
  // Une nature se choisit ; un domaine seulement s'il n'a aucune nature active (règle du dépôt).
  const categories = useMemo(() => arbre.filter((x) => x.is_active).map((dom) => {
    const natures = (dom.natures || []).filter((n) => n.is_active);
    return { value: dom.id, title: lbl(dom), selectable: natures.length === 0, children: natures.map((n) => ({ value: n.id, title: lbl(n) })) };
  }), [arbre, lang]);
  const optionsLieux = useMemo(() => lieux.filter((l) => l.is_active)
    .map((l) => ({ value: l.id, label: `${lang === 'nl' ? l.nom_nl : l.nom_fr} (${l.code})` })), [lieux, lang]);

  const changer = (i: number, p: Partial<Partie>) => setParties((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const valables = parties.every((p) => p.description.trim().length >= DESCRIPTION_MIN);

  const envoyer = async () => {
    if (!valables) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<Demande & { nouvelles: { id: number; numero: string }[] }>(`/demandes/${d.id}/decouper`, {
        parties: parties.map((p) => ({ description: p.description.trim(), ...(p.categorie_id ? { categorie_id: p.categorie_id } : {}), ...(p.lieu_id ? { lieu_id: p.lieu_id } : {}) })),
        langue: lang, ...(commentaire.trim() ? { commentaire: commentaire.trim() } : {}),
      });
      message.success(t('decoupage.fait').replace('{numeros}', r.nouvelles.map((x) => x.numero).join(', ')));
      onDone(r);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : t('common.error'));
    } finally { setEnvoi(false); }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>{t('decoupage.intro').split('{numero}').join(d.numero)}</Typography.Paragraph>
      {erreur && <Alert type="error" showIcon message={erreur} />}
      {parties.map((p, i) => {
        const id = `decoupage-${i}`;
        const court = p.description.length > 0 && p.description.trim().length < DESCRIPTION_MIN;
        return (
          <Card key={i} size="small" title={t('decoupage.partie').replace('{n}', String(i + 1))}
            extra={parties.length > 1 ? <Button size="small" icon={<DeleteOutlined />} onClick={() => setParties((l) => l.filter((_, j) => j !== i))}>{t('decoupage.retirer')}</Button> : null}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <div>
                <label htmlFor={`${id}-description`} className="dem-complement-label">{t('decoupage.description')}</label>
                <Input.TextArea id={`${id}-description`} rows={3} maxLength={5000} lang={lang} value={p.description}
                  onChange={(e) => changer(i, { description: e.target.value })} status={court ? 'error' : undefined} aria-invalid={court || undefined}
                  aria-describedby={`${id}-aide`} />
                <Typography.Text id={`${id}-aide`} type={court ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>{t('decoupage.description.aide')}</Typography.Text>
              </div>
              <div>
                <label htmlFor={`${id}-categorie`} className="dem-complement-label">{t('decoupage.categorie')}</label>
                <TreeSelect id={`${id}-categorie`} style={{ width: '100%' }} allowClear showSearch treeNodeFilterProp="title" treeData={categories}
                  placeholder={t('decoupage.comme_origine')} value={p.categorie_id ?? undefined} onChange={(v) => changer(i, { categorie_id: (v as number) ?? null })} />
              </div>
              <div>
                <label htmlFor={`${id}-lieu`} className="dem-complement-label">{t('decoupage.lieu')}</label>
                <Select<number> id={`${id}-lieu`} style={{ width: '100%' }} allowClear showSearch optionFilterProp="label" options={optionsLieux}
                  placeholder={t('decoupage.comme_origine')} value={p.lieu_id ?? undefined} onChange={(v) => changer(i, { lieu_id: v ?? null })} />
              </div>
            </Space>
          </Card>
        );
      })}
      {parties.length < MAX && <Button icon={<PlusOutlined />} onClick={() => setParties((l) => [...l, { ...VIDE }])}>{t('decoupage.ajouter')}</Button>}
      <div>
        <label htmlFor="decoupage-commentaire" className="dem-complement-label">{t('cycle.commentaire')}</label>
        <Input.TextArea id="decoupage-commentaire" rows={2} maxLength={2000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} aria-describedby="decoupage-commentaire-aide" />
        <Typography.Text id="decoupage-commentaire-aide" type="secondary" style={{ fontSize: 12 }}>{t('decoupage.commentaire.aide')}</Typography.Text>
      </div>
      <Space wrap>
        <Button type="primary" loading={envoi} disabled={!valables} onClick={envoyer}>
          {parties.length === 1 ? t('decoupage.envoyer.un') : t('decoupage.envoyer').replace('{n}', String(parties.length))}
        </Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </Space>
    </Space>
  );
}

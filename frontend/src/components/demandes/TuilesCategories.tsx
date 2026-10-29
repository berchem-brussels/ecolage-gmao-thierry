/**
 * Choix de la catégorie d'une demande (cahier des charges DEM-02 « Quoi », DEM-03, REF-06) : tuiles des domaines de
 * l'entité active, puis tuiles des natures du domaine ouvert. Un domaine sans nature se choisit directement. Seules les
 * catégories actives sont proposées (GET /api/categories/arbre). Boutons, pas de liste déroulante (standard, 12.4).
 * 0.7.0 (DEM-05) : la catégorie choisie porte ses questions (« questions » de l'arbre) ; une catégorie reprise d'un
 * brouillon, qui ne les porte pas, les reçoit dès que l'arbre est chargé.
 */
import { useEffect, useState } from 'react';
import { Button, Spin, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleFilled } from '@ant-design/icons';
import api from '../../api';
import { useI18n } from '../../contexts/I18nContext';
import { type ArbreCategories, type Categorie, type QuestionPosee, Icone } from '../../referentiel';

export interface CategorieChoisie {
  id: number; libelle_fr: string; libelle_nl: string; icone: string; domaine_fr: string | null; domaine_nl: string | null;
  /** Questions posées pour cette catégorie (0.7.0) ; absentes d'une catégorie reprise d'un brouillon. */
  questions?: QuestionPosee[];
}

interface Props {
  value: CategorieChoisie | null;
  onChange: (c: CategorieChoisie) => void;
  labelledBy?: string;
}

export default function TuilesCategories({ value, onChange, labelledBy }: Props) {
  const { t, tField } = useI18n();
  const [arbre, setArbre] = useState<Categorie[] | null>(null);
  const [domaine, setDomaine] = useState<Categorie | null>(null);
  const lbl = (c: Categorie) => tField(c as unknown as Record<string, unknown>, 'libelle');

  useEffect(() => {
    api.get<ArbreCategories>('/categories/arbre').then((r) => setArbre(r.domaines)).catch(() => setArbre([]));
  }, []);

  // Catégorie déjà choisie (brouillon repris, 0.7.0) : le domaine qui la contient s'ouvre pour la montrer cochée.
  useEffect(() => {
    if (!arbre || !value) return;
    const d = arbre.find((x) => (x.natures || []).some((n) => n.id === value.id));
    if (d) setDomaine(d);
    // Questions de la catégorie reprise (0.7.0) : prises dans l'arbre.
    if (value.questions === undefined) {
      const c = d ? (d.natures || []).find((n) => n.id === value.id) : arbre.find((x) => x.id === value.id);
      if (c) choisir(c, d || null);
    }
  }, [arbre, value?.id]);

  function choisir(c: Categorie, d: Categorie | null) {
    onChange({
      id: c.id, libelle_fr: c.libelle_fr, libelle_nl: c.libelle_nl, icone: c.icone, domaine_fr: d ? d.libelle_fr : null, domaine_nl: d ? d.libelle_nl : null,
      questions: c.questions || [],
    });
  }

  if (arbre === null) return <Spin />;
  const items = domaine ? (domaine.natures || []) : arbre;
  return (
    <div role="group" aria-labelledby={labelledBy}>
      {domaine && (
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => setDomaine(null)} style={{ paddingInline: 0, marginBottom: 8 }}>
          {t('demande.quoi.retour')}
        </Button>
      )}
      {domaine && <Typography.Paragraph strong style={{ marginBottom: 8 }}>{lbl(domaine)}</Typography.Paragraph>}
      <div className="ref-tuiles">
        {items.map((c) => {
          const feuille = !!domaine || !(c.natures && c.natures.length);
          const choisie = value?.id === c.id;
          return (
            <button key={c.id} type="button" className={`ref-tuile${choisie ? ' dem-tuile-choisie' : ''}`}
              aria-pressed={feuille ? choisie : undefined}
              aria-label={feuille ? lbl(c) : `${lbl(c)} : ${t('ref.cat.tuiles.ouvrir')}`}
              onClick={() => (feuille ? choisir(c, domaine) : setDomaine(c))}>
              {choisie ? <CheckCircleFilled style={{ fontSize: 28, color: 'var(--app-primary)' }} /> : <Icone code={c.icone} style={{ fontSize: 28, color: 'var(--app-primary)' }} />}
              <span>{lbl(c)}</span>
            </button>
          );
        })}
      </div>
      {!items.length && <Typography.Text type="secondary">{t('demande.quoi.aucune')}</Typography.Text>}
    </div>
  );
}

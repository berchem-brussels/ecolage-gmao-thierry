/**
 * Questions propres à la catégorie choisie (cahier des charges DEM-05 ; version 0.7.0, point 5), sous les tuiles
 * de « 2. Quoi ? » : celles du domaine d'abord, puis celles de la nature, dans l'ordre réglé par le responsable.
 * Réponses en boutons (standard, section 12.4) : un bouton enfoncé par question ; un second clic le relâche, sauf
 * pour une question obligatoire, qui garde toujours une réponse une fois répondue. Aucune question n'est obligatoire,
 * sauf mention « obligatoire » ; le serveur le contrôle aussi (REPONSE_OBLIGATOIRE). Sert aussi à l'aperçu de l'onglet
 * Catégories du référentiel.
 */
import { Button, Space, Typography } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import { useI18n } from '../../contexts/I18nContext';
import type { QuestionPosee, ReponseDonnee } from '../../referentiel';
import ErreurObligatoire from '../ErreurObligatoire';

interface Props {
  questions: QuestionPosee[];
  value: ReponseDonnee[];
  onChange: (v: ReponseDonnee[]) => void;
  /** Montre « Ce champ est obligatoire » sous une question obligatoire sans réponse. */
  montrerErreurs?: boolean;
  /** Préfixe des identifiants, pour deux blocs dans la même page (formulaire et aperçu). */
  prefixe?: string;
}

/** Questions obligatoires sans réponse. */
export const obligatoiresManquantes = (questions: QuestionPosee[], value: ReponseDonnee[]) =>
  questions.filter((q) => q.obligatoire && !value.some((r) => r.question_id === q.id));

/** Réponses qui valent encore pour ces questions (changement de catégorie, brouillon repris). */
export const reponsesValables = (questions: QuestionPosee[], value: ReponseDonnee[]) =>
  value.filter((r) => questions.some((q) => q.id === r.question_id && q.reponses.some((x) => x.valeur === r.valeur)));

export default function QuestionsCategorie({ questions, value, onChange, montrerErreurs = false, prefixe = 'dem-q' }: Props) {
  const { t, lang } = useI18n();
  if (!questions.length) return null;
  const texte = (o: { fr: string; nl: string }) => (lang === 'nl' ? o.nl : o.fr);
  const choisir = (q: QuestionPosee, valeur: string) => {
    const actuelle = value.find((r) => r.question_id === q.id)?.valeur;
    const autres = value.filter((r) => r.question_id !== q.id);
    if (actuelle === valeur) { if (!q.obligatoire) onChange(autres); return; }
    onChange([...autres, { question_id: q.id, valeur }]);
  };
  return (
    <div className="dem-questions" style={{ marginTop: 16 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{t('demande.questions.aide')}</Typography.Text>
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        {questions.map((q) => {
          const id = `${prefixe}-${q.id}`;
          const choisie = value.find((r) => r.question_id === q.id)?.valeur;
          const erreur = montrerErreurs && q.obligatoire === 1 && !choisie;
          return (
            <div key={q.id} role="group" aria-labelledby={id} aria-describedby={erreur ? `${id}-erreur` : undefined} className="dem-question">
              <Typography.Text id={id} strong style={{ display: 'block', marginBottom: 6 }}>
                {lang === 'nl' ? q.question_nl : q.question_fr}
                {q.obligatoire === 1 && <Typography.Text type="secondary" style={{ fontWeight: 400 }}> ({t('demande.questions.obligatoire')})</Typography.Text>}
              </Typography.Text>
              <Space wrap size={[8, 8]}>
                {q.reponses.map((r) => {
                  const enfonce = choisie === r.valeur;
                  return (
                    <Button key={r.valeur} type={enfonce ? 'primary' : 'default'} aria-pressed={enfonce} className="dem-reponse"
                      icon={enfonce ? <CheckOutlined aria-hidden /> : undefined} onClick={() => choisir(q, r.valeur)}>
                      {texte(r)}
                    </Button>
                  );
                })}
              </Space>
              {erreur && <ErreurObligatoire id={`${id}-erreur`} />}
            </div>
          );
        })}
      </Space>
    </div>
  );
}

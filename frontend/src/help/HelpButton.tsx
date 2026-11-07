/**
 * Bouton « Aide » de l'en-tête (gabarit 1.3.0, help/HelpButton.tsx ; standard section 13.1) : la fiche de l'écran en
 * cours s'ouvre dans un panneau latéral, avec les questions de la FAQ locale rattachées à cet écran. GMAO (0.12.0) : le
 * bouton est dans l'en-tête commun, à côté de « Signaler », pour tous les écrans à la fois (le gabarit le met dans
 * PageHeader, que la plupart des écrans de la GMAO n'utilisent pas) ; sur téléphone, l'icône seule avec son nom
 * accessible ; un écran sans fiche mène au mode d'emploi.
 */
import { useEffect, useState } from 'react';
import { Button, Drawer, Grid } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { qs } from '../api';
import { useI18n } from '../contexts/I18nContext';
import { topicForPath, useHelpAccess } from './index';
import TopicView, { type LocalFaq } from './TopicView';

export default function HelpButton() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const mobile = Grid.useBreakpoint().md === false;
  const voit = useHelpAccess();
  const [open, setOpen] = useState(false);
  const [faq, setFaq] = useState<LocalFaq[]>([]);
  const trouvee = topicForPath(location.pathname);
  const topic = trouvee && voit(trouvee.acces) ? trouvee : undefined;
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (open && topic) api.page<LocalFaq>(`/faq${qs({ topic_id: topic.id, limit: 200 })}`).then((r) => setFaq(Array.isArray(r.data) ? r.data : [])).catch(() => setFaq([]));
  }, [open, topic]);
  if (location.pathname === '/help') return null;
  return (
    <>
      <Button size={mobile ? 'middle' : 'small'} icon={<QuestionCircleOutlined />} aria-label={mobile ? t('help.button') : undefined}
        onClick={() => (topic ? setOpen(true) : navigate('/help'))}>
        {mobile ? null : t('help.button')}
      </Button>
      {topic && (
        <Drawer open={open} onClose={() => setOpen(false)} width={mobile ? '100%' : 760} title={t('help.button')}
          extra={<Link to={`/help?fiche=${topic.id}`} onClick={() => setOpen(false)}>{t('help.full')}</Link>}>
          <TopicView topic={topic} localFaq={faq} />
        </Drawer>
      )}
    </>
  );
}

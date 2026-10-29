/**
 * Chatbot local à intentions (patron SAGA Chatbot.tsx) : sans modèle de langage, sans appel sortant.
 * Bouton rond de 52 px fixé en bas à droite ; fenêtre de 380 sur 500 px, plein écran sur smartphone.
 */
import { useState } from 'react';
import { Button, Card, Grid, Input, Space, Typography } from 'antd';
import { MessageOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { intents } from '../i18n';
import { moduleActif, useModules } from '../moduleMap';
import { useAuth } from '../contexts/AuthContext';

/** Écrans réservés à l'administrateur : l'assistant n'y propose pas de lien pour les autres (standard v3.2, section 13.3). */
const ECRANS_ADMIN = ['/parametres', '/journal', '/entites', '/users'];

interface Msg { from: 'bot' | 'user'; text: string; route?: string }

/** Réponse à une question ; les intentions d'un module éteint sont ignorées (standard v3.2, section 6.2). */
export function answer(q: string, actif: (module?: string) => boolean = () => true): { key: string; route?: string } {
  const s = q.toLowerCase();
  const hit = intents.find((i) => actif(i.module) && i.keys.some((k) => s.includes(k)));
  return hit ? { key: hit.answer, route: hit.route } : { key: 'chat.unknown' };
}

export default function Chatbot() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const { modules } = useModules();
  const { isAdmin } = useAuth();
  const send = () => {
    if (!q.trim()) return;
    const a = answer(q, (m) => moduleActif(modules, m));
    const route = a.route && (isAdmin || !ECRANS_ADMIN.some((e) => a.route!.startsWith(e))) ? a.route : undefined;
    setMsgs((m) => [...m, { from: 'user', text: q }, { from: 'bot', text: a.key, route }]);
    setQ('');
  };
  const mobile = screens.md === false;
  return (
    <div className="chatbot-widget">
      {!open && (
        <Button type="primary" shape="circle" aria-label={t('chat.open')} icon={<MessageOutlined />} onClick={() => setOpen(true)}
          style={{ position: 'fixed', right: 20, bottom: 20, width: 52, height: 52, zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
      )}
      {open && (
        <Card title={t('chat.title')} role="dialog" aria-label={t('chat.title')}
          extra={<Button type="text" aria-label={t('common.close')} icon={<CloseOutlined />} onClick={() => setOpen(false)} />}
          style={mobile ? { position: 'fixed', inset: 0, zIndex: 30, borderRadius: 0 } : { position: 'fixed', right: 20, bottom: 20, width: 380, height: 500, zIndex: 30, borderRadius: 16, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' } }}>
          <div style={{ flex: 1, overflow: 'auto' }} aria-live="polite">
            <Typography.Paragraph type="secondary">{t('chat.hello')}</Typography.Paragraph>
            {msgs.map((m, i) => (
              <div key={i} style={{ textAlign: m.from === 'user' ? 'right' : 'left', marginBottom: 8 }}>
                <Typography.Text>{m.from === 'bot' ? t(m.text) : m.text}</Typography.Text>
                {m.route && <div><Button size="small" type="link" onClick={() => { navigate(m.route!); setOpen(false); }}>{t('chat.go')}</Button></div>}
              </div>
            ))}
          </div>
          <Space.Compact style={{ width: '100%' }}>
            <Input aria-label={t('chat.placeholder')} placeholder={t('chat.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} onPressEnter={send} />
            <Button type="primary" aria-label={t('chat.send')} icon={<SendOutlined />} onClick={send} />
          </Space.Compact>
        </Card>
      )}
    </div>
  );
}

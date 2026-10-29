/** Changement de mot de passe, imposé à la première connexion avec un mot de passe provisoire (patron SAGA). */
import { Form, Input, Modal, message } from 'antd';
import api, { ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { obligatoire } from '../validation';

export default function PasswordModal({ open, forced, onClose }: { open: boolean; forced: boolean; onClose: () => void }) {
  const [form] = Form.useForm();
  const { refresh } = useAuth();
  const { t } = useI18n();
  const submit = async (v: { current: string; next: string }) => {
    try {
      await api.put('/auth/password', { current_password: v.current, new_password: v.next });
      message.success(t('password.changed'));
      form.resetFields();
      await refresh();
      onClose();
    } catch (e) {
      message.error(e instanceof ApiError ? e.message : t('common.error'));
    }
  };
  return (
    <Modal open={open} title={t('password.title')} okText={t('common.save')} cancelText={t('common.cancel')}
      closable={!forced} maskClosable={!forced} keyboard={!forced} onOk={() => form.submit()} onCancel={onClose}
      cancelButtonProps={{ style: forced ? { display: 'none' } : undefined }}>
      {forced && <p style={{ fontSize: 13, color: 'var(--app-text-secondary)', marginBottom: 12 }}>{t('password.forced')}</p>}
      <Form form={form} layout="vertical" onFinish={submit}>
        <Form.Item name="current" label={t('password.current')} rules={[obligatoire(t)]}><Input.Password autoComplete="current-password" /></Form.Item>
        <Form.Item name="next" label={t('password.new')} rules={[obligatoire(t), { min: 12 }]}><Input.Password autoComplete="new-password" /></Form.Item>
        <Form.Item name="confirm" label={t('password.confirm')} dependencies={['next']}
          rules={[obligatoire(t), ({ getFieldValue }) => ({ validator: (_, v) => (!v || getFieldValue('next') === v ? Promise.resolve() : Promise.reject(new Error(t('password.mismatch')))) })]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

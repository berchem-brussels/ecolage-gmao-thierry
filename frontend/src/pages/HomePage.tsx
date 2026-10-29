/**
 * Accueil adapté au rôle (version 0.5.0 ; cahier des charges ERG-03, DEM-01, SUI-01) : pour tout agent, « Nouvelle
 * demande » et « Mes demandes » en gros boutons, puis ses demandes en cours ; pour le gestionnaire et le responsable,
 * en plus, le nombre de demandes à qualifier et le lien vers les demandes de l'entité (le tableau de bord arrive à
 * l'étape 8). Ensuite, comme depuis la 0.1.0 : entité active, rôles, personnes de l'entité pour les rôles habilités.
 * « Réserver » viendra avec le module des salles (étape 22).
 */
import { useEffect, useState } from 'react';
import { Alert, Card, List, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, ProfileOutlined, InboxOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import api, { qs } from '../api';
import { type Demande, dateDepot } from '../demandes';
import { EtatTag } from './DemandesPage';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { hasPermission, useRoles } from '../useRoles';

interface Membre { id: number; first_name: string; last_name: string; email: string; roles: string[] }

export default function HomePage() {
  const { user, entite, roles } = useAuth();
  const { t, tField } = useI18n();
  const catalogue = useRoles();
  const [membres, setMembres] = useState<Membre[] | null>(null);
  const [enCours, setEnCours] = useState<Demande[] | null>(null);
  const [aQualifier, setAQualifier] = useState<number | null>(null);
  const voitEntite = hasPermission(catalogue, roles, 'demandes:entite');
  const label = (code: string) => {
    const r = catalogue.find((x) => x.code === code);
    return r ? tField(r as unknown as Record<string, unknown>, 'label') : code;
  };
  // Permission lue dans le catalogue des rôles ; le serveur fait foi (403 sinon).
  const canSeeMembres = !!entite && roles.some((r) => catalogue.find((x) => x.code === r)?.permissions.includes('entites:membres'));

  useEffect(() => {
    setMembres(null);
    if (!canSeeMembres || !entite) return;
    api.get<Membre[]>(`/entites/${entite.id}/membres`).then(setMembres).catch(() => setMembres([]));
  }, [canSeeMembres, entite?.id]);

  useEffect(() => {
    setEnCours(null);
    if (!entite) return;
    api.page<Demande>(`/demandes${qs({ ouvertes: 1, limit: 3 })}`).then((r) => setEnCours(r.data)).catch(() => setEnCours([]));
  }, [entite?.id]);

  useEffect(() => {
    setAQualifier(null);
    if (!entite || !voitEntite) return;
    api.page<Demande>(`/demandes${qs({ perimetre: 'entite', etat: 'a_qualifier', limit: 1 })}`).then((r) => setAQualifier(r.pagination.total)).catch(() => setAQualifier(null));
  }, [entite?.id, voitEntite]);

  return (
    <div>
      <Typography.Title level={1} style={{ fontSize: 22, marginBottom: 16 }}>{t('home.title')}</Typography.Title>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {entite && (
          <Card>
            <Typography.Paragraph style={{ fontSize: 16, marginBottom: 12 }}>{t('home.welcome')} {user?.first_name}</Typography.Paragraph>
            <div className="home-actions">
              <Link to="/demandes/nouvelle" className="home-action home-action-primaire"><PlusOutlined aria-hidden /> <span>{t('nav.demande.nouvelle')}</span></Link>
              <Link to="/demandes" className="home-action"><ProfileOutlined aria-hidden /> <span>{t('nav.demandes')}</span></Link>
              {voitEntite && (
                <Link to="/demandes-entite" className="home-action">
                  <InboxOutlined aria-hidden /> <span>{t('nav.demandes.entite')}{aQualifier !== null ? ` (${aQualifier} ${t('home.aqualifier')})` : ''}</span>
                </Link>
              )}
            </div>
          </Card>
        )}
        {entite && (
          <Card title={<Typography.Title level={2} style={{ fontSize: 16, margin: 0, marginInlineEnd: 12, whiteSpace: 'normal' }}>{t('home.encours')}</Typography.Title>}
            extra={<Link to="/demandes">{t('home.encours.tout')}</Link>}>
            <List<Demande> loading={enCours === null} dataSource={enCours || []} locale={{ emptyText: t('home.encours.vide') }}
              renderItem={(d) => (
                <List.Item>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Link to={`/demandes?demande=${d.id}`}><Typography.Text strong>{d.numero}</Typography.Text></Link>
                      <EtatTag etat={d.etat} />
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {tField(d as unknown as Record<string, unknown>, 'categorie_libelle')} · {tField(d as unknown as Record<string, unknown>, 'lieu_nom')} · {dateDepot(d.created_at)}
                    </Typography.Text>
                  </Space>
                </List.Item>
              )} />
          </Card>
        )}
        <Card>
          {!entite && <Typography.Paragraph style={{ fontSize: 16, marginBottom: 8 }}>{t('home.welcome')} {user?.first_name}</Typography.Paragraph>}
          {entite ? (
            <>
              <Typography.Paragraph style={{ marginBottom: 8 }}>
                {t('home.entite')} <Typography.Text strong>{tField(entite as unknown as Record<string, unknown>, 'nom')}</Typography.Text> ({entite.code})
              </Typography.Paragraph>
              <Typography.Text type="secondary">{t('home.roles')}</Typography.Text>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {roles.map((r) => <Tag key={r} color="blue">{label(r)}</Tag>)}
              </div>
            </>
          ) : (
            <Alert type="warning" showIcon message={t('home.none')} />
          )}
        </Card>
        {(user?.entites?.length || 0) > 1 && <Alert type="info" showIcon message={t('home.switch')} />}
        <Alert type="info" message={<Link to="/help?onglet=nouveautes">{t('home.nouveautes')}</Link>} />
        {canSeeMembres && (
          <Card title={t('home.membres')}>
            <Table<Membre> rowKey="id" size="small" loading={membres === null} dataSource={membres || []} pagination={false}
              scroll={{ x: 'max-content' }} locale={{ emptyText: t('common.nodata') }}
              columns={[
                { title: t('home.membres.name'), key: 'name', render: (_, m) => `${m.last_name} ${m.first_name}` },
                { title: t('users.field.email'), dataIndex: 'email', key: 'email' },
                { title: t('users.field.role'), key: 'roles', render: (_, m) => m.roles.map((r) => <Tag key={r}>{label(r)}</Tag>) },
              ]} />
          </Card>
        )}
      </Space>
    </div>
  );
}

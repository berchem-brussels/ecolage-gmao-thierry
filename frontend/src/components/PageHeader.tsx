/**
 * En-tête commun d'un écran : titre et actions. Repris de PageHeader.tsx du gabarit 1.3.0 (0.11.0), sans le bouton
 * « Aide » de l'écran, qui arrive avec l'aide par écran (0.12.0, DV-100) ; il s'ajoutera ici, une seule fois pour tous.
 */
import React from 'react';
import { Space, Typography } from 'antd';

export default function PageHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
      <Typography.Title level={1} style={{ fontSize: 22, margin: 0, minWidth: 0 }}>{title}</Typography.Title>
      {actions && <Space wrap className="page-header-actions">{actions}</Space>}
    </div>
  );
}

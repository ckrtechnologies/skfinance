import React from 'react';

const colors = {
  draft: { bg: '#f1f5f9', text: '#475569' },
  submitted: { bg: '#e0f2fe', text: '#0284c7' },
  in_progress: { bg: '#fef3c7', text: '#d97706' },
  approved: { bg: '#dcfce7', text: '#15803d' },
  disbursed: { bg: '#ecfdf5', text: '#047857' },
  rejected: { bg: '#fee2e2', text: '#b91c1c' },
  cancelled: { bg: '#f1f5f9', text: '#64748b' },
  blocked_90d: { bg: '#ffedd5', text: '#c2410c' }
};

const formatText = (status) => {
  if (!status) return 'Unknown';
  if (status === 'blocked_90d') return '90-Day Blocked';
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const StatusPill = ({ status }) => {
  const style = colors[status] || { bg: '#f1f5f9', text: '#475569' };
  
  return (
    <span style={{
      backgroundColor: style.bg,
      color: style.text,
      padding: '4px 12px',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {formatText(status)}
    </span>
  );
};

export default StatusPill;

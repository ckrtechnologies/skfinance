'use client';

export function StatusBadge({ status }) {
  const s = status?.toLowerCase().replace(/ /g, '_') || 'unknown';
  return <span className={`badge badge-${s}`}>{status?.replace(/_/g, ' ') || '—'}</span>;
}

export function DateRangeBanner({ from, to }) {
  if (!from && !to) return null;
  return (
    <div className="date-range-banner">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      Filtered: <strong>{from}</strong> to <strong>{to}</strong>
    </div>
  );
}

export function LoadingRows({ cols = 5, rows = 8 }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }, (_, j) => (
        <td key={j}>
          <div className="skeleton" style={{ height: 14, width: j === 0 ? '80%' : '60%', borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  ));
}

export function EmptyState({ icon, title, description }) {
  return (
    <tr>
      <td colSpan="100">
        <div className="empty-state">
          <div className="empty-state-icon">
            {icon || (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <h3>{title || 'No data'}</h3>
          <p>{description || 'Nothing to show for the selected date range.'}</p>
        </div>
      </td>
    </tr>
  );
}

export function AmountCell({ value }) {
  if (value == null) return <span className="text-muted">—</span>;
  return <span>₹{Number(value).toLocaleString('en-IN')}</span>;
}

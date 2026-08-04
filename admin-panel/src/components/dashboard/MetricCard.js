'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';

/**
 * MetricCard — clickable dashboard metric card.
 * On click → navigates to `href` with current dateRange as query params.
 */
export default function MetricCard({ label, value, sub, icon: Icon, color, bg, href, loading }) {
  const { from, to } = useSelector(selectDateRange);
  const url = href ? `${href}?from=${from}&to=${to}` : null;

  const content = (
    <div
      className="metric-card"
      style={{ '--metric-color': color, '--metric-bg': bg }}
    >
      {loading ? (
        <SkeletonContent />
      ) : (
        <>
          {url && (
            <span className="metric-arrow-link" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
          )}
          <div className="metric-icon-wrap">
            {Icon && <Icon size={20} />}
          </div>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value ?? '—'}</div>
          {sub && <div className="metric-sub">{sub}</div>}
        </>
      )}
    </div>
  );

  if (url) {
    return <Link href={url} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>{content}</Link>;
  }
  return content;
}

function SkeletonContent() {
  return (
    <>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 14 }} />
      <div className="skeleton" style={{ width: '60%', height: 12, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: '40%', height: 28, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '70%', height: 10 }} />
    </>
  );
}

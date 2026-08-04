'use client';

import { useGetAuditLogQuery } from '@/store/api/adminApi';
import { useSelector } from 'react-redux';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import { DateRangeBanner, LoadingRows, EmptyState } from '@/components/ui/Primitives';

export default function AuditLogPage() {
  const { from, to } = useSelector(selectDateRange);
  const { data, isLoading } = useGetAuditLogQuery({ from, to });
  const logs = data?.data || [];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-desc">Track system events and user actions</p>
      </div>

      <DateRangeBanner from={from} to={to} />

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>User ID</th>
              <th>Target Type</th>
              <th>Target ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? <LoadingRows cols={6} /> : logs.length === 0 ? (
              <EmptyState title="No audit logs" description="No activity recorded in this date range." />
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td className="text-muted font-mono">{new Date(log.created_at).toLocaleString('en-IN')}</td>
                <td style={{ fontWeight: 600 }}>{log.action}</td>
                <td><span className="font-mono">{log.user_id || 'System'}</span></td>
                <td>{log.target_type || '—'}</td>
                <td><span className="font-mono">{log.target_id || '—'}</span></td>
                <td>
                  {log.details ? (
                    <div className="font-mono text-muted text-sm truncate" style={{ maxWidth: 200 }} title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </div>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

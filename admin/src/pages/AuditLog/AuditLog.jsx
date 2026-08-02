import React, { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import styles from '../Financials/Financials.module.css'; // Reusing table layout CSS

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/audit-log');
        setLogs(res.data?.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit Log</h1>
          <p className={styles.subtitle}>Immutable ledger of critical system actions</p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.controls}>
          <input 
            type="text" 
            placeholder="Filter by Entity or Action..." 
            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '300px' }}
          />
        </div>
        
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Actor Profile</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className={styles.emptyState}>Loading audit logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className={styles.emptyState}>No audit logs found.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className={styles.tableRow}>
                    <td style={{ color: '#64748b' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{log.action}</td>
                    <td style={{ textTransform: 'capitalize' }}>{log.entity}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>{log.entity_id}</td>
                    <td>{log.actor_profile_id}</td>
                    <td>
                      <pre style={{ margin: 0, fontSize: '0.7rem', color: '#475569', background: '#f1f5f9', padding: '0.5rem', borderRadius: '0.25rem', maxWidth: '200px', overflowX: 'auto' }}>
                        {JSON.stringify(log.detail, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;

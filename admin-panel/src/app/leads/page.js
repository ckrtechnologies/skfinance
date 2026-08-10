'use client';

import { useGetLeadsQuery, useUpdateLeadMutation } from '@/store/api/adminApi';
import { StatusBadge, LoadingRows, EmptyState } from '@/components/ui/Primitives';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { selectDateRange } from '@/store/slices/dateRangeSlice';
import ExportButtons from '@/components/ui/ExportButtons';
import styles from '../page.module.css';

export default function LeadsPage() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderInfo({ title: 'Leads', breadcrumbs: ['Operations', 'Leads'] }));
  }, [dispatch]);
  
  const dateRange = useSelector(selectDateRange);
  
  const { data, isLoading } = useGetLeadsQuery({
    from: dateRange?.from,
    to: dateRange?.to
  });
  const [updateLead] = useUpdateLeadMutation();
  
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  
  const leads = data?.data || [];

  const sortedLeads = [...leads].sort((a, b) => {
    let aVal = a[sortConfig.key] || '';
    let bVal = b[sortConfig.key] || '';
    
    if (sortConfig.key === 'created_at') {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const exportColumns = [
    { header: 'S.No', accessor: (_, i) => i + 1 },
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Email', accessor: 'email' },
    { header: 'City', accessor: 'city' },
    { header: 'Message', accessor: 'message' },
    { header: 'Status', accessor: 'status' },
    { header: 'Date', accessor: (d) => new Date(d.created_at).toLocaleDateString() },
  ];

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateLead({ id, status: newStatus }).unwrap();
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'blue';
      case 'contacted': return 'orange';
      case 'closed': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Website Leads ({leads.length})</h1>
        <ExportButtons data={sortedLeads} columns={exportColumns} filename="website_leads" title="Website Leads" />
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Name <SortIcon columnKey="name" /></th>
              <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer' }}>Phone <SortIcon columnKey="phone" /></th>
              <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>Email <SortIcon columnKey="email" /></th>
              <th onClick={() => handleSort('city')} style={{ cursor: 'pointer' }}>City <SortIcon columnKey="city" /></th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status <SortIcon columnKey="status" /></th>
              <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Date <SortIcon columnKey="created_at" /></th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingRows columns={7} rows={5} />
            ) : sortedLeads.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <EmptyState title="No Leads Found" message="Try adjusting your date range filter." />
                </td>
              </tr>
            ) : (
              sortedLeads.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 500 }}>{lead.name}</td>
                  <td>{lead.phone || '—'}</td>
                  <td>{lead.email || '—'}</td>
                  <td>{lead.city || '—'}</td>
                  <td>
                    <select 
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        background: '#f9f9f9',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lead.message}>
                    {lead.message || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

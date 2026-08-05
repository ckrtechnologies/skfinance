'use client';

import { useGetApplicationQuery, useGetStageEntriesQuery, useAddStageEntryMutation, useDisburseMutation, useReApproveMutation } from '@/store/api/adminApi';
import { StatusBadge, AmountCell, LoadingRows } from '@/components/ui/Primitives';
import { useState, useEffect, use } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useRouter } from 'next/navigation';

const PIPELINE_STAGES = [
  { key: 'pre_check', label: 'Pre-Check', icon: '⚡', desc: 'Rules & Check' },
  { key: 'cibil', label: 'CIBIL Bureau', icon: '📊', desc: 'Credit Score' },
  { key: 'document_verification', label: 'KYC & Docs', icon: '📄', desc: 'Verifications' },
  { key: 'bank', label: 'Bank Underwriting', icon: '🏦', desc: 'Income & Banking' },
  { key: 'valuation', label: 'Valuation', icon: '🚗', desc: 'Vehicle Report' },
  { key: 'fi', label: 'Field Investigation', icon: '🏠', desc: 'Residence Check' },
  { key: 'sanction', label: 'Sanction', icon: '📜', desc: 'Credit Sanction' },
  { key: 'approval', label: 'Final Approval', icon: '✅', desc: 'Sanction Letter' },
  { key: 'disbursement', label: 'Disbursement', icon: '💸', desc: 'Fund Payout' }
];

export default function ApplicationDetailsPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();

  const { data: appData, isLoading, refetch } = useGetApplicationQuery(id);
  const { data: stagesData, isLoading: stagesLoading, refetch: refetchStages } = useGetStageEntriesQuery(id);
  const [addStageEntry, { isLoading: addingEntry }] = useAddStageEntryMutation();
  const [disburse, { isLoading: disbursing }] = useDisburseMutation();
  const [reApprove, { isLoading: reApproving }] = useReApproveMutation();

  const [modal, setModal] = useState(null); // 'stage', 'disburse', 'reapprove'
  const [stageNotes, setStageNotes] = useState('');
  const [stageAction, setStageAction] = useState('advance'); // 'advance', 'clarification', 'reject'
  const [targetStage, setTargetStage] = useState('');
  const [utr, setUtr] = useState('');

  // Active Tab View State: 'docs', 'financial', 'customer'
  const [activeTab, setActiveTab] = useState('docs');

  const app = appData?.data;
  const stages = stagesData?.data || [];

  const dispatch = useDispatch();
  useEffect(() => {
    if (app) {
      dispatch(setHeaderInfo({ title: `App: #${app.application_no || app.id}`, breadcrumbs: ['Operations', 'Applications', 'Details'] }));
      if (!targetStage) setTargetStage(app.current_stage || 'cibil');
    }
  }, [dispatch, app?.application_no, app?.current_stage]);

  if (isLoading) return <div style={{ padding: '24px', fontSize: '14px' }}>Loading application details...</div>;
  if (!app) return <div style={{ padding: '24px', color: '#EF4444', fontSize: '14px' }}>Application not found</div>;

  const displayStatus = (app.status === 'draft' || app.status === 'pending') ? 'in_progress' : app.status;

  const customerName = app.customers?.profiles?.full_name || app.applicant_details?.customer_name || 'Customer';
  const customerPhone = app.customers?.profiles?.phone || app.applicant_details?.phone || '—';
  const customerPan = app.customers?.pan_number || app.applicant_details?.pan_number || '—';
  const dealerName = app.dealers?.business_name || app.dealers?.profiles?.full_name || 'Direct';
  const staffName = app.staff?.name || app.staff?.profiles?.full_name || 'Unassigned';

  const sourceInfo = app.source || {
    type: app.dealer_id ? 'dealer' : app.staff_id ? 'staff' : 'customer',
    label: app.dealer_id ? 'Dealer Portal' : app.staff_id ? 'Staff Assisted' : 'Customer Direct',
    detail: app.dealer_id ? dealerName : app.staff_id ? staffName : 'Web/App'
  };

  const activeStageIndex = PIPELINE_STAGES.findIndex(s => s.key === app.current_stage);
  const activeIndex = activeStageIndex >= 0 ? activeStageIndex : 0;
  const documents = app.documents || [];

  async function handleAddStageEntry() {
    let newStatus = 'in_progress';
    let outcome = 'approved';

    if (stageAction === 'clarification') {
      newStatus = 'clarification_requested';
      outcome = 'clarification_requested';
    } else if (stageAction === 'reject') {
      newStatus = 'rejected';
      outcome = 'rejected';
    } else {
      outcome = 'approved';
      if (targetStage === 'approval' || targetStage === 'disbursement') newStatus = 'approved';
    }

    try {
      await addStageEntry({ 
        id, 
        stage: targetStage || app.current_stage || 'cibil',
        outcome, 
        remarks: stageNotes,
        new_status: newStatus 
      }).unwrap();
    } catch (err) {
      console.log('Stage entry submitted');
    }

    refetch();
    refetchStages();
    setModal(null);
    setStageNotes('');
  }

  async function handleDisburse() {
    await disburse({ id, utr_number: utr });
    setModal(null);
    setUtr('');
  }

  async function handleReApprove() {
    await reApprove({ id });
    setModal(null);
  }

  return (
    <div style={{ width: '100%', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingBottom: '12px', marginBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} className="btn btn-secondary btn-sm">← Back</button>
          <StatusBadge status={displayStatus} />
          <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '99px', fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {sourceInfo.type === 'dealer' ? '🏬' : sourceInfo.type === 'staff' ? '👔' : '👤'} {sourceInfo.label}: <strong style={{ fontWeight: 700 }}>{sourceInfo.detail}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {displayStatus !== 'approved' && displayStatus !== 'disbursed' && displayStatus !== 'rejected' && (
            <button className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', border: 'none', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }} onClick={() => { setTargetStage(app.current_stage || 'cibil'); setStageAction('advance'); setModal('stage'); }}>
              ⚡ Advance Stage / Decision Node
            </button>
          )}
          {displayStatus === 'blocked_90d' && (
            <button className="btn btn-amber btn-sm" onClick={() => setModal('reapprove')}>Request Re-Approval</button>
          )}
          {displayStatus === 'approved' && (
            <button className="btn btn-emerald btn-sm" onClick={() => setModal('disburse')}>Mark as Disbursed</button>
          )}
        </div>
      </div>

      {/* Hero Visual Waterfall Stage Board */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        color: '#FFFFFF',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'linear-gradient(90deg, #38BDF8, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🌊 WATERFALL STAGE PIPELINE
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              Stage {activeIndex + 1} of 9
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Active Stage:</span>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#064E3B', color: '#34D399', border: '1px solid #059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} />
              {PIPELINE_STAGES[activeIndex]?.icon} {PIPELINE_STAGES[activeIndex]?.label}
            </span>
          </div>
        </div>

        {/* 9 Horizontal Waterfall Flow Nodes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: '8px' }}>
          {PIPELINE_STAGES.map((stg, idx) => {
            const isDone = idx < activeIndex || displayStatus === 'approved' || displayStatus === 'disbursed';
            const isCurrent = idx === activeIndex && displayStatus !== 'approved' && displayStatus !== 'disbursed' && displayStatus !== 'rejected';

            return (
              <div 
                key={stg.key}
                onClick={() => {
                  if (displayStatus !== 'approved' && displayStatus !== 'disbursed' && displayStatus !== 'rejected') {
                    setTargetStage(stg.key);
                    setModal('stage');
                  }
                }}
                style={{
                  background: isDone 
                    ? 'linear-gradient(135deg, rgba(5, 150, 105, 0.25) 0%, rgba(16, 185, 129, 0.15) 100%)' 
                    : isCurrent 
                    ? 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)' 
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isDone 
                    ? '1px solid rgba(52, 211, 153, 0.4)' 
                    : isCurrent 
                    ? '2px solid #60A5FA' 
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '10px 8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isCurrent ? '0 0 16px rgba(59, 130, 246, 0.5)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  height: '84px',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px' }}>{stg.icon}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isDone ? '#10B981' : isCurrent ? '#FFFFFF' : 'rgba(255, 255, 255, 0.1)',
                    color: isDone ? '#FFFFFF' : isCurrent ? '#1E40AF' : '#94A3B8'
                  }}>
                    {isDone ? '✓' : `0${idx + 1}`}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: isCurrent ? '#FFFFFF' : isDone ? '#6EE7B7' : '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stg.label}
                  </div>
                  <div style={{ fontSize: '9px', color: isCurrent ? '#BFDBFE' : '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {stg.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dual Column Zero-Scroll Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '16px' }}>
        
        {/* Left Column (7 Cols): Tabbed Interactive Detail Viewer */}
        <div style={{ gridColumn: 'span 7 / span 7', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Tab Selection Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-surface)', padding: '6px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <button 
              onClick={() => setActiveTab('docs')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                background: activeTab === 'docs' ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
                color: activeTab === 'docs' ? '#FFFFFF' : 'var(--color-text-2)',
                transition: 'all 0.15s ease'
              }}
            >
              📎 Uploaded Documents ({documents.length})
            </button>

            <button 
              onClick={() => setActiveTab('financial')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                background: activeTab === 'financial' ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'transparent',
                color: activeTab === 'financial' ? '#FFFFFF' : 'var(--color-text-2)',
                transition: 'all 0.15s ease'
              }}
            >
              📊 Financial & Loan Terms
            </button>

            <button 
              onClick={() => setActiveTab('customer')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                background: activeTab === 'customer' ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : 'transparent',
                color: activeTab === 'customer' ? '#FFFFFF' : 'var(--color-text-2)',
                transition: 'all 0.15s ease'
              }}
            >
              👤 Customer & KYC Profile
            </button>
          </div>

          {/* Active Tab Panel 1: Uploaded Verification Documents */}
          {activeTab === 'docs' && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📎 Verification Documents & KYC Attachments
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '2px 8px', borderRadius: '12px' }}>
                  {documents.length} Files Ready
                </span>
              </div>

              {documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', border: '1px dashed var(--color-border)', borderRadius: '12px', background: 'var(--color-surface-2)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>📄</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-2)' }}>No documents attached yet.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                  {documents.map((doc, idx) => (
                    <div key={doc.id || idx} style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase' }}>
                            {doc.doc_type?.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--color-surface-3)', color: 'var(--color-text-2)', textTransform: 'uppercase' }}>
                            {doc.party}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.original_filename || 'Uploaded File'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: doc.verified ? '#10B981' : '#F59E0B' }}>
                          {doc.verified ? '✓ Verified' : '⏳ Pending Review'}
                        </span>
                        {doc.cdn_path ? (
                          <a 
                            href={doc.cdn_path} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textDecoration: 'none', background: 'rgba(37,99,235,0.1)', padding: '3px 8px', borderRadius: '6px' }}
                          >
                            View File ↗
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Tab Panel 2: Financial Terms */}
          {activeTab === 'financial' && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📊 Loan Terms & Financial Assessment
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>Requested Loan</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}><AmountCell value={app.requested_amount} /></div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Product Category</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px', textTransform: 'capitalize' }}>{app.product_type?.replace(/_/g, ' ') || 'New Car'}</div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Selected Lender</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#3B82F6', marginTop: '4px' }}>{app.lenders?.name || 'Multi-Lender Pre-Check'}</div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Creation Date</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>{new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab Panel 3: Customer Profile */}
          {activeTab === 'customer' && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  👤 Customer Profile & Identification
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Full Name</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>{customerName}</div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Phone Number</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>{customerPhone}</div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>PAN Number</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#8B5CF6', marginTop: '4px', textTransform: 'uppercase' }}>{customerPan}</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (5 Cols): Living Timeline & Activity Feed */}
        <div style={{ gridColumn: 'span 5 / span 5', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📜 Stage Audit & Living Activity Log
            </h3>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-2)' }}>{stages.length} Entries</span>
          </div>

          {stagesLoading ? <LoadingRows cols={1} rows={4} /> : stages.length === 0 ? (
            <div style={{ color: 'var(--color-text-2)', fontSize: '12px', padding: '24px 0', textAlign: 'center' }}>No stage entries logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '8px' }}>
              <div style={{ position: 'absolute', left: '15px', top: '10px', bottom: '10px', width: '2px', background: 'var(--color-border)' }} />
              {stages.map((stg, i) => {
                const stgStatus = stg.outcome || stg.status || 'pending';
                const stgStage = stg.stage_name || stg.stage || 'cibil';
                const stgUser = stg.profiles?.full_name || stg.staff?.name || 'System';

                return (
                  <div key={stg.id || i} style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 10 }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: 'var(--color-surface)',
                      border: `2px solid ${stgStatus === 'approved' ? '#10B981' : stgStatus === 'rejected' ? '#EF4444' : '#F59E0B'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '3px'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: stgStatus === 'approved' ? '#10B981' : stgStatus === 'rejected' ? '#EF4444' : '#F59E0B' }} />
                    </div>

                    <div style={{ flex: 1, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', textTransform: 'capitalize' }}>{stgStage.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-3)', fontFamily: 'monospace' }}>{new Date(stg.created_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ marginBottom: '4px' }}>
                        <StatusBadge status={stgStatus} />
                      </div>
                      {stg.remarks || stg.notes ? <p style={{ fontSize: '11px', color: 'var(--color-text-2)', marginTop: '4px' }}>{stg.remarks || stg.notes}</p> : null}
                      <p style={{ fontSize: '10px', color: 'var(--color-text-3)', marginTop: '4px' }}>— by {stgUser}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Stage Update Modal */}
      {modal === 'stage' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-4">Stage Action & Decision Node</h3>
            
            <div className="field mb-3">
              <label className="text-xs font-semibold mb-1 block">Target Stage *</label>
              <select className="select w-full" value={targetStage} onChange={e => setTargetStage(e.target.value)}>
                {PIPELINE_STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                ))}
              </select>
            </div>

            <div className="field mb-3">
              <label className="text-xs font-semibold mb-1 block">Stage Decision / Action *</label>
              <select className="select w-full" value={stageAction} onChange={e => setStageAction(e.target.value)}>
                <option value="advance">Advance to Selected Stage (Approve Stage)</option>
                <option value="clarification">Request Clarification from Dealer / Raise Query</option>
                <option value="reject">Decline / Reject Application</option>
              </select>
            </div>

            <div className="field mb-4">
              <label className="text-xs font-semibold mb-1 block">
                {stageAction === 'clarification' ? 'Missing Details / Query Notes for Dealer *' : stageAction === 'reject' ? 'Rejection Reason *' : 'Internal Review Remarks'}
              </label>
              <textarea className="input w-full" rows="3" value={stageNotes} onChange={e => setStageNotes(e.target.value)} placeholder="Enter details or review notes..."></textarea>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAddStageEntry} disabled={addingEntry}>{addingEntry ? 'Saving...' : 'Save Stage Update'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'disburse' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-3">Mark Loan as Disbursed</h3>
            <p className="text-xs text-muted mb-4">This will finalize the loan and credit any applicable dealer commissions.</p>
            <div className="field mb-4">
              <label className="text-xs font-semibold mb-1 block">Bank UTR Number *</label>
              <input className="input w-full" value={utr} onChange={e => setUtr(e.target.value)} placeholder="e.g. HDFC123456789" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleDisburse} disabled={disbursing || !utr}>{disbursing ? 'Processing...' : 'Confirm Disbursement'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'reapprove' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-3">Request Re-Approval</h3>
            <p className="text-xs text-muted mb-4">Re-approving will revert status to 'approved'.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleReApprove} disabled={reApproving}>{reApproving ? 'Processing...' : 'Confirm Re-Approval'}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .modal-content { background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 24px; width: 440px; }
      `}</style>
    </div>
  );
}

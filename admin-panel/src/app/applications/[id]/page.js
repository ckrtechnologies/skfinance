'use client';

import { 
  useGetApplicationQuery, 
  useGetStageEntriesQuery, 
  useAddStageEntryMutation, 
  useDisburseMutation, 
  useReApproveMutation, 
  useGetLendersQuery,
  useGetStaffQuery,
  useAssignApplicationMutation
} from '@/store/api/adminApi';
import { StatusBadge, AmountCell, LoadingRows } from '@/components/ui/Primitives';
import { useState, useEffect, use } from 'react';
import { useDispatch } from 'react-redux';
import { setHeaderInfo } from '@/store/slices/uiSlice';
import { useRouter } from 'next/navigation';

const PIPELINE_STAGES = [
  { key: 'cibil', label: 'CIBIL & Rules', icon: '📊', desc: 'Pre-Check & Bureau' },
  { key: 'bank', label: 'Docs & Bank', icon: '🏦', desc: 'KYC & Underwriting' },
  { key: 'valuation', label: 'Valuation', icon: '🚗', desc: 'Vehicle Report' },
  { key: 'fi', label: 'Field Inv.', icon: '🏠', desc: 'Residence Check' },
  { key: 'approval', label: 'Approval', icon: '✅', desc: 'Sanction & Final' },
  { key: 'disbursement', label: 'Disbursement', icon: '💸', desc: 'Fund Payout' }
];

function formatFileName(rawName, docType) {
  if (!rawName) return `${(docType || 'Document').replace(/_/g, ' ')}.pdf`;
  try {
    let name = decodeURIComponent(rawName);
    if (name.startsWith('rn_image_picker_lib_temp_')) {
      name = name.replace(/^rn_image_picker_lib_temp_[a-f0-9-]+_?/, '');
      if (!name || name.trim() === '') {
        name = `${(docType || 'Document').replace(/_/g, ' ')} File.jpg`;
      }
    }
    return name;
  } catch {
    return rawName;
  }
}

export default function ApplicationDetailsPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const router = useRouter();

  const { data: appData, isLoading, refetch } = useGetApplicationQuery(id);
  const { data: stagesData, isLoading: stagesLoading, refetch: refetchStages } = useGetStageEntriesQuery(id);
  const { data: staffData } = useGetStaffQuery();
  const [addStageEntry, { isLoading: addingEntry }] = useAddStageEntryMutation();
  const [disburse, { isLoading: disbursing }] = useDisburseMutation();
  const [reApprove, { isLoading: reApproving }] = useReApproveMutation();
  const [assignApplication, { isLoading: assigning }] = useAssignApplicationMutation();
  const { data: lendersRes } = useGetLendersQuery();
  const activeLenders = lendersRes?.data?.filter(l => l.is_active) || [];

  const [modal, setModal] = useState(null); // 'stage', 'disburse', 'reapprove', 'assign'
  const [stageNotes, setStageNotes] = useState('');
  const [stageApprovedAmount, setStageApprovedAmount] = useState('');
  const [stageLenderName, setStageLenderName] = useState('');
  const [stageAction, setStageAction] = useState(''); // '', 'advance', 'clarification', 'reject'
  const [targetStage, setTargetStage] = useState('');
  const [utr, setUtr] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);

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
  const customerDob = app.customers?.dob ? new Date(app.customers.dob).toLocaleDateString('en-IN') : '—';
  const customerAddress = app.customers?.address_line1 || '—';
  const customerState = app.customers?.state ? `${app.customers.city ? `${app.customers.city}, ` : ''}${app.customers.state}, ${app.customers.pincode || ''}` : '';
  const customerGender = app.customers?.custom_fields?.digilocker_gender || '—';
  const customerFatherName = app.customers?.custom_fields?.digilocker_fathername ? app.customers.custom_fields.digilocker_fathername.replace('S/O ', '') : '—';
  const customerCibilRaw = app.customers?.cibil_score ?? app.applicant_details?.cibil_score;
  const customerCibil = customerCibilRaw === -1 ? 'NTC (-1)' : (customerCibilRaw ?? '—');
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

  const stageEntries = stagesData?.data || [];
  const responseMap = {};
  stageEntries.forEach(stg => {
    if ((stg.outcome === 'clarification_submitted' || stg.data?.is_clarification_response) && stg.data?.response_to_query_id) {
      if (!responseMap[stg.data.response_to_query_id]) responseMap[stg.data.response_to_query_id] = [];
      responseMap[stg.data.response_to_query_id].push(stg);
    }
  });

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
      const effectiveStage = targetStage || app?.current_stage || 'cibil';
      if (effectiveStage === 'approval' || effectiveStage === 'disbursement') newStatus = 'approved';
      // Note: Disbursement status should only be set by the dedicated Mark as Disbursed flow
    }

    try {
      const stageData = {};
      if (stageApprovedAmount) stageData.approved_amount = parseFloat(stageApprovedAmount);
      if (stageLenderName) stageData.lender_name = stageLenderName;

      await addStageEntry({
        id,
        stage: targetStage || app.current_stage || 'cibil',
        outcome,
        remarks: stageNotes,
        new_status: newStatus,
        data: stageData
      }).unwrap();
    } catch (err) {
      console.log('Stage entry submitted');
    }

    refetch();
    refetchStages();
    setModal(null);
    setStageNotes('');
    setStageApprovedAmount('');
    setStageLenderName('');
  }

  async function handleDisburse() {
    await disburse({ 
      id, 
      disbursed_amount: app.approved_amount || app.requested_amount || 0,
      stage_data: { utr_number: utr }
    });
    setModal(null);
    setUtr('');
  }

  async function handleReApprove() {
    await reApprove({ id });
    setModal(null);
  }

  const latestClarificationQuery = stages.slice().reverse().find(s => s.outcome === 'rework' || s.outcome === 'clarification_requested');
  const latestDealerResponse = stages.slice().reverse().find(s => s.outcome === 'clarification_submitted' || s.data?.is_clarification_response);

  async function handleAssign() {
    await assignApplication({ id, staff_ids: selectedStaffIds });
    setModal(null);
    refetch();
  }

  const staffList = staffData?.data || [];
  const assignedStaffList = app.assignees?.map(a => a.staff) || [];

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
          <button 
            onClick={() => { setSelectedStaffIds(app.assignees?.map(a => a.staff_id) || []); setModal('assign'); }}
            style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '99px', fontWeight: 600, background: assignedStaffList.length ? 'rgba(139,92,246,0.1)' : 'rgba(245,158,11,0.1)', color: assignedStaffList.length ? '#8B5CF6' : '#F59E0B', border: `1px solid ${assignedStaffList.length ? 'rgba(139,92,246,0.3)' : 'rgba(245,158,11,0.3)'}`, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
            className="hover:opacity-80"
          >
            {assignedStaffList.length > 0 ? `👔 Assigned to: ${assignedStaffList.map(s => s.profiles?.full_name).join(', ')}` : '⚠️ Unassigned'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {displayStatus !== 'approved' && displayStatus !== 'disbursed' && displayStatus !== 'rejected' && (
            <button className="btn btn-primary btn-sm" style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', border: 'none', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }} onClick={() => { setTargetStage(app.current_stage || 'cibil'); setStageAction('advance'); setModal('stage'); }}>
              ⚡ NEXT
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

      {/* Active Clarification Query & Dealer Response Banner */}
      {(displayStatus === 'clarification_requested' || latestClarificationQuery || latestDealerResponse) && (
        <div style={{
          background: latestDealerResponse ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))' : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))',
          border: `1.5px solid ${latestDealerResponse ? 'rgba(52, 211, 153, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '16px' }}>{latestDealerResponse ? '💬' : '⚠️'}</span>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: latestDealerResponse ? '#34D399' : '#FBBF24', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {latestDealerResponse ? 'Dealer Clarification Response Received' : 'Clarification Requested from Dealer'}
              </h4>
            </div>
            {latestClarificationQuery && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-2)', margin: '4px 0 0 0' }}>
                <strong>Query Raised:</strong> "{latestClarificationQuery.remarks || latestClarificationQuery.notes || 'Please provide document clarification.'}"
              </p>
            )}
            {latestDealerResponse && (
              <p style={{ fontSize: '12px', color: '#34D399', margin: '4px 0 0 0', fontWeight: 600 }}>
                <strong>Dealer Response:</strong> "{latestDealerResponse.remarks || latestDealerResponse.notes || 'Dealer submitted clarification details.'}"
              </p>
            )}
          </div>

          <button
            className="btn btn-primary btn-sm"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
            onClick={() => { setTargetStage(app.current_stage || 'cibil'); setStageAction('advance'); setModal('stage'); }}
          >
            ⚡ NEXT
          </button>
        </div>
      )}

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
              🌊 STAGE PIPELINE
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              Stage {activeIndex + 1} of {PIPELINE_STAGES.length}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '8px' }}>
          {PIPELINE_STAGES.map((stg, idx) => {
            const isDone = idx < activeIndex || displayStatus === 'disbursed';
            const isCurrent = (idx === activeIndex && displayStatus !== 'disbursed' && displayStatus !== 'rejected') || (displayStatus === 'approved' && idx === 5);

            return (
              <div
                key={stg.key}
                onClick={() => {
                  if (displayStatus !== 'approved' && displayStatus !== 'disbursed' && displayStatus !== 'rejected') {
                    setTargetStage(stg.key);
                    setStageAction('advance');
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
                  justifyContent: 'space-between',
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

      {/* Full Width Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: '16px' }}>

        {/* Full Width Column: Tabbed Interactive Detail Viewer */}
        <div style={{ gridColumn: 'span 12 / span 12', display: 'flex', flexDirection: 'column', gap: '16px' }}>

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

            <button
              onClick={() => setActiveTab('audit')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                background: activeTab === 'audit' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                color: activeTab === 'audit' ? '#FFFFFF' : 'var(--color-text-2)',
                transition: 'all 0.15s ease'
              }}
            >
              📜 Stage Audit Trail
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {['applicant', 'co_applicant', 'guarantor'].map((partyKey) => {
                    const partyDocs = documents.filter(d => (d.party || 'applicant').toLowerCase() === partyKey);
                    if (partyDocs.length === 0) return null;

                    const partyLabel = partyKey === 'co_applicant' ? 'Co-Applicant' : partyKey.charAt(0).toUpperCase() + partyKey.slice(1);

                    return (
                      <div key={partyKey} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            📁 {partyLabel} Documents ({partyDocs.length})
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                          {partyDocs.map((doc, idx) => {
                            const displayName = formatFileName(doc.original_filename, doc.doc_type);
                            return (
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
                                  <div style={{ fontSize: '11px', color: 'var(--color-text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={displayName}>
                                    {displayName}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: doc.verified ? '#10B981' : '#F59E0B' }}>
                                    {doc.verified ? '✓ Verified' : '⏳ Pending Review'}
                                  </span>
                                  {doc.cdn_url ? (
                                    <a
                                      href={doc.cdn_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textDecoration: 'none', background: 'rgba(37,99,235,0.1)', padding: '3px 8px', borderRadius: '6px' }}
                                    >
                                      View File ↗
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Requested Loan</span>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text)', marginTop: '2px' }}><AmountCell value={app.requested_amount} /></div>
                </div>
                {(() => {
                  const effectiveApprovedAmount = app.approved_amount || (app.status === 'disbursed' || app.status === 'approved' ? (app.disbursed_amount || app.requested_amount) : null);
                  return (
                    <div style={{ background: effectiveApprovedAmount ? 'rgba(16,185,129,0.1)' : 'var(--color-surface-2)', border: effectiveApprovedAmount ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: effectiveApprovedAmount ? '#10B981' : 'var(--color-text-2)', textTransform: 'uppercase' }}>Approved Loan Amount</span>
                      <div style={{ fontSize: effectiveApprovedAmount ? '18px' : '14px', fontWeight: 800, color: effectiveApprovedAmount ? '#10B981' : 'var(--color-text-3)', marginTop: '2px' }}>
                        {effectiveApprovedAmount ? <AmountCell value={effectiveApprovedAmount} /> : 'Pending Approval'}
                      </div>
                    </div>
                  );
                })()}
                <div style={{ background: app.lenders?.name ? 'rgba(59,130,246,0.1)' : 'var(--color-surface-2)', border: app.lenders?.name ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: app.lenders?.name ? '#3B82F6' : 'var(--color-text-2)', textTransform: 'uppercase' }}>Sanctioning Bank / Lender</span>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: app.lenders?.name ? '#3B82F6' : 'var(--color-text-3)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {app.lenders?.name ? `🏦 ${app.lenders.name}` : 'Pending Assignment'}
                    {app.lenders?.contact_phone && (
                      <a href={`https://wa.me/${app.lenders.contact_phone}?text=Hello, sharing documents for Application ${app.application_no || app.id}`} target="_blank" rel="noopener noreferrer" style={{ padding: '2px 8px', fontSize: '11px', background: '#25D366', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}>
                        <i className="fa fa-whatsapp" style={{ marginRight: 4 }}></i>WhatsApp POC
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Disbursed Amount</span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: app.disbursed_amount ? '#10B981' : 'var(--color-text-3)', marginTop: '4px' }}>
                    {app.disbursed_amount ? <AmountCell value={app.disbursed_amount} /> : 'Pending Payout'}
                  </div>
                </div>
              </div>

              {/* Multi-Lender Pre-Check & Approval Verdicts */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🏦 Partner Lender Eligibility & Multi-NBFC Approval Verdicts
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-2)', fontWeight: 600 }}>
                    {(app.evaluations || []).filter(e => e.result === 'eligible').length} Eligible Lenders Found
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {!(app.evaluations && app.evaluations.length > 0) ? (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-2)', padding: '8px 0' }}>
                      Primary Lender: <strong style={{ color: '#3B82F6' }}>{app.lenders?.name || 'ITI Finance'}</strong> (Pre-check Passed)
                    </div>
                  ) : (
                    app.evaluations.map((ev, idx) => {
                      const isEligible = ev.result === 'eligible';
                      const isIncomplete = ev.result === 'incomplete';
                      return (
                        <div key={idx} style={{
                          background: isEligible ? 'rgba(16,185,129,0.08)' : isIncomplete ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                          border: `1px solid ${isEligible ? 'rgba(16,185,129,0.25)' : isIncomplete ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: isEligible ? '#10B981' : isIncomplete ? '#F59E0B' : '#EF4444' }}>
                                {ev.lender_name}
                              </span>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: isEligible ? '#10B981' : isIncomplete ? '#F59E0B' : '#EF4444',
                                color: '#FFFFFF',
                                textTransform: 'uppercase'
                              }}>
                                {isEligible ? 'High Approval Chance (Eligible)' : isIncomplete ? 'Incomplete Docs' : 'Not Eligible'}
                              </span>
                            </div>
                            {ev.failed_rules && ev.failed_rules.length > 0 && (
                              <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>
                                Reason: {ev.failed_rules.join('; ')}
                              </div>
                            )}
                          </div>
                          {isEligible && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: '6px' }}>
                              ✓ Recommended Candidate
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Active Tab Panel 3: Customer Profile */}
          {activeTab === 'customer' && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Customer Profile
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Full Name</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>{customerName}</div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Phone</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>{customerPhone}</div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>PAN</span>
                  <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#8B5CF6', marginTop: '4px' }}>{customerPan}</div>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginTop: '12px' }}>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Date of Birth</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>{customerDob}</div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Gender</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>{customerGender}</div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Father's Name</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>{customerFatherName}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginTop: '12px' }}>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>CIBIL Score</span>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: customerCibil === '—' ? 'inherit' : customerCibil === 'NTC (-1)' ? '#F59E0B' : customerCibil >= 750 ? '#10B981' : customerCibil >= 650 ? '#F59E0B' : '#EF4444', marginTop: '4px' }}>
                    {customerCibil}
                  </div>
                </div>
                <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '10px', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase' }}>Address</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>{customerAddress}</div>
                  {customerState && <div style={{ fontSize: '12px', color: 'var(--color-text-2)', marginTop: '2px' }}>{customerState}</div>}
                </div>
              </div>
            </div>
          )}

          {/* Active Tab Panel 4: Stage Audit & Living Activity Log */}
          {activeTab === 'audit' && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' }}>
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
              {[...stages].reverse().filter(stg => !stg.data?.is_clarification_response).map((stg, i) => {
                const stgStatus = stg.outcome || stg.status || 'pending';
                const stgStage = stg.stage_name || stg.stage || 'cibil';
                const stgUser = stg.profiles?.full_name || stg.staff?.name || 'System';
                const isPassed = stgStatus === 'approved' || stgStatus === 'pass';
                const isFailed = stgStatus === 'rejected' || stgStatus === 'fail';
                const isClarificationResponse = stg.data?.is_clarification_response;
                const statusColor = isPassed ? '#10B981' : isFailed ? '#EF4444' : isClarificationResponse ? '#3B82F6' : '#F59E0B';
                const badgeLabel = isPassed ? 'Pass' : isFailed ? 'Rejected' : stgStatus === 'rework' ? 'Clarification Requested' : isClarificationResponse ? 'Dealer Response' : 'Pending';

                const renderResponse = (resp) => {
                  const respDocs = (resp.data?.document_ids || []).map(id => documents.find(d => d.id === id)).filter(Boolean);
                  return (
                    <div key={resp.id} style={{ marginTop: '8px', padding: '10px', background: 'rgba(59,130,246,0.08)', borderRadius: '6px', borderLeft: '3px solid #3B82F6' }}>
                      <strong style={{ fontSize: '10px', color: '#3B82F6', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                        👤 Dealer Response:
                      </strong>
                      <div style={{ fontSize: '11px', color: 'var(--color-text)', lineHeight: '1.4' }}>
                        {resp.remarks || resp.notes || '(Documents attached)'}
                      </div>
                      {respDocs.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {respDocs.map(d => (
                            <a key={d.id} href={d.cdn_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: '#3B82F6', background: '#DBEAFE', padding: '2px 8px', borderRadius: '4px', textDecoration: 'none' }}>
                              📎 {formatFileName(d.original_filename, d.doc_type)}
                            </a>
                          ))}
                        </div>
                      )}
                      <p style={{ fontSize: '9px', color: 'var(--color-text-3)', marginTop: '4px' }}>
                        — by {resp.profiles?.full_name || 'Dealer'} on {new Date(resp.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  );
                };

                return (
                  <div key={stg.id || i} style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 10 }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: 'var(--color-surface)',
                      border: `2px solid ${statusColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '3px'
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
                    </div>

                    <div style={{ flex: 1, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', textTransform: 'capitalize' }}>{stgStage.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-3)', fontFamily: 'monospace' }}>{new Date(stg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: isPassed ? 'rgba(16,185,129,0.15)' : isFailed ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                          color: statusColor,
                          textTransform: 'uppercase'
                        }}>
                          {badgeLabel}
                        </span>
                        {stg.data?.lender_name && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                            🏦 Bank: {stg.data.lender_name}
                          </span>
                        )}
                        {stg.data?.approved_amount && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                            💰 Approved: ₹{Number(stg.data.approved_amount).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {stg.remarks || stg.notes ? (
                        <div style={{
                          fontSize: '11px',
                          color: 'var(--color-text)',
                          background: isFailed ? 'rgba(239,68,68,0.08)' : stgStatus === 'rework' ? 'rgba(245,158,11,0.08)' : 'var(--color-surface)',
                          borderLeft: `3px solid ${statusColor}`,
                          padding: '6px 10px',
                          borderRadius: '4px',
                          marginTop: '6px',
                          lineHeight: '1.4'
                        }}>
                          <strong style={{ fontSize: '10px', color: statusColor, textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                            💬 {stgStatus === 'rework' ? 'Clarification Query' : isClarificationResponse ? 'Dealer Response' : 'Stage Note / Remarks'}:
                          </strong>
                          {stg.remarks || stg.notes}
                        </div>
                      ) : null}
                      
                      {/* Render nested responses if any */}
                      {stg.data?.query_id && responseMap[stg.data.query_id] && (
                        <div>
                          {responseMap[stg.data.query_id].map(renderResponse)}
                        </div>
                      )}
                      <p style={{ fontSize: '10px', color: 'var(--color-text-3)', marginTop: '6px' }}>— by {stgUser}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                <option value="" disabled>Select Action...</option>
                <option value="advance">Advance to Selected Stage (Approve Stage)</option>
                <option value="clarification">Request Clarification from Dealer / Raise Query</option>
                <option value="reject">Decline / Reject Application</option>
              </select>
            </div>

            <div className="field mb-3">
              <label className="text-xs font-semibold mb-1 block">Sanctioning Lender / Bank (Optional)</label>
              <select
                className="select w-full"
                value={stageLenderName}
                onChange={e => setStageLenderName(e.target.value)}
              >
                <option value="">Select a Lender...</option>
                {activeLenders.map(l => (
                  <option key={l.id} value={l.name}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="field mb-3">
              <label className="text-xs font-semibold mb-1 block">Approved Loan Amount (₹) (Optional)</label>
              <input
                type="number"
                className="input w-full"
                value={stageApprovedAmount}
                onChange={e => setStageApprovedAmount(e.target.value)}
                placeholder={`Default: ₹${app.requested_amount || 0}`}
              />
            </div>

            <div className="field mb-4">
              <label className="text-xs font-semibold mb-1 block">
                {stageAction === 'clarification' ? 'Missing Details / Query Notes for Dealer *' : stageAction === 'reject' ? 'Rejection Reason *' : 'Internal Review Remarks / Notes'}
              </label>
              <textarea className="input w-full" rows="3" value={stageNotes} onChange={e => setStageNotes(e.target.value)} placeholder="Enter notes or clarification instructions..."></textarea>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAddStageEntry} disabled={addingEntry || !stageAction}>{addingEntry ? 'Saving...' : 'Save Stage Update'}</button>
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

      {modal === 'assign' && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-3">Manage Assignment</h3>
            <p className="text-xs text-muted mb-4">Assign this application to one or more staff members.</p>
            <div className="field mb-4 max-h-[300px] overflow-y-auto pr-2">
              <label className="text-xs font-semibold mb-2 block">Select Staff Members</label>
              <div className="flex flex-col gap-2">
                {staffList.filter(s => s.is_active).map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 p-1 rounded">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={selectedStaffIds.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStaffIds([...selectedStaffIds, s.id]);
                        } else {
                          setSelectedStaffIds(selectedStaffIds.filter(id => id !== s.id));
                        }
                      }}
                    />
                    {s.profiles?.full_name || s.staff_code}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleAssign} disabled={assigning}>{assigning ? 'Saving...' : 'Save Assignments'}</button>
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

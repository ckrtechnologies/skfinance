import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { ScrollView, RefreshControl, Modal, TouchableOpacity, Linking, Platform } from 'react-native';
import { YStack, XStack, H2, H4, Paragraph, Card, Spinner, SizableText, Separator, Input, Button } from 'tamagui';
import { useGetApplicationDetailsQuery, useGetStageEntriesQuery, useResubmitClarificationMutation, useGetDigilockerAuthUrlMutation, useProcessDigilockerMutation } from '../store/api/dealerApi';
import ScreenWrapper from '../ui/ScreenWrapper';
import { DigilockerWebView } from '../ui/DigilockerWebView';
import { PrimaryButton, AltButton } from '../ui/Components';
import { colors } from '../theme';
import { useAppAlert } from '../context/AlertContext';
import { FileText, CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert, Send, ExternalLink, UploadCloud, Plus, Paperclip } from '@tamagui/lucide-icons-2';
import DocumentPicker, { types, pick } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import * as Keychain from 'react-native-keychain';
import Config from 'react-native-config';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PIPELINE_STAGES = [
  { key: 'cibil', label: 'CIBIL' },
  { key: 'bank', label: 'Documents' },
  { key: 'valuation', label: 'Valuation' },
  { key: 'fi', label: 'FI' },
  { key: 'approval', label: 'Approval' },
  { key: 'disbursement', label: 'Disburse' },
];

export default function ApplicationDetailsScreen({ route, navigation }) {
  const { showAlert } = useAppAlert();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const reduxToken = useSelector(state => state.auth?.token);
  const { data: response, isLoading, isFetching, refetch } = useGetApplicationDetailsQuery(id);
  const { data: stagesResponse, isLoading: stagesLoading, refetch: refetchStages } = useGetStageEntriesQuery(id);
  const [resubmitClarification, { isLoading: isSubmittingClarification }] = useResubmitClarificationMutation();
  const [getDigilockerAuthUrl] = useGetDigilockerAuthUrlMutation();
  const [processDigilocker] = useProcessDigilockerMutation();

  const [showClarificationModal, setShowClarificationModal] = useState(false);
  const [activeQueryId, setActiveQueryId] = useState(null);
  const [clarificationNotes, setClarificationNotes] = useState('');
  const [clarificationDocs, setClarificationDocs] = useState([]); // array of { id, name }

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('aadhaar');
  const [uploadParty, setUploadParty] = useState('applicant');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Digilocker State
  const [showDigilocker, setShowDigilocker] = useState(false);
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [digilockerSession, setDigilockerSession] = useState({ client_token: '', state: '' });
  const [isDigilockerProcessing, setIsDigilockerProcessing] = useState(false);

  const app = response?.data;
  const stageEntries = stagesResponse?.data || [];

  const handleRefresh = () => {
    refetch();
    refetchStages();
  };

  const uploadFileToApp = async (pickedFile) => {
    if (!pickedFile || !id) return;
    setIsUploadingDoc(true);
    try {
      let token = reduxToken;
      if (!token) {
        const credentials = await Keychain.getGenericPassword();
        token = credentials ? credentials.password : '';
      }

      let baseUrl = Config.API_URL || 'http://localhost:4000';
      if (Platform.OS === 'android' && baseUrl.includes('localhost')) {
        baseUrl = baseUrl.replace('localhost', '10.0.2.2');
      }

      let uri = pickedFile.uri || '';
      if (Platform.OS === 'android' && uri && !uri.startsWith('file://') && !uri.startsWith('content://')) {
        uri = `file://${uri}`;
      } else if (Platform.OS === 'ios' && uri.startsWith('file://')) {
        uri = uri.replace('file://', '');
      }

      const fileName = pickedFile.name || (uri ? uri.split('/').pop() : null) || `${uploadDocType || 'document'}.jpg`;
      const fileType = pickedFile.type || (fileName.endsWith('.pdf') ? 'application/pdf' : fileName.endsWith('.png') ? 'image/png' : 'image/jpeg');

      const url = `${baseUrl}/dealer/applications/upload-document`;
      let res;
      let retries = 3;
      let lastError;
      
      while (retries > 0) {
        try {
          const body = new FormData();
          body.append('file', {
            uri,
            name: fileName,
            type: fileType,
          });
          body.append('loan_application_id', id);
          body.append('doc_type', uploadDocType);
          body.append('party', uploadParty);

          res = await fetch(url, {
            method: 'POST',
            body,
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          break; // if it succeeds or gets a 4xx/5xx response, exit the retry loop
        } catch (err) {
          lastError = err;
          retries--;
          if (retries > 0) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      if (!res) {
        throw lastError || new Error('Network request failed after retries');
      }

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message || (typeof json?.error === 'string' ? json.error : null) || json?.message || 'Upload failed');
      }

      // If activeQueryId is set, this upload is for a clarification response
      if (activeQueryId && json?.data?.document_id) {
        setClarificationDocs(prev => [...prev, { id: json.data.document_id, name: fileName }]);
      } else {
        showAlert('Success', 'Document uploaded successfully!');
        setShowUploadModal(false);
        handleRefresh();
      }
      return json?.data;
    } catch (e) {
      showAlert('Upload Error', e?.message || 'Failed to upload document.');
      throw e;
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleStartDigilocker = async () => {
    try {
      setIsDigilockerProcessing(true);
      const res = await getDigilockerAuthUrl().unwrap();
      if (res.data && res.data.url) {
        setDigilockerSession({ client_token: res.data.client_token, state: res.data.state });
        setDigilockerUrl(res.data.url);
        setShowDigilocker(true);
      } else {
        showAlert('Error', 'Failed to generate DigiLocker URL');
      }
    } catch (e) {
      showAlert('Error', e?.data?.error?.message || 'Failed to start DigiLocker');
    } finally {
      setIsDigilockerProcessing(false);
    }
  };

  const handleDigilockerRedirect = async (url) => {
    setShowDigilocker(false);
    setIsDigilockerProcessing(true);
    try {
      const res = await processDigilocker({
        client_token: digilockerSession.client_token,
        state: digilockerSession.state,
        application_no: app?.application_no,
      }).unwrap();
      
      showAlert('Success', 'Documents securely fetched and saved to application!');
      handleRefresh();
    } catch (e) {
      showAlert('Error', e?.data?.error?.message || 'Failed to process DigiLocker data. Please try again or use manual upload.');
    } finally {
      setIsDigilockerProcessing(false);
    }
  };

  const handleCameraPick = async () => {
    try {
      const result = await launchCamera({ mediaType: 'photo', cameraType: 'back', quality: 0.8 });
      if (result.assets?.length) {
        const asset = result.assets[0];
        uploadFileToApp({ uri: asset.uri, type: asset.type, name: asset.fileName || 'photo.jpg' });
      }
    } catch (err) { console.log(err); }
  };

  const handleGalleryPick = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.assets?.length) {
        const asset = result.assets[0];
        uploadFileToApp({ uri: asset.uri, type: asset.type, name: asset.fileName || 'photo.jpg' });
      }
    } catch (err) { console.log(err); }
  };

  const handleFilePick = async () => {
    try {
      const results = await pick({ type: [types.pdf, types.images] });
      if (results && results[0]) {
        const file = results[0];
        uploadFileToApp({ uri: file.uri, type: file.type, name: file.name });
      }
    } catch (err) { console.log(err); }
  };

  const handleResubmit = async () => {
    if (!clarificationNotes.trim() && clarificationDocs.length === 0) {
      showAlert('Validation Required', 'Please enter notes or attach a document for the review team.');
      return;
    }
    try {
      await resubmitClarification({ 
        id, 
        notes: clarificationNotes,
        queryId: activeQueryId,
        documentIds: clarificationDocs.map(d => d.id)
      }).unwrap();
      showAlert('Success', 'Clarification response submitted. Application is now under review.');
      setShowClarificationModal(false);
      setClarificationNotes('');
      setClarificationDocs([]);
      setActiveQueryId(null);
      handleRefresh();
    } catch (err) {
      showAlert('Error', typeof err === 'string' ? err : 'Failed to submit clarification response.');
    }
  };

  const handleOpenDoc = (url) => {
    if (!url) {
      showAlert('Unavailable', 'Document file link is not available.');
      return;
    }

    let finalUrl = url;
    
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      let baseUrl = Config.API_URL || 'http://localhost:4000';
      if (!finalUrl.startsWith('/')) finalUrl = '/' + finalUrl;
      if (!finalUrl.startsWith('/cdn')) finalUrl = '/cdn' + finalUrl;
      finalUrl = baseUrl + finalUrl;
    }

    if (Platform.OS === 'android' && finalUrl.includes('localhost')) {
      finalUrl = finalUrl.replace('localhost', '10.0.2.2');
    }

    Linking.openURL(finalUrl).catch(err => {
      showAlert('Error', 'Could not open document URL.');
    });
  };

  if (isLoading) {
    return (
      <ScreenWrapper edges={['bottom']}>
        <YStack f={1} jc="center" ai="center" backgroundColor="$background">
          <Spinner size="large" color={colors.brandBlue} />
        </YStack>
      </ScreenWrapper>
    );
  }

  if (!app) {
    return (
      <ScreenWrapper edges={['bottom']}>
        <YStack f={1} jc="center" ai="center" p="$4" backgroundColor="$background" space="$3">
          <AlertTriangle size={48} color={colors.error} />
          <Paragraph color={colors.textMuted} ta="center">Application not found.</Paragraph>
          <PrimaryButton onPress={() => navigation.goBack()}>Back to Applications</PrimaryButton>
        </YStack>
      </ScreenWrapper>
    );
  }

  const currentStageIndex = PIPELINE_STAGES.findIndex(s => s.key === app.current_stage);
  const activeStageIndex = currentStageIndex >= 0 ? currentStageIndex : 0;
  const isRejected = app.status === 'rejected';
  const isApproved = app.status === 'approved' || app.status === 'disbursed';
  const latestEntry = stageEntries[stageEntries.length - 1];

  let unresolvedQueries = stageEntries.filter(stg => 
    (stg.outcome === 'rework' || stg.outcome === 'clarification_requested') && 
    stg.data?.resolved !== true
  );
  
  if (unresolvedQueries.length === 0 && app.status === 'clarification_requested') {
    unresolvedQueries = [{
      id: 'legacy-query',
      stage: app.current_stage || 'Review',
      outcome: 'rework',
      remarks: 'The review team requested additional information or document clarification for this application.',
      data: { query_id: 'legacy-query-id' }
    }];
  }

  const isClarificationNeeded = unresolvedQueries.length > 0;

  return (
    <ScreenWrapper edges={['bottom']}>
      <ScrollView 
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={handleRefresh} />}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
      >
        <YStack space="$4">
          
          {/* Formatted Application Number Header */}
          <YStack space="$1">
            <XStack jc="space-between" ai="center">
              <SizableText color={colors.brandBlue} fontSize={22} fontWeight="bold" flex={1} numberOfLines={1}>
                App #{app.application_no || app.reference_id || app.id?.substring(0, 8)}
              </SizableText>
              <SizableText 
                backgroundColor={
                  isApproved ? colors.brandGreenMuted : 
                  isRejected ? colors.errorMuted : 
                  isClarificationNeeded ? '#FEF3C7' : '#DBEAFE'
                }
                color={
                  isApproved ? colors.brandGreenDark : 
                  isRejected ? colors.error : 
                  isClarificationNeeded ? '#B45309' : '#1D4ED8'
                }
                px="$2"
                py="$1"
                borderRadius="$4"
                fontWeight="bold"
                fontSize={10}
                maxWidth="40%"
                numberOfLines={1}
                textAlign="center"
              >
                {((app.status === 'draft' || app.status === 'pending') ? 'IN_PROGRESS' : app.status || 'IN_PROGRESS').replace(/_/g, ' ').toUpperCase()}
              </SizableText>
            </XStack>
            <Paragraph color={colors.textMuted} fontSize={12}>
              Created on {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Paragraph>
          </YStack>

          {/* Action Required Banner (Clarification Needed) */}
          {isClarificationNeeded && (
            <YStack space="$3">
              {unresolvedQueries.map(query => (
                <Card key={query.id} p="$4" backgroundColor="#FFFBEB" borderColor="#F59E0B" borderWidth={1.5} borderRadius="$4">
                  <YStack space="$2">
                    <XStack ai="center" space="$2">
                      <ShieldAlert color="#B45309" size={22} />
                      <SizableText color="#B45309" fontWeight="bold" fontSize={15}>
                        Clarification Requested ({query.stage?.toUpperCase()})
                      </SizableText>
                    </XStack>
                    <Paragraph color="#92400E" fontSize={13} lineHeight={18}>
                      {query.remarks || 'The review team requested additional information or document clarification.'}
                    </Paragraph>
                    <PrimaryButton 
                      mt="$2"
                      onPress={() => {
                        setActiveQueryId(query.data?.query_id);
                        setClarificationNotes('');
                        setClarificationDocs([]);
                        setShowClarificationModal(true);
                      }}
                      icon={() => <Send size={16} color="#FFF" />}
                    >
                      Reply to Query
                    </PrimaryButton>
                  </YStack>
                </Card>
              ))}
            </YStack>
          )}

          {/* Rejection Banner */}
          {isRejected && (
            <Card p="$4" backgroundColor={colors.errorMuted} borderColor={colors.error} borderWidth={1.5} borderRadius="$4">
              <YStack space="$2">
                <XStack ai="center" space="$2">
                  <XCircle color={colors.error} size={22} />
                  <SizableText color={colors.error} fontWeight="bold" fontSize={15}>
                    Application Declined
                  </SizableText>
                </XStack>
                <Paragraph color={colors.error} fontSize={13} lineHeight={18}>
                  Reason: {latestEntry?.remarks || app.rejection_reason || 'This application does not meet lender risk criteria.'}
                </Paragraph>
              </YStack>
            </Card>
          )}

          {/* Pipeline Stage Tracker Progress Bar */}
          <Card p="$4" bordered borderRadius="$4" backgroundColor="$background">
            <YStack space="$3">
              <SizableText color={colors.brandBlue} fontWeight="bold" fontSize={14}>
                Pipeline Progress Stage
              </SizableText>
              
              <XStack jc="space-between" ai="flex-start">
                {PIPELINE_STAGES.map((stg, index) => {
                  const isDone = index < activeStageIndex || isApproved;
                  const isCurrent = index === activeStageIndex && !isApproved && !isRejected;

                  return (
                    <YStack key={stg.key} ai="center" space="$1" style={{ flex: 1 }}>
                      <YStack
                        w={28}
                        h={28}
                        borderRadius={14}
                        ai="center"
                        jc="center"
                        backgroundColor={
                          isDone ? colors.brandGreen :
                          isCurrent ? colors.brandBlue :
                          '$borderColor'
                        }
                      >
                        {isDone ? (
                          <CheckCircle2 size={16} color="#FFF" />
                        ) : (
                          <SizableText color={isCurrent ? '#FFF' : colors.textMuted} fontSize={11} fontWeight="bold">
                            {index + 1}
                          </SizableText>
                        )}
                      </YStack>
                      <SizableText 
                        fontSize={10} 
                        fontWeight={isCurrent ? 'bold' : 'normal'}
                        color={isCurrent ? colors.brandBlue : colors.textMuted}
                        numberOfLines={2}
                        ta="center"
                      >
                        {stg.label}
                      </SizableText>
                    </YStack>
                  );
                })}
              </XStack>
            </YStack>
          </Card>

          {/* Customer Information Card */}
          <Card p="$4" bordered borderRadius="$4" backgroundColor="$background">
            <YStack space="$3">
              <SizableText color={colors.brandBlue} fontWeight="bold" fontSize={15}>
                Customer Information
              </SizableText>
              <Separator />
              <YStack space="$2">
                <XStack jc="space-between" ai="center">
                  <Paragraph color={colors.textMuted} fontSize={13}>Full Name</Paragraph>
                  <SizableText fontWeight="bold" fontSize={14}>
                    {app.customers?.profiles?.full_name || app.applicant_details?.customer_name || 'N/A'}
                  </SizableText>
                </XStack>

                <XStack jc="space-between" ai="center">
                  <Paragraph color={colors.textMuted} fontSize={13}>Phone Number</Paragraph>
                  <SizableText fontWeight="bold" fontSize={14}>
                    {app.customers?.profiles?.phone || app.applicant_details?.phone || '—'}
                  </SizableText>
                </XStack>

                <XStack jc="space-between" ai="center">
                  <Paragraph color={colors.textMuted} fontSize={13}>PAN Number</Paragraph>
                  <SizableText fontWeight="bold" fontSize={14} tt="uppercase">
                    {app.customers?.pan_number || app.applicant_details?.pan_number || '—'}
                  </SizableText>
                </XStack>

                <XStack jc="space-between" ai="center">
                  <Paragraph color={colors.textMuted} fontSize={13}>Date of Birth</Paragraph>
                  <SizableText fontWeight="bold" fontSize={14}>
                    {app.customers?.dob ? new Date(app.customers.dob).toLocaleDateString('en-IN') : '—'}
                  </SizableText>
                </XStack>

                <XStack jc="space-between" ai="center">
                  <Paragraph color={colors.brandBlue} fontSize={13} fontWeight="bold">Ownership Proof By</Paragraph>
                  <SizableText fontWeight="bold" fontSize={14} backgroundColor="$blue4" color="$blue10" px="$2" py="$1" borderRadius={6} tt="capitalize">
                    {app.ownership_provided_by ? app.ownership_provided_by.replace('_', '-') : 'Applicant'}
                  </SizableText>
                </XStack>

                {(() => {
                  const cibilRaw = app.customers?.cibil_score ?? app.applicant_details?.cibil_score;
                  const cibilScore = cibilRaw === -1 ? 'NTC (-1)' : (cibilRaw ?? '—');
                  const cibilColor = cibilScore === '—' ? colors.textMuted : cibilScore === 'NTC (-1)' ? colors.brandAmber : cibilRaw >= 750 ? colors.brandGreen : cibilRaw >= 650 ? colors.brandAmber : colors.error;
                  return (
                    <XStack jc="space-between" ai="center">
                      <Paragraph color={colors.textMuted} fontSize={13}>CIBIL Score</Paragraph>
                      <SizableText fontWeight="bold" fontSize={14} color={cibilColor}>
                        {cibilScore}
                      </SizableText>
                    </XStack>
                  );
                })()}

                {app.customers?.custom_fields?.digilocker_gender && (
                  <XStack jc="space-between" ai="center">
                    <Paragraph color={colors.textMuted} fontSize={13}>Gender</Paragraph>
                    <SizableText fontWeight="bold" fontSize={14}>
                      {app.customers.custom_fields.digilocker_gender}
                    </SizableText>
                  </XStack>
                )}

                {app.customers?.custom_fields?.digilocker_fathername && (
                  <XStack jc="space-between" ai="center">
                    <Paragraph color={colors.textMuted} fontSize={13}>Father's Name</Paragraph>
                    <SizableText fontWeight="bold" fontSize={14}>
                      {app.customers.custom_fields.digilocker_fathername.replace('S/O ', '')}
                    </SizableText>
                  </XStack>
                )}

                <XStack jc="space-between" ai="flex-start">
                  <Paragraph color={colors.textMuted} fontSize={13}>Address</Paragraph>
                  <YStack f={1} ai="flex-end" pl="$4">
                    <SizableText fontWeight="bold" fontSize={14} textAlign="right" numberOfLines={2}>
                      {app.customers?.address_line1 || '—'}
                    </SizableText>
                    {app.customers?.state && (
                      <SizableText fontSize={12} color={colors.textMuted}>
                        {app.customers.city ? `${app.customers.city}, ` : ''}{app.customers.state}, {app.customers.pincode || ''}
                      </SizableText>
                    )}
                  </YStack>
                </XStack>
              </YStack>
            </YStack>
          </Card>

          {/* Loan & Bank Approval Details Card */}
          <Card p="$4" bordered borderRadius="$4" backgroundColor="$background">
            <YStack space="$3">
              <SizableText color={colors.brandBlue} fontWeight="bold" fontSize={15}>
                Loan & Bank Sanction Details
              </SizableText>
              <Separator />
              <YStack space="$2">
                <XStack jc="space-between" ai="center">
                  <Paragraph color={colors.textMuted} fontSize={13}>Requested Loan Amount</Paragraph>
                  <SizableText fontWeight="bold" fontSize={15} color={colors.brandBlue}>
                    ₹{(app.requested_amount || 0).toLocaleString('en-IN')}
                  </SizableText>
                </XStack>

                {(() => {
                  const effectiveApprovedAmount = app.approved_amount || (app.status === 'disbursed' || app.status === 'approved' ? (app.disbursed_amount || app.requested_amount) : null);
                  return (
                    <XStack jc="space-between" ai="center">
                      <Paragraph color={colors.textMuted} fontSize={13}>Approved Loan Amount</Paragraph>
                      <SizableText fontWeight="bold" fontSize={16} color={effectiveApprovedAmount ? colors.brandGreenDark : colors.textMuted}>
                        {effectiveApprovedAmount ? `₹${Number(effectiveApprovedAmount).toLocaleString('en-IN')}` : 'Pending Approval'}
                      </SizableText>
                    </XStack>
                  );
                })()}

                <XStack jc="space-between" ai="center">
                  <Paragraph color={colors.textMuted} fontSize={13}>Sanctioning Bank / Lender</Paragraph>
                  <SizableText fontWeight="bold" fontSize={14} color={app.lenders?.name ? colors.brandBlue : colors.textMuted}>
                    {app.lenders?.name ? `🏦 ${app.lenders.name}` : 'Pending Assignment'}
                  </SizableText>
                </XStack>

                <XStack jc="space-between" ai="center">
                  <Paragraph color={colors.textMuted} fontSize={13}>Product Category</Paragraph>
                  <SizableText fontWeight="bold" fontSize={14} tt="capitalize">
                    {(app.product_type || 'new_car').replace(/_/g, ' ')}
                  </SizableText>
                </XStack>

                {app.disbursed_amount && (
                  <XStack jc="space-between" ai="center">
                    <Paragraph color={colors.textMuted} fontSize={13}>Disbursed Amount</Paragraph>
                    <SizableText fontWeight="bold" fontSize={15} color={colors.brandGreenDark}>
                      ₹{Number(app.disbursed_amount).toLocaleString('en-IN')}
                    </SizableText>
                  </XStack>
                )}
              </YStack>
            </YStack>
          </Card>

          {/* Uploaded Verification Documents Card */}
          <Card p="$4" bordered borderRadius="$4" backgroundColor="$background">
            <YStack space="$3">
              <XStack jc="space-between" ai="center">
                <SizableText color={colors.brandBlue} fontWeight="bold" fontSize={15}>
                  Uploaded Documents
                </SizableText>
                <XStack ai="center" space="$2">
                  <SizableText fontSize={12} color={colors.textMuted} fontWeight="bold">
                    {(app.documents || []).length} attached
                  </SizableText>
                  {!isApproved && !isRejected && (
                    <TouchableOpacity 
                      onPress={() => setShowUploadModal(true)}
                      disabled={isUploadingDoc}
                      style={{ backgroundColor: isUploadingDoc ? colors.textMuted : colors.brandBlue, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, flexDirection: 'row', alignItems: 'center', opacity: isUploadingDoc ? 0.6 : 1 }}
                    >
                      {isUploadingDoc ? <Spinner size="small" color="#FFF" style={{ marginRight: 4 }} /> : <Plus size={12} color="#FFF" style={{ marginRight: 4 }} />}
                      <SizableText color="#FFF" fontSize={11} fontWeight="bold">{isUploadingDoc ? 'Uploading...' : '+ Upload'}</SizableText>
                    </TouchableOpacity>
                  )}
                </XStack>
              </XStack>
              <Separator />

              {!(app.documents && app.documents.length > 0) ? (
                <YStack py="$3" ai="center" jc="center">
                  <FileText size={32} color={colors.textMuted} />
                  <Paragraph color={colors.textMuted} fontSize={12} ta="center" mt="$1">
                    No documents uploaded for this application yet.
                  </Paragraph>
                  {!isApproved && !isRejected && (
                    <TouchableOpacity
                      onPress={() => setShowUploadModal(true)}
                      style={{ marginTop: 12, backgroundColor: colors.brandBlueMuted, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}
                    >
                      <SizableText color={colors.brandBlue} fontSize={12} fontWeight="bold">+ Add More Documents</SizableText>
                    </TouchableOpacity>
                  )}
                  {!isApproved && !isRejected && (
                    <TouchableOpacity
                      onPress={handleStartDigilocker}
                      disabled={isDigilockerProcessing}
                      style={{ marginTop: 8, backgroundColor: colors.brandGreen, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, opacity: isDigilockerProcessing ? 0.7 : 1 }}
                    >
                      <XStack ai="center" jc="center" space="$2">
                        {isDigilockerProcessing && <Spinner size="small" color="#FFF" />}
                        <SizableText color="#FFF" fontSize={12} fontWeight="bold">⚡ Fast-Track via DigiLocker</SizableText>
                      </XStack>
                    </TouchableOpacity>
                  )}
                </YStack>
              ) : (
                <YStack space="$4">
                  {['applicant', 'co_applicant', 'guarantor'].map((partyKey) => {
                    const partyDocs = app.documents.filter(d => (d.party || 'applicant').toLowerCase() === partyKey);
                    if (partyDocs.length === 0) return null;

                    const partyLabel = partyKey === 'co_applicant' ? 'Co-Applicant' : partyKey.charAt(0).toUpperCase() + partyKey.slice(1);

                    return (
                      <YStack key={partyKey} space="$2">
                        <XStack ai="center" space="$2">
                          <SizableText fontWeight="bold" fontSize={12} color={colors.brandBlue} tt="uppercase" letterSpacing={0.5}>
                            📁 {partyLabel} Documents ({partyDocs.length})
                          </SizableText>
                        </XStack>

                        <YStack space="$2">
                          {partyDocs.map((doc, idx) => {
                            const fileUrl = doc.cdn_url || doc.cdn_path || doc.file_url;
                            return (
                              <TouchableOpacity 
                                key={doc.id || idx} 
                                onPress={() => handleOpenDoc(fileUrl)}
                                activeOpacity={fileUrl ? 0.7 : 1}
                              >
                                <XStack jc="space-between" ai="center" p="$3" backgroundColor="$backgroundHover" borderRadius="$3">
                                  <YStack f={1} pr="$2">
                                    <SizableText fontWeight="bold" fontSize={13} tt="capitalize" color={colors.brandBlue}>
                                      {doc.doc_type?.replace(/_/g, ' ')}
                                    </SizableText>
                                    <Paragraph fontSize={11} color={colors.textMuted} numberOfLines={1}>
                                      {doc.original_filename || 'Uploaded File'}
                                    </Paragraph>
                                  </YStack>
                                  <XStack ai="center" space="$2">
                                    <SizableText 
                                      fontSize={10} 
                                      fontWeight="bold" 
                                      color={doc.verified ? colors.brandGreenDark : colors.brandAmber}
                                      backgroundColor={doc.verified ? colors.brandGreenMuted : '#FEF3C7'}
                                      px="$2" 
                                      py="$1" 
                                      borderRadius="$2"
                                    >
                                      {doc.verified ? '✓ VERIFIED' : 'PENDING'}
                                    </SizableText>
                                    {fileUrl && (
                                      <XStack backgroundColor={colors.brandBlue} px="$2" py="$1" borderRadius="$2" ai="center" space="$1">
                                        <ExternalLink size={12} color="#FFF" />
                                        <SizableText fontSize={10} color="#FFF" fontWeight="bold">VIEW</SizableText>
                                      </XStack>
                                    )}
                                  </XStack>
                                </XStack>
                              </TouchableOpacity>
                            );
                          })}
                        </YStack>
                      </YStack>
                    );
                  })}
                </YStack>
              )}
            </YStack>
          </Card>

          {/* Stage Audit & Living Activity Log Card */}
          <Card p="$4" bordered borderRadius="$4" backgroundColor="$background">
            <YStack space="$3">
              <XStack jc="space-between" ai="center">
                <SizableText color={colors.brandBlue} fontWeight="bold" fontSize={15}>
                  📜 Stage History & Review Notes
                </SizableText>
                <SizableText fontSize={12} color={colors.textMuted} fontWeight="bold">
                  {stageEntries.length} updates
                </SizableText>
              </XStack>
              <Separator />

              {stagesLoading ? (
                <Spinner size="small" color={colors.brandBlue} />
              ) : stageEntries.length === 0 ? (
                <Paragraph color={colors.textMuted} fontSize={12} ta="center" py="$2">
                  No review activity logged yet.
                </Paragraph>
              ) : (
                <YStack space="$3">
                  {[...stageEntries]
                    .reverse()
                    .filter(stg => !((stg.outcome === 'clarification_submitted' || stg.data?.is_clarification_response) && stg.data?.response_to_query_id))
                    .map((stg, i) => {
                    const stgStatus = stg.outcome || stg.status || 'pending';
                    const isPassed = stgStatus === 'approved' || stgStatus === 'pass';
                    const isFailed = stgStatus === 'rejected' || stgStatus === 'fail';
                    const isClarificationResponse = stgStatus === 'clarification_submitted' || stg.data?.is_clarification_response;
                    const statusColor = isPassed ? colors.brandGreen : isFailed ? colors.error : isClarificationResponse ? colors.brandBlue : '#F59E0B';
                    const badgeLabel = isPassed ? 'PASS' : isFailed ? 'REJECTED' : (stgStatus === 'rework' || stgStatus === 'clarification_requested') ? 'CLARIFICATION' : isClarificationResponse ? 'DEALER RESPONSE' : 'PENDING';
                    const stgUser = stg.profiles?.full_name || stg.staff?.name || (isClarificationResponse ? 'Dealer' : 'Review Team');

                    const responses = stageEntries.filter(r => (r.outcome === 'clarification_submitted' || r.data?.is_clarification_response) && (r.data?.response_to_query_id === stg.data?.query_id || r.data?.response_to_query_id === stg.id));

                    return (
                      <YStack key={stg.id || i} p="$3" borderRadius="$3" backgroundColor="#F8FAFC" borderColor="$borderColor" borderWidth={1} space="$2">
                        <XStack jc="space-between" ai="center">
                          <SizableText fontWeight="bold" fontSize={13} tt="capitalize" color={colors.brandBlue}>
                            {(stg.stage || 'cibil').replace(/_/g, ' ')}
                          </SizableText>
                          <SizableText fontSize={10} color={colors.textMuted}>
                            {new Date(stg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </SizableText>
                        </XStack>

                        <XStack ai="center" space="$2" fw="wrap">
                          <SizableText
                            backgroundColor={isPassed ? colors.brandGreenMuted : isFailed ? colors.errorMuted : isClarificationResponse ? '#DBEAFE' : '#FEF3C7'}
                            color={statusColor}
                            px="$2"
                            py="$0.5"
                            borderRadius="$2"
                            fontSize={10}
                            fontWeight="bold"
                          >
                            {badgeLabel}
                          </SizableText>
                          {stg.data?.lender_name && (
                            <SizableText fontSize={10} fontWeight="bold" color="#1D4ED8">
                              🏦 {stg.data.lender_name}
                            </SizableText>
                          )}
                          {stg.data?.approved_amount && (
                            <SizableText fontSize={10} fontWeight="bold" color={colors.brandGreenDark}>
                              💰 ₹{Number(stg.data.approved_amount).toLocaleString('en-IN')}
                            </SizableText>
                          )}
                        </XStack>

                        {stg.remarks || stg.notes ? (
                          <YStack p="$2" borderRadius="$2" backgroundColor={isFailed ? colors.errorMuted : (stgStatus === 'rework' || stgStatus === 'clarification_requested') ? '#FEF3C7' : isClarificationResponse ? '#EFF6FF' : '#F1F5F9'}>
                            <SizableText fontSize={10} fontWeight="bold" color={statusColor} mb="$1">
                              💬 {(stgStatus === 'rework' || stgStatus === 'clarification_requested') ? 'Query / Required Clarification:' : isClarificationResponse ? 'Dealer Notes:' : 'Review Note:'}
                            </SizableText>
                            <Paragraph fontSize={12} color="$colorFocus" lineHeight={16}>
                              {stg.remarks || stg.notes}
                            </Paragraph>
                          </YStack>
                        ) : null}

                        <Paragraph fontSize={10} color={colors.textMuted}>
                          — by {stgUser}
                        </Paragraph>

                        {responses.length > 0 && (
                          <YStack space="$2" mt="$2" pl="$3" borderLeftWidth={2} borderColor={colors.brandBlue} ml="$2">
                            {responses.map(resp => {
                              const respDocs = (resp.data?.document_ids || []).map(id => (app.documents || []).find(d => d.id === id)).filter(Boolean);
                              return (
                                <YStack key={resp.id} p="$3" borderRadius="$3" backgroundColor="#EFF6FF" space="$2">
                                  <XStack jc="space-between" ai="center">
                                    <SizableText fontSize={10} fontWeight="bold" color={colors.brandBlue} tt="uppercase">
                                      👤 Dealer Response
                                    </SizableText>
                                    <SizableText fontSize={9} color={colors.textMuted}>
                                      {new Date(resp.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </SizableText>
                                  </XStack>
                                  <Paragraph fontSize={11} color="$colorFocus" lineHeight={16}>
                                    {resp.remarks || resp.notes || '(Documents attached)'}
                                  </Paragraph>
                                  {respDocs.length > 0 && (
                                    <XStack fw="wrap" gap="$2" mt="$1">
                                      {respDocs.map(d => (
                                        <TouchableOpacity key={d.id} onPress={() => handleOpenDoc(d.cdn_url || d.cdn_path)}>
                                          <XStack backgroundColor="#DBEAFE" px="$2" py="$1" borderRadius="$2" ai="center" space="$1">
                                            <Paperclip size={10} color={colors.brandBlue} />
                                            <SizableText fontSize={10} color={colors.brandBlue}>
                                              {d.original_filename || d.doc_type || 'Document'}
                                            </SizableText>
                                          </XStack>
                                        </TouchableOpacity>
                                      ))}
                                    </XStack>
                                  )}
                                </YStack>
                              );
                            })}
                          </YStack>
                        )}
                      </YStack>
                    );
                  })}
                </YStack>
              )}
            </YStack>
          </Card>

        </YStack>
      </ScrollView>

      {/* Clarification Response Modal */}
      <Modal
        visible={showClarificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowClarificationModal(false);
          setActiveQueryId(null);
        }}
      >
        <YStack f={1} jc="center" ai="center" backgroundColor="rgba(0,0,0,0.6)" p="$4">
          <Card w="100%" maxWidth={400} p="$5" backgroundColor="$background" borderRadius="$5" space="$4">
            <XStack jc="space-between" ai="center">
              <H4 color={colors.brandBlue} fontWeight="bold">Submit Clarification</H4>
              <TouchableOpacity onPress={() => setShowClarificationModal(false)}>
                <SizableText fontSize={18} color="$colorFocus">✕</SizableText>
              </TouchableOpacity>
            </XStack>

            <Paragraph color={colors.textMuted} fontSize={13}>
              Enter a response message or attach documents for the review team:
            </Paragraph>

            <Input
              multiline
              numberOfLines={4}
              h={100}
              placeholder="e.g. Re-uploaded bank statement and updated co-applicant salary slip..."
              textAlignVertical="top"
              value={clarificationNotes}
              onChangeText={setClarificationNotes}
              borderColor="$borderColor"
              borderRadius="$4"
              p="$3"
            />

            <YStack space="$2">
              {clarificationDocs.map((doc, idx) => (
                <XStack key={idx} p="$2" backgroundColor="$surface" borderRadius="$2" ai="center" jc="space-between">
                  <SizableText fontSize={12} color={colors.text} flex={1} numberOfLines={1}>📎 {doc.name}</SizableText>
                  <TouchableOpacity onPress={() => setClarificationDocs(prev => prev.filter((_, i) => i !== idx))}>
                    <SizableText color={colors.error} fontSize={16}>✕</SizableText>
                  </TouchableOpacity>
                </XStack>
              ))}
              
              <AltButton onPress={handleFilePick} icon={() => <Paperclip size={16} color={colors.text} />} loading={isUploadingDoc}>
                Attach Document
              </AltButton>
            </YStack>

            <XStack space="$3" jc="flex-end" mt="$2">
              <AltButton onPress={() => setShowClarificationModal(false)}>Cancel</AltButton>
              <PrimaryButton 
                onPress={handleResubmit}
                loading={isSubmittingClarification}
              >
                Submit Response
              </PrimaryButton>
            </XStack>
          </Card>
        </YStack>
      </Modal>

      {/* Document Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!isUploadingDoc) setShowUploadModal(false); }}
      >
        <YStack f={1} jc="flex-end" backgroundColor="rgba(0,0,0,0.5)">
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            p="$5"
            space="$4"
            pb={Math.max(insets.bottom, 24)}
          >
            <XStack jc="space-between" ai="center">
              <H4 color={colors.brandBlue} fontWeight="bold">Upload Document</H4>
              {!isUploadingDoc && (
                <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                  <SizableText fontSize={18} color="$colorFocus">✕</SizableText>
                </TouchableOpacity>
              )}
            </XStack>

            <YStack space="$2">
              <SizableText fontWeight="bold" fontSize={13}>Select Document Type</SizableText>
              <XStack fw="wrap" gap="$2">
                {[
                  { label: 'Aadhaar', value: 'aadhaar' },
                  { label: 'PAN Card', value: 'pan' },
                  { label: 'Bank Statement', value: 'bank_statement' },
                  { label: 'Salary / Income', value: 'salary_slip' },
                  { label: 'RC / Vehicle', value: 'rc' },
                  { label: 'Other', value: 'other' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setUploadDocType(item.value)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: uploadDocType === item.value ? colors.brandBlue : colors.borderLight,
                    }}
                  >
                    <SizableText fontSize={12} fontWeight="bold" color={uploadDocType === item.value ? '#FFF' : colors.textMuted}>
                      {item.label}
                    </SizableText>
                  </TouchableOpacity>
                ))}
              </XStack>
            </YStack>

            <YStack space="$2">
              <SizableText fontWeight="bold" fontSize={13}>Party</SizableText>
              <XStack gap="$2">
                {[
                  { label: 'Applicant', value: 'applicant' },
                  { label: 'Co-Applicant', value: 'co_applicant' },
                  { label: 'Guarantor', value: 'guarantor' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setUploadParty(item.value)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: uploadParty === item.value ? colors.brandBlue : colors.borderLight,
                    }}
                  >
                    <SizableText fontSize={12} fontWeight="bold" color={uploadParty === item.value ? '#FFF' : colors.textMuted}>
                      {item.label}
                    </SizableText>
                  </TouchableOpacity>
                ))}
              </XStack>
            </YStack>

            <Paragraph color={colors.textMuted} fontSize={12}>
              Select upload source for {uploadDocType.toUpperCase()} ({uploadParty}):
            </Paragraph>

            {isUploadingDoc ? (
              <YStack py="$5" ai="center" space="$3">
                <Spinner size="large" color={colors.brandBlue} />
                <SizableText fontSize={14} color={colors.brandBlue} fontWeight="bold">
                  Uploading {uploadDocType.toUpperCase()} ({uploadParty})...
                </SizableText>
                <Paragraph fontSize={12} color={colors.textMuted} ta="center">
                  Please wait while your file is being uploaded securely to the server.
                </Paragraph>
              </YStack>
            ) : (
              <YStack space="$2">
                <PrimaryButton onPress={handleCameraPick}>Take Photo (Camera)</PrimaryButton>
                <AltButton onPress={handleGalleryPick}>Choose from Photo Gallery</AltButton>
                <AltButton onPress={handleFilePick}>Pick File (PDF / Image)</AltButton>
              </YStack>
            )}
          </YStack>
        </YStack>
      </Modal>

      {/* DigiLocker WebView Modal */}
      <DigilockerWebView
        visible={showDigilocker}
        onClose={() => setShowDigilocker(false)}
        authUrl={digilockerUrl}
        onRedirectIntercept={handleDigilockerRedirect}
      />

    </ScreenWrapper>
  );
}

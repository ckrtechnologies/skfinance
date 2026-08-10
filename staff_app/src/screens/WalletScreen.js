import React, { useState, useCallback } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, View, Linking, Modal, TextInput, Platform } from 'react-native';
import { YStack, XStack, H2, H4, Paragraph, Card, Button, Spinner, SizableText, Tabs, Separator } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useGetWalletQuery,
  useGetCommissionsQuery,
  useGetWithdrawalRequestsQuery,
  useRequestWithdrawalMutation
} from '../store/api/dealerApi';
import DateRangePickerModal, { getFormattedDateRangeText } from '../ui/DateRangePickerModal';
import AppBottomSheet from '../ui/AppBottomSheet';
import { useAppAlert } from '../context/AlertContext';
import {
  Wallet as WalletIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
  Bell,
  Calendar,
  Menu,
  ChevronRight,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  Info,
  Search,
  ExternalLink
} from '@tamagui/lucide-icons-2';
import HeaderDP from '../ui/HeaderDP';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';
import { useSelector, useDispatch } from 'react-redux';
import { setDateFilter } from '../store/slices/filterSlice';

export default function WalletScreen() {
  const { showAlert } = useAppAlert();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { activePreset, dateRange: isoDateRange } = useSelector((state) => state.filter);

  const dateRange = {
    start: isoDateRange.start ? new Date(isoDateRange.start) : null,
    end: isoDateRange.end ? new Date(isoDateRange.end) : null
  };

  const [activeTab, setActiveTab] = useState('ledger');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  // State for Transaction Detail Modal
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const { data: wallet, isLoading: loadingWallet, refetch: refetchWallet, isFetching: isFetchingWallet, isError: isWalletError } = useGetWalletQuery({
    startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
    endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
  });
  const { data: commissions, isLoading: loadingCommissions, refetch: refetchCommissions, isFetching: isFetchingCommissions } = useGetCommissionsQuery({
    startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
    endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
  });
  const { data: withdrawalsData, isLoading: loadingWithdrawals, refetch: refetchWithdrawals, isFetching: isFetchingWithdrawals } = useGetWithdrawalRequestsQuery({
    startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
    endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
  });

  const [requestWithdrawal, { isLoading: submittingPayout }] = useRequestWithdrawalMutation();

  const isLoading = loadingWallet || loadingCommissions || loadingWithdrawals;
  const isFetching = isFetchingWallet || isFetchingCommissions || isFetchingWithdrawals;

  const handleRefresh = useCallback(() => {
    refetchWallet();
    refetchCommissions();
    refetchWithdrawals();
  }, [refetchWallet, refetchCommissions, refetchWithdrawals]);

  const handleSelectPreset = (label, range) => {
    dispatch(setDateFilter({ preset: label, dateRange: range }));
  };

  const handleOpenPdf = (url) => {
    if (!url) {
      showAlert('No Receipt', 'Payment receipt PDF is not available yet.');
      return;
    }
    let finalUrl = url;
    if (Platform.OS === 'android' && finalUrl.includes('localhost')) {
      finalUrl = finalUrl.replace('localhost', '10.0.2.2');
    }
    Linking.openURL(finalUrl).catch(() => {
      showAlert('Error', 'Unable to open PDF link.');
    });
  };

  const handleSubmitPayout = async () => {
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid payout amount.');
      return;
    }
    if (amt > balance) {
      showAlert('Insufficient Balance', `Requested amount ₹${amt} exceeds your current wallet balance ₹${balance}.`);
      return;
    }

    try {
      await requestWithdrawal({ amount_requested: amt }).unwrap();
      setIsPayoutModalOpen(false);
      setPayoutAmount('');
      showAlert('Payout Requested', 'Your payout request has been submitted to Admin. It will be processed manually via bank transfer with attached PDF receipt.');
      handleRefresh();
    } catch (err) {
      const errMsg = (err && err.data && err.data.error) ? err.data.error : 'Failed to submit payout request. Please try again.';
      showAlert('Request Failed', errMsg);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.brandBlueDark }} edges={['top']}>
        <YStack f={1} jc="center" ai="center" backgroundColor="$background">
          <Spinner size="large" color="$color" />
        </YStack>
      </SafeAreaView>
    );
  }

  const commissionData = commissions?.data || [];
  const withdrawalData = withdrawalsData?.data || [];
  const ledgerData = wallet?.data?.ledger || wallet?.ledger || [];
  const balance = wallet?.data?.balance ?? wallet?.balance ?? 0;

  // Calculate totals
  const totalEarned = commissionData.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const totalPayouts = withdrawalData.filter(w => w.status === 'processed' || w.status === 'paid').reduce((acc, w) => acc + Number(w.amount_requested || 0), 0);
  
  const pendingPayouts = withdrawalData.filter(w => w.status === 'pending').reduce((acc, w) => acc + Number(w.amount_requested || 0), 0);
  const pendingCount = withdrawalData.filter(w => w.status === 'pending').length;

  // Selected Transaction detail properties
  const isDebit = selectedTransaction ? Number(selectedTransaction.amount) < 0 : false;
  const appDetails = selectedTransaction?.loan_applications;
  const appId = selectedTransaction?.application_id || appDetails?.id;

  // Extract PAN Number from remarks if available
  const panMatch = selectedTransaction?.remarks?.match(/PAN:\s*([A-Z0-9]{10})/i) || selectedTransaction?.remarks?.match(/([A-Z]{5}[0-9]{4}[A-Z]{1})/);
  const extractedPan = panMatch ? panMatch[1] : null;

  const getStatusIcon = (status) => {
    if (status === 'processed' || status === 'paid') return <CheckCircle size={14} color="#16a34a" />;
    if (status === 'rejected') return <AlertTriangle size={14} color="#dc2626" />;
    return <Clock size={14} color="#d97706" />;
  };

  if (isWalletError && !isFetchingWallet) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.brandBlueDark }} edges={['top']}>
        <YStack f={1} backgroundColor="$background">
          <View style={{ backgroundColor: colors.brandBlueDark }}>
            <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$4" minHeight={72}>
              <XStack space="$3" ai="center">
                <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ padding: 4 }}>
                  <Menu size={24} color="white" />
                </TouchableOpacity>
                <H2 color="white" fontWeight="700" fontSize={22}>Wallet & Earnings</H2>
              </XStack>
            </XStack>
          </View>
          <YStack f={1} jc="center" ai="center" p="$8" space="$4">
            <AlertTriangle size={48} color={colors.error} />
            <Paragraph color={colors.error} ta="center">Failed to load wallet data.</Paragraph>
            <Button onPress={refetchWallet} mt="$2">Retry</Button>
          </YStack>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.brandBlueDark }} edges={['top']}>
      <YStack f={1} backgroundColor="$background">
        {/* Header Bar */}
        <View style={{ backgroundColor: colors.brandBlueDark }}>
          <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$4" minHeight={72}>
            <XStack space="$3" ai="center">
              <HeaderDP />
              <H2 color="white" fontWeight="700" fontSize={22}>Wallet & Earnings</H2>
            </XStack>
            <XStack space="$2" ai="center">
              <Button size="$3" icon={Calendar} onPress={() => setIsDatePickerOpen(true)} backgroundColor="rgba(255,255,255,0.18)" color="white" borderRadius={20} px="$3">
                {getFormattedDateRangeText(activePreset, dateRange)}
              </Button>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ padding: 4 }}>
                <Bell size={24} color="white" />
              </TouchableOpacity>
            </XStack>
          </XStack>
        </View>

        {isDatePickerOpen && (
        <DateRangePickerModal
          isOpen={true}
          onClose={() => setIsDatePickerOpen(false)}
          activePreset={activePreset}
          onSelectPreset={handleSelectPreset}
        />
        )}

        {/* Request Payout Modal */}
        <AppBottomSheet
          open={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          title="Request Manual Payout"
          snapPoints={[75]}
        >
          <YStack space="$3" my="$2">
            <Paragraph size="$2" color="#475569">
              Available Wallet Balance: <SizableText color="#10b981" fontWeight="bold">₹{balance.toLocaleString('en-IN')}</SizableText>
            </Paragraph>

            <View style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f8fafc' }}>
              <SizableText fontSize={12} color="#64748b" fontWeight="600" mb={4}>Enter Amount (₹)</SizableText>
              <TextInput
                style={{ fontSize: 20, fontWeight: '700', color: '#0f172a', padding: 0 }}
                placeholder="e.g. 5000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={payoutAmount}
                onChangeText={setPayoutAmount}
              />
            </View>

            <XStack backgroundColor="#eff6ff" p="$3" borderRadius={12} space="$2" ai="flex-start">
              <Info size={18} color="#2563eb" style={{ marginTop: 2 }} />
              <YStack f={1}>
                <SizableText fontSize={12} fontWeight="bold" color="#1e40af">Manual Payout Process</SizableText>
                <SizableText fontSize={11} color="#1e3a8a" mt={2}>
                  Payout requests are verified & processed manually by SK Finance Admin via NEFT/IMPS within 24–48 hours. A PDF bank payment receipt will be attached upon processing.
                </SizableText>
              </YStack>
            </XStack>

            <XStack space="$3" mt="$3">
              <Button f={1} backgroundColor="#e2e8f0" color="#334155" fontWeight="600" borderRadius={12} onPress={() => setIsPayoutModalOpen(false)}>
                Cancel
              </Button>
              <Button
                f={1}
                backgroundColor="#2563eb"
                pressStyle={{ backgroundColor: "#1d4ed8" }}
                color="#ffffff"
                fontWeight="bold"
                borderRadius={12}
                disabled={submittingPayout}
                onPress={handleSubmitPayout}
              >
                {submittingPayout ? 'Submitting...' : 'Submit Request'}
              </Button>
            </XStack>
          </YStack>
        </AppBottomSheet>

        {/* Transaction Detail Modal */}
        <AppBottomSheet
          open={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          title={isDebit ? 'Payout / Debit' : 'Commission Credit'}
          snapPoints={[55]}
        >
          {/* Header */}
          <XStack jc="space-between" ai="center" p="$3" borderRadius={12} backgroundColor={isDebit ? '#fef2f2' : '#ecfdf5'} mb="$3">
            <XStack space="$2" ai="center">
              <YStack width={40} height={40} borderRadius={20} backgroundColor={isDebit ? '#ef4444' : '#10b981'} jc="center" ai="center">
                {isDebit ? <ArrowUpRight color="white" size={20} /> : <ArrowDownLeft color="white" size={20} />}
              </YStack>
              <YStack>
                <SizableText size="$2" color={isDebit ? '#b91c1c' : '#059669'} fontWeight="600">
                  {selectedTransaction?.created_at ? new Date(selectedTransaction.created_at).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : 'N/A'}
                </SizableText>
              </YStack>
            </XStack>
          </XStack>

          <YStack space="$2.5" my="$2">
            <YStack backgroundColor="#f8fafc" p="$3" borderRadius={12} space="$1">
              <SizableText fontSize={11} color="#64748b" fontWeight="600" textTransform="uppercase">Remarks / Reason</SizableText>
              <Paragraph fontSize={13} color="#0f172a" fontWeight="600">
                {selectedTransaction?.remarks || 'Wallet Adjustment'}
              </Paragraph>
            </YStack>

            {selectedTransaction?.payout_utr && (
              <XStack jc="space-between" ai="center" backgroundColor="#eff6ff" p="$3" borderRadius={12}>
                <SizableText fontSize={12} color="#1e40af" fontWeight="600">Bank UTR Number</SizableText>
                <SizableText fontSize={13} color="#2563eb" fontWeight="bold">{selectedTransaction.payout_utr}</SizableText>
              </XStack>
            )}

            {appDetails ? (
              <YStack backgroundColor="#f0f9ff" p="$3" borderRadius={12} borderWidth={1} borderColor="#bae6fd" space="$1">
                <SizableText fontSize={11} color="#0369a1" fontWeight="700" textTransform="uppercase">Linked Loan Application</SizableText>
                <SizableText fontSize={14} color="#0c4a6e" fontWeight="bold">
                  App #{appDetails.application_no}
                </SizableText>
                <SizableText fontSize={12} color="#0369a1">
                  Customer: {appDetails?.customers?.profiles?.full_name || appDetails?.customer_name || 'Customer'}
                </SizableText>
              </YStack>
            ) : extractedPan ? (
              <YStack backgroundColor="#fffbeb" p="$3" borderRadius={12} borderWidth={1} borderColor="#fef3c7" space="$1">
                <SizableText fontSize={11} color="#b45309" fontWeight="700" textTransform="uppercase">Reference PAN</SizableText>
                <SizableText fontSize={14} color="#78350f" fontWeight="bold">
                  PAN: {extractedPan}
                </SizableText>
              </YStack>
            ) : null}
          </YStack>

          <YStack space="$2" mt="$3">
            {appId ? (
              <Button
                backgroundColor="#2563eb"
                pressStyle={{ backgroundColor: "#1d4ed8" }}
                color="#ffffff"
                fontWeight="bold"
                borderRadius={12}
                icon={ExternalLink}
                onPress={() => {
                  setSelectedTransaction(null);
                  navigation.navigate('ApplicationDetails', { id: appId });
                }}
              >
                View Application #{appDetails?.application_no || 'Details'}
              </Button>
            ) : extractedPan ? (
              <Button
                backgroundColor="#0284c7"
                pressStyle={{ backgroundColor: "#0369a1" }}
                color="#ffffff"
                fontWeight="bold"
                borderRadius={12}
                icon={Search}
                onPress={() => {
                  setSelectedTransaction(null);
                  navigation.navigate('ApplicationsTab', { search: extractedPan });
                }}
              >
                Find Applications for PAN: {extractedPan}
              </Button>
            ) : null}

            {selectedTransaction?.receipt_pdf_url && (
              <Button
                backgroundColor="#10b981"
                pressStyle={{ backgroundColor: "#059669" }}
                color="#ffffff"
                fontWeight="bold"
                borderRadius={12}
                icon={Download}
                onPress={() => handleOpenPdf(selectedTransaction.receipt_pdf_url)}
              >
                Download Payment Receipt PDF
              </Button>
            )}

            <Button
              backgroundColor="#e2e8f0"
              color="#334155"
              fontWeight="600"
              borderRadius={12}
              onPress={() => setSelectedTransaction(null)}
            >
              Close
            </Button>
          </YStack>
        </AppBottomSheet>

        <ScrollView
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={handleRefresh} />}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack p="$4" space="$4">

            {/* Hero Wallet Balance Card */}
            <LinearGradient
              colors={['#0A2540', '#1E3A8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 20,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <XStack jc="space-between" ai="center">
                <YStack space="$1">
                  <SizableText color="rgba(255,255,255,0.7)" size="$2" fontWeight="600" textTransform="uppercase" letterSpacing={0.5}>
                    Available Wallet Balance
                  </SizableText>
                  <SizableText size="$9" fontWeight="800" color={balance < 0 ? "#ef4444" : "#10b981"}>
                    {balance < 0 ? '-' : ''}₹{Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </SizableText>
                </YStack>
                <Button
                  size="$3"
                  backgroundColor={pendingCount > 0 ? "rgba(255,255,255,0.15)" : "#3b82f6"}
                  color={pendingCount > 0 ? "rgba(255,255,255,0.6)" : "white"}
                  borderRadius={12}
                  pressStyle={{ opacity: 0.8 }}
                  icon={<WalletIcon size={16} color={pendingCount > 0 ? "rgba(255,255,255,0.6)" : "white"} />}
                  onPress={() => setIsPayoutModalOpen(true)}
                  disabled={pendingCount > 0}
                >
                  {pendingCount > 0 ? 'Pending Approval' : 'Request Payout'}
                </Button>
              </XStack>

              <Separator my="$3" borderColor="rgba(255,255,255,0.15)" />

              <XStack jc="space-between" ai="center">
                <XStack space="$2" ai="center">
                  <YStack width={32} height={32} borderRadius={16} backgroundColor="rgba(16,185,129,0.2)" jc="center" ai="center">
                    <ArrowDownLeft size={18} color="#10b981" />
                  </YStack>
                  <YStack>
                    <SizableText color="rgba(255,255,255,0.7)" size="$1">Total Commissions</SizableText>
                    <SizableText color="white" fontWeight="bold" size="$3">₹{totalEarned.toLocaleString('en-IN')}</SizableText>
                  </YStack>
                </XStack>

                <XStack space="$2" ai="center">
                  <YStack width={32} height={32} borderRadius={16} backgroundColor="rgba(59,130,246,0.2)" jc="center" ai="center">
                    <ArrowUpRight size={18} color="#60a5fa" />
                  </YStack>
                  <YStack>
                    <SizableText color="rgba(255,255,255,0.7)" size="$1">Total Payouts</SizableText>
                    <SizableText color="white" fontWeight="bold" size="$3">₹{totalPayouts.toLocaleString('en-IN')}</SizableText>
                  </YStack>
                </XStack>
              </XStack>

              {pendingCount > 0 ? (
                <XStack mt="$4" backgroundColor="rgba(245,158,11,0.15)" p="$3" borderRadius={10} ai="center" space="$3" borderWidth={1} borderColor="rgba(245,158,11,0.3)">
                  <Clock size={22} color="#fbbf24" />
                  <YStack f={1}>
                    <SizableText color="#fbbf24" fontWeight="700" fontSize={13}>Payout Pending</SizableText>
                    <SizableText color="#fef3c7" fontSize={12} mt={2}>
                      You have {pendingCount} request{pendingCount > 1 ? 's' : ''} totaling ₹{pendingPayouts.toLocaleString('en-IN')} pending admin approval.
                    </SizableText>
                  </YStack>
                </XStack>
              ) : (
                <XStack mt="$3" backgroundColor="rgba(255,255,255,0.08)" p="$2.5" borderRadius={10} ai="center" space="$2">
                  <Info size={14} color="#93c5fd" />
                  <SizableText color="#dbeafe" fontSize={11} f={1} fontWeight="500">
                    Manual Payouts processed by Admin via NEFT/IMPS with PDF proof.
                  </SizableText>
                </XStack>
              )}
            </LinearGradient>

              {/* Tab Navigation */}
              <XStack mt="$4" p="$1" backgroundColor="#f1f5f9" borderRadius={12} space="$1">
                {['ledger', 'withdrawals', 'commissions'].map((tab) => (
                  <Button
                    key={tab}
                    f={1}
                    size="$3"
                    px={0}
                    backgroundColor={activeTab === tab ? '#1e293b' : 'transparent'}
                    color={activeTab === tab ? '#ffffff' : '#334155'}
                    fontWeight={activeTab === tab ? 'bold' : '600'}
                    borderRadius={10}
                    borderWidth={1}
                    borderColor={activeTab === tab ? '#1e293b' : 'transparent'}
                    shadowColor={activeTab === tab ? '#000' : 'transparent'}
                    shadowOpacity={activeTab === tab ? 0.1 : 0}
                    shadowRadius={4}
                    shadowOffset={{ width: 0, height: 2 }}
                    onPress={() => setActiveTab(tab)}
                  >
                    <SizableText 
                      color={activeTab === tab ? '#ffffff' : '#334155'} 
                      fontWeight={activeTab === tab ? 'bold' : '600'}
                      fontSize={13}
                    >
                      {tab === 'withdrawals' ? 'Payouts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </SizableText>
                  </Button>
                ))}
              </XStack>

              {/* Ledger Tab Content */}
              {activeTab === "ledger" && (
                <YStack space="$3" mt="$4">
                  {ledgerData.length === 0 ? (
                    <YStack ai="center" jc="center" py="$8" space="$2" backgroundColor="#f8fafc" borderRadius={16} p="$4">
                      <Clock size={36} color={'#94a3b8'} />
                      <Paragraph color="#64748b" ta="center" fontWeight="600">No ledger history found.</Paragraph>
                    </YStack>
                  ) : (
                    ledgerData.map((item) => {
                      const relatedComm = item.entry_type === 'commission_earned' ? commissionData.find(c => c.id === item.reference_id) : null;
                      const itemAppDetails = item.loan_applications || relatedComm?.loan_applications;
                      const itemAppId = item.application_id || itemAppDetails?.id;
                      const isCredit = ['credit', 'commission', 'commission_earned'].includes(item.entry_type?.toLowerCase());
                      const amountColor = isCredit ? '#16a34a' : '#dc2626';
                      
                      let remarksText = item.remarks || 'Transaction';
                      if (item.entry_type === 'commission_earned' && remarksText.includes('Commission on disbursement of')) {
                        remarksText = 'Commission on loan disbursement';
                      }

                      return (
                        <Card
                          key={item.id}
                          onPress={() => setSelectedTransaction(item)}
                          pressStyle={{ scale: 0.98, opacity: 0.8 }}
                          backgroundColor="#ffffff" borderRadius={16} borderWidth={1} borderColor="#e2e8f0" p={16}
                          animation="bouncy"
                        >
                            <YStack space="$2">
                              <XStack jc="space-between" ai="center">
                                <SizableText fontSize={12} color="#64748b" fontWeight="600" textTransform="capitalize" f={1} mr="$2">
                                  {item.entry_type ? item.entry_type.replace(/_/g, ' ') : 'TRANSACTION'}
                                </SizableText>
                                <H4 color={amountColor} fontWeight="800" m={0}>
                                  {isCredit ? '+' : '-'}₹{parseFloat(Math.abs(item.amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </H4>
                              </XStack>
                              <Paragraph size="$3" color="#334155" fontWeight="500" m={0}>
                                {remarksText}
                              </Paragraph>

                              {itemAppDetails && (
                                <XStack backgroundColor="#f8fafc" p="$2" borderRadius={8} space="$2" ai="center">
                                  <FileText size={14} color="#64748b" />
                                  <SizableText fontSize={12} color="#334155" fontWeight="600" f={1}>
                                    App #{itemAppDetails.application_no} • {itemAppDetails?.customers?.profiles?.full_name || itemAppDetails?.customer_name || 'Customer'}
                                  </SizableText>
                                </XStack>
                              )}

                              <XStack jc="space-between" ai="center" mt="$1" pt="$2" borderTopWidth={1} borderColor="#f1f5f9">
                                <SizableText size="$2" color="#94a3b8">
                                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </SizableText>

                                <XStack space="$2" ai="center">
                                  {item.receipt_pdf_url && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                      <Download size={12} color="#2563eb" />
                                      <SizableText fontSize={11} color="#2563eb" fontWeight="bold">Receipt PDF</SizableText>
                                    </View>
                                  )}

                                  <SizableText fontSize={11} color="#2563eb" fontWeight="700">
                                    {itemAppId ? 'View App ➔' : 'Details ➔'}
                                  </SizableText>
                                </XStack>
                              </XStack>
                            </YStack>
                        </Card>
                      );
                    })
                  )}
                </YStack>
              )}

              {/* Withdrawals / Payouts Tab Content */}
              {activeTab === "withdrawals" && (
                <YStack space="$3" mt="$4">
                  {withdrawalData.length === 0 ? (
                    <YStack ai="center" jc="center" py="$8" space="$2" backgroundColor="#f8fafc" borderRadius={16} p="$4">
                      <Clock size={36} color={'#94a3b8'} />
                      <Paragraph color="#64748b" ta="center" fontWeight="600">No payout history found.</Paragraph>
                      <SizableText size="$2" color="#94a3b8" ta="center">Submitted payouts will appear here with bank transfer receipts.</SizableText>
                    </YStack>
                  ) : (
                    withdrawalData.map((item) => {
                      const isProcessed = item.status === 'processed' || item.status === 'paid' || item.status === 'approved';
                      const isRejected = item.status === 'rejected';
                      const statusColor = isProcessed ? '#16a34a' : isRejected ? '#dc2626' : '#d97706';
                      const statusBg = isProcessed ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fffbeb';
                      const statusBorder = isProcessed ? '#bbf7d0' : isRejected ? '#fecaca' : '#fef3c7';

                      return (
                        <Card
                          key={item.id}
                          onPress={() => setSelectedTransaction({
                            ...item,
                            entry_type: 'PAYOUT',
                            amount: -item.amount_requested,
                            remarks: `Manual Payout Request ${item.payout_utr ? '(UTR: ' + item.payout_utr + ')' : ''}`
                          })}
                          pressStyle={{ scale: 0.98, opacity: 0.8 }}
                          backgroundColor="#ffffff" borderRadius={16} borderWidth={1} borderColor="#e2e8f0" p={16}
                          animation="bouncy"
                        >
                            <YStack space="$2">
                              <XStack jc="space-between" ai="center">
                                <YStack space="$0.5">
                                  <SizableText fontSize={12} color="#64748b" fontWeight="600">
                                    Request #{item.id.toString().slice(-6)}
                                  </SizableText>
                                  <H4 color="#0f172a" fontWeight="800" m={0}>
                                    ₹{parseFloat(item.amount_requested || item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </H4>
                                </YStack>

                                <View style={{
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                  borderRadius: 8,
                                  backgroundColor: statusBg,
                                  borderWidth: 1,
                                  borderColor: statusBorder,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4
                                }}>
                                  {isProcessed ? <CheckCircle size={12} color="#16a34a" /> : isRejected ? <AlertTriangle size={12} color="#dc2626" /> : <Clock size={12} color="#d97706" />}
                                  <SizableText size="$2" fontWeight="700" color={statusColor} textTransform="capitalize">
                                    {item.status || 'Requested'}
                                  </SizableText>
                                </View>
                              </XStack>

                              {item.payout_utr && (
                                <XStack backgroundColor="#eff6ff" p="$2" borderRadius={8} space="$2" ai="center">
                                  <SizableText fontSize={12} color="#1e40af" fontWeight="bold">
                                    Bank UTR: {item.payout_utr}
                                  </SizableText>
                                </XStack>
                              )}

                              {isRejected && item.rejection_reason && (
                                <Paragraph size="$2" color="#dc2626" fst="italic" m={0} mt="$1">
                                  Rejection Reason: {item.rejection_reason}
                                </Paragraph>
                              )}

                              <XStack jc="space-between" ai="center" mt="$1" pt="$2" borderTopWidth={1} borderColor="#f1f5f9">
                                <SizableText size="$2" color="#94a3b8">
                                  Requested: {new Date(item.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </SizableText>

                                {item.receipt_pdf_url ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Download size={12} color="#2563eb" />
                                    <SizableText fontSize={11} color="#2563eb" fontWeight="bold">Receipt PDF</SizableText>
                                  </View>
                                ) : isProcessed ? (
                                  <SizableText fontSize={11} color="#64748b" fst="italic">Receipt pending</SizableText>
                                ) : null}
                              </XStack>
                            </YStack>
                        </Card>
                      );
                    })
                  )}
                </YStack>
              )}

              {/* Commissions Tab Content */}
              {activeTab === "commissions" && (
                <YStack space="$3" mt="$4">
                  {commissionData.length === 0 ? (
                    <YStack ai="center" jc="center" py="$8" space="$2" backgroundColor="#f8fafc" borderRadius={16} p="$4">
                      <Clock size={36} color={'#94a3b8'} />
                      <Paragraph color="#64748b" ta="center" fontWeight="600">No commissions earned yet.</Paragraph>
                    </YStack>
                  ) : (
                    commissionData.map((comm) => {
                      const commAppDetails = comm.loan_applications;
                      const commAppId = comm.application_id || commAppDetails?.id;

                      return (
                        <Card
                          key={comm.id}
                          onPress={() => setSelectedTransaction({
                            ...comm,
                            entry_type: 'COMMISSION',
                            remarks: `Commission Earned (${comm.rate_applied}% slab on Loan ₹${Number(comm.disbursed_amount || 0).toLocaleString('en-IN')})`
                          })}
                          pressStyle={{ scale: 0.98, opacity: 0.8 }}
                          backgroundColor="#ffffff" borderRadius={16} borderWidth={1} borderColor="#e2e8f0" p={16}
                          animation="bouncy"
                        >
                            <YStack space="$2">
                              <XStack jc="space-between" ai="center">
                                <YStack>
                                  <Paragraph fontWeight="700" color="#0f172a" m={0}>
                                    Loan Amount: ₹{Number(comm.disbursed_amount || 0).toLocaleString('en-IN')}
                                  </Paragraph>
                                  <Paragraph color="#64748b" size="$3" m={0}>
                                    Slab: {comm.rate_applied}%
                                  </Paragraph>
                                </YStack>

                                <YStack ai="flex-end">
                                  <H4 color="#16a34a" fontWeight="800" m={0}>
                                    +₹{Number(comm.amount || 0).toLocaleString('en-IN')}
                                  </H4>
                                  <XStack ai="center" space="$1" mt="$0.5">
                                    {comm.status === 'credited' || comm.status === 'paid' ? (
                                      <CheckCircle size={12} color="#16a34a" />
                                    ) : (
                                      <Clock size={12} color="#d97706" />
                                    )}
                                    <Paragraph size="$2" textTransform="capitalize" fontWeight="600" color={comm.status === 'credited' || comm.status === 'paid' ? '#16a34a' : '#d97706'} m={0}>
                                      {comm.status || 'Earned'}
                                    </Paragraph>
                                  </XStack>
                                </YStack>
                              </XStack>

                              {commAppDetails && (
                                <XStack jc="space-between" ai="center" mt="$1" pt="$2" borderTopWidth={1} borderColor="#f1f5f9">
                                  <SizableText fontSize={12} color="#334155" fontWeight="600">
                                    App #{commAppDetails.application_no} • {commAppDetails?.customers?.profiles?.full_name || commAppDetails?.customer_name || 'Customer'}
                                  </SizableText>
                                  {commAppId && (
                                    <SizableText fontSize={11} color="#2563eb" fontWeight="bold">View App ➔</SizableText>
                                  )}
                                </XStack>
                              )}
                            </YStack>
                        </Card>
                      );
                    })
                  )}
                </YStack>
              )}

            
          </YStack>
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}

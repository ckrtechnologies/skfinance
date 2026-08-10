import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl, TouchableOpacity, View, ScrollView } from 'react-native';
import { YStack, XStack, H2, H4, Paragraph, Card, Button, Spinner, SizableText, Input } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useGetApplicationsQuery } from '../store/api/dealerApi';
import { Plus, FileText, ChevronRight, Bell, Calendar, Filter, X, Menu, Search } from '@tamagui/lucide-icons-2';
import ScreenWrapper from '../ui/ScreenWrapper';
import HeaderDP from '../ui/HeaderDP';
import DateRangePickerModal, { getFormattedDateRangeText } from '../ui/DateRangePickerModal';
import FilterModal from '../ui/FilterModal';
import { colors } from '../theme';
import { setDateFilter } from '../store/slices/filterSlice';

export default function ApplicationsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const [page, setPage] = useState(1);
  const { activePreset, dateRange: isoDateRange } = useSelector((state) => state.filter);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const dateRange = {
    start: isoDateRange.start ? new Date(isoDateRange.start) : null,
    end: isoDateRange.end ? new Date(isoDateRange.end) : null
  };

  const [statusFilter, setStatusFilter] = useState(route?.params?.status || 'all');

  React.useEffect(() => {
    if (route?.params?.search) {
      setSearchQuery(route.params.search);
      setDebouncedSearch(route.params.search);
      setPage(1);
    }
    if (route?.params?.status) {
      setStatusFilter(route.params.status);
      setPage(1);
    }
  }, [route?.params?.search, route?.params?.status]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: applications, isLoading, isFetching, refetch } = useGetApplicationsQuery({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
    endDate: dateRange.end ? dateRange.end.toISOString() : undefined
  });

  const handleSelectPreset = (label, range) => {
    dispatch(setDateFilter({ preset: label, dateRange: range }));
    setPage(1);
  };

  const handleApplyFilterModal = ({ status, datePreset, dateRange: newRange }) => {
    setStatusFilter(status);
    dispatch(setDateFilter({ preset: datePreset, dateRange: newRange }));
    setPage(1);
  };

  if (isLoading && page === 1) {
    return (
      <ScreenWrapper style={{ flex: 1, backgroundColor: colors.brandBlueDark }} edges={['top']}>
        <YStack f={1} jc="center" ai="center" backgroundColor="$background">
          <Spinner size="large" color={colors.brandBlue} />
        </YStack>
  
      <TouchableOpacity
        onPress={() => navigation.navigate('NewApplication')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.brandGreen,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          zIndex: 999
        }}
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>
    </ScreenWrapper>
    );
  }

  // Safely extract the inner response data array
  const appData = applications?.data?.data || [];
  const totalCount = applications?.data?.count || 0;
  const isError = !applications?.success || !Array.isArray(appData);

  if (isError && !isFetching && page === 1) {
    return (
      <ScreenWrapper style={{ flex: 1, backgroundColor: colors.brandBlueDark }} edges={['top']}>
        <YStack f={1} backgroundColor="$background">
          <View style={{ backgroundColor: colors.brandBlueDark }}>
            <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$4" minHeight={72}>
              <YStack jc="center">
                <XStack space="$3" ai="center">
                  <HeaderDP />
                  <H2 color="white" fontWeight="700" fontSize={22}>Pipeline</H2>
                </XStack>
              </YStack>
            </XStack>
          </View>
          <YStack f={1} jc="center" ai="center" p="$8" space="$4">
            <FileText size={48} color={colors.error} />
            <Paragraph color={colors.error} ta="center">Failed to load applications pipeline. Please pull to refresh.</Paragraph>
            <Button onPress={() => { setPage(1); refetch(); }} mt="$2">Retry</Button>
          </YStack>
        </YStack>
  
      <TouchableOpacity
        onPress={() => navigation.navigate('NewApplication')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.brandGreen,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          zIndex: 999
        }}
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>
    </ScreenWrapper>
    );
  }

  const handleRefresh = () => {
    setPage(1);
    refetch();
  };

  const handleLoadMore = () => {
    if (!isFetching && appData.length < totalCount) {
      setPage(prev => prev + 1);
    }
  };

  const renderItem = ({ item: app }) => {
    const customerName = app.customers?.profiles?.full_name || app.applicant_details?.customer_name || 'Customer';
    const status = app.status || 'in_progress';
    const isClarificationNeeded = status === 'clarification_requested';
    const statusColor =
      status === 'approved' || status === 'disbursed' ? '#10B981' :
      status === 'rejected' ? '#EF4444' :
      isClarificationNeeded ? '#F59E0B' : '#3B82F6';

    const badgeBg =
      status === 'approved' || status === 'disbursed' ? '#DCFCE7' :
      status === 'rejected' ? '#FEE2E2' :
      isClarificationNeeded ? '#FEF3C7' : '#DBEAFE';

    const badgeText =
      status === 'approved' || status === 'disbursed' ? '#15803D' :
      status === 'rejected' ? '#B91C1C' :
      isClarificationNeeded ? '#B45309' : '#1D4ED8';

    return (
      <TouchableOpacity
        key={app.id}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ApplicationDetails', { id: app.id })}
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          marginBottom: 10,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: '#E2E8F0',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          flexDirection: 'row',
        }}
      >
        {/* Status Color Bar Accent */}
        <View style={{ width: 5, backgroundColor: statusColor }} />

        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
          {/* Header Row: App ID & Status Badge */}
          <XStack jc="space-between" ai="center" mb="$1">
            <SizableText fontSize={11} fontWeight="bold" color="#64748B" letterSpacing={0.5}>
              APP-{(app.id || '').substring(0, 8).toUpperCase()}
            </SizableText>
            <View style={{ backgroundColor: badgeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <SizableText color={badgeText} fontSize={10} fontWeight="700">
                {isClarificationNeeded ? 'ACTION NEEDED' : ((status === 'draft' || status === 'pending') ? 'IN PROGRESS' : status).replace(/_/g, ' ').toUpperCase()}
              </SizableText>
            </View>
          </XStack>

          {/* Title & Stage Row */}
          <XStack jc="space-between" ai="center" mb="$2">
            <H4 fontSize={15} fontWeight="bold" color="#0F172A" numberOfLines={1} style={{ flex: 1, marginRight: 8 }}>
              {customerName}
            </H4>
            <SizableText fontSize={11} color="#64748B" fontWeight="500">
              {app.current_stage?.replace(/_/g, ' ') || 'Pre-Check'}
            </SizableText>
          </XStack>

          {/* Footer Row: Amount & Action */}
          <XStack jc="space-between" ai="center" borderTopWidth={1} borderTopColor="#F1F5F9" pt="$1.5">
            <XStack ai="baseline" space="$1.5">
              <SizableText fontSize={11} color="#94A3B8" fontWeight="500">Amount:</SizableText>
              <SizableText fontSize={15} fontWeight="bold" color="#0F172A">
                ₹{(app.requested_amount || app.loan_amount || 0).toLocaleString('en-IN')}
              </SizableText>
            </XStack>

            <XStack ai="center" space="$1">
              <SizableText fontSize={12} fontWeight="700" color="#2563EB">Details</SizableText>
              <ChevronRight size={14} color="#2563EB" />
            </XStack>
          </XStack>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper style={{ flex: 1, backgroundColor: colors.brandBlueDark }} edges={['top']}>
      <YStack f={1} backgroundColor="$background">
        <View style={{ backgroundColor: colors.brandBlueDark }}>
          <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$4" minHeight={72}>
            <XStack space="$3" ai="center">
              <HeaderDP />
              <H2 color="white" fontWeight="700" fontSize={22}>Pipeline</H2>
            </XStack>

            <XStack space="$2.5" ai="center">
              <Button
                size="$3"
                icon={Filter}
                onPress={() => setIsFilterModalOpen(true)}
                backgroundColor="rgba(255,255,255,0.18)"
                color="white"
                borderRadius={20}
                px="$3"
              >
                Filter {statusFilter !== 'all' ? '(1)' : ''}
              </Button>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ padding: 4 }}>
                <Bell size={22} color="white" />
              </TouchableOpacity>
            </XStack>
          </XStack>

          <XStack px="$4" pb="$4" ai="center">
            <View style={{ flex: 1, position: 'relative' }}>
              <Input
                placeholder="Search Applicant, App No, Phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                pl="$10"
                backgroundColor="rgba(255,255,255,0.18)"
                color="white"
                borderWidth={0}
                placeholderTextColor="rgba(255,255,255,0.7)"
                borderRadius={20}
              />
              <View style={{ position: 'absolute', left: 12, top: 12 }}>
                <Search size={18} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
          </XStack>
        </View>

        <DateRangePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          activePreset={activePreset}
          dateRange={dateRange}
          onSelectPreset={handleSelectPreset}
        />

        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          activeStatus={statusFilter}
          activeDatePreset={activePreset}
          onApply={handleApplyFilterModal}
        />

        {/* Active Filter Summary Bar */}
        <View style={{ backgroundColor: colors.brandBlueDark, paddingBottom: 10, px: 16 }}>
          <XStack ai="center" jc="space-between" backgroundColor="rgba(255,255,255,0.1)" p="$2" px="$3" borderRadius={12}>
            <XStack ai="center" space="$2" f={1} fw="wrap">
              <SizableText color="rgba(255,255,255,0.8)" size="$2" fontWeight="bold">Active Filters:</SizableText>
              <SizableText color="white" size="$2" backgroundColor="rgba(255,255,255,0.2)" px="$2" py="$0.5" borderRadius={8} fontWeight="600">
                {statusFilter === 'all' ? 'All Statuses' : statusFilter.replace(/_/g, ' ').toUpperCase()}
              </SizableText>
              <SizableText color="white" size="$2" backgroundColor="rgba(255,255,255,0.2)" px="$2" py="$0.5" borderRadius={8} fontWeight="600">
                {getFormattedDateRangeText(activePreset, dateRange)}
              </SizableText>
            </XStack>

            {(statusFilter !== 'all' || activePreset !== 'This Month') && (
              <TouchableOpacity onPress={() => { setStatusFilter('all'); dispatch(setDateFilter({ preset: 'This Month', dateRange: null })); setPage(1); }}>
                <X size={16} color="white" />
              </TouchableOpacity>
            )}
          </XStack>
        </View>

        <FlatList
          data={appData}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isFetching && page === 1} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            !isFetching && (
              <YStack jc="center" ai="center" p="$8" space="$4">
                <FileText size={48} color={colors.textMuted} />
                <Paragraph theme="alt2" ta="center">No applications found in pipeline. Tap the + button to start a new application.</Paragraph>
              </YStack>
            )
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <YStack py="$4" ai="center" jc="center">
                <Spinner size="small" color={colors.brandBlue} />
              </YStack>
            ) : null
          }
        />
      </YStack>

      <TouchableOpacity
        onPress={() => navigation.navigate('NewApplication')}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.brandGreen,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
          zIndex: 999
        }}
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>
    </ScreenWrapper>
  );
}

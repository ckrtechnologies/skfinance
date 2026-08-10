import React, { useState, useMemo } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, Alert, Image, Dimensions, View, Platform, useWindowDimensions } from 'react-native';
import { YStack, XStack, H2, H4, Paragraph, Card, Button, Spinner, SizableText, Sheet, Avatar, Text } from 'tamagui';
import { useGetApplicationsQuery, useGetBannersQuery, useGetProfileQuery } from '../store/api/dealerApi';
import { ArrowRightCircle, Bell, Calendar, Check, Award, Sparkles, TrendingUp, ChevronRight } from '@tamagui/lucide-icons-2';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../ui/ScreenWrapper';
import HeaderDP from '../ui/HeaderDP';
import { LineChart, PieChart, BarChart } from 'react-native-gifted-charts';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';
import { useSelector, useDispatch } from 'react-redux';
import { setDateFilter } from '../store/slices/filterSlice';
import DateRangePickerModal, { getFormattedDateRangeText } from '../ui/DateRangePickerModal';



const processImageUrl = (url) => {
  if (!url) return url;
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
};



function BannerCard({ banner, containerWidth }) {
  const [aspectRatio, setAspectRatio] = React.useState(2.1); // default aspect ratio
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (banner?.image_url) {
      const url = processImageUrl(banner.image_url);
      Image.getSize(
        url,
        (width, height) => {
          if (width && height > 0) {
            setAspectRatio(width / height);
          }
          setLoaded(true);
        },
        () => setLoaded(true) // handle error gracefully
      );
    } else {
      setLoaded(true);
    }
  }, [banner?.image_url]);

  return (
    <View style={{ width: containerWidth + 32, paddingHorizontal: 16 }}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={{
          width: containerWidth,
          aspectRatio: aspectRatio,
          backgroundColor: loaded ? 'transparent' : '#f0f0f0',
          borderRadius: 16,
          overflow: 'hidden',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Image 
          source={{ uri: processImageUrl(banner.image_url) }} 
          style={{ width: '100%', height: '100%', opacity: loaded ? 1 : 0 }} 
          resizeMode="cover"
        />
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { activePreset, dateRange: isoDateRange } = useSelector((state) => state.filter);
  
  // Reconstruct Date objects from ISO strings for querying
  const dateRange = { 
    start: isoDateRange.start ? new Date(isoDateRange.start) : null, 
    end: isoDateRange.end ? new Date(isoDateRange.end) : null 
  };
  
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const { data: appsData, isLoading: appsLoading, refetch: refetchApps, isFetching: appsFetching } = useGetApplicationsQuery({
    startDate: dateRange.start ? dateRange.start.toISOString() : undefined,
    endDate: dateRange.end ? dateRange.end.toISOString() : undefined,
    limit: 1000 // fetch a lot for dashboard analytics
  });
  const { data: bannersData, refetch: refetchBanners, isFetching: bannersFetching } = useGetBannersQuery();
  const { data: profileData } = useGetProfileQuery();
  
  const isLoading = appsLoading;
  const isFetching = appsFetching || bannersFetching;
  const applications = appsData?.data?.data || [];
  const banners = bannersData?.data || [];

  // Metrics
  const pendingCount = applications.filter(app => !['approved', 'rejected', 'disbursed'].includes(app.status)).length;
  const approvedCount = applications.filter(app => app.status === 'approved').length;
  const disbursedCount = applications.filter(app => app.status === 'disbursed').length;
  const totalAmount = applications.reduce((acc, app) => acc + (parseFloat(app.requested_amount) || 0), 0);
  // Chart Data preparation
  const getStatusData = () => {
    if (applications.length === 0) {
      return [{ value: 1, color: '#e5e7eb', text: '0' }];
    }
    const colors = { pending: '#3b82f6', approved: '#10b981', rejected: '#ef4444', disbursed: '#8b5cf6', in_progress: '#f59e0b' };
    const counts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({
      value: counts[key],
      text: `${counts[key]}`,
      color: colors[key] || '#9ca3af',
      title: key.replace('_', ' ')
    }));
  };

  // Real-time Weekly Volume calculation
  const getVolumeData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    applications.forEach(app => {
      if (!app.created_at) return;
      const date = new Date(app.created_at);
      const dayName = days[(date.getDay() + 6) % 7];
      if (dayCounts[dayName] !== undefined) {
        dayCounts[dayName] += 1;
      }
    });

    const todayName = days[(new Date().getDay() + 6) % 7];

    return days.map(d => ({
      value: dayCounts[d],
      label: d,
      frontColor: d === todayName ? colors.brandBlue : colors.brandBlueLight,
      topLabelComponent: () => (
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 2, textAlign: 'center' }}>{dayCounts[d]}</Text>
      )
    }));
  };


  // Real-time Product Category Breakdown (New / Used / Commercial)
  const getCategoryData = () => {
    let newCount = 0;
    let usedCount = 0;
    let commCount = 0;

    applications.forEach(app => {
      const pType = (app.product_type || app.vehicle_details?.product_type || '').toLowerCase();
      if (pType.includes('new')) newCount++;
      else if (pType.includes('commercial') || pType.includes('comm')) commCount++;
      else usedCount++;
    });

    return [
      { value: newCount, label: 'New Car', frontColor: '#3B82F6', topLabelComponent: () => <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 2, textAlign: 'center' }}>{newCount}</Text> },
      { value: usedCount, label: 'Used Car', frontColor: '#F59E0B', topLabelComponent: () => <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 2, textAlign: 'center' }}>{usedCount}</Text> },
      { value: commCount, label: 'Commercial', frontColor: '#10B981', topLabelComponent: () => <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 2, textAlign: 'center' }}>{commCount}</Text> }
    ];
  };

  const volumeData = getVolumeData();
  const categoryData = getCategoryData();

  const handleRefresh = () => {

    refetchApps();
    refetchBanners();
  };

  const handleSelectPreset = (preset, range) => {
    dispatch(setDateFilter({ preset, dateRange: range }));
  };

  const profileDataRaw = profileData?.data;
  const profileObj = profileDataRaw?.profiles || {};
  const userName = profileObj.full_name || profileDataRaw?.business_name || 'Staff';
  const firstName = userName ? userName.split(' ')[0] : 'Staff';

  return (
    <ScreenWrapper edges={['top']}>
      {/* Fixed Top Header */}
      <View style={{ backgroundColor: colors.brandBlueDark }}>
        <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$4" minHeight={72}>
          <XStack space="$3" ai="center" f={1} pr="$2">
            <HeaderDP />
            <H2 color="white" fontWeight="700" fontSize={18} numberOfLines={1} ellipsizeMode="tail">
              Welcome, {firstName}
            </H2>
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

      <ScrollView 
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={handleRefresh} />}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      >
        {/* Dynamic Banners - Dynamic Aspect Ratio (100% Fit, No Crop, No Gaps) */}
        {banners.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {banners.map((banner) => (
                <BannerCard key={banner.id} banner={banner} containerWidth={width - 32} />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ padding: 16 }}>

            <Card p="$4" bordered backgroundColor="$background" elevate size="$2">
              <YStack ai="center" jc="center" space="$2" py="$4">
                <Paragraph theme="alt2">No active banners.</Paragraph>
                <Paragraph theme="alt2" size="$2">Add banners from the Admin Panel.</Paragraph>
              </YStack>
            </Card>
          </View>
        )}

        <YStack f={1} p="$4" pt={banners.length > 0 ? "$3" : "$4"} space="$4">


          {/* Key Metrics Overview Cards */}
          <YStack style={{ marginBottom: 4 }}>
            <H4 color="$color" fontWeight="bold" mt="$1" mb="$3">Overview</H4>
            
            {/* Row 1: Pending & Approved */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1 }} 
                onPress={() => navigation.navigate('ApplicationsTab', { status: 'in_progress' })}
                activeOpacity={0.8}
              >
                <Card elevate size="$3" bordered p="$4" borderRadius={16} backgroundColor={colors.brandBlue} style={{ minHeight: 96, justifyContent: 'space-between' }}>
                  <SizableText color="white" fontSize={14} fontWeight="600">Pending</SizableText>
                  <H2 color="white" fontWeight="bold" mt="$2">{pendingCount}</H2>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1 }} 
                onPress={() => navigation.navigate('ApplicationsTab', { status: 'approved' })}
                activeOpacity={0.8}
              >
                <Card elevate size="$3" bordered p="$4" borderRadius={16} backgroundColor={colors.brandGreen} style={{ minHeight: 96, justifyContent: 'space-between' }}>
                  <SizableText color="white" fontSize={14} fontWeight="600">Approved</SizableText>
                  <H2 color="white" fontWeight="bold" mt="$2">{approvedCount}</H2>
                </Card>
              </TouchableOpacity>
            </View>

            {/* Row 2: Disbursed & Total Value */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1 }} 
                onPress={() => navigation.navigate('ApplicationsTab', { status: 'disbursed' })}
                activeOpacity={0.8}
              >
                <Card elevate size="$3" bordered p="$4" borderRadius={16} backgroundColor="#8B5CF6" style={{ minHeight: 96, justifyContent: 'space-between' }}>
                  <SizableText color="white" fontSize={14} fontWeight="600">Disbursed</SizableText>
                  <H2 color="white" fontWeight="bold" mt="$2">{disbursedCount}</H2>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1 }} 
                onPress={() => navigation.navigate('ApplicationsTab', { status: 'all' })}
                activeOpacity={0.8}
              >
                <Card elevate size="$3" bordered p="$4" borderRadius={16} backgroundColor="#D97706" style={{ minHeight: 96, justifyContent: 'space-between' }}>
                  <SizableText color="white" fontSize={14} fontWeight="600">Total Value</SizableText>
                  <H2 color="white" fontWeight="bold" mt="$2">₹{(totalAmount / 100000).toFixed(2)}L</H2>
                </Card>
              </TouchableOpacity>
            </View>
          </YStack>

          {/* Clean Application Pipeline Status Progress Breakdown (Replaces Bulky Donut Chart) */}
          <Card elevate size="$3" bordered p="$4" mt="$2" backgroundColor="$background">
            <H4 fontWeight="bold" mb="$3">Application Pipeline Status</H4>
            {applications.length === 0 ? (
              <Paragraph theme="alt2" size="$2">No applications in selected date range.</Paragraph>
            ) : (
              <YStack space="$3">
                {[
                  { label: 'In Progress / Pending', count: pendingCount, color: '#3B82F6' },
                  { label: 'Approved', count: approvedCount, color: '#10B981' },
                  { label: 'Disbursed', count: disbursedCount, color: '#8B5CF6' },
                  { label: 'Rejected', count: applications.filter(a => a.status === 'rejected').length, color: '#EF4444' },
                ].map((item, idx) => {
                  const pct = applications.length > 0 ? Math.round((item.count / applications.length) * 100) : 0;
                  return (
                    <YStack key={idx} space="$1">
                      <XStack jc="space-between" ai="center">
                        <SizableText fontSize={13} fontWeight="600" color="$color">{item.label}</SizableText>
                        <SizableText fontSize={13} fontWeight="bold" color="$colorFocus">{item.count} ({pct}%)</SizableText>
                      </XStack>
                      <View style={{ height: 8, width: '100%', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${pct}%`, backgroundColor: item.color, borderRadius: 4 }} />
                      </View>
                    </YStack>
                  );
                })}
              </YStack>
            )}
          </Card>

          {/* Weekly Volume Real-time Bar Chart */}
          <Card elevate size="$3" bordered p="$4" mt="$2" backgroundColor="$background">
            <H4 fontWeight="bold" mb="$3">Weekly Application Volume</H4>
            <XStack ai="center" jc="center" pt="$4" pb="$1">
              <BarChart
                data={volumeData}
                barWidth={14}
                spacing={Math.max(4, (width - 130 - (7 * 14)) / 6)}
                initialSpacing={12}
                noOfSections={3}
                maxValue={Math.max(...volumeData.map(d => d.value), 4) + 2}
                barBorderRadius={4}
                topLabelContainerStyle={{ marginBottom: 2 }}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="$borderColor"
                yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 10, fontWeight: '600', textAlign: 'center' }}
                yAxisLabelWidth={30}
                hideRules
                height={160}
                width={width - 100}
                disableScroll={true}
              />
            </XStack>
          </Card>

          {/* Vehicle Category Bar Chart (New Car / Used Car / Commercial) */}
          <Card elevate size="$3" bordered p="$4" mt="$2" backgroundColor="$background">
            <H4 fontWeight="bold" mb="$3">Vehicle Category Breakdown</H4>
            <XStack ai="center" jc="center" pt="$4" pb="$1">
              <BarChart
                data={categoryData}
                barWidth={28}
                spacing={Math.max(10, (width - 140 - (3 * 28)) / 2)}
                initialSpacing={18}
                noOfSections={3}
                maxValue={Math.max(...categoryData.map(d => d.value), 4) + 2}
                barBorderRadius={4}
                topLabelContainerStyle={{ marginBottom: 2 }}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor="$borderColor"
                yAxisTextStyle={{ color: '#9ca3af', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#6b7280', fontSize: 10, fontWeight: '600', textAlign: 'center' }}
                yAxisLabelWidth={30}
                hideRules
                height={160}
                width={width - 100}
                disableScroll={true}
              />
            </XStack>
          </Card>

        </YStack>
      </ScrollView>

      <DateRangePickerModal 
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        activePreset={activePreset}
        dateRange={dateRange}
        onSelectPreset={handleSelectPreset}
      />
    </ScreenWrapper>
  );
}

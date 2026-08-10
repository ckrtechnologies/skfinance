import React, { useState, useEffect } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { YStack, H2, Paragraph, Spinner, Avatar, XStack, SizableText, Input, Separator, Button, Sheet, H4 } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { setTheme } from '../store/slices/themeSlice';
import { dealerApi, useGetProfileQuery, useUpdateProfileMutation, useUploadAvatarMutation, useDeleteAccountMutation } from '../store/api/dealerApi';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { LogOut, Monitor, Moon, Sun, User, Building, CreditCard, Save, ChevronRight, X, Trash2, Camera, Image as ImageIcon, Bell } from '@tamagui/lucide-icons-2';
import ScreenWrapper from '../ui/ScreenWrapper';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../theme';
import { PrimaryButton, FloatingInput } from '../ui/Components';
import HeaderDP from '../ui/HeaderDP';
import AppModal from '../ui/AppModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppAlert } from '../context/AlertContext';

const { width } = Dimensions.get('window');

function MenuOption({ icon: Icon, title, onPress, color = colors.brandBlue }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <XStack ai="center" jc="space-between" py="$3" px="$4" backgroundColor="$background" borderBottomWidth={1} borderColor="$borderColor">
        <XStack ai="center" space="$3">
          <YStack width={32} height={32} borderRadius={16} backgroundColor={`${color}20`} ai="center" jc="center">
            <Icon size={18} color={color} />
          </YStack>
          <SizableText fontSize={15} fontWeight="600" color="$color">{title}</SizableText>
        </XStack>
        <ChevronRight size={18} color="$colorHover" />
      </XStack>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { showAlert } = useAppAlert();
  const dispatch = useDispatch();
  const { data: profileResponse, isLoading, error } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [uploadAvatarMutation, { isLoading: isUploadingAvatar }] = useUploadAvatarMutation();
  const [deleteAccountMutation] = useDeleteAccountMutation();
  const currentTheme = useSelector(state => state.theme.value);

  const [activeModal, setActiveModal] = useState(null); // 'personal', 'business', 'bank'
  const [formData, setFormData] = useState({});
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (profileResponse?.data && !activeModal) {
      const profileData = profileResponse.data.profiles || {};
      const dealerData = profileResponse.data || {};
      
      setFormData({
        full_name: profileData.full_name || '',
        avatar_url: profileData.avatar_url || '',
        business_name: dealerData.business_name || '',
        business_address: dealerData.business_address || '',
        city: dealerData.city || '',
        state: dealerData.state || '',
        pincode: dealerData.pincode || '',
        pan_number: dealerData.pan_number || '',
        gst_number: dealerData.gst_number || '',
        bank_account_name: dealerData.bank_account_name || '',
        bank_account_number: dealerData.bank_account_number || '',
        bank_ifsc: dealerData.bank_ifsc || '',
        bank_name: dealerData.bank_name || '',
      });
    }
  }, [profileResponse, activeModal]);

  const handleLogout = () => {
    dispatch(dealerApi.util.resetApiState());
    dispatch(logoutUser());
  };

  const handleSetTheme = (themeValue) => {
    dispatch(setTheme(themeValue));
  };

  const handleSave = async () => {
    try {
      await updateProfile(formData).unwrap();
      setActiveModal(null);
      setTimeout(() => {
        showAlert('Success', 'Profile updated successfully!');
      }, 500);
    } catch (err) {
      showAlert('Error', err?.data?.error || 'Failed to update profile');
    }
  };

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const handleAvatarUpload = () => {
    setIsAvatarModalOpen(true);
  };

  const handleCameraLaunch = async () => {
    setIsAvatarModalOpen(false);
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
      if (result.didCancel || result.errorCode) return;
      if (result.assets?.length > 0) await processAvatarAsset(result.assets[0]);
    } catch (err) {
      showAlert('Error', err.message);
    }
  };

  const handleLibraryLaunch = async () => {
    setIsAvatarModalOpen(false);
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.didCancel || result.errorCode) return;
      if (result.assets?.length > 0) await processAvatarAsset(result.assets[0]);
    } catch (err) {
      showAlert('Error', err.message);
    }
  };

  const processAvatarAsset = async (asset) => {
    const data = new FormData();
    data.append('avatar', {
      uri: asset.uri,
      type: asset.type,
      name: asset.fileName || 'avatar.jpg',
    });
    await uploadAvatarMutation(data).unwrap();
    showAlert('Success', 'Profile picture updated successfully!');
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteAccountMutation().unwrap();
              showAlert('Success', 'Account has been deleted.');
              handleLogout();
            } catch (err) {
              showAlert('Error', err?.data?.error || 'Failed to delete account');
            }
          } 
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.brandBlueDark }} edges={['top']}>
        <YStack f={1} jc="center" ai="center">
          <Spinner size="large" color={colors.brandBlue} />
        </YStack>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.brandBlueDark }} edges={['top']}>
        <YStack f={1} jc="center" ai="center">
          <Paragraph color="$red10">Error loading profile</Paragraph>
          <Button onPress={handleLogout} mt="$4">Logout anyway</Button>
        </YStack>
      </SafeAreaView>
    );
  }

  const dealerData = profileResponse?.data || {};
  const profileData = dealerData.profiles || {};
  let rawAvatarUrl = profileData.avatar_url || '';
  if (rawAvatarUrl && Platform.OS === 'android' && rawAvatarUrl.includes('localhost')) {
    rawAvatarUrl = rawAvatarUrl.replace('localhost', '10.0.2.2');
  }

  const displayData = {
    full_name: profileData.full_name || '',
    email: profileData.email || 'dealer@example.com',
    avatar_url: rawAvatarUrl,
    code: dealerData.dealer_code || 'N/A',
  };

  const renderModalContent = () => {
    switch(activeModal) {
      case 'personal':
        return (
          <YStack>
            <FloatingInput label="Full Name" value={formData.full_name} onChangeText={t => setFormData({...formData, full_name: t})} />
          </YStack>
        );
      case 'business':
        return (
          <YStack>
            <FloatingInput label="Business Name" value={formData.business_name} onChangeText={t => setFormData({...formData, business_name: t})} />
            <FloatingInput label="PAN Number" value={formData.pan_number} onChangeText={t => setFormData({...formData, pan_number: t})} autoCapitalize="characters" />
            <FloatingInput label="GST Number" value={formData.gst_number} onChangeText={t => setFormData({...formData, gst_number: t})} autoCapitalize="characters" />
            <FloatingInput label="Business Address" value={formData.business_address} onChangeText={t => setFormData({...formData, business_address: t})} multiline />
            <XStack space="$3">
              <YStack f={1}><FloatingInput label="City" value={formData.city} onChangeText={t => setFormData({...formData, city: t})} /></YStack>
              <YStack f={1}><FloatingInput label="State" value={formData.state} onChangeText={t => setFormData({...formData, state: t})} /></YStack>
            </XStack>
            <FloatingInput label="Pincode" value={formData.pincode} onChangeText={t => setFormData({...formData, pincode: t})} keyboardType="number-pad" />
          </YStack>
        );
      case 'bank':
        return (
          <YStack>
            <FloatingInput label="Bank Name" value={formData.bank_name} onChangeText={t => setFormData({...formData, bank_name: t})} />
            <FloatingInput label="Account Name" value={formData.bank_account_name} onChangeText={t => setFormData({...formData, bank_account_name: t})} />
            <FloatingInput label="Account Number" value={formData.bank_account_number} onChangeText={t => setFormData({...formData, bank_account_number: t})} keyboardType="number-pad" />
            <FloatingInput label="IFSC Code" value={formData.bank_ifsc} onChangeText={t => setFormData({...formData, bank_ifsc: t})} autoCapitalize="characters" />
          </YStack>
        );
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch(activeModal) {
      case 'personal': return 'Personal Details';
      case 'business': return 'Business Details';
      case 'bank': return 'Bank Details';
      default: return 'Edit Profile';
    }
  };

  return (
    <ScreenWrapper edges={['top']} style={{ flex: 1, backgroundColor: colors.brandBlueDark }}>
      {/* Fixed Top Header */}
      <View style={{ backgroundColor: colors.brandBlueDark }}>
        <XStack jc="space-between" ai="center" px="$4" pt="$4" pb="$4" minHeight={72}>
          <XStack space="$3" ai="center">
            <HeaderDP />
            <H2 color="white" fontWeight="700" fontSize={22}>My Profile</H2>
          </XStack>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={{ padding: 4 }}>
            <Bell size={24} color="white" />
          </TouchableOpacity>
        </XStack>
      </View>
      
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }} bounces={true} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: colors.brandBlueDark, paddingBottom: 28, paddingTop: 8, marginTop: -2 }}>
          <YStack ai="center" zIndex={10}>
            <TouchableOpacity onPress={handleAvatarUpload}>
              <Avatar circular size={110} style={styles.avatarContainer}>
                <Avatar.Image src={displayData.avatar_url || "https://i.pravatar.cc/150?u=a04258114e29026702d"} />
                <Avatar.Fallback bc="$blue10" />
              </Avatar>
              <YStack 
                position="absolute" 
                bottom={0} 
                right={0} 
                backgroundColor="#3b82f6" 
                padding="$2" 
                borderRadius={20}
                borderWidth={2}
                borderColor="white"
              >
                {isUploadingAvatar ? <Spinner size="small" color="white" /> : <Camera size={16} color="white" />}
              </YStack>
            </TouchableOpacity>
            <YStack ai="center" mt="$3" space="$1">
              <H2 size="$7" color="white" fontWeight="bold">{displayData.full_name || 'Dealer Name'}</H2>
              <SizableText color="rgba(255,255,255,0.75)" fontSize={14}>{displayData.email}</SizableText>
              <YStack backgroundColor="rgba(255,255,255,0.18)" px="$3" py="$1" borderRadius="$full" mt="$2">
                <SizableText color="white" fontSize={12} fontWeight="bold">Code: {displayData.code}</SizableText>
              </YStack>
            </YStack>
          </YStack>
        </View>

        <YStack f={1} backgroundColor="$background">

        <YStack padding="$3" space="$3" mt="$2">
          <MenuOption icon={User} color="#3B82F6" title="Personal Details" onPress={() => setActiveModal('personal')} />
          <MenuOption icon={Building} color="#F59E0B" title="Business Details" onPress={() => setActiveModal('business')} />
          <MenuOption icon={CreditCard} color="#10B981" title="Bank Details" onPress={() => setActiveModal('bank')} />
        </YStack>

        <YStack px="$4" mt="$6" mb="$8">
          <SizableText fontSize={16} fontWeight="700" color="$color" mb="$4">App Settings</SizableText>
          
          <YStack backgroundColor="$background" borderRadius={12} p="$4" borderWidth={1} borderColor="$borderColor">
            <SizableText fontSize={13} color="$colorFocus" fontWeight="600" mb="$3">Appearance</SizableText>
            <XStack space="$2" mb="$5">
              <Button flex={1} onPress={() => handleSetTheme('system')} backgroundColor={currentTheme === 'system' ? colors.brandBlueMuted : '$backgroundHover'} color={currentTheme === 'system' ? colors.brandBlue : '$colorHover'} icon={Monitor}>System</Button>
              <Button flex={1} onPress={() => handleSetTheme('light')} backgroundColor={currentTheme === 'light' ? colors.brandBlueMuted : '$backgroundHover'} color={currentTheme === 'light' ? colors.brandBlue : '$colorHover'} icon={Sun}>Light</Button>
              <Button flex={1} onPress={() => handleSetTheme('dark')} backgroundColor={currentTheme === 'dark' ? colors.brandBlueMuted : '$backgroundHover'} color={currentTheme === 'dark' ? colors.brandBlue : '$colorHover'} icon={Moon}>Dark</Button>
            </XStack>

            <Separator mb="$5" borderColor="$borderColor" />

            <Button 
              icon={LogOut} 
              onPress={handleLogout} 
              backgroundColor={colors.errorMuted} 
              color={colors.error} 
              borderWidth={1} 
              borderColor={colors.error}
              mb="$3"
            >
              Log Out
            </Button>

            <Button 
              icon={Trash2} 
              onPress={handleDeleteAccount} 
              backgroundColor="transparent" 
              color={colors.error} 
              borderWidth={1} 
              borderColor={colors.error}
            >
              Delete Account
            </Button>
          </YStack>
        </YStack>
        </YStack>
      </ScrollView>

      {/* --- AVATAR UPLOAD ACTION SHEET --- */}
      <AppModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        title="Update Profile Picture"
        description="Choose where to pick your new profile picture"
        icon={<Camera size={24} color="#2563eb" />}
        variant="options"
        options={[
          {
            label: 'Take Photo',
            icon: <Camera size={20} color="#2563eb" />,
            onPress: handleCameraLaunch
          },
          {
            label: 'Choose from Library',
            icon: <ImageIcon size={20} color="#2563eb" />,
            onPress: handleLibraryLaunch
          }
        ]}
      />

      {/* --- CATEGORY EDIT MODAL (BOTTOM SHEET) --- */}
      <Sheet
        forceRemoveScrollEnabled={!!activeModal}
        modal={true}
        open={!!activeModal}
        onOpenChange={(open) => !open && setActiveModal(null)}
        snapPoints={[90]}
        dismissOnSnapToBottom
        position={0}
        zIndex={100000}
        animation="medium"
      >
        <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Handle />
        <Sheet.Frame flex={1} padding="$0" justifyContent="flex-start" backgroundColor="$background">
          
          <XStack jc="space-between" ai="center" p="$4" borderBottomWidth={1} borderColor="$borderColor">
            <H4 color="$color">{getModalTitle()}</H4>
            <Button size="$3" circular icon={X} onPress={() => setActiveModal(null)} backgroundColor="$backgroundHover" />
          </XStack>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
              {renderModalContent()}
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Modal Sticky Footer with Safe Area Padding */}
          <YStack 
            position="absolute" 
            bottom={0} 
            left={0} 
            right={0} 
            padding="$4" 
            paddingBottom={Math.max(insets.bottom, 24) + 16}
            backgroundColor="$background"
            style={styles.footerShadow}
            borderTopWidth={1}
            borderColor="$borderColor"
          >
            <PrimaryButton onPress={handleSave} loading={isUpdating} icon={Save} size="$5">
              Save {getModalTitle()}
            </PrimaryButton>
          </YStack>

        </Sheet.Frame>
      </Sheet>

    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heroGradient: {
    height: 150,
    width: '100%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    borderWidth: 4,
    borderColor: 'white',
    backgroundColor: 'white',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  footerShadow: {
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  }
});

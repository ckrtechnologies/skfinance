import os

file_path = '/Users/chandanmallik/projects/skfinance/dealer/src/screens/OnboardingScreen.js'

content = """import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, ScrollView, Platform, PermissionsAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types } from '@react-native-documents/picker';
import Geolocation from '@react-native-community/geolocation';
import {
  YStack, XStack, Input, Button, H2, Paragraph, SizableText, Spinner, AnimatePresence
} from 'tamagui';
import { fetchOnboardingStatus } from '../store/slices/authSlice';
import ScreenWrapper from '../ui/ScreenWrapper';
import { PrimaryButton, SecondaryButton, AltButton, BrandCard } from '../ui/Components';
import { colors } from '../theme';
import Config from 'react-native-config';
import { useAppAlert } from '../context/AlertContext';
import { MapPin, CheckCircle2 } from '@tamagui/lucide-icons-2';

const getApiUrl = () => {
  let url = Config.API_URL || 'http://localhost:4000';
  if (Platform.OS === 'android' && url.includes('localhost')) url = url.replace('localhost', '10.0.2.2');
  return url;
};

const STEPS = ['Personal', 'Business', 'Bank', 'Documents'];

function StepIndicator({ currentStep }) {
  return (
    <XStack space="$2" ai="center" mb="$6">
      {STEPS.map((label, idx) => (
        <XStack key={label} ai="center" f={1} space="$1">
          <YStack
            width={32} height={32} borderRadius={16}
            backgroundColor={idx < currentStep ? colors.brandGreen : idx === currentStep ? colors.brandBlueLight : colors.borderLight}
            ai="center" jc="center"
          >
            {idx < currentStep ? (
              <CheckCircle2 color="white" size={16} />
            ) : (
              <SizableText color={idx === currentStep ? "white" : colors.textMutedLight} fontSize={12} fontWeight="bold">{idx + 1}</SizableText>
            )}
          </YStack>
          <SizableText 
            fontSize={11} 
            fontWeight={idx === currentStep ? "bold" : "normal"}
            color={idx < currentStep ? colors.brandGreen : idx === currentStep ? colors.brandBlueLight : colors.textMutedLight} 
            f={1}
            numberOfLines={1}
          >
            {label}
          </SizableText>
        </XStack>
      ))}
    </XStack>
  );
}

function LabeledInput({ label, ...props }) {
  return (
    <YStack space="$1">
      <SizableText fontSize={12} color={colors.textMutedLight || '#64748B'} fontWeight="600">{label}</SizableText>
      <Input
        borderWidth={1}
        borderColor={colors.border || '#ccc'}
        borderRadius="$3"
        p="$3"
        backgroundColor="$background"
        {...props}
      />
    </YStack>
  );
}

export default function OnboardingScreen({ onSuccess }) {
  const { showAlert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const { token } = useSelector(s => s.auth);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);

  // Error modal state
  const [validationError, setValidationError] = useState('');

  // Document upload picker modal state
  const [activeDoc, setActiveDoc] = useState(null); // { key, label }
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [uploadingDocKey, setUploadingDocKey] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    business_address: '',
    city: '',
    state: '',
    pincode: '',
    pan_number: '',
    gst_number: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    latitude: null,
    longitude: null,
  });

  const [documents, setDocuments] = useState({
    pan_url: '',
    gst_url: '',
    aadhar_url: '',
    shop_photo_url: '',
  });

  const [rejectionReason, setRejectionReason] = useState('');

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  React.useEffect(() => {
    async function loadExistingOnboardingData() {
      if (!token) return;
      try {
        const res = await fetch(`${getApiUrl()}/dealer/onboarding/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        const d = json?.data || json;
        if (d) {
          setForm(f => ({
            ...f,
            full_name: d.profiles?.full_name || f.full_name,
            business_name: d.business_name || f.business_name,
            business_address: d.business_address || f.business_address,
            city: d.city || f.city,
            state: d.state || f.state,
            pincode: d.pincode || f.pincode,
            pan_number: d.pan_number || f.pan_number,
            gst_number: d.gst_number || f.gst_number,
            bank_account_name: d.bank_account_name || f.bank_account_name,
            bank_account_number: d.bank_account_number || f.bank_account_number,
            bank_ifsc: d.bank_ifsc || f.bank_ifsc,
            bank_name: d.bank_name || f.bank_name,
            latitude: d.latitude || f.latitude,
            longitude: d.longitude || f.longitude,
          }));

          if (d.documents && typeof d.documents === 'object') {
            setDocuments(docs => ({ ...docs, ...d.documents }));
          }

          if (d.onboarding_rejection_reason) {
            setRejectionReason(d.onboarding_rejection_reason);
          }
        }
      } catch (e) {
        console.log('Error pre-filling onboarding data:', e);
      }
    }
    loadExistingOnboardingData();
  }, [token]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs access to camera to take photos of documents.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    }
    return true;
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need your location to securely verify your dealership address.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Location permission error:', err);
        return false;
      }
    }
    return true;
  };

  const captureLocation = async () => {
    setValidationError('');
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setValidationError('Location permission is required to capture your store coordinates.');
      return;
    }
    setIsFetchingLocation(true);
    Geolocation.getCurrentPosition(
      (position) => {
        setForm(f => ({
          ...f,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setIsFetchingLocation(false);
      },
      (error) => {
        setIsFetchingLocation(false);
        setValidationError('Failed to get location. Please ensure GPS is enabled.');
        console.log(error.code, error.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const uploadFileToBackend = async (docKey, fileUri, fileName, mimeType) => {
    setUploadingDocKey(docKey);
    try {
      const formData = new FormData();
      formData.append('doc_type', docKey);
      formData.append('file', {
        uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
        name: fileName || `${docKey}_${Date.now()}.jpg`,
        type: mimeType || (fileUri.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      });

      const response = await fetch(`${getApiUrl()}/dealer/onboarding/upload-doc`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data?.data?.url) {
        setDocuments(d => ({ ...d, [`${docKey}_url`]: data.data.url }));
      } else {
        showAlert('Upload Failed', data?.error?.message || data?.message || 'Failed to upload document to server. Please try again.');
      }
    } catch (e) {
      console.log('Document upload error:', e);
      showAlert('Upload Error', 'Network error while uploading document. Please check connection and try again.');
    } finally {
      setUploadingDocKey(null);
      setShowDocPicker(false);
    }
  };

  const handleCameraPick = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setValidationError('Camera permission is required to take photo.');
      setShowDocPicker(false);
      return;
    }
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
      if (result.assets && result.assets[0] && activeDoc) {
        const asset = result.assets[0];
        await uploadFileToBackend(activeDoc.key, asset.uri, asset.fileName, asset.type);
      }
    } catch (err) {
      console.warn('Camera launch error:', err);
    }
  };

  const handleGalleryPick = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.assets && result.assets[0] && activeDoc) {
        const asset = result.assets[0];
        await uploadFileToBackend(activeDoc.key, asset.uri, asset.fileName, asset.type);
      }
    } catch (err) {
      console.warn('Gallery launch error:', err);
    }
  };

  const handleDocumentPick = async () => {
    try {
      const results = await pick({ type: [types.pdf, types.images] });
      if (results && results[0] && activeDoc) {
        const file = results[0];
        await uploadFileToBackend(activeDoc.key, file.uri, file.name, file.type);
      }
    } catch (err) {
      console.warn('Document picker error:', err);
      handleGalleryPick();
    }
  };

  const handleUseDemoSample = () => {
    if (activeDoc) {
      setDocuments(d => ({ ...d, [`${activeDoc.key}_url`]: `https://cdn.placeholder.com/${activeDoc.key}.jpg` }));
      setShowDocPicker(false);
    }
  };

  const validateStep = () => {
    setValidationError('');
    if (step === 0 && !form.full_name.trim()) {
      setValidationError('Please enter your Full Name');
      return false;
    }
    if (step === 1 && !form.business_name.trim()) {
      setValidationError('Please enter your Business Name');
      return false;
    }
    if (step === 1 && !form.pan_number.trim()) {
      setValidationError('PAN Number is required');
      return false;
    }
    if (step === 1 && (!form.latitude || !form.longitude)) {
      setValidationError('Please capture your store location');
      return false;
    }
    if (step === 2 && (!form.bank_account_number.trim() || !form.bank_ifsc.trim())) {
      setValidationError('Bank Account Number and IFSC are required');
      return false;
    }
    if (step === 3) {
      if (!documents.pan_url) {
        setValidationError('Please upload your PAN card document');
        return false;
      }
      if (Object.values(documents).some(url => typeof url === 'string' && url.startsWith('content://'))) {
        setValidationError('One or more documents were not uploaded to the server. Please tap Replace and re-upload them.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  }

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setValidationError('');
    try {
      const response = await fetch(`${getApiUrl()}/dealer/onboarding/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, documents }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.message || 'Submission failed');
      
      showAlert(
        'Application Submitted',
        'Your dealer profile has been submitted successfully and is now under review by our team.',
        [
          {
            text: 'View Status',
            onPress: () => {
              if (onSuccess) onSuccess();
              dispatch(fetchOnboardingStatus());
            }
          }
        ]
      );
    } catch (e) {
      setValidationError(e.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <YStack space="$4" key="step0" animation="quick" enterStyle={{ opacity: 0, x: direction * 50 }} exitStyle={{ opacity: 0, x: -direction * 50 }}>
            <LabeledInput label="Full Name *" placeholder="e.g. Ramesh Kumar" value={form.full_name} onChangeText={set('full_name')} />
          </YStack>
        );
      case 1:
        return (
          <YStack space="$4" key="step1" animation="quick" enterStyle={{ opacity: 0, x: direction * 50 }} exitStyle={{ opacity: 0, x: -direction * 50 }}>
            <LabeledInput label="Business Name *" placeholder="e.g. Ramesh Motors" value={form.business_name} onChangeText={set('business_name')} />
            <LabeledInput label="Business Address" placeholder="Shop no., Street" value={form.business_address} onChangeText={set('business_address')} />
            
            <YStack space="$2" p="$4" backgroundColor={colors.brandBlueMuted} borderRadius="$3" borderWidth={1} borderColor={colors.brandBlueLight}>
              <XStack ai="center" jc="space-between" mb="$2">
                <SizableText fontSize={14} fontWeight="600" color={colors.brandBlueDark}>Store Location *</SizableText>
                <MapPin color={colors.brandBlue} size={20} />
              </XStack>
              <Paragraph fontSize={12} color={colors.brandBlue}>
                We require your exact location to verify your dealership. Please capture it while at your store.
              </Paragraph>
              
              {form.latitude && form.longitude ? (
                <XStack ai="center" space="$2" mt="$2">
                  <CheckCircle2 color={colors.brandGreen} size={18} />
                  <SizableText color={colors.brandGreenDark} fontSize={12} fontWeight="bold">
                    Location Captured: {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                  </SizableText>
                </XStack>
              ) : null}

              <SecondaryButton 
                mt="$3" 
                onPress={captureLocation} 
                loading={isFetchingLocation}
                icon={form.latitude ? null : () => <MapPin color="white" size={16} />}
              >
                {form.latitude ? 'Recapture Location' : 'Fetch Location'}
              </SecondaryButton>
            </YStack>

            <XStack space="$2">
              <YStack f={1}><LabeledInput label="City" placeholder="City" value={form.city} onChangeText={set('city')} /></YStack>
              <YStack f={1}><LabeledInput label="State" placeholder="State" value={form.state} onChangeText={set('state')} /></YStack>
            </XStack>
            <LabeledInput label="Pincode" placeholder="302001" value={form.pincode} onChangeText={set('pincode')} keyboardType="numeric" maxLength={6} />
            <LabeledInput label="PAN Number *" placeholder="ABCDE1234F" value={form.pan_number} onChangeText={set('pan_number')} autoCapitalize="characters" maxLength={10} />
            <LabeledInput label="GST Number (optional)" placeholder="08ABCDE1234F1Z5" value={form.gst_number} onChangeText={set('gst_number')} autoCapitalize="characters" />
          </YStack>
        );
      case 2:
        return (
          <YStack space="$4" key="step2" animation="quick" enterStyle={{ opacity: 0, x: direction * 50 }} exitStyle={{ opacity: 0, x: -direction * 50 }}>
            <LabeledInput label="Account Holder Name *" placeholder="As per bank records" value={form.bank_account_name} onChangeText={set('bank_account_name')} />
            <LabeledInput label="Account Number *" placeholder="XXXXXXXXXXXXXXXX" value={form.bank_account_number} onChangeText={set('bank_account_number')} keyboardType="numeric" />
            <LabeledInput label="IFSC Code *" placeholder="SBIN0001234" value={form.bank_ifsc} onChangeText={set('bank_ifsc')} autoCapitalize="characters" />
            <LabeledInput label="Bank Name" placeholder="e.g. State Bank of India" value={form.bank_name} onChangeText={set('bank_name')} />
          </YStack>
        );
      case 3:
        const docItems = [
          { key: 'pan', label: 'PAN Card *' },
          { key: 'aadhar', label: 'Aadhar Card *' },
          { key: 'gst', label: 'GST Certificate (if applicable)' },
          { key: 'shop_photo', label: 'Shop / Showroom Photo' },
        ];
        return (
          <YStack space="$4" key="step3" animation="quick" enterStyle={{ opacity: 0, x: direction * 50 }} exitStyle={{ opacity: 0, x: -direction * 50 }}>
            {docItems.map(({ key, label }) => (
              <XStack key={key} ai="center" space="$3" borderWidth={1} borderColor={colors.border || '#ccc'} borderRadius="$3" p="$4" backgroundColor="$background">
                <YStack f={1}>
                  <SizableText fontSize={14} fontWeight="600">{label}</SizableText>
                  <SizableText fontSize={12} color={documents[`${key}_url`] ? colors.brandGreen : colors.textMutedLight} mt="$1">
                    {documents[`${key}_url`] ? '✓ Uploaded securely' : 'Pending upload'}
                  </SizableText>
                </YStack>
                <SecondaryButton
                  size="$3"
                  loading={uploadingDocKey === key}
                  onPress={() => {
                    setActiveDoc({ key, label });
                    setShowDocPicker(true);
                  }}
                >
                  {uploadingDocKey === key ? 'Uploading...' : documents[`${key}_url`] ? 'Replace' : 'Upload'}
                </SecondaryButton>
              </XStack>
            ))}
            <SizableText fontSize={12} color={colors.textMutedLight || '#64748B'} ta="center" mt="$2">
              Supported formats: Camera, Gallery, PDF (max 10 MB each)
            </SizableText>
          </YStack>
        );
    }
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <YStack mb="$5" ai="center" mt="$2">
          <H2 color={colors.brandBlue} fontWeight="bold" mb="$2">Dealer Profile</H2>
          <Paragraph color={colors.textMutedLight || '#64748B'} fontSize={14} ta="center">Complete these simple steps to start submitting applications instantly.</Paragraph>
        </YStack>

        <StepIndicator currentStep={step} />

        {rejectionReason ? (
          <YStack backgroundColor={colors.errorMuted} borderColor={colors.error} borderWidth={1} borderRadius="$4" p="$4" mb="$5" space="$2">
            <SizableText color={colors.error} fontSize={13} fontWeight="bold" textTransform="uppercase">
              ⚠️ Rejection Notice
            </SizableText>
            <SizableText color={colors.error} fontSize={14}>
              {rejectionReason}
            </SizableText>
            <SizableText color={colors.error} fontSize={12} opacity={0.8}>
              Please review and update the relevant details or documents below before resubmitting.
            </SizableText>
          </YStack>
        ) : null}

        {validationError ? (
          <YStack backgroundColor={colors.errorMuted} borderColor={colors.error} borderWidth={1} borderRadius="$4" p="$3" mb="$4">
            <SizableText color={colors.error} fontSize={13} fontWeight="bold" ta="center">{validationError}</SizableText>
          </YStack>
        ) : null}

        <BrandCard p="$5" mb="$5">
          <SizableText fontWeight="bold" fontSize={18} mb="$4" color={colors.brandBlueDark}>{STEPS[step]} Details</SizableText>
          <AnimatePresence exitBeforeEnter>
            {renderStep()}
          </AnimatePresence>
        </BrandCard>

        <XStack space="$4" mt="$2" mb="$6">
          {step > 0 && (
            <AltButton f={1} onPress={handleBack} disabled={loading || !!uploadingDocKey}>Back</AltButton>
          )}
          {step < STEPS.length - 1 ? (
            <SecondaryButton f={1} onPress={handleNext} disabled={!!uploadingDocKey}>Continue →</SecondaryButton>
          ) : (
            <PrimaryButton
              f={1} onPress={handleSubmit} loading={loading || !!uploadingDocKey} disabled={loading || !!uploadingDocKey}
            >
              Submit Application
            </PrimaryButton>
          )}
        </XStack>
      </ScrollView>

      {/* DOCUMENT PICKER MODAL */}
      <Modal
        transparent
        visible={showDocPicker}
        animationType="fade"
        onRequestClose={() => { if (!uploadingDocKey) setShowDocPicker(false); }}
      >
        <YStack f={1} jc="center" ai="center" backgroundColor="rgba(0,0,0,0.7)" p="$4">
          <BrandCard w="100%" maxWidth={400} p="$5" space="$4">
            <SizableText fontWeight="bold" fontSize={18} color={colors.brandBlue} mb="$2" ta="center">
              Upload {activeDoc?.label}
            </SizableText>

            {uploadingDocKey ? (
              <YStack py="$5" ai="center" space="$4">
                <Spinner size="large" color={colors.brandBlue} />
                <SizableText fontSize={15} color={colors.brandBlue} fontWeight="bold">
                  Uploading {activeDoc?.label}...
                </SizableText>
                <Paragraph fontSize={13} color={colors.textMuted} ta="center">
                  Please wait while your document is being uploaded securely to the server.
                </Paragraph>
              </YStack>
            ) : (
              <>
                <PrimaryButton size="$4" onPress={handleCameraPick}>
                  📷 Take Photo (Camera)
                </PrimaryButton>
                <SecondaryButton size="$4" onPress={handleGalleryPick}>
                  🖼️ Choose from Gallery
                </SecondaryButton>
                <AltButton size="$4" onPress={handleDocumentPick}>
                  📄 Pick Document (PDF / File)
                </AltButton>
                <Button size="$3" theme="subtle" onPress={handleUseDemoSample} mt="$2">
                  ⚡ Use Sample Demo Document
                </Button>
                <Button 
                  size="$4" 
                  mt="$4" 
                  backgroundColor="transparent" 
                  color={colors.error} 
                  onPress={() => setShowDocPicker(false)}
                >
                  Cancel
                </Button>
              </>
            )}
          </BrandCard>
        </YStack>
      </Modal>
    </ScreenWrapper>
  );
}
"""

with open(file_path, 'w') as f:
    f.write(content)

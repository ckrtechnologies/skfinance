import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { View, ScrollView, Modal, TouchableOpacity, Platform, BackHandler, SafeAreaView, Linking, StatusBar, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, H2, H4, Paragraph, Input, Button, Spinner, SizableText, Card } from 'tamagui';
import { useSubmitApplicationMutation, useCheckEligibilityMutation, useFetchCibilMutation, useGetDigilockerAuthUrlMutation, useProcessDigilockerMutation, usePreviewDigilockerMutation } from '../store/api/dealerApi';
import DocumentPicker, { types, pick } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import * as Keychain from 'react-native-keychain';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileText, CheckCircle2, Car, UserCheck, CreditCard, Activity, UploadCloud, User, Users, Shield, Contact, Landmark, Home, Lightbulb, FileStack, X, Zap, Map, ShieldCheck, RefreshCw } from '@tamagui/lucide-icons-2';

import ScreenWrapper from '../ui/ScreenWrapper';
import { DigilockerWebView } from '../ui/DigilockerWebView';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
import { PrimaryButton, AltButton } from '../ui/Components';
import { colors } from '../theme';
import { useAppAlert } from '../context/AlertContext';

// Note: The UI has been refactored into a 3-step Pre-Check flow!
export default function NewApplicationScreen({ navigation }) {
  const { showAlert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const reduxToken = useSelector(state => state.auth?.token);
  const [step, setStep] = useState(1);
  const [activeDocRequirement, setActiveDocRequirement] = useState(null);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [isUploadingModal, setIsUploadingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('applicant');
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    pan_number: '',
    age: '',
    customer_type: 'salaried',
    cibil_score: null,
    address_type: 'owned',
    ownership_provided_by: 'applicant',
    co_applicant_name: '',
    co_applicant_relation: '',
    co_applicant_marital_status: '',
    co_applicant_income: '',
    co_applicant_address_type: 'owned',
    guarantor_name: '',
    guarantor_phone: '',
    guarantor_relation: '',
    product_type: 'new_car',
    make_model: '',
    year: '2024',
    vehicle_price: '',
    loan_amount: '',
    tenure_months: '48',
  });

  const [requiredDocs, setRequiredDocs] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [eligibilityResults, setEligibilityResults] = useState(null);
  const [createdApplicationId, setCreatedApplicationId] = useState(null);
  const [createdApplicationNo, setCreatedApplicationNo] = useState(null);
  const [digilockerReady, setDigilockerReady] = useState(false);

  // Digilocker State
  const [showDigilocker, setShowDigilocker] = useState(false);
  const [digilockerUrl, setDigilockerUrl] = useState('');
  const [digilockerSession, setDigilockerSession] = useState({ client_token: '', state: '' });
  const [digilockerData, setDigilockerData] = useState(null);

  // Draft Restore State
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const DRAFT_STORAGE_KEY = 'SK_DEALER_APP_DRAFT_V3';

  // Restore Draft on Mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const saved = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.formData && (parsed.formData.customer_name || parsed.formData.phone)) {
            setFormData(parsed.formData);
            if (parsed.step) setStep(parsed.step);
            if (parsed.digilockerReady) setDigilockerReady(parsed.digilockerReady);
            if (parsed.eligibilityResults) setEligibilityResults(parsed.eligibilityResults);
            if (parsed.requiredDocs) setRequiredDocs(parsed.requiredDocs);
            setHasRestoredDraft(true);
          }
        }
      } catch (e) {
        console.log('Error loading application draft', e);
      }
    };
    loadDraft();
  }, []);

  // Auto-Save Draft on Form Changes
  useEffect(() => {
    const saveDraft = async () => {
      try {
        if (formData.customer_name || formData.phone || formData.pan_number || step > 1) {
          await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
            formData,
            step,
            digilockerReady,
            eligibilityResults,
            requiredDocs
          }));
        }
      } catch (e) {
        console.log('Error saving draft', e);
      }
    };
    saveDraft();
  }, [formData, step, digilockerReady, eligibilityResults, requiredDocs]);

  const handleClearDraft = async (silent = false) => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      setFormData({
        customer_name: '',
        phone: '',
        pan_number: '',
        age: '',
        customer_type: 'salaried',
        cibil_score: null,
        address_type: 'owned',
        ownership_provided_by: 'applicant',
        co_applicant_name: '',
        co_applicant_relation: '',
        co_applicant_marital_status: '',
        co_applicant_income: '',
        co_applicant_address_type: 'owned',
        guarantor_name: '',
        guarantor_phone: '',
        guarantor_relation: '',
        product_type: 'new_car',
        make_model: '',
        year: '2024',
        vehicle_price: '',
        loan_amount: '',
        tenure_months: '48',
      });
      setStep(1);
      setDigilockerReady(false);
      setDigilockerData(null);
      setEligibilityResults(null);
      setRequiredDocs([]);
      setUploadedDocs({});
      setHasRestoredDraft(false);
      if (!silent) showAlert('Draft Cleared', 'The application form has been reset.');
    } catch (e) {
      console.log('Error clearing draft', e);
    }
  };

  const getDocIcon = (docType) => {
    const type = docType.toLowerCase();
    if (type.includes('pan')) return <CreditCard size={20} color={colors.textMuted} />;
    if (type.includes('aadhaar') || type.includes('voter')) return <Contact size={20} color={colors.textMuted} />;
    if (type.includes('bank') || type.includes('statement')) return <Landmark size={20} color={colors.textMuted} />;
    if (type.includes('address') || type.includes('ownership')) return <Home size={20} color={colors.textMuted} />;
    return <FileText size={20} color={colors.textMuted} />;
  };
  const [isDigilockerProcessing, setIsDigilockerProcessing] = useState(false);

  const [getDigilockerAuthUrl] = useGetDigilockerAuthUrlMutation();
  const [processDigilocker] = useProcessDigilockerMutation();
  const [previewDigilocker] = usePreviewDigilockerMutation();

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (step === 3) {
          showAlert(
            'Exit Application?',
            'Your application is not yet submitted. All progress will be lost. Are you sure you want to exit?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Exit', onPress: () => navigation.navigate('Main') },
            ]
          );
          return true;
        }
        if (step === 2) {
          setStep(1);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [step, navigation])
  );

  const [submitApp, { isLoading: isSubmitting }] = useSubmitApplicationMutation();
  const [checkEligibility, { isLoading: isChecking }] = useCheckEligibilityMutation();

  const productOptions = [
    { label: 'New Car', value: 'new_car' },
    { label: 'Used Car', value: 'used_car' },
    { label: 'Commercial', value: 'commercial_vehicle' },
  ];

  const tenureOptions = ['12', '24', '36', '48', '60', '72', '84'];

  const [fetchCibil, { isLoading: isFetchingCibil }] = useFetchCibilMutation();

  const calculateEmi = () => {
    const p = parseFloat(formData.loan_amount) || 0;
    const n = parseInt(formData.tenure_months, 10) || 48;
    if (p <= 0 || n <= 0) return 0;
    const r = 0.12 / 12;
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return Math.round(emi);
  };

  const validatePan = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan?.toUpperCase());
  const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);

  const handleFetchCibil = async () => {
    if (!formData.pan_number || !formData.phone) {
      showAlert('Required', 'Please enter PAN Number and Phone Number to fetch CIBIL score.');
      return;
    }
    if (!validatePhone(formData.phone)) {
      showAlert('Invalid Format', 'Phone number must be exactly 10 digits.');
      return;
    }
    if (!validatePan(formData.pan_number)) {
      showAlert('Invalid Format', 'PAN number must be in the correct format (e.g. ABCDE1234F).');
      return;
    }
    try {
      const res = await fetchCibil({
        pan_number: formData.pan_number,
        phone: formData.phone,
        customer_name: formData.customer_name || formData.full_name
      }).unwrap();
      setFormData({ ...formData, cibil_score: res.data.score });
      showAlert('CIBIL Fetched', `Score retrieved: ${res.data.score}`);
    } catch (e) {
      showAlert('Error', e?.data?.error?.message || e?.message || 'Could not fetch CIBIL');
    }
  };

  const handlePreCheck = async () => {
    if (!formData.customer_name || !formData.phone || !formData.age || !formData.loan_amount || !formData.cibil_score) {
      showAlert('Required', 'Please enter all details and Fetch CIBIL Score before checking eligibility.');
      return;
    }
    if (!validatePhone(formData.phone)) {
      showAlert('Invalid Format', 'Phone number must be exactly 10 digits.');
      return;
    }
    if (formData.pan_number && !validatePan(formData.pan_number)) {
      showAlert('Invalid Format', 'PAN number must be in the correct format (e.g. ABCDE1234F).');
      return;
    }
    if (formData.co_applicant_relation === 'sister' && !formData.co_applicant_marital_status) {
      showAlert('Required', 'Please select Co-Applicant Marital Status for Sister.');
      return;
    }
    try {
      const res = await checkEligibility({
        age: parseInt(formData.age, 10),
        customerType: formData.customer_type,
        cibilScore: formData.cibil_score === 'NTC/-1' ? -1 : parseInt(formData.cibil_score),
        addressType: formData.address_type === 'rented' ? 'rental' : formData.address_type,
        productType: formData.product_type,
        requestedAmount: parseInt(formData.loan_amount || 500000, 10),
        coApplicantRelation: formData.co_applicant_relation || null,
        coApplicantMaritalStatus: formData.co_applicant_marital_status || null,
      }).unwrap();

      const results = res?.data || [];
      setEligibilityResults(results);

      const eligibleLenders = results.filter(l => l.result === 'eligible' || l.result === 'incomplete');

      // Extract unique required documents from eligible/incomplete lenders
      const docs = [];
      const seen = new Set();
      (eligibleLenders.length > 0 ? eligibleLenders : results).forEach(lender => {
        if (lender.required_documents) {
          lender.required_documents.forEach(doc => {
            const key = `${doc.party}_${doc.doc_type}`;
            if (!seen.has(key)) {
              seen.add(key);
              docs.push(doc);
            }
          });
        }
      });
      setRequiredDocs(docs);
      setStep(2);
    } catch (e) {
      showAlert('Pre-Check Error', e?.data?.error?.message || e?.message || 'Could not run eligibility pre-check. Please verify internet and try again.');
    }
  };


  const handleProceedToUpload = () => {
    if (!formData.loan_amount) {
      showAlert('Required', 'Please enter Requested Loan Amount');
      return;
    }
    if (!validatePhone(formData.phone)) {
      showAlert('Invalid Format', 'Phone number must be exactly 10 digits.');
      return;
    }
    if (formData.pan_number && !validatePan(formData.pan_number)) {
      showAlert('Invalid Format', 'PAN number must be in the correct format (e.g. ABCDE1234F).');
      return;
    }
    setStep(3);
  };


  const uploadFile = (pickedFile, doc) => {
    if (!pickedFile) return;

    let fileUri = pickedFile.uri || '';
    if (Platform.OS === 'android' && fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = `file://${fileUri}`;
    } else if (Platform.OS === 'ios' && fileUri.startsWith('file://')) {
      fileUri = fileUri.replace('file://', '');
    }

    const fileName = pickedFile.name || (fileUri ? fileUri.split('/').pop() : null) || `${doc.doc_type || 'document'}.jpg`;
    const fileType = pickedFile.type || (fileName.endsWith('.pdf') ? 'application/pdf' : fileName.endsWith('.png') ? 'image/png' : 'image/jpeg');

    const key = `${doc.party}_${doc.doc_type}`;
    const fileId = Date.now().toString();

    setUploadedDocs(prev => {
      const currentList = prev[key] || [];
      return { 
        ...prev, 
        [key]: [...currentList, { id: fileId, status: 'pending', name: fileName, fileUri, fileType, doc_party: doc.party, doc_type: doc.doc_type }] 
      };
    });
    
    setShowDocPicker(false);
  };

  const handleFinalSubmit = async () => {
    try {
      setIsUploadingModal(true);

      const newApp = await submitApp({
        customer_name: formData.customer_name,
        phone: formData.phone,
        pan_number: formData.pan_number,
        co_applicant_name: formData.co_applicant_name,
        co_applicant_income: formData.co_applicant_income,
        product_type: formData.product_type,
        cibil_score: formData.cibil_score,
        age: formData.age ? parseInt(formData.age, 10) : null,
        vehicle_details: {
          make_model: formData.make_model,
          year: formData.year,
          vehicle_price: parseFloat(formData.vehicle_price) || 0,
          tenure_months: parseInt(formData.tenure_months, 10),
          estimated_emi: calculateEmi(),
        },
        loan_amount: parseFloat(formData.loan_amount),
      }).unwrap();

      const appId = newApp.data.id;
      setCreatedApplicationId(appId);
      const appNo = newApp.data.application_no || appId;
      setCreatedApplicationNo(appNo);

      // Process Digilocker if authenticated
      if (digilockerReady) {
        try {
          await processDigilocker({
            client_token: digilockerSession.client_token,
            state: digilockerSession.state,
            application_no: appNo,
          }).unwrap();
        } catch (e) {
          console.log('Digilocker process error after submission:', e);
          showAlert('DigiLocker Error', 'Could not process DigiLocker documents. You may need to upload them manually.');
        }
      }

      let token = reduxToken;
      if (!token) {
        const credentials = await Keychain.getGenericPassword();
        token = credentials ? credentials.password : '';
      }
      let baseUrl = Config.API_URL || 'http://localhost:4000';
      if (Platform.OS === 'android' && baseUrl.includes('localhost')) {
        baseUrl = baseUrl.replace('localhost', '10.0.2.2');
      }
      const url = `${baseUrl}/dealer/applications/upload-document`;

      const allPending = [];
      Object.keys(uploadedDocs).forEach(k => {
        uploadedDocs[k].forEach(item => {
          if (item.status === 'pending') {
            allPending.push({ ...item, key: k });
          }
        });
      });

      let allUploadsSuccessful = true;
      let failedCount = 0;

      for (const doc of allPending) {
        let retries = 3;
        let success = false;
        while (retries > 0 && !success) {
          try {
            const body = new FormData();
            body.append('loan_application_id', appId);
            body.append('doc_type', doc.doc_type);
            body.append('party', doc.doc_party);
            body.append('file', {
              uri: doc.fileUri,
              name: doc.name,
              type: doc.fileType,
            });

            const response = await fetch(url, {
              method: 'POST',
              body,
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
              },
            });
            if (response.ok) {
              const json = await response.json();
              setUploadedDocs(prev => {
                const currentList = prev[doc.key] || [];
                return {
                  ...prev,
                  [doc.key]: currentList.map(item => item.id === doc.id ? { ...item, status: 'success', url: json.data?.url || json.url } : item)
                };
              });
              success = true;
            }
          } catch (err) {}
          
          if (!success) {
            retries--;
            if (retries > 0) await new Promise(r => setTimeout(r, 1000));
          }
        }
        if (!success) {
          allUploadsSuccessful = false;
          failedCount++;
        }
      }

      setIsUploadingModal(false);
      
      if (allUploadsSuccessful) {
        showAlert('Success', 'Application submitted and documents uploaded successfully!');
        handleClearDraft(true);
        navigation.navigate('Main');
      } else {
        showAlert('Upload Incomplete', `Application submitted, but ${failedCount} document(s) failed to upload. Please review and tap Submit again to retry failed uploads.`);
        handleClearDraft(true);
        navigation.navigate('Main');
      }
    } catch (err) {
      setIsUploadingModal(false);
      showAlert('Submission Error', err?.data?.error?.message || err?.message || 'Failed to create application');
    }
  };

  const handleOpenDocPicker = (doc) => {
    setActiveDocRequirement(doc);
    setShowDocPicker(true);
  };

  const handleCameraPickModal = async () => {
    if (!activeDocRequirement) return;
    try {
      const result = await launchCamera({ mediaType: 'photo', cameraType: 'back', quality: 0.8 });
      if (result.assets?.length) {
        const asset = result.assets[0];
        uploadFile({ uri: asset.uri, type: asset.type, name: asset.fileName || 'photo.jpg' }, activeDocRequirement);
      }
    } catch (err) { console.log(err); }
  };

  const handleGalleryPickModal = async () => {
    if (!activeDocRequirement) return;
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (result.assets?.length) {
        const asset = result.assets[0];
        uploadFile({ uri: asset.uri, type: asset.type, name: asset.fileName || 'photo.jpg' }, activeDocRequirement);
      }
    } catch (err) { console.log(err); }
  };

  const handleDocumentPickModal = async () => {
    if (!activeDocRequirement) return;
    try {
      const results = await pick({ type: [types.pdf, types.images], copyTo: 'cachesDirectory' });
      if (results && results[0]) {
        const file = results[0];
        uploadFile({ uri: file.fileCopyUri || file.uri, type: file.type, name: file.name }, activeDocRequirement);
      }
    } catch (err) { console.log(err); }
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
    try {
      setIsDigilockerProcessing(true);
      const res = await previewDigilocker({
        client_token: digilockerSession.client_token,
        state: digilockerSession.state
      }).unwrap();
      
      setDigilockerData(res.data || res);
      setDigilockerReady(true);
      showAlert('Success', 'DigiLocker authenticated! Data preview is available below.');
    } catch (e) {
      console.log(e);
      showAlert('Error', 'Failed to fetch DigiLocker preview data.');
    } finally {
      setIsDigilockerProcessing(false);
    }
  };

  return (
    <ScreenWrapper edges={['bottom']}>
      {/* FIXED PINNED STEPPER HEADER AT TOP */}
      <View style={{ backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', zIndex: 20 }}>
        <XStack space="$2" ai="center" jc="space-between">
          {[ {label: 'Pre-Check', icon: UserCheck}, {label: 'Details', icon: Activity}, {label: 'Documents', icon: FileText} ].map((s, idx) => {
            const i = idx + 1;
            const isActive = step >= i;
            const isCurrent = step === i;
            return (
              <XStack key={i} f={1} ai="center">
                <YStack ai="center" space="$1" f={1}>
                  <YStack
                    width={32}
                    height={32}
                    borderRadius={16}
                    backgroundColor={isActive ? colors.brandBlue : '$borderColor'}
                    ai="center"
                    jc="center"
                  >
                    <s.icon size={16} color="white" />
                  </YStack>
                  <SizableText fontSize={10} color={isActive ? colors.brandBlue : '$colorHover'} fontWeight={isCurrent ? 'bold' : 'normal'}>
                    {s.label}
                  </SizableText>
                </YStack>
                {i < 3 && (
                  <View style={{ flex: 1, height: 2, backgroundColor: step > i ? colors.brandBlue : '#e5e7eb', marginLeft: -10, marginRight: -10, marginTop: -14 }} />
                )}
              </XStack>
            );
          })}
        </XStack>

        {/* Draft Notification Badge */}
        {hasRestoredDraft && (
          <XStack ai="center" jc="space-between" backgroundColor="#EFF6FF" px="$3" py="$1.5" borderRadius={8} mt="$2" borderWidth={1} borderColor="#BFDBFE">
            <SizableText fontSize={11} color="#1E40AF" fontWeight="600">
              ✓ Restored saved draft data
            </SizableText>
            <TouchableOpacity onPress={handleClearDraft}>
              <SizableText fontSize={11} color="#DC2626" fontWeight="bold">
                Clear & Reset
              </SizableText>
            </TouchableOpacity>
          </XStack>
        )}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        {/* Step 1: Pre-Check (Lead Info) */}
        {step === 1 && (
          <YStack space="$4">
            <Card elevate size="$3" bordered p="$4" backgroundColor="$background">
              <XStack ai="center" jc="center" space="$2" mb="$4" pb="$2" borderBottomWidth={1} borderColor="$borderColor">
                <UserCheck color="#2563EB" size={20} />
                <H4 color="$color" fontSize={16} fontWeight="bold">Personal Details</H4>
              </XStack>

              <YStack space="$4">
                <YStack space="$2">
                  <SizableText fontWeight="bold">Customer Full Name *</SizableText>
                  <Input value={formData.customer_name} onChangeText={(t) => setFormData({ ...formData, customer_name: t })} placeholder="E.g. Rajesh Sharma" />
                </YStack>
                <YStack space="$2">
                  <SizableText fontWeight="bold">Phone Number *</SizableText>
                  <Input keyboardType="phone-pad" value={formData.phone} onChangeText={(t) => setFormData({ ...formData, phone: t })} placeholder="10-digit mobile number" />
                </YStack>
                <YStack space="$2">
                  <SizableText fontWeight="bold">PAN Number *</SizableText>
                  <Input value={formData.pan_number} onChangeText={(t) => setFormData({ ...formData, pan_number: t.toUpperCase() })} placeholder="E.g. ABCDE1234F" autoCapitalize="characters" />
                </YStack>
                <YStack space="$2">
                  <SizableText fontWeight="bold">CIBIL Score *</SizableText>
                  {formData.cibil_score ? (
                    <Card bordered p="$3" backgroundColor="$blue4">
                      <SizableText fontWeight="bold" color="$blue10">Score: {formData.cibil_score}</SizableText>
                      <Button size="$2" backgroundColor="$blue10" color="white" mt="$2" onPress={handleFetchCibil} disabled={isFetchingCibil} icon={isFetchingCibil ? () => <Spinner color="white" /> : undefined}>Refetch CIBIL</Button>
                    </Card>
                  ) : (
                    <Button size="$3" backgroundColor="$blue10" color="white" onPress={handleFetchCibil} disabled={isFetchingCibil} icon={isFetchingCibil ? () => <Spinner color="white" /> : undefined}>
                      {isFetchingCibil ? 'Fetching Score...' : 'Fetch CIBIL Score'}
                    </Button>
                  )}
                </YStack>
                <YStack space="$2">
                  <SizableText fontWeight="bold">Age *</SizableText>
                  <Input keyboardType="numeric" value={formData.age} onChangeText={(t) => setFormData({ ...formData, age: t })} placeholder="E.g. 35" />
                </YStack>
                <YStack space="$2">
                  <SizableText fontWeight="bold">Employment Type *</SizableText>
                  <XStack space="$2">
                    <Button f={1} size="$3" backgroundColor={formData.customer_type === 'salaried' ? '$blue10' : '$background'} color={formData.customer_type === 'salaried' ? 'white' : '$color'} borderColor={formData.customer_type === 'salaried' ? '$blue10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, customer_type: 'salaried' })}>Salaried</Button>
                    <Button f={1} size="$3" backgroundColor={formData.customer_type === 'self_employed' ? '$blue10' : '$background'} color={formData.customer_type === 'self_employed' ? 'white' : '$color'} borderColor={formData.customer_type === 'self_employed' ? '$blue10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, customer_type: 'self_employed' })}>Self-Employed</Button>
                    <Button f={1} size="$3" backgroundColor={formData.customer_type === 'agriculture' ? '$blue10' : '$background'} color={formData.customer_type === 'agriculture' ? 'white' : '$color'} borderColor={formData.customer_type === 'agriculture' ? '$blue10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, customer_type: 'agriculture' })}>Agriculture</Button>
                  </XStack>
                </YStack>
                <YStack space="$2">
                  <SizableText fontWeight="bold">Residence Type *</SizableText>
                  <XStack space="$2">
                    <Button f={1} size="$3" backgroundColor={formData.address_type === 'owned' ? '$blue10' : '$background'} color={formData.address_type === 'owned' ? 'white' : '$color'} borderColor={formData.address_type === 'owned' ? '$blue10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, address_type: 'owned' })}>Owned</Button>
                    <Button f={1} size="$3" backgroundColor={formData.address_type === 'rented' ? '$blue10' : '$background'} color={formData.address_type === 'rented' ? 'white' : '$color'} borderColor={formData.address_type === 'rented' ? '$blue10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, address_type: 'rented' })}>Rented</Button>
                  </XStack>
                </YStack>
                <YStack space="$2">
                  <SizableText fontWeight="bold">Ownership Proof Provided By *</SizableText>
                  <XStack space="$2">
                    <Button f={1} size="$3" backgroundColor={formData.ownership_provided_by === 'applicant' ? '$blue10' : '$background'} color={formData.ownership_provided_by === 'applicant' ? 'white' : '$color'} borderColor={formData.ownership_provided_by === 'applicant' ? '$blue10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, ownership_provided_by: 'applicant' })}>Applicant</Button>
                    <Button f={1} size="$3" backgroundColor={formData.ownership_provided_by === 'co_applicant' ? '$blue10' : '$background'} color={formData.ownership_provided_by === 'co_applicant' ? 'white' : '$color'} borderColor={formData.ownership_provided_by === 'co_applicant' ? '$blue10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, ownership_provided_by: 'co_applicant' })}>Co-Applicant</Button>
                    <Button f={1} size="$3" backgroundColor={formData.ownership_provided_by === 'guarantor' ? '$blue10' : '$background'} color={formData.ownership_provided_by === 'guarantor' ? 'white' : '$color'} borderColor={formData.ownership_provided_by === 'guarantor' ? '$blue10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, ownership_provided_by: 'guarantor' })}>Guarantor</Button>
                  </XStack>
                </YStack>
              </YStack>
            </Card>

            <Card elevate size="$3" bordered p="$4" backgroundColor="$background">
              <XStack ai="center" jc="center" space="$2" mb="$4" pb="$2" borderBottomWidth={1} borderColor="$borderColor">
                <Car color="#2563EB" size={20} />
                <H4 color="$color" fontSize={16} fontWeight="bold">Vehicle Details</H4>
              </XStack>
              <YStack space="$4">
                <YStack space="$2">
                  <SizableText fontWeight="bold">Product Category *</SizableText>
                  <XStack space="$2">
                    {productOptions.map((opt) => (
                      <Button key={opt.value} f={1} size="$3" backgroundColor={formData.product_type === opt.value ? '$orange10' : '$background'} color={formData.product_type === opt.value ? 'white' : '$color'} borderColor={formData.product_type === opt.value ? '$orange10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, product_type: opt.value })}>
                        {opt.label}
                      </Button>
                    ))}
                  </XStack>
                </YStack>
                <YStack space="$2">
                  <SizableText fontWeight="bold">Vehicle Make & Model</SizableText>
                  <Input value={formData.make_model} onChangeText={(t) => setFormData({ ...formData, make_model: t })} />
                </YStack>
                <YStack space="$2">
                  <XStack jc="space-between" ai="center">
                    <SizableText fontWeight="bold">Requested Loan Amount (₹) *</SizableText>
                    {formData.loan_amount ? (
                      <SizableText fontSize={12} fontWeight="bold" color="#EA580C">
                        ₹{((parseFloat(formData.loan_amount) || 0) / 100000).toFixed(2)} Lakhs
                      </SizableText>
                    ) : null}
                  </XStack>

                  {/* Quick Amount Selectors */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <XStack space="$2" py="$1">
                      {[
                        { label: '₹2L', value: '200000' },
                        { label: '₹3.5L', value: '350000' },
                        { label: '₹5L', value: '500000' },
                        { label: '₹7.5L', value: '750000' },
                        { label: '₹10L', value: '1000000' },
                        { label: '₹15L', value: '1500000' },
                      ].map(preset => {
                        const isSelected = formData.loan_amount === preset.value;
                        return (
                          <TouchableOpacity
                            key={preset.value}
                            onPress={() => setFormData({ ...formData, loan_amount: preset.value })}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 16,
                              backgroundColor: isSelected ? '#EA580C' : '#F1F5F9',
                              borderWidth: 1,
                              borderColor: isSelected ? '#EA580C' : '#CBD5E1',
                            }}
                          >
                            <SizableText color={isSelected ? 'white' : '#475569'} fontSize={12} fontWeight="bold">
                              {preset.label}
                            </SizableText>
                          </TouchableOpacity>
                        );
                      })}
                    </XStack>
                  </ScrollView>

                  {/* Stepper Input Row */}
                  <XStack space="$2" ai="center">
                    <TouchableOpacity
                      onPress={() => {
                        const curr = parseFloat(formData.loan_amount) || 0;
                        const next = Math.max(50000, curr - 50000);
                        setFormData({ ...formData, loan_amount: String(next) });
                      }}
                      style={{ backgroundColor: '#F1F5F9', width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1' }}
                    >
                      <SizableText fontSize={20} fontWeight="bold" color="#475569">-</SizableText>
                    </TouchableOpacity>

                    <Input
                      flex={1}
                      keyboardType="numeric"
                      value={formData.loan_amount}
                      onChangeText={(t) => setFormData({ ...formData, loan_amount: t })}
                      placeholder="Enter amount in ₹"
                      textAlign="center"
                      fontSize={16}
                      fontWeight="bold"
                    />

                    <TouchableOpacity
                      onPress={() => {
                        const curr = parseFloat(formData.loan_amount) || 0;
                        const next = curr + 50000;
                        setFormData({ ...formData, loan_amount: String(next) });
                      }}
                      style={{ backgroundColor: '#F1F5F9', width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1' }}
                    >
                      <SizableText fontSize={20} fontWeight="bold" color="#475569">+</SizableText>
                    </TouchableOpacity>
                  </XStack>
                </YStack>
              </YStack>
            </Card>

            <Card elevate size="$3" bordered p="$4" backgroundColor="$background">
              <XStack ai="center" jc="center" space="$2" mb="$4" pb="$2" borderBottomWidth={1} borderColor="$borderColor">
                <Users color="#2563EB" size={20} />
                <H4 color="$color" fontSize={16} fontWeight="bold">Co-Applicant Details</H4>
              </XStack>
              <YStack space="$4">
                <YStack space="$2">
                  <SizableText fontWeight="bold">Co-Applicant Relation</SizableText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <XStack space="$2">
                      <Button size="$3" backgroundColor={formData.co_applicant_relation === '' ? '$green10' : '$background'} color={formData.co_applicant_relation === '' ? 'white' : '$color'} borderColor={formData.co_applicant_relation === '' ? '$green10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, co_applicant_relation: '' })}>None</Button>
                      {['father', 'mother', 'brother', 'sister', 'son', 'daughter', 'friend'].map(opt => (
                        <Button key={opt} size="$3" backgroundColor={formData.co_applicant_relation === opt ? '$green10' : '$background'} color={formData.co_applicant_relation === opt ? 'white' : '$color'} borderColor={formData.co_applicant_relation === opt ? '$green10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, co_applicant_relation: opt })} tt="capitalize">{opt}</Button>
                      ))}
                    </XStack>
                  </ScrollView>
                </YStack>

                {formData.co_applicant_relation === 'sister' && (
                  <YStack space="$2">
                    <SizableText fontWeight="bold">Co-Applicant Marital Status *</SizableText>
                    <XStack space="$2">
                      <Button f={1} size="$3" backgroundColor={formData.co_applicant_marital_status === 'unmarried' ? '$green10' : '$background'} color={formData.co_applicant_marital_status === 'unmarried' ? 'white' : '$color'} borderColor={formData.co_applicant_marital_status === 'unmarried' ? '$green10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, co_applicant_marital_status: 'unmarried' })}>Unmarried</Button>
                      <Button f={1} size="$3" backgroundColor={formData.co_applicant_marital_status === 'married' ? '$green10' : '$background'} color={formData.co_applicant_marital_status === 'married' ? 'white' : '$color'} borderColor={formData.co_applicant_marital_status === 'married' ? '$green10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, co_applicant_marital_status: 'married' })}>Married</Button>
                    </XStack>
                  </YStack>
                )}

                {formData.co_applicant_relation !== '' && (
                  <YStack space="$2">
                    <SizableText fontWeight="bold">Co-Applicant Residence Type</SizableText>
                    <XStack space="$2">
                      <Button f={1} size="$3" backgroundColor={formData.co_applicant_address_type === 'owned' ? '$green10' : '$background'} color={formData.co_applicant_address_type === 'owned' ? 'white' : '$color'} borderColor={formData.co_applicant_address_type === 'owned' ? '$green10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, co_applicant_address_type: 'owned' })}>Owned</Button>
                      <Button f={1} size="$3" backgroundColor={formData.co_applicant_address_type === 'rented' ? '$green10' : '$background'} color={formData.co_applicant_address_type === 'rented' ? 'white' : '$color'} borderColor={formData.co_applicant_address_type === 'rented' ? '$green10' : '$borderColor'} borderWidth={1} onPress={() => setFormData({ ...formData, co_applicant_address_type: 'rented' })}>Rented</Button>
                    </XStack>
                  </YStack>
                )}
              </YStack>
            </Card>

            {formData.address_type === 'rented' && (formData.co_applicant_relation === '' || formData.co_applicant_address_type === 'rented') && (
              <Card elevate size="$3" bordered p="$4" backgroundColor="$background">
                <XStack ai="center" jc="center" space="$2" mb="$4" pb="$2" borderBottomWidth={1} borderColor="$borderColor">
                  <Shield color="#2563EB" size={20} />
                  <H4 color="$color" fontSize={16} fontWeight="bold">Guarantor Details</H4>
                </XStack>
                <YStack space="$4">
                  <YStack space="$2">
                    <SizableText fontWeight="bold">Guarantor Name *</SizableText>
                    <Input value={formData.guarantor_name} onChangeText={(t) => setFormData({ ...formData, guarantor_name: t })} placeholder="Guarantor Full Name" />
                  </YStack>
                  <YStack space="$2">
                    <SizableText fontWeight="bold">Guarantor Phone *</SizableText>
                    <Input keyboardType="phone-pad" value={formData.guarantor_phone} onChangeText={(t) => setFormData({ ...formData, guarantor_phone: t })} placeholder="10-digit mobile number" />
                  </YStack>
                  <YStack space="$2">
                    <SizableText fontWeight="bold">Guarantor Relation *</SizableText>
                    <Input value={formData.guarantor_relation} onChangeText={(t) => setFormData({ ...formData, guarantor_relation: t })} placeholder="E.g. Friend, Relative" />
                  </YStack>
                </YStack>
              </Card>
            )}

            <Button backgroundColor="$blue10" color="white" size="$5" mt="$4" mb="$4" onPress={handlePreCheck} disabled={isChecking} icon={isChecking ? () => <Spinner color="white" /> : undefined}>
              <SizableText color="white" fontWeight="bold" fontSize={16}>{isChecking ? 'Checking Eligibility...' : 'Run Eligibility Pre-Check'}</SizableText>
            </Button>
          </YStack>
        )}

        {/* Step 2: Eligibility Assessment Breakdown */}
        {step === 2 && (
          <YStack space="$4">
            <XStack ai="center" space="$2">
              <Activity color={colors.brandBlue} size={24} />
              <H4 color={colors.brandBlue} fontWeight="bold">Step 2: Eligibility Assessment</H4>
            </XStack>

            {/* Display the verdicts and reasons */}
            {eligibilityResults && (
              <YStack space="$3">
                {eligibilityResults.map((r, idx) => {
                  const isEligible = r.result === 'eligible';
                  const isIncomplete = r.result === 'incomplete';
                  const isNotEligible = r.result === 'not_eligible';

                  const badgeColor = isEligible ? colors.success : (isIncomplete ? colors.warning : colors.error);
                  const bgColor = isEligible ? colors.successMuted : (isIncomplete ? colors.warningMuted : colors.errorMuted);

                  return (
                    <Card key={idx} p="$4" bordered borderColor={badgeColor} backgroundColor={bgColor} borderRadius="$4">
                      <XStack jc="space-between" ai="center" mb="$2">
                        <SizableText fontWeight="bold" fontSize={16} color={badgeColor}>
                          {r.lender_name}
                        </SizableText>
                        <YStack backgroundColor={badgeColor} px="$2.5" py="$1" borderRadius="$2">
                          <SizableText fontSize={11} fontWeight="bold" color="#FFF" textTransform="uppercase">
                            {isEligible ? 'Eligible' : (isIncomplete ? 'Incomplete Docs' : 'Not Eligible')}
                          </SizableText>
                        </YStack>
                      </XStack>

                      {r.failed_rules && r.failed_rules.length > 0 && (
                        <YStack mt="$2" space="$1">
                          <SizableText fontSize={12} fontWeight="bold" color={badgeColor}>
                            Unmet Lender Criteria:
                          </SizableText>
                          {r.failed_rules.map((rule, i) => (
                            <XStack key={i} space="$2" ai="flex-start">
                              <SizableText color={badgeColor} fontSize={13}>•</SizableText>
                              <Paragraph size="$2" color={badgeColor} f={1} lineHeight={18}>
                                {rule}
                              </Paragraph>
                            </XStack>
                          ))}
                        </YStack>
                      )}

                      {isEligible && (
                        <Paragraph size="$2" color={colors.success} mt="$1">
                          ✓ All eligibility requirements met for instant processing.
                        </Paragraph>
                      )}
                    </Card>
                  );
                })}
              </YStack>
            )}

            {/* Recommendation Box if ALL lenders failed */}
            {eligibilityResults && eligibilityResults.every(r => r.result === 'not_eligible') && (
              <YStack backgroundColor={colors.errorMuted} borderColor={colors.error} borderWidth={1} borderRadius="$4" p="$4" space="$2">
                <SizableText fontWeight="bold" fontSize={13} color={colors.error}>
                  ⛔ Application Creation Blocked
                </SizableText>
                <Paragraph fontSize={12} color={colors.error} lineHeight={18}>
                  This lead does not meet the minimum criteria for any partner lender. Please tap <SizableText fontWeight="bold">"Modify Lead Details"</SizableText> below to update the co-applicant, income, or CIBIL score.
                </Paragraph>
              </YStack>
            )}

            {eligibilityResults && eligibilityResults.every(r => r.result === 'not_eligible') ? (
              <YStack mt="$2">
                <PrimaryButton width="100%" onPress={() => setStep(1)}>
                  Modify Lead Details
                </PrimaryButton>
              </YStack>
            ) : (
              <XStack space="$3" mt="$2">
                <AltButton f={1} onPress={() => setStep(1)}>
                  Modify Lead Details
                </AltButton>
                <PrimaryButton
                  f={1}
                  onPress={handleProceedToUpload}
                  disabled={isSubmitting}
                  icon={isSubmitting ? () => <Spinner color="#FFF" /> : undefined}
                >
                  Proceed to Upload Documents
                </PrimaryButton>
              </XStack>
            )}
          </YStack>
        )}

        {/* Step 3: Dynamic Document Uploads */}
        {step === 3 && (
          <YStack space="$4">
            <XStack ai="center" space="$2">
              <FileText color={colors.brandBlue} size={24} />
              <H4 color={colors.brandBlue} fontWeight="bold">Step 3: Required Documents</H4>
            </XStack>
            <Paragraph color={colors.textMuted} fontSize={13}>
              Please upload the required documents determined by the eligibility engine. The application will be created when you press Submit.
            </Paragraph>

            <TouchableOpacity
              onPress={handleStartDigilocker}
              disabled={isDigilockerProcessing || digilockerReady}
              style={{ opacity: isDigilockerProcessing ? 0.7 : 1, marginTop: 8, marginBottom: 8 }}
            >
              <Card bordered p="$3.5" backgroundColor={digilockerReady ? '#ECFDF5' : '$backgroundHover'} borderColor={digilockerReady ? '#10b981' : colors.brandBlue} elevate size="$2">
                <XStack ai="center" space="$3">
                  <View style={{ backgroundColor: digilockerReady ? '#10b981' : colors.brandBlue, width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                    {isDigilockerProcessing ? <Spinner size="small" color="#FFF" /> : <ShieldCheck size={22} color="#FFF" />}
                  </View>
                  <YStack flex={1} space="$0.5">
                    <SizableText color={digilockerReady ? "#047857" : colors.brandBlue} fontSize={14} fontWeight="bold">
                      {digilockerReady ? 'DigiLocker Authenticated' : 'Fast-Track KYC via DigiLocker'}
                    </SizableText>
                    <SizableText color={digilockerReady ? "#059669" : "$colorHover"} fontSize={11}>
                      {digilockerReady ? 'Required documents will be fetched securely.' : 'Skip manual upload for PAN and Aadhaar.'}
                    </SizableText>
                  </YStack>
                </XStack>
              </Card>
            </TouchableOpacity>

            {digilockerReady && digilockerData && (
              <YStack backgroundColor="white" p="$3" borderRadius={8} borderWidth={1} borderColor="$borderColor" mb="$3">
                <SizableText fontSize={12} color="$textMuted" mb="$2" fontWeight="bold">PREVIEW DATA</SizableText>
                <XStack mb="$1"><SizableText fontSize={13} fontWeight="bold" width={70}>Name:</SizableText><SizableText fontSize={13} flex={1}>{digilockerData.name || digilockerData.aadhaar_name || '-'}</SizableText></XStack>
                <XStack mb="$1"><SizableText fontSize={13} fontWeight="bold" width={70}>DOB:</SizableText><SizableText fontSize={13}>{digilockerData.dob || '-'}</SizableText></XStack>
                <XStack mb="$1"><SizableText fontSize={13} fontWeight="bold" width={70}>PAN:</SizableText><SizableText fontSize={13}>{digilockerData.pan_number || digilockerData.pan || '-'}</SizableText></XStack>
                <YStack mb="$2"><SizableText fontSize={13} fontWeight="bold">Address:</SizableText><SizableText fontSize={13}>{digilockerData.aadhar_address || digilockerData.address || '-'}</SizableText></YStack>
                
                {/* Document Previews */}
                <XStack space="$2" flexWrap="wrap">
                  {digilockerData.aadhar_filename && (
                    <TouchableOpacity onPress={() => Linking.openURL(digilockerData.aadhar_filename)}>
                      <XStack backgroundColor="#E0F2FE" px="$2" py="$1" borderRadius="$2" ai="center">
                        <FileText size={12} color="#0284C7" />
                        <SizableText fontSize={11} color="#0284C7" ml="$1" fontWeight="bold">Aadhaar PDF</SizableText>
                      </XStack>
                    </TouchableOpacity>
                  )}
                  {digilockerData.pan_image_path && (
                    <TouchableOpacity onPress={() => Linking.openURL(digilockerData.pan_image_path)}>
                      <XStack backgroundColor="#E0F2FE" px="$2" py="$1" borderRadius="$2" ai="center">
                        <FileText size={12} color="#0284C7" />
                        <SizableText fontSize={11} color="#0284C7" ml="$1" fontWeight="bold">PAN PDF</SizableText>
                      </XStack>
                    </TouchableOpacity>
                  )}
                  {digilockerData.aadhar_img_filename && (
                    <TouchableOpacity onPress={() => Linking.openURL(digilockerData.aadhar_img_filename)}>
                      <XStack backgroundColor="#E0F2FE" px="$2" py="$1" borderRadius="$2" ai="center">
                        <User size={12} color="#0284C7" />
                        <SizableText fontSize={11} color="#0284C7" ml="$1" fontWeight="bold">Photo</SizableText>
                      </XStack>
                    </TouchableOpacity>
                  )}
                </XStack>
              </YStack>
            )}

            <XStack space="$3" mt="$2">
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await InAppBrowser.open('https://consumer.uppcl.org/wss/view-bill', {
                      showTitle: true,
                      enableUrlBarHiding: true,
                      enableDefaultShare: true,
                      forceCloseOnRedirection: false,
                    });
                  } catch (error) {
                    console.log(error);
                    Linking.openURL('https://consumer.uppcl.org/wss/view-bill');
                  }
                }}
                style={{ flex: 1 }}
              >
                <Card bordered p="$3" backgroundColor="#fffbeb" borderColor="#f59e0b" elevate size="$2" ai="center" jc="center">
                  <YStack space="$2" ai="center">
                    <Zap size={24} color="#d97706" />
                    <SizableText color="#d97706" fontSize={13} fontWeight="bold" ta="center">UPPCL Bill</SizableText>
                  </YStack>
                </Card>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  try {
                    await InAppBrowser.open('https://upbhulekh.gov.in/', {
                      showTitle: true,
                      enableUrlBarHiding: true,
                      enableDefaultShare: true,
                      forceCloseOnRedirection: false,
                    });
                  } catch (error) {
                    console.log(error);
                    Linking.openURL('https://upbhulekh.gov.in/');
                  }
                }}
                style={{ flex: 1 }}
              >
                <Card bordered p="$3" backgroundColor="#ecfdf5" borderColor="#10b981" elevate size="$2" ai="center" jc="center">
                  <YStack space="$2" ai="center">
                    <Map size={24} color="#059669" />
                    <SizableText color="#059669" fontSize={13} fontWeight="bold" ta="center">Bhulekh Khatoni</SizableText>
                  </YStack>
                </Card>
              </TouchableOpacity>
            </XStack>

            <YStack space="$4" mt="$2">
              {requiredDocs.length === 0 ? (
                <Paragraph color={colors.textMuted}>No additional documents required!</Paragraph>
              ) : (
                <>
                  <XStack space="$2" p="$1" backgroundColor="$backgroundHover" borderRadius="$4" mb="$2">
                    {['applicant', 'co_applicant', 'guarantor'].map(partyKey => {
                      if (!requiredDocs.some(d => d.party === partyKey)) return null;

                      const partyLabel = partyKey.replace('_', ' ').toUpperCase();
                      const isActive = activeTab === partyKey;
                      const Icon = partyKey === 'applicant' ? User : partyKey === 'co_applicant' ? Users : Shield;

                      return (
                        <TouchableOpacity
                          key={partyKey}
                          onPress={() => setActiveTab(partyKey)}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            backgroundColor: isActive ? '$background' : 'transparent',
                            borderRadius: 8,
                            shadowColor: isActive ? "#000" : "transparent",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: isActive ? 2 : 0,
                          }}
                        >
                          <XStack ai="center" jc="center" space="$2">
                            <Icon size={14} color={isActive ? colors.brandBlue : colors.textMuted} />
                            <SizableText
                              fontWeight={isActive ? "bold" : "normal"}
                              fontSize={12}
                              color={isActive ? colors.brandBlue : colors.textMuted}
                            >
                              {partyLabel}
                            </SizableText>
                          </XStack>
                        </TouchableOpacity>
                      );
                    })}
                  </XStack>

                  <YStack space="$3">
                    {requiredDocs.filter(d => d.party === activeTab).map((doc, idx) => {
                      const key = `${doc.party}_${doc.doc_type}`;
                      const fileList = uploadedDocs[key] || [];
                      const isUploaded = fileList.some(item => item.status === 'success' || item.status === 'pending');
                      const isUploading = fileList.some(item => item.status === 'uploading');
                      const isDigilockerFetched = digilockerReady && doc.party === 'applicant' && (doc.doc_type.toLowerCase().includes('pan') || doc.doc_type.toLowerCase().includes('aadhaar'));

                      const hasPending = fileList.some(item => item.status === 'pending');

                      return (
                        <Card key={idx} p="$3" bordered borderRadius="$4" backgroundColor="$backgroundHover" elevate size="$1">
                          <XStack jc="space-between" ai="center">
                            <XStack f={1} pr="$2" space="$3" ai="center">
                              <YStack p="$2" backgroundColor="$blue4" borderRadius="$3">
                                {getDocIcon(doc.doc_type)}
                              </YStack>
                              <YStack f={1}>
                                <SizableText fontWeight="bold" fontSize={14} tt="capitalize">
                                  {doc.doc_type.replace(/_/g, ' ')} *
                                </SizableText>

                                {isUploaded && !isDigilockerFetched && (
                                  <XStack ai="center" space="$1" mt="$1">
                                    <CheckCircle2 size={12} color={hasPending ? colors.brandOrange : colors.success} />
                                    <SizableText color={hasPending ? colors.brandOrange : colors.success} fontSize={12} fontWeight="bold">
                                      {hasPending ? 'Ready to Upload' : 'Uploaded'}
                                    </SizableText>
                                  </XStack>
                                )}
                                {isDigilockerFetched && (
                                  <XStack ai="center" space="$1" mt="$1">
                                    <ShieldCheck size={12} color="#10b981" />
                                    <SizableText color="#10b981" fontSize={12} fontWeight="bold">
                                      Will be fetched on Submit
                                    </SizableText>
                                  </XStack>
                                )}
                                  {isUploading && (
                                    <XStack ai="center" space="$2" mt="$1">
                                      <Spinner size="small" color={colors.brandBlue} />
                                      <SizableText fontSize={12} color={colors.brandBlue}>Uploading...</SizableText>
                                    </XStack>
                                  )}
                                </YStack>
                              </XStack>

                              {fileList.length > 0 && !isDigilockerFetched && (
                                <TouchableOpacity onPress={() => Linking.openURL(fileList[0].fileUri || fileList[0].url)}>
                                  <YStack mr="$3" ai="center" jc="center">
                                    {fileList[0].fileType?.includes('image') ? (
                                      <Image source={{ uri: fileList[0].fileUri || fileList[0].url }} style={{ width: 40, height: 40, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' }} />
                                    ) : (
                                      <YStack w={40} h={40} borderRadius={6} backgroundColor="$blue4" ai="center" jc="center" borderWidth={1} borderColor="#E2E8F0">
                                        <FileText size={18} color={colors.brandBlue} />
                                      </YStack>
                                    )}
                                  </YStack>
                                </TouchableOpacity>
                              )}

                              {!isDigilockerFetched && (
                              <Button
                                size="$3"
                                backgroundColor={isUploaded ? '$background' : '$blue10'}
                                color={isUploaded ? '$color' : 'white'}
                                borderColor={isUploaded ? '$borderColor' : 'transparent'}
                                borderWidth={isUploaded ? 1 : 0}
                                onPress={() => handleOpenDocPicker(doc)}
                                disabled={isUploading}
                              >
                                {isUploaded ? 'Replace' : 'Upload'}
                              </Button>
                            )}
                          </XStack>
                        </Card>
                      );
                    })}
                  </YStack>
                </>
              )}
            </YStack>

            {(() => {
              const isAnyDocUploading = isUploadingModal || Object.values(uploadedDocs).flat().some(d => d.status === 'uploading');
              return (
                <YStack space="$3" mt="$4">
                  <PrimaryButton
                    width="100%"
                    onPress={handleFinalSubmit}
                    disabled={isAnyDocUploading || isSubmitting}
                    icon={(isAnyDocUploading || isSubmitting) ? () => <Spinner color="#FFF" /> : undefined}
                  >
                    {(isAnyDocUploading || isSubmitting) ? 'Submitting & Uploading... Please Wait' : 'Submit Application & Upload Documents'}
                  </PrimaryButton>
                </YStack>
              );
            })()}
          </YStack>
        )}
      </ScrollView>

      {/* Document Source Picker Bottom Sheet Modal */}
      <Modal
        visible={showDocPicker}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!isUploadingModal) setShowDocPicker(false); }}
      >
        <YStack f={1} jc="flex-end" backgroundColor="rgba(0,0,0,0.5)">
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            p="$5"
            space="$3"
            pb={Math.max(insets.bottom, 24)}
          >
            <XStack jc="space-between" ai="center" mb="$2">
              <H4 color={colors.brandBlue} fontWeight="bold">
                Upload {activeDocRequirement?.doc_type?.replace(/_/g, ' ')?.toUpperCase()}
              </H4>
              {!isUploadingModal && (
                <TouchableOpacity onPress={() => setShowDocPicker(false)}>
                  <SizableText fontSize={18} color="$colorFocus">✕</SizableText>
                </TouchableOpacity>
              )}
            </XStack>

            {isUploadingModal ? (
              <YStack py="$4" ai="center" space="$3">
                <Spinner size="large" color={colors.brandBlue} />
                <SizableText fontSize={14} color={colors.brandBlue} fontWeight="bold">
                  Uploading {activeDocRequirement?.doc_type?.replace(/_/g, ' ')?.toUpperCase()}...
                </SizableText>
                <Paragraph fontSize={12} color={colors.textMuted} ta="center">
                  Please wait while your document is being uploaded securely to the server.
                </Paragraph>
              </YStack>
            ) : (
              <>
                <Paragraph color={colors.textMuted} fontSize={13} mb="$2">
                  Select a file source to upload the document for {activeDocRequirement?.party?.replace('_', ' ')}:
                </Paragraph>

                <PrimaryButton onPress={handleCameraPickModal} icon={() => <SizableText fontSize={18}>📸</SizableText>}>
                  Take Photo with Camera
                </PrimaryButton>

                <AltButton onPress={handleGalleryPickModal} icon={() => <SizableText fontSize={18}>🖼️</SizableText>}>
                  Choose Photo from Gallery
                </AltButton>

                <AltButton onPress={handleDocumentPickModal} icon={() => <SizableText fontSize={18}>📄</SizableText>}>
                  Upload PDF / Document File
                </AltButton>

                <TouchableOpacity onPress={() => setShowDocPicker(false)} style={{ marginTop: 8, alignItems: 'center' }}>
                  <SizableText color={colors.error} fontWeight="bold">Cancel</SizableText>
                </TouchableOpacity>
              </>
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

import re

with open('dealer/src/screens/NewApplicationScreen.js', 'r') as f:
    content = f.read()

# Replace handleSubmitApplication
handle_proceed = """
  const handleProceedToUpload = () => {
    if (!formData.loan_amount) {
      Alert.alert('Required', 'Please enter Requested Loan Amount');
      return;
    }
    if (!validatePhone(formData.phone)) {
      Alert.alert('Invalid Format', 'Phone number must be exactly 10 digits.');
      return;
    }
    if (formData.pan_number && !validatePan(formData.pan_number)) {
      Alert.alert('Invalid Format', 'PAN number must be in the correct format (e.g. ABCDE1234F).');
      return;
    }
    setStep(3);
  };
"""

content = re.sub(
    r'  const handleSubmitApplication = async \(\) => \{.*?^\s+};\n', 
    handle_proceed, 
    content, 
    flags=re.MULTILINE | re.DOTALL
)

# Replace uploadFile and add handleFinalSubmit
upload_file_new = """
  const uploadFile = (pickedFile, doc) => {
    if (!pickedFile) return;

    let fileUri = pickedFile.uri || '';
    if (Platform.OS === 'android' && fileUri && !fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
      fileUri = `file://${fileUri}`;
    } else if (Platform.OS === 'ios' && fileUri.startsWith('file://')) {
      fileUri = fileUri.replace('file://', '');
    }

    const fileName = pickedFile.name || (fileUri ? fileUri.split('/').pop() : null) || `${doc.doc_type || 'document'}.jpg`;
    const fileType = pickedFile.type || (fileName.endsWith('.pdf') ? 'application/pdf' : fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

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
      setCreatedApplicationNo(newApp.data.application_no || appId);

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

      for (const doc of allPending) {
        let retries = 3;
        while (retries > 0) {
          try {
            const body = new FormData();
            body.append('file', {
              uri: doc.fileUri,
              name: doc.name,
              type: doc.fileType,
            });
            body.append('loan_application_id', appId);
            body.append('doc_type', doc.doc_type);
            body.append('party', doc.doc_party);

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
              break;
            }
          } catch (err) {}
          retries--;
          if (retries > 0) await new Promise(r => setTimeout(r, 1000));
        }
      }

      setIsUploadingModal(false);
      Alert.alert('Success', 'Application submitted and documents uploaded successfully!');
      navigation.navigate('Main');
    } catch (err) {
      setIsUploadingModal(false);
      Alert.alert('Submission Error', err?.data?.error?.message || err?.message || 'Failed to create application');
    }
  };
"""

content = re.sub(
    r'  const uploadFile = async \(pickedFile, doc\) => \{.*?^\s+};\n', 
    upload_file_new, 
    content, 
    flags=re.MULTILINE | re.DOTALL
)

# Now replace the button in Step 2: onPress={handleSubmitApplication} to onPress={handleProceedToUpload}
# and change label to 'Proceed to Upload Documents'
content = content.replace('onPress={handleSubmitApplication}', 'onPress={handleProceedToUpload}')
content = content.replace("{isSubmitting ? 'Creating...' : 'Create Application'}", "'Proceed to Upload Documents'")

# Replace the "Finish & Return to Dashboard" logic to use handleFinalSubmit
bottom_btn_orig = """                <YStack space="$3" mt="$4">
                  <PrimaryButton
                    width="100%"
                    onPress={() => navigation.navigate('Main')}
                    disabled={isAnyDocUploading}
                    icon={isAnyDocUploading ? () => <Spinner color="#FFF" /> : undefined}
                  >
                    {isAnyDocUploading ? 'Uploading Documents... Please Wait' : 'Finish & Return to Dashboard'}
                  </PrimaryButton>
                </YStack>"""

bottom_btn_new = """                <YStack space="$3" mt="$4">
                  <PrimaryButton
                    width="100%"
                    onPress={handleFinalSubmit}
                    disabled={isAnyDocUploading || isSubmitting}
                    icon={(isAnyDocUploading || isSubmitting) ? () => <Spinner color="#FFF" /> : undefined}
                  >
                    {(isAnyDocUploading || isSubmitting) ? 'Submitting & Uploading... Please Wait' : 'Submit Application & Upload Documents'}
                  </PrimaryButton>
                </YStack>"""

content = content.replace(bottom_btn_orig, bottom_btn_new)

with open('dealer/src/screens/NewApplicationScreen.js', 'w') as f:
    f.write(content)

print("Done")

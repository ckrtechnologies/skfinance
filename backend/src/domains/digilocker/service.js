'use strict';
const { MEON_COMPANY_NAME, MEON_SECRET_TOKEN, MEON_BASE_URL, MEON_REDIRECT_URL } = require('../../config/secrets');
const { supabase } = require('../../config/database');
const { saveToCdn } = require('../../shared/utils/cdnStorage');

/**
 * getAuthUrl
 * Generates Digilocker URL from Meon API.
 */
async function getAuthUrl() {
  if (!MEON_COMPANY_NAME || !MEON_SECRET_TOKEN) {
    throw Object.assign(new Error('Meon credentials not configured.'), { statusCode: 500 });
  }

  // 1. Get access token from Meon
  const tokenRes = await fetch(`${MEON_BASE_URL}/get_access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: MEON_COMPANY_NAME,
      secret_token: MEON_SECRET_TOKEN,
    }),
  });
  
  if (!tokenRes.ok) {
    throw Object.assign(new Error('Meon token request failed (HTTP error)'), { statusCode: 500 });
  }
  const tokenData = await tokenRes.json();

  if (!tokenData || tokenData.status === false || !tokenData.client_token) {
    throw Object.assign(new Error(tokenData?.msg || tokenData?.message || 'Failed to generate Meon access token'), { statusCode: 400 });
  }

  // 2. Get Digilocker Link
  const linkRes = await fetch(`${MEON_BASE_URL}/digi_url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_token: tokenData.client_token,
      redirect_url: MEON_REDIRECT_URL,
      company_name: MEON_COMPANY_NAME,
      documents: 'aadhaar,pan,driving_license', // Add more if needed
    }),
  });

  if (!linkRes.ok) {
    throw Object.assign(new Error('Meon URL request failed (HTTP error)'), { statusCode: 500 });
  }
  const linkData = await linkRes.json();

  if (!linkData || linkData.status === 'error' || (!linkData.url && !linkData.digi_url)) {
    throw Object.assign(new Error(linkData?.msg || linkData?.message || 'Failed to generate DigiLocker URL'), { statusCode: 400 });
  }

  const consentUrl = linkData.url || linkData.digi_url;
  
  return {
    url: consentUrl,
    client_token: tokenData.client_token,
    state: tokenData.state,
  };
}

/**
 * Helper to download file from URL and return buffer
 */
async function downloadFileBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download file from ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * processDigilockerData
 * Fetches data from Meon, downloads documents, uploads to CDN, and saves to DB.
 */
async function processDigilockerData(client_token, state, applicationNo, uploadedByProfileId) {
  if (!client_token || !applicationNo) {
    throw Object.assign(new Error('client_token and applicationNo are required.'), { statusCode: 400 });
  }

  // 1. Fetch entire data from Meon
  const dataRes = await fetch(`${MEON_BASE_URL}/v2/send_entire_data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_token,
      state,
      status: true,
    }),
  });
  
  if (!dataRes.ok) {
    throw Object.assign(new Error('Meon retrieve data request failed (HTTP error)'), { statusCode: 500 });
  }
  const resultData = await dataRes.json();

  if (!resultData || resultData.status === 'error' || resultData.status === false) {
    throw Object.assign(new Error(resultData?.msg || resultData?.message || 'Failed to retrieve Aadhaar data from Meon.'), { statusCode: 400 });
  }

  const data = resultData.data || resultData;
  const fetchedDocs = [];

  // Get loan application id first
  const { data: loanApp, error: appError } = await supabase
    .from('loan_applications')
    .select('id, customer_id')
    .eq('application_no', applicationNo)
    .single();

  if (appError || !loanApp) {
    throw Object.assign(new Error('Loan application not found.'), { statusCode: 404 });
  }

  const loanAppId = loanApp.id;
  const customerId = loanApp.customer_id;

  // 2. Process documents
  // Aadhaar PDF
  if (data.aadhar_filename) {
    try {
      const buffer = await downloadFileBuffer(data.aadhar_filename);
      const cdnResult = saveToCdn({ buffer, originalname: 'aadhaar.pdf' }, applicationNo, 'applicant', 'digilocker_aadhaar');
      fetchedDocs.push({
        loan_application_id: loanAppId,
        party: 'applicant',
        doc_type: 'digilocker_aadhaar',
        cdn_path: cdnResult.cdn_path,
        original_filename: 'aadhaar.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: buffer.length,
        uploaded_by_profile_id: uploadedByProfileId,
        verified: true
      });
    } catch (e) {
      console.error('Failed to process Aadhaar PDF', e);
    }
  }

  // Aadhaar Image
  if (data.aadhar_img_filename) {
    try {
      const buffer = await downloadFileBuffer(data.aadhar_img_filename);
      const cdnResult = saveToCdn({ buffer, originalname: 'aadhaar_photo.jpg' }, applicationNo, 'applicant', 'digilocker_photo');
      fetchedDocs.push({
        loan_application_id: loanAppId,
        party: 'applicant',
        doc_type: 'digilocker_photo',
        cdn_path: cdnResult.cdn_path,
        original_filename: 'aadhaar_photo.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: buffer.length,
        uploaded_by_profile_id: uploadedByProfileId,
        verified: true
      });
    } catch (e) {
      console.error('Failed to process Aadhaar Photo', e);
    }
  }

  // Driving License Image
  if (data.driving_img_filename) {
    try {
      const buffer = await downloadFileBuffer(data.driving_img_filename);
      const cdnResult = saveToCdn({ buffer, originalname: 'driving_license_photo.jpg' }, applicationNo, 'applicant', 'digilocker_driving_photo');
      fetchedDocs.push({
        loan_application_id: loanAppId,
        party: 'applicant',
        doc_type: 'digilocker_driving_photo',
        cdn_path: cdnResult.cdn_path,
        original_filename: 'driving_license_photo.jpg',
        mime_type: 'image/jpeg',
        file_size_bytes: buffer.length,
        uploaded_by_profile_id: uploadedByProfileId,
        verified: true
      });
    } catch (e) {
      console.error('Failed to process Driving License Photo', e);
    }
  }
  
  // PAN Image/PDF
  if (data.pan_image_path) {
    try {
      const buffer = await downloadFileBuffer(data.pan_image_path);
      const ext = data.pan_image_path.endsWith('.pdf') ? '.pdf' : '.jpg';
      const cdnResult = saveToCdn({ buffer, originalname: `pan${ext}` }, applicationNo, 'applicant', 'digilocker_pan');
      fetchedDocs.push({
        loan_application_id: loanAppId,
        party: 'applicant',
        doc_type: 'digilocker_pan',
        cdn_path: cdnResult.cdn_path,
        original_filename: `pan${ext}`,
        mime_type: ext === '.pdf' ? 'application/pdf' : 'image/jpeg',
        file_size_bytes: buffer.length,
        uploaded_by_profile_id: uploadedByProfileId,
        verified: true
      });
    } catch (e) {
      console.error('Failed to process PAN file', e);
    }
  }

  // 3. Insert documents to Supabase
  if (fetchedDocs.length > 0) {
    const { error: insertError } = await supabase.from('documents').insert(fetchedDocs);
    if (insertError) {
      console.error('Error inserting documents to Supabase:', insertError);
    }
  }

  // 4. Update Customer record
  const updateData = {};
  if (data.dob) {
    // dob might be DD-MM-YYYY, convert to YYYY-MM-DD
    const parts = data.dob.split('-');
    if (parts.length === 3) {
      updateData.dob = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  if (data.pan_number) updateData.pan_number = data.pan_number;
  if (data.aadhar_address) updateData.address_line1 = data.aadhar_address;
  if (data.pincode) updateData.pincode = data.pincode;
  if (data.state) updateData.state = data.state;
  if (data.dist) updateData.city = data.dist;
  
  // Fetch existing custom_fields to safely merge
  const { data: existingCust } = await supabase.from('customers').select('custom_fields').eq('id', customerId).single();
  const existingCustomFields = existingCust?.custom_fields || {};

  updateData.custom_fields = {
    ...existingCustomFields,
    digilocker_name: data.name,
    digilocker_name_on_pan: data.name_on_pan,
    digilocker_gender: data.gender,
    digilocker_fathername: data.fathername,
    digilocker_country: data.country,
    digilocker_locality: data.locality,
    digilocker_vtc: data.vtc,
    digilocker_house: data.house,
    digilocker_subdist: data.subdist
  };

  if (Object.keys(updateData).length > 0) {
    await supabase.from('customers').update(updateData).eq('id', customerId);
  }

  return {
    ...data,
    saved_documents: fetchedDocs.map(d => d.doc_type)
  };
}

module.exports = {
  getAuthUrl,
  processDigilockerData
};

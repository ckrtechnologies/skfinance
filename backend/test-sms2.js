require('dotenv').config();
const axios = require('axios');

const SMS_API_BASE_URL = process.env.SMS_API_BASE_URL || 'https://multichannel.buddyinfotech.in/api/v1';
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_OTP_TEMPLATE_ID = process.env.SMS_OTP_TEMPLATE_ID || 22663;
const SMS_DLT_TEMPLATE_ID = process.env.SMS_DLT_TEMPLATE_ID || '1777178575424884704';

const client = axios.create({
  baseURL: SMS_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${SMS_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function run() {
  const phone = '7982296878';
  
  // Test 1: Pass internal template_id + message + personalized: 0
  try {
    console.log('Test 1: template_id + message');
    const res = await client.post('/sms/sendMessage', {
      template_id: Number(SMS_OTP_TEMPLATE_ID),
      message: `123123 is your OTP for login with Shreeja Finance Pvt.Ltd`,
      senderid: 'SHREJA',
      unicode: 0,
      personalized: 0,
      numbers: [phone]
    });
    console.log('Result 1:', res.data);
  } catch (err) {
    console.error('Test 1 failed:', err.response?.data || err.message);
  }

  // Test 2: Pass dlt_template_id in raw mode
  try {
    console.log('\nTest 2: dlt_template_id in raw mode');
    const res = await client.post('/sms/sendMessage', {
      senderid: 'SHREJA',
      dlt_template_id: SMS_DLT_TEMPLATE_ID,
      message: `456456 is your OTP for login with Shreeja Finance Pvt.Ltd`,
      unicode: 0,
      personalized: 0,
      numbers: [phone]
    });
    console.log('Result 2:', res.data);
  } catch (err) {
    console.error('Test 2 failed:', err.response?.data || err.message);
  }
}

run();

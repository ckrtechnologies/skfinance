require('dotenv').config();
const axios = require('axios');

const SMS_API_BASE_URL = process.env.SMS_API_BASE_URL || 'https://multichannel.buddyinfotech.in/api/v1';
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'SHREJA';

const client = axios.create({
  baseURL: SMS_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${SMS_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function run() {
  const phone = '7982296878';
  const otp = '888888';
  const message = `${otp} is your OTP for Registration with Shreeja Finance Pvt.Ltd`;

  console.log('Testing raw mode string:', message);

  try {
    const res = await client.post('/sms/sendMessage', {
      senderid: SMS_SENDER_ID,
      message: message,
      unicode: 0,
      personalized: 0,
      numbers: [phone]
    });
    console.log('Raw mode result:', res.data);
  } catch (err) {
    console.error('Raw mode failed:', err.response?.data || err.message);
  }
}

run();

require('dotenv').config();
const axios = require('axios');

const SMS_API_BASE_URL = process.env.SMS_API_BASE_URL || 'https://multichannel.buddyinfotech.in/api/v1';
const SMS_API_KEY = process.env.SMS_API_KEY;

const client = axios.create({
  baseURL: SMS_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${SMS_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function run() {
  try {
    const res = await client.get('/sms/templates');
    console.log('Templates:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Failed to get templates:', err.response?.data || err.message);
  }
}

run();

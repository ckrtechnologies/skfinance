'use strict';
const axios = require('axios');

const SMS_API_BASE_URL = process.env.SMS_API_BASE_URL || 'https://multichannel.buddyinfotech.in/api/v1';
const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_OTP_TEMPLATE_ID = process.env.SMS_OTP_TEMPLATE_ID;

const smsClient = axios.create({
  baseURL: SMS_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token dynamically
smsClient.interceptors.request.use((config) => {
  const token = process.env.SMS_API_KEY || SMS_API_KEY;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * sendOtpSms - Dispatches an OTP SMS via BuddyInfotech DLT Gateway.
 * 
 * @param {Object} params
 * @param {string} params.phone - 10-digit phone number
 * @param {string} params.otp - The OTP code to send
 * @param {string} [params.name] - Optional recipient name for template placeholder
 * @returns {Promise<{ referenceId: string, raw: Object }>}
 */
async function sendOtpSms({ phone, otp, name = '' }) {
  if (!process.env.SMS_API_KEY || !process.env.SMS_OTP_TEMPLATE_ID) {
    console.warn('[smsService] Missing SMS_API_KEY or SMS_OTP_TEMPLATE_ID in environment. SMS not sent.');
    return { referenceId: 'DUMMY_REF', raw: {} };
  }

  const payload = {
    template_id: Number(process.env.SMS_OTP_TEMPLATE_ID),
    senderid: process.env.SMS_SENDER_ID || 'SHREJA',
    // message: `${otp} is your OTP for Registration with Shreeja finance Pvt.Ltd`,
    unicode: 0,
    personalized: 1,
    numbers: [
      {
        number: phone,
        '#num#': otp
      }
    ]
  };

  try {
    const { data } = await smsClient.post('/sms/sendMessage', payload);

    if (data && data.success === true) {
      return { referenceId: data.reference_id, raw: data };
    } else {
      throw Object.assign(new Error(data.message || 'SMS Gateway returned failure'), { 
        statusCode: 502, 
        code: 'SMS_SEND_FAILED' 
      });
    }
  } catch (error) {
    if (error.response) {
      // Map known gateway HTTP errors
      const status = error.response.status;
      let errorCode = 'SMS_UNAVAILABLE';
      let statusCode = 502;
      let message = error.response.data?.message || error.message;

      if (status === 401) {
        errorCode = 'SMS_AUTH_FAILED';
        statusCode = 500; // Keep internal 500 so we don't leak upstream 401 to user
        message = 'SMS Gateway authentication failed (internal error)';
      } else if (status === 429) {
        errorCode = 'SMS_RATE_LIMITED';
        statusCode = 429;
      } else if (status === 422) {
        errorCode = 'SMS_VALIDATION_FAILED';
      }

      console.error(`[smsService] Gateway Error (${status}):`, error.response.data);
      throw Object.assign(new Error(message), { statusCode, code: errorCode });
    }
    
    // Network errors / timeouts
    console.error(`[smsService] Network/Timeout Error:`, error.message);
    throw Object.assign(new Error('SMS service is temporarily unavailable'), { 
      statusCode: 502, 
      code: 'SMS_UNAVAILABLE' 
    });
  }
}

module.exports = {
  sendOtpSms,
  smsClient
};

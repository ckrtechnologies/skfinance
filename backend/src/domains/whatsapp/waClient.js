const axios = require('axios');

const MC_BASE_URL = process.env.SMS_API_BASE_URL || 'https://multichannel.buddyinfotech.in/api/v1';
const MC_API_KEY = process.env.SMS_API_KEY;

// Re-using the same environment variables as the SMS service,
// or you can define specific MC_API_KEY, MC_WABA_ID, MC_PHONE_NUMBER_ID if needed.
const WABA = process.env.MC_WABA_ID;
const PNID = process.env.MC_PHONE_NUMBER_ID;

const wa = axios.create({
  baseURL: MC_BASE_URL,
  timeout: 15000,
  headers: { Authorization: `Bearer ${MC_API_KEY}` },
});

// Interceptor for standardizing error responses
wa.interceptors.response.use(
  (r) => r,
  (err) => {
    const v = err.response?.data?.error;
    const e = new Error(v?.message || err.message);
    e.status = err.response?.status;
    e.code = v?.code || 'vendor_error';
    e.details = v?.details;
    e.retryable = [429, 500, 502, 503, 504].includes(e.status) || !err.response;
    throw e;
  }
);

module.exports = {
  wa,
  WABA,
  PNID
};

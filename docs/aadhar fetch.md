# Aadhaar Fetch API Integration (Meon DigiLocker) — React Native

## Overview
Meon's Aadhaar Fetch API lets users authenticate with DigiLocker and share their
Aadhaar/PAN details with your app. The flow has 3 backend API calls + 1 in-app
browser redirect. Never call these APIs directly from the mobile app — proxy
them through your own backend so `secret_token` is never exposed on-device.

Base URL: `https://digilocker.meon.co.in`

---

## Flow Summary
1. Backend generates an access token.
2. Backend requests a DigiLocker consent URL.
3. App opens that URL in an in-app browser; user logs in & consents.
4. DigiLocker redirects to your callback URL.
5. Backend calls "Retrieve Data" to fetch the user's Aadhaar/PAN details.

---

## Step 1: Generate Access Token (Backend)

`POST /get_access_token`

Request body:
```json
{
  "company_name": "YOUR_COMPANY_NAME",
  "secret_token": "YOUR_SECRET_TOKEN"
}
```

Response:
```json
{
  "client_token": "...",
  "state": "...",
  "status": true
}
```
Store `client_token` and `state` server-side (e.g. tied to the user's session).

---

## Step 2: Generate DigiLocker Link (Backend)

`POST /digi_url`

Request body:
```json
{
  "client_token": "<from step 1>",
  "redirect_url": "https://yourapp.com/digilocker/callback",
  "company_name": "YOUR_COMPANY_NAME",
  "documents": "aadhaar,pan"
}
```

Response:
```json
{
  "status": "success",
  "url": "https://api.digitallocker.gov.in/public/oauth2/1/authorize?..."
}
```
Send this `url` to your app.

---

## Step 3: Open the Link in the App (React Native)

Use an in-app browser so you can detect the redirect back to your callback URL.

```bash
npm install react-native-inappbrowser-reborn
```

```jsx
import { InAppBrowser } from 'react-native-inappbrowser-reborn';

async function openDigiLocker(digiLockerUrl, redirectUrl) {
  if (await InAppBrowser.isAvailable()) {
    const result = await InAppBrowser.openAuth(digiLockerUrl, redirectUrl, {
      ephemeralWebSession: false,
    });

    if (result.type === 'success' && result.url) {
      // result.url is your redirect_url, possibly with query params
      // Notify your backend that consent is complete, then call Step 4
      await notifyBackendConsentComplete();
    }
  }
}
```

Alternative: a `WebView` with `onNavigationStateChange` watching for
`redirect_url` also works if you don't want an external dependency.

---

## Step 4: Retrieve Fetched Data (Backend)

`POST /v2/send_entire_data`

Request body:
```json
{
  "client_token": "<from step 1>",
  "state": "<from step 1>",
  "status": true
}
```

Response (sample fields):
```json
{
  "status": "success",
  "data": {
    "name": "Rahul",
    "dob": "14-1-2002",
    "gender": "Male",
    "fathername": "Ram Pal Singh",
    "aadhar_no": "xxxxxxxx7845",
    "aadhar_address": "...",
    "pincode": "220100",
    "state": "Uttar Pradesh",
    "aadhar_filename": "https://.../AADHAR.pdf",
    "aadhar_img_filename": "https://.../Photo.jpg",
    "pan_number": "KT*****S"
  }
}
```
Return only the fields your app needs to the client — avoid sending full
Aadhaar numbers or document URLs to the mobile app unless required.

---

## Backend Endpoint Suggestions (Node/Express example)

```js
// server.js (Node/Express, backend only)
app.post('/api/aadhaar/start', async (req, res) => {
  const tokenRes = await fetch('https://digilocker.meon.co.in/get_access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_name: process.env.MEON_COMPANY_NAME,
      secret_token: process.env.MEON_SECRET_TOKEN,
    }),
  }).then(r => r.json());

  const linkRes = await fetch('https://digilocker.meon.co.in/digi_url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_token: tokenRes.client_token,
      redirect_url: 'https://yourapp.com/digilocker/callback',
      company_name: process.env.MEON_COMPANY_NAME,
      documents: 'aadhaar,pan',
    }),
  }).then(r => r.json());

  // persist tokenRes.client_token & tokenRes.state against the user session
  res.json({ url: linkRes.url });
});

app.post('/api/aadhaar/result', async (req, res) => {
  const { client_token, state } = req.session.aadhaar; // however you store it
  const data = await fetch('https://digilocker.meon.co.in/v2/send_entire_data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_token, state, status: true }),
  }).then(r => r.json());

  res.json(data);
});
```

---

## Security Notes
- Keep `secret_token` and `client_token` server-side only.
- Serve all three API calls through your own backend endpoints; the mobile
  app should only call your backend, never Meon's endpoints directly.
- Mask/redact sensitive fields (Aadhaar number, address) before sending to
  the client unless your use case explicitly requires the full value.
- Use HTTPS everywhere and validate the `redirect_url` callback server-side.
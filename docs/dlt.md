# Spec: DLT SMS OTP Login — Express.js Backend

## 0. Goal
Implement phone-number OTP login in an Express.js API using the
BuddyInfotech MultiChannel SMS gateway (DLT-compliant Indian SMS).

Deliverables:
- `POST /api/auth/otp/request` — generate + send OTP via SMS
- `POST /api/auth/otp/verify` — verify OTP, issue JWT session
- Reusable SMS service module
- Redis-backed OTP storage with TTL, rate limiting, and attempt lockout

---

## 1. Provider API Reference

**Base URL:** `https://multichannel.buddyinfotech.in/api/v1`

**Auth:** every request sends header
`Authorization: Bearer <SMS_API_KEY>` plus `Content-Type: application/json`.
(The gateway also accepts `?token=` / `?bearer_token=` query params on GET, but
this project MUST use the header + POST — never put the key in a URL.)

**Global rate limit:** 1000 requests/hour per API key → `429` when exceeded.

### 1.1 Create SMS Template — `POST /sms/storeTemplate`
Run ONCE per template (or via an admin-only route / seed script). Not part of
the login runtime path.

Request body (all fields required, strings):

| Field | Meaning |
|---|---|
| `template_name` | Friendly name, max 255 chars |
| `entity_id` | Entity ID issued by the DLT portal |
| `template_id` | Template ID issued by the DLT portal |
| `content` | Body text; may contain `{ placeholders }` |
| `sender_id` | Registered sender ID, must already exist in the gateway |

Example:
```json
{
  "template_name": "otp_alert",
  "entity_id": "1234567890",
  "template_id": "DLT12345",
  "content": "Hello { name }, your OTP is { otp }.",
  "sender_id": "ABCDEF"
}
```

Success `201`:
```json
{
  "success": true,
  "message": "Template created successfully.",
  "template_id": 158,
  "char_count": 154,
  "sms_units": 1,
  "template_status": "Pending for approval"
}
```

> IMPORTANT: the numeric `template_id` in the RESPONSE (e.g. `158`) is the
> gateway's internal ID. That is the value used when sending. It is different
> from the DLT `template_id` string sent in the request. Store the numeric one
> as `SMS_OTP_TEMPLATE_ID`.
>
> `template_status` starts as `Pending for approval` and must become
> `Approved` before real delivery works. Statuses: Pending for approval /
> Approved / Rejected.

Failure `422`:
```json
{ "success": false, "message": "The given data was invalid.", "errors": { "entity_id": ["..."] } }
```

### 1.2 Send SMS — `POST /sms/sendMessage`
This is the runtime call used for OTP.

| Field | Type | Notes |
|---|---|---|
| `template_id` | Integer | Gateway numeric template ID. Recommended mode. When present, `senderid` and `message` are ignored. |
| `senderid` | String (max 6) | Raw mode only. Required if no `template_id`. |
| `message` | String (max 1000) | Raw mode only. Supports `{placeholder}` tokens. Required if no `template_id`. |
| `unicode` | 0 or 1 | `0` = English (default), `1` = Unicode/regional. |
| `personalized` | 0 or 1 | `0` = same text to everyone, `1` = per-recipient variables. |
| `numbers` | Array | See below. |

`numbers` shape:
- Non-personalized: array of 10-digit strings, max **300** per request.
- Personalized: array of objects, each with `number` (10-digit) plus one key
  per template variable, max **100** per request.

**Use personalized mode for OTP** (one recipient per call):
```json
{
  "template_id": 158,
  "unicode": 0,
  "personalized": 1,
  "numbers": [
    { "number": "9876543210", "name": "Sanjay", "otp": "123456" }
  ]
}
```

The object keys (`name`, `otp`) MUST match the placeholder names in the
registered template content.

Raw-mode alternative (only if no approved template is available):
```json
{
  "senderid": "ABCDEF",
  "message": "Hello {name}, your OTP is {otp}.",
  "unicode": 0,
  "personalized": 1,
  "numbers": [{ "number": "9876543210", "name": "Sanjay", "otp": "123456" }]
}
```

Success `200`:
```json
{
  "success": true,
  "message": "Personalized messages submitted.",
  "reference_id": "INSIGNTEST-251224132336-OTA5..."
}
```
`reference_id` (a.k.a. `gateway_ref_id`) identifies the batch — persist it.

Errors:
- `400` → `{ "success": false, "code": "ERROR_CODE", "message": "Invalid sender ID or gateway error..." }`
- `422` → `{ "success": false, "message": "Maximum 300 numbers allowed in non-personalized..." }`
- `422` → `{ "success": false, "message": "Maximum 100 recipients allowed in personalized..." }`

### 1.3 Delivery Report — `GET /sms/reports/{gateway_ref_id}`
Pass the `reference_id` from the send response.

Response `200`:
```json
[
  { "number": "9876543210", "status": "submitted", "timespan": "2025-12-24T13:23:36+00:00" },
  { "number": "9123456780", "status": "delivered", "timespan": "2025-12-24T13:23:40+00:00" }
]
```
Statuses: `submitted`, `delivered`, `failed`. Per-message `cost`,
`message_content`, `sms_units`, `message_length` are also tracked by the gateway.

### 1.4 Credit Balance (optional) — `GET /credit`
Returns `{ username, total_assigned, used, available }`. Useful for a health
check / low-balance alert.

### 1.5 Standard HTTP codes
`200` OK · `201` Created · `400` Bad Request · `401` Unauthorized (bad/missing
key) · `403` Forbidden · `404` Not Found · `429` Rate limited · `500` Server error.

---

## 2. Environment Variables

```env
PORT=3000
NODE_ENV=development

# SMS gateway
SMS_API_BASE_URL=https://multichannel.buddyinfotech.in/api/v1
SMS_API_KEY=                 # Bearer token from the provider dashboard
SMS_OTP_TEMPLATE_ID=         # numeric gateway template id from storeTemplate
SMS_SENDER_ID=               # 6-char registered sender id (raw-mode fallback)
SMS_DLT_ENTITY_ID=           # only needed by the template-registration script
SMS_DLT_TEMPLATE_ID=         # only needed by the template-registration script

# OTP behaviour
OTP_LENGTH=6
OTP_TTL_SECONDS=300          # 5 minutes
OTP_MAX_VERIFY_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_PER_PHONE_PER_DAY=10

# Session
JWT_SECRET=
JWT_EXPIRES_IN=7d

REDIS_URL=redis://localhost:6379
```

Never hardcode secrets. Never log the raw OTP outside `NODE_ENV=development`.

---

## 3. Project Structure

```
src/
  app.js
  server.js
  config/env.js            # validate + export env (throw at boot if missing)
  config/redis.js
  services/smsService.js   # gateway HTTP client
  services/otpService.js   # generate/store/verify OTP
  controllers/authController.js
  routes/auth.routes.js
  middleware/rateLimiter.js
  middleware/validate.js
  middleware/errorHandler.js
  utils/phone.js
  utils/AppError.js
scripts/registerTemplate.js
```

Dependencies: `express`, `axios`, `ioredis`, `jsonwebtoken`, `zod`,
`express-rate-limit`, `rate-limit-redis`, `helmet`, `cors`, `dotenv`.
Dev: `nodemon`, `jest`, `supertest`, `nock`.

---

## 4. Module Requirements

### 4.1 `utils/phone.js`
- `normalizePhone(input)` → strip spaces/dashes, strip leading `+91`/`91`/`0`,
  return bare 10-digit string. Throw `AppError(400, 'INVALID_PHONE')` if the
  result doesn't match `/^[6-9]\d{9}$/`.
- The gateway expects **10-digit numbers with no country code**.

### 4.2 `services/smsService.js`
Axios instance with `baseURL`, Bearer header, `timeout: 10000`.

Functions:
- `sendOtpSms({ phone, otp, name })`
  - Body: `{ template_id: Number(env.SMS_OTP_TEMPLATE_ID), unicode: 0, personalized: 1, numbers: [{ number: phone, name: name ?? '', otp }] }`
  - Returns `{ referenceId, raw }`.
  - If `data.success !== true`, throw `AppError(502, 'SMS_SEND_FAILED', data.message)`.
- `getDeliveryReport(referenceId)` → `GET /sms/reports/{referenceId}`.
- `getCredit()` → `GET /credit`.
- `createTemplate(payload)` → `POST /sms/storeTemplate` (used by the script).

Error normalization: map upstream `401` → `SMS_AUTH_FAILED`, `429` →
`SMS_RATE_LIMITED`, `422` → `SMS_VALIDATION_FAILED`, timeout/network →
`SMS_UNAVAILABLE`. Never leak the API key or full upstream response to clients.

Add one retry with 500ms backoff for network errors / `5xx` only.
Do NOT retry `4xx` — a resend would burn SMS credits.

### 4.3 `services/otpService.js`
Redis keys:
- `otp:<phone>` → JSON `{ hash, attempts, referenceId, createdAt }`, TTL `OTP_TTL_SECONDS`
- `otp:cooldown:<phone>` → TTL `OTP_RESEND_COOLDOWN_SECONDS`
- `otp:daily:<phone>` → counter, TTL 86400

Functions:
- `generateOtp()` — use `crypto.randomInt(10**(n-1), 10**n)` for the configured
  length. Must be cryptographically secure; do not use `Math.random()`.
- `issueOtp(phone, name)`
  1. If cooldown key exists → `AppError(429, 'OTP_COOLDOWN')`.
  2. If daily counter ≥ max → `AppError(429, 'OTP_DAILY_LIMIT')`.
  3. Generate OTP, store **SHA-256 hash only** (never the plaintext).
  4. Call `smsService.sendOtpSms(...)`; on failure delete the Redis key so the
     user can retry immediately.
  5. Set cooldown, increment daily counter, return `{ referenceId, expiresIn }`.
- `verifyOtp(phone, otp)`
  1. Missing/expired key → `AppError(400, 'OTP_EXPIRED')`.
  2. `attempts >= OTP_MAX_VERIFY_ATTEMPTS` → delete key, `AppError(429, 'OTP_ATTEMPTS_EXCEEDED')`.
  3. Compare with `crypto.timingSafeEqual` on the hashes; on mismatch increment
     `attempts` (preserving the original TTL) → `AppError(400, 'OTP_INVALID')`.
  4. On success delete all three keys and return `true`.

### 4.4 Routes & Contracts

**`POST /api/auth/otp/request`**
```json
// request
{ "phone": "9876543210", "name": "Sanjay" }
// 200
{ "success": true, "message": "OTP sent", "expiresIn": 300, "referenceId": "INSIGNTEST-..." }
```
Errors: `400 INVALID_PHONE`, `429 OTP_COOLDOWN` (include `retryAfter`),
`429 OTP_DAILY_LIMIT`, `502 SMS_SEND_FAILED`.

**`POST /api/auth/otp/verify`**
```json
// request
{ "phone": "9876543210", "otp": "123456" }
// 200
{ "success": true, "token": "<jwt>", "user": { "id": "...", "phone": "9876543210", "isNew": false } }
```
Errors: `400 OTP_INVALID`, `400 OTP_EXPIRED`, `429 OTP_ATTEMPTS_EXCEEDED`.

On successful verify: find-or-create the user by phone, set `isNew`
accordingly, sign a JWT with `{ sub: user.id, phone }`.

Validate both bodies with zod via a `validate(schema)` middleware.

### 4.5 Rate limiting (`middleware/rateLimiter.js`)
- `/otp/request`: 5 requests / 15 min per IP **and** the per-phone cooldown +
  daily cap in `otpService`.
- `/otp/verify`: 10 requests / 15 min per IP.
- Use `rate-limit-redis` so limits hold across instances.

### 4.6 `scripts/registerTemplate.js`
One-off CLI: reads `SMS_DLT_ENTITY_ID`, `SMS_DLT_TEMPLATE_ID`,
`SMS_SENDER_ID`, posts to `/sms/storeTemplate` with content
`"Hello { name }, your OTP is { otp }."`, prints the returned numeric
`template_id` and `template_status`, and reminds the operator to paste the ID
into `SMS_OTP_TEMPLATE_ID`.

### 4.7 Error handling
Central `errorHandler` returns `{ success: false, code, message }`.
Log upstream gateway errors server-side with the `referenceId` where available.
Never echo gateway internals or the API key to the client.

---

## 5. Constraints & Gotchas
- DLT template content must exactly match what was approved on the DLT portal;
  variable names in `numbers[]` must match the template placeholders or the
  gateway/operator will reject the message.
- Sending will not deliver until `template_status` is `Approved`.
- Personalized mode is capped at 100 recipients; OTP always sends exactly 1.
- Only 10-digit numbers, no `+91` prefix.
- OTP plaintext must never be returned in the API response, logged in
  production, or stored unhashed.

## 6. Tests (jest + supertest + nock)
1. `normalizePhone` handles `+91`, `91`, `0`, spaces, and rejects invalid input.
2. `/otp/request` returns 200 and calls the gateway with the exact expected body.
3. Second immediate `/otp/request` returns `429 OTP_COOLDOWN`.
4. Gateway `success: false` → `502` and the Redis OTP key is cleared.
5. `/otp/verify` with the correct OTP returns a JWT; the key is deleted.
6. Wrong OTP increments attempts; the 6th attempt returns `429`.
7. Expired key returns `400 OTP_EXPIRED`.
Mock all outbound gateway calls with `nock` — no real SMS in tests.
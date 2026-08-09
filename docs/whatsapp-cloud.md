# WhatsApp Marketing Module — Backend Spec (Express)

Admin sends approved WhatsApp marketing templates (with image / video / PDF
headers) to dealers, in bulk, with per-dealer personalisation and delivery
tracking.

Vendor: **MultiChannel (buddyinfotech.in)** — a wrapper over Meta WhatsApp
Cloud API. Payload shapes are identical to Meta's Graph API.

---

## 1. Hard rules (do not design around these)

1. Marketing content **must** use a Meta-approved template of category
   `MARKETING`. Free-form text is only legal inside the 24h session window
   (i.e. after the dealer messages us first).
2. `MC_WABA_ID` is used for **templates + media**.
   `MC_PHONE_NUMBER_ID` is used for **sending**. Never swap them.
3. `POST /media` returns a **media id** (for sending).
   `POST /media_handle` returns a **handle** (for template creation).
   They are NOT interchangeable.
4. Template body variables are **positional**: `bodyVars[0]` → `{{1}}`.
5. Language code must match the template exactly. Ours is `en_US`, not `en`.
6. Vendor rate limit = 1000 req/hour per key. Throttle at 900.
7. Credit is deducted only on successful send. MARKETING bills at Type_1.
8. **Never** use the vendor's "Simple GET API" or GET report endpoint from the
   server — they take `username` and `password` as query params, which leaks
   credentials into logs. Use the Bearer-token POST API only.

---

## 2. Vendor endpoint reference

Base URL: `https://multichannel.buddyinfotech.in/api/v1`
Auth header: `Authorization: Bearer <MC_API_KEY>`

| Purpose | Method | Path |
|---|---|---|
| List templates | GET | `/whatsapp/{waba_id}/message_templates?limit=100` |
| Get one template | GET | `/whatsapp/{waba_id}/message_templates/{id}` |
| Create template | POST | `/whatsapp/{waba_id}/message_templates` |
| Edit components | POST | `/whatsapp/{waba_id}/message_templates/id/{template_id}` |
| Delete template | DELETE | `/whatsapp/{waba_id}/message_templates` |
| Upload media (→ `id`) | POST | `/whatsapp/{waba_id}/media` (multipart) |
| Upload handle (→ `h`) | POST | `/whatsapp/{waba_id}/media_handle` (multipart) |
| Get media by id | GET | `/whatsapp/{waba_id}/media/{media_id}` |
| **Send message** | POST | `/whatsapp/{phone_number_id}/messages` |

Multipart fields for both media endpoints: `file`, `messaging_product=whatsapp`,
`type=<mime>`. Max 25 MB.

Supported media: image (jpeg/png/gif/webp), video (mp4/3gp),
document (pdf/doc/docx/xls/xlsx/ppt/pptx), audio (mp3/ogg/amr/m4a),
sticker (webp).

Error body:
```json
{ "error": { "code": "invalid_request", "message": "...", "details": {} } }
```
Codes: 200, 201, 400, 401, 403, 404, 429, 500.

### Send payload — media template (our main use case)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "+919321012345",
  "type": "template",
  "template": {
    "name": "offer_1",
    "language": { "code": "en_US" },
    "components": [
      { "type": "header",
        "parameters": [
          { "type": "image", "image": { "link": "https://cdn.example.com/a.jpg" } }
        ] },
      { "type": "body",
        "parameters": [
          { "type": "text", "text": "Rahul Motors" },
          { "type": "text", "text": "20%" }
        ] }
    ]
  }
}
```
Header media accepts `{ "link": "<public https url>" }` OR `{ "id": "<media id>" }`.
Swap `image` → `video` / `document` for other header formats.

### Send payload — session text (support replies only)

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "+919321012345",
  "type": "text",
  "text": { "preview_url": false, "body": "Hello" }
}
```

Success returns `{ "messages": [ { "id": "wamid...." } ] }`.

Delivery statuses: `queued → sent → delivered → read`, or `failed`.

---

## 3. Folder structure

```
src/
  server.js
  app.js
  config/env.js
  lib/waClient.js
  lib/logger.js
  middlewares/{auth.js,errorHandler.js,validate.js,upload.js}
  models/            (prisma or sequelize)
  services/
    template.service.js
    media.service.js
    whatsapp.service.js
    campaign.service.js
    dealer.service.js
  queues/
    connection.js
    campaign.queue.js
    campaign.worker.js
  routes/
    index.js
    template.routes.js
    media.routes.js
    campaign.routes.js
    dealer.routes.js
    webhook.routes.js
  utils/{phone.js,retry.js,idempotency.js}
prisma/schema.prisma
```

---

## 4. Database schema

```sql
CREATE TABLE dealers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  phone_e164 VARCHAR(20) NOT NULL UNIQUE,   -- +9198xxxxxxx
  city VARCHAR(100),
  state VARCHAR(100),
  category VARCHAR(50),
  wa_opt_in TINYINT(1) DEFAULT 1,
  opted_out_at DATETIME NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wa_templates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  meta_template_id VARCHAR(64) UNIQUE,
  name VARCHAR(120) NOT NULL,
  language VARCHAR(16) NOT NULL,
  category ENUM('MARKETING','UTILITY','AUTHENTICATION') NOT NULL,
  status ENUM('PENDING','APPROVED','REJECTED','PAUSED','DISABLED'),
  header_format ENUM('NONE','TEXT','IMAGE','VIDEO','DOCUMENT') DEFAULT 'NONE',
  header_var_count INT DEFAULT 0,
  body_var_count INT DEFAULT 0,
  raw_components JSON,
  synced_at DATETIME
);

CREATE TABLE wa_media (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  kind ENUM('image','video','document','audio','sticker'),
  media_id VARCHAR(255) NULL,       -- from /media   (for sending)
  media_handle TEXT NULL,           -- from /media_handle (for template create)
  public_url VARCHAR(500) NULL,     -- our own CDN copy
  uploaded_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaigns (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  template_id BIGINT NOT NULL,
  media_id BIGINT NULL,
  header_var_map JSON,     -- ["city"]
  body_var_map JSON,       -- ["name","discount"]  -> dealer column or literal
  audience_filter JSON,    -- {"state":"MH","category":"GOLD"}
  status ENUM('draft','queued','running','completed','failed','cancelled'),
  total_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  read_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  scheduled_at DATETIME NULL,
  created_by BIGINT,
  idempotency_key VARCHAR(80) UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  campaign_id BIGINT NOT NULL,
  dealer_id BIGINT NOT NULL,
  to_phone VARCHAR(20) NOT NULL,
  payload JSON,
  wamid VARCHAR(255) NULL,
  status ENUM('queued','sent','delivered','read','failed') DEFAULT 'queued',
  error_code VARCHAR(80) NULL,
  error_message TEXT NULL,
  attempts INT DEFAULT 0,
  sent_at DATETIME NULL,
  delivered_at DATETIME NULL,
  read_at DATETIME NULL,
  UNIQUE KEY uniq_campaign_dealer (campaign_id, dealer_id),
  INDEX idx_wamid (wamid)
);

CREATE TABLE wa_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  wamid VARCHAR(255),
  event_type VARCHAR(50),
  raw JSON,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. Internal REST API (admin panel → our Express)

All routes require admin JWT.

```
GET    /api/wa/templates                 list cached templates (?category=MARKETING&status=APPROVED)
POST   /api/wa/templates/sync            pull fresh from vendor, upsert cache
GET    /api/wa/templates/:id             one template + parsed variable slots

POST   /api/wa/media                     multipart: file, purpose=send|template
GET    /api/wa/media                     paginated library

GET    /api/wa/dealers?state=&category=  audience preview + count
POST   /api/wa/dealers/import            CSV bulk import

POST   /api/wa/campaigns                 create draft
POST   /api/wa/campaigns/:id/preview     render message for first 5 dealers
POST   /api/wa/campaigns/:id/send        enqueue  -> 202 Accepted
POST   /api/wa/campaigns/:id/cancel      stop remaining jobs
GET    /api/wa/campaigns                 list + counters
GET    /api/wa/campaigns/:id             detail
GET    /api/wa/campaigns/:id/messages    per-dealer status (?status=failed)
GET    /api/wa/campaigns/:id/export      CSV report

POST   /api/wa/webhook                   vendor status callback (no JWT, shared secret)
```

---

## 6. Key implementation files

### `src/lib/waClient.js`
```js
import axios from 'axios';
import { env } from '../config/env.js';

export const wa = axios.create({
  baseURL: env.MC_BASE_URL,
  timeout: env.MC_TIMEOUT_MS,
  headers: { Authorization: `Bearer ${env.MC_API_KEY}` },
});

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

export const WABA = env.MC_WABA_ID;
export const PNID = env.MC_PHONE_NUMBER_ID;
```

### `src/services/media.service.js`
```js
import FormData from 'form-data';
import { wa, WABA } from '../lib/waClient.js';

const ALLOWED = {
  image: ['image/jpeg','image/png','image/gif','image/webp'],
  video: ['video/mp4','video/3gpp'],
  document: ['application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  audio: ['audio/mpeg','audio/ogg','audio/amr','audio/mp4'],
  sticker: ['image/webp'],
};

export function kindOf(mime) {
  return Object.keys(ALLOWED).find((k) => ALLOWED[k].includes(mime)) || null;
}

async function push(path, file) {
  const form = new FormData();
  form.append('file', file.buffer, { filename: file.originalname });
  form.append('messaging_product', 'whatsapp');
  form.append('type', file.mimetype);
  const { data } = await wa.post(path, form, { headers: form.getHeaders() });
  return data;
}

// for sending messages -> { id }
export const uploadForSend = (f) => push(`/whatsapp/${WABA}/media`, f);
// for creating templates -> { h }
export const uploadForTemplate = (f) => push(`/whatsapp/${WABA}/media_handle`, f);
```

### `src/services/whatsapp.service.js`
```js
import { wa, PNID } from '../lib/waClient.js';

export function buildTemplatePayload({ to, templateName, language,
                                       headerMedia, headerVars = [], bodyVars = [] }) {
  const components = [];

  if (headerMedia) {
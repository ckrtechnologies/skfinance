# Dealer Wallet Payout — Cashfree Integration (Express.js)

## 1. Architecture Overview

Cashfree does not maintain a per-dealer wallet. Your Express app owns the
wallet ledger (balance, credits, debits) in your own database. Cashfree
Payouts is only the disbursal rail: once your app authorizes a withdrawal,
you call Cashfree to actually move money to the dealer's bank
account/UPI/card. Your merchant Cashfree account must be funded (this is the
real "wallet" Cashfree debits from).

Flow at a glance:

1. Dealer adds bank account -> verify with Bank Account Verification (BAV / penny-drop equivalent)
2. Register dealer as a Cashfree Beneficiary
3. Dealer requests withdrawal from their in-app wallet
4. Backend debits wallet (pending state) and calls Standard Transfer API
5. Cashfree webhook confirms SUCCESS / FAILED / REVERSED / REJECTED
6. Backend finalizes wallet ledger based on webhook (with polling fallback)

## 2. Auth & Environment

| Env | Base URL (Payouts) | Base URL (Verification) |
|-----|---------------------|--------------------------|
| Sandbox | `https://sandbox.cashfree.com/payout` | `https://sandbox.cashfree.com/verification` |
| Production | `https://api.cashfree.com/payout` | `https://api.cashfree.com/verification` |

Headers on every request:

x-client-id: <CASHFREE_CLIENT_ID>
x-client-secret: <CASHFREE_CLIENT_SECRET>
x-api-version: 2024-01-01
Content-Type: application/json



Production also requires either IP whitelisting or an `x-cf-signature` header
(RSA-encrypted `clientId.timestamp` using the public key from the dashboard).

## 3. Step 1 — Verify Dealer Bank Account (Penny Drop / BAV)

**Endpoint:** `POST /verification/bank-account/sync`

```json
{
  "bank_account": "26291800001191",
  "ifsc": "YESB0000001",
  "name": "Dealer Name",
  "phone": "9999999999"
}
```

Response includes `account_status` (`VALID`/`INVALID`), `account_status_code`
(reason if invalid), `name_at_bank`, `name_match_score`, `name_match_result`.
Only allow beneficiary creation if `account_status === "VALID"` and the name
match score is above your acceptable threshold (e.g. reject `NO_MATCH` /
`POOR_PARTIAL_MATCH`).

An async variant (`/verification/bank-account/async` + status-check endpoint)
exists if you want to batch this instead of blocking the request.

## 4. Step 2 — Create Beneficiary (once per dealer bank account)

**Endpoint:** `POST /payout/beneficiary`

```json
{
  "beneficiary_id": "DLR_<dealerId>",
  "beneficiary_name": "Dealer Name",
  "beneficiary_instrument_details": {
    "bank_account_number": "26291800001191",
    "bank_ifsc": "YESB0000001"
  },
  "beneficiary_contact_details": {
    "beneficiary_email": "dealer@example.com",
    "beneficiary_phone": "9999999999"
  }
}
```

Store `beneficiary_status` (must be `VERIFIED` to receive payouts).

## 5. Step 3 — Dealer-Initiated Withdrawal (your business logic)

Express route, e.g. `POST /api/dealer/withdraw`:

1. Validate `amount <= dealer.wallet_balance` and any min/max/KYC rules.
2. In a DB transaction: decrement `wallet_balance`, insert a
   `payout_transactions` row `{ transfer_id: uuid(), amount, status: 'PENDING' }`.
3. Call Standard Transfer.
4. If the API call itself throws/5xx, do **not** retry blindly — call Get
   Transfer Status with the same `transfer_id` first.

## 6. Step 4 — Initiate Transfer

**Endpoint:** `POST /payout/transfers`

```json
{
  "transfer_id": "TXN_<uuid>",
  "transfer_amount": 1500.00,
  "beneficiary_details": { "beneficiary_id": "DLR_<dealerId>" },
  "transfer_mode": "banktransfer"
}
```

Response is async: `status: "RECEIVED"` only means Cashfree accepted the
request — not that it succeeded. Save `cf_transfer_id`.

## 7. Step 5 — Confirm via Webhook

Configure webhook URL in Dashboard -> Payouts -> Developers -> Webhooks (select V2).

Events you care about: `TRANSFER_SUCCESS`, `TRANSFER_FAILED`,
`TRANSFER_REJECTED`, `TRANSFER_REVERSED`.

**Verify signature before trusting payload:**

```js
const crypto = require('crypto');

function verifyCashfreeWebhook(signature, rawBody, timestamp, clientSecret) {
  const signedPayload = timestamp + rawBody;
  const expected = crypto
    .createHmac('sha256', clientSecret)
    .update(signedPayload)
    .digest('base64');
  return expected === signature;
}
```

Mount the webhook route with a raw body parser (needed for signature
verification):

```js
app.post(
  '/webhooks/cashfree/payouts',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const rawBody = req.body.toString('utf8');

    if (!verifyCashfreeWebhook(signature, rawBody, timestamp, process.env.CASHFREE_CLIENT_SECRET)) {
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(rawBody);
    // event.type: TRANSFER_SUCCESS | TRANSFER_FAILED | TRANSFER_REJECTED | TRANSFER_REVERSED
    // event.data.transfer_id, event.data.status, event.data.status_code
    handlePayoutWebhook(event); // your business logic (queue it, don't block)

    res.sendStatus(200); // ack quickly, always
  }
);
```

Business logic on event:

- `TRANSFER_SUCCESS` + `status_code === "COMPLETED"` -> mark transaction `SUCCESS`, keep wallet debited.
- `TRANSFER_FAILED` / `TRANSFER_REJECTED` / `TRANSFER_REVERSED` -> credit the amount back to `wallet_balance`, mark transaction `FAILED`.

## 8. Step 6 — Reconciliation Fallback

For any transaction still `PENDING` past a timeout (e.g. 10 minutes), poll:

**Endpoint:** `GET /payout/transfers?transfer_id=<id>`

Use the response to settle the wallet ledger the same way as the webhook
handler, in case the webhook was missed or delayed.

## 9. Key Safeguards

- `transfer_id` must be unique per attempt — use it as an idempotency key so retried requests can't double-pay.
- Always debit the wallet before calling Cashfree, and refund on failure — never debit after success only (a crash between the two would let dealers withdraw twice).
- Reject withdrawal requests if the beneficiary's `beneficiary_status` isn't `VERIFIED` or if BAV `account_status` wasn't `VALID`.
- Whitelist Cashfree's webhook IPs and require HTTPS on your webhook endpoint.
- Never log or store `x-client-secret` in plaintext outside environment variables/secret managers.
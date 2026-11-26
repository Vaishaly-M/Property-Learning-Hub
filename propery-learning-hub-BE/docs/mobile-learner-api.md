# Mobile Learner API

Base URL: `{API_BASE}/api`  
Auth header (when required): `Authorization: Bearer {access_token}`  
Content-Type: `application/json`

Docs path in repo: `docs/mobile-learner-api.md`

## Flow overview

```
1. GET  /mobile/learner/onboarding/info
2. POST /mobile/learner/onboarding/sign-agreement   → agreement_token
3. POST /mobile/learner/onboarding/register         → access_token + payment_pending=true
4. POST /mobile/learner/onboarding/verify-email     → access_token + open dashboard
5. GET  /mobile/learner/me                          → read payment_pending / full_access
6. If payment_pending:
     GET  /mobile/learner/payment/config
     POST /mobile/learner/payment/intent            → Stripe client_secret
     (confirm in Stripe PaymentSheet / PaymentIntent)
     POST /mobile/learner/payment/confirm           → payment_pending=false, full access
```

### App gating rule

```text
if (!email_verified)        → verify email screen
else if (payment_pending)   → limited dashboard + payment screen
else                        → full UI
```

Always re-check with `GET /mobile/learner/me` after verify, login, and payment confirm.

---

## Endpoint summary

| Step | Method | Path | Auth |
|------|--------|------|------|
| Info | GET | `/mobile/learner/onboarding/info` | No |
| Check email | POST | `/mobile/learner/onboarding/check-email` | No |
| Check phone | POST | `/mobile/learner/onboarding/check-phone` | No |
| Sign agreement | POST | `/mobile/learner/onboarding/sign-agreement` | No |
| Register | POST | `/mobile/learner/onboarding/register` | No |
| Verify email | POST | `/mobile/learner/onboarding/verify-email` | No |
| Resend verification | POST | `/mobile/learner/onboarding/resend-verification` | Bearer |
| Login | POST | `/mobile/learner/auth/login` | No |
| Logout | POST | `/mobile/learner/auth/logout` | Bearer |
| Me | GET | `/mobile/learner/me` | Bearer |
| Payment config | GET | `/mobile/learner/payment/config` | Bearer |
| Payment status | GET | `/mobile/learner/payment/status` | Bearer |
| Create intent | POST | `/mobile/learner/payment/intent` | Bearer |
| Confirm payment | POST | `/mobile/learner/payment/confirm` | Bearer |

---

## 1) Get onboarding info

`GET /mobile/learner/onboarding/info`

Use this to render the agreement text and show the fee before signing.

**Response**
```json
{
  "success": true,
  "data": {
    "agreement_type": "training",
    "document_title": "Training & Membership Services Agreement",
    "document_paragraphs": ["..."],
    "formatted_fee": "£3000.00",
    "fee_amount_pence": 300000,
    "payment": {
      "publishable_key": "pk_...",
      "amount": 300000,
      "currency": "gbp",
      "formatted_amount": "£3000.00"
    },
    "flow": {
      "steps": ["get_info", "sign_agreement", "register", "verify_email", "dashboard", "pay_if_pending"]
    }
  }
}
```

---

## 2) Optional validation

### Check email
`POST /mobile/learner/onboarding/check-email`

```json
{ "email": "learner@example.com" }
```

```json
{
  "success": true,
  "data": {
    "registered": false,
    "available": true,
    "message": "Email is available."
  }
}
```

### Check phone
`POST /mobile/learner/onboarding/check-phone`

```json
{ "phone": "+447712345678" }
```

---

## 3) Sign agreement

`POST /mobile/learner/onboarding/sign-agreement`

```json
{
  "client_full_name": "Jane Doe",
  "client_address": "1 High Street, London",
  "client_dob": "1990-05-12",
  "client_email": "jane@example.com",
  "client_phone": "+447712345678",
  "client_signature_data": "data:image/png;base64,...",
  "accepted_terms": true,
  "payment_plan": "full"
}
```

Notes:
- `client_signature_data` must start with `data:image/`
- `accepted_terms` must be accepted (`true`)
- Email/phone must not already be registered

**Response (201)**
```json
{
  "success": true,
  "message": "Agreement signed successfully.",
  "data": {
    "agreement_token": "uuid-here",
    "next_step": "register"
  }
}
```

Store `agreement_token` for register and optionally for payment.

---

## 4) Register (set password)

`POST /mobile/learner/onboarding/register`

Email and phone **must match** the signed agreement.

```json
{
  "agreement_token": "uuid-here",
  "first_name": "Jane",
  "last_name": "Doe",
  "email": "jane@example.com",
  "phone_number": "+447712345678",
  "password": "SecretPass1!",
  "password_confirmation": "SecretPass1!"
}
```

**Response (201)**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email address.",
  "email_verification_required": true,
  "verification_email_sent": true,
  "payment_pending": true,
  "access_token": "...",
  "token_type": "Bearer",
  "user": {
    "id": 123,
    "email": "jane@example.com",
    "role": "learner",
    "email_verified": false,
    "payment_pending": true,
    "subscription_plan": "free"
  },
  "next_step": "verify_email"
}
```

Important:
- Account is created with `payment_pending = true`
- Learner can verify email and open a limited dashboard before paying
- Use `access_token` for resend verification / me

---

## 5) Verify email

Verification email link format:

`https://{FRONTEND}/verify-email?id=123&hash={sha1(email)}`

Mobile app should deep-link that URL (or parse `id` + `hash`), then call:

`POST /mobile/learner/onboarding/verify-email`

```json
{
  "id": 123,
  "hash": "sha1-of-email"
}
```

**Response**
```json
{
  "success": true,
  "message": "Email verified successfully.",
  "access_token": "...",
  "token_type": "Bearer",
  "payment_pending": true,
  "user": { "payment_pending": true, "email_verified": true },
  "next_step": "pay",
  "redirect_to": "dashboard"
}
```

Replace stored token with the new `access_token`.  
Open dashboard. If `payment_pending` is true, show payment UI / lock premium screens.

### Resend verification
`POST /mobile/learner/onboarding/resend-verification`  
Auth: Bearer (token from register)

---

## 6) Login

`POST /mobile/learner/auth/login`

```json
{
  "email": "jane@example.com",
  "password": "SecretPass1!"
}
```

**Response**
```json
{
  "success": true,
  "access_token": "...",
  "payment_pending": true,
  "full_access": false,
  "user": { "payment_pending": true },
  "next_step": "pay"
}
```

Email must already be verified.

### Logout
`POST /mobile/learner/auth/logout`  
Auth: Bearer

---

## 7) Me (current user)

`GET /mobile/learner/me`  
Auth: Bearer

**Response**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "email": "jane@example.com",
      "payment_pending": true,
      "subscription_plan": "free",
      "email_verified": true
    },
    "payment_pending": true,
    "full_access": false,
    "profile": {}
  }
}
```

`full_access` is `true` only when email is verified **and** `payment_pending` is `false`.

---

## 8) Payment APIs

Call these only when `payment_pending === true` (and email is verified).

### Payment config
`GET /mobile/learner/payment/config`  
Auth: Bearer

Returns Stripe publishable key + amount + current pending flags.

### Payment status
`GET /mobile/learner/payment/status`  
Auth: Bearer

```json
{
  "success": true,
  "data": {
    "payment_pending": true,
    "full_access": false,
    "subscription_plan": "free",
    "billing_cycle": "yearly",
    "email_verified": true
  }
}
```

### Create payment intent
`POST /mobile/learner/payment/intent`  
Auth: Bearer

Body optional:
```json
{ "agreement_token": "uuid-here" }
```

If omitted, server uses the learner’s linked training agreement.

**Response**
```json
{
  "success": true,
  "data": {
    "client_secret": "pi_..._secret_...",
    "payment_intent_id": "pi_...",
    "payment_id": 55,
    "amount": 300000,
    "currency": "gbp",
    "formatted_amount": "£3000.00",
    "publishable_key": "pk_..."
  }
}
```

Calling intent again while a previous intent is still open reuses it (avoids duplicate Stripe PaymentIntents).

### Confirm with Stripe (on device)
1. Initialize Stripe with `publishable_key`
2. Present PaymentSheet using `client_secret`
3. On success, call confirm API below with `payment_intent_id`

### Confirm payment (enable access)
`POST /mobile/learner/payment/confirm`  
Auth: Bearer

```json
{
  "payment_intent_id": "pi_..."
}
```

**Response**
```json
{
  "success": true,
  "message": "Payment confirmed. Full access enabled.",
  "payment_pending": false,
  "full_access": true,
  "data": {
    "status": "consumed",
    "user": {
      "payment_pending": false,
      "subscription_plan": "pro",
      "billing_cycle": "yearly"
    }
  }
}
```

After this, `GET /me` returns `payment_pending: false` and the app should unlock all UI.

Stripe webhook `payment_intent.succeeded` also clears `payment_pending` when the PaymentIntent is linked to the user. Confirm remains safe to call (idempotent if already paid).

---

## Error format

```json
{
  "success": false,
  "message": "Human readable error",
  "errors": { "field": ["..."] }
}
```

Common statuses:
- `422` validation / business rule
- `403` forbidden / email not verified / wrong role
- `502` Stripe or mail provider failure

---

## Example cURL (happy path)

```bash
# 1) Info
curl -s "$API/api/mobile/learner/onboarding/info"

# 2) Sign
curl -s -X POST "$API/api/mobile/learner/onboarding/sign-agreement" \
  -H "Content-Type: application/json" \
  -d '{
    "client_full_name":"Jane Doe",
    "client_address":"1 High Street, London",
    "client_dob":"1990-05-12",
    "client_email":"jane@example.com",
    "client_phone":"+447712345678",
    "client_signature_data":"data:image/png;base64,...",
    "accepted_terms":true
  }'

# 3) Register
curl -s -X POST "$API/api/mobile/learner/onboarding/register" \
  -H "Content-Type: application/json" \
  -d '{
    "agreement_token":"UUID",
    "first_name":"Jane",
    "last_name":"Doe",
    "email":"jane@example.com",
    "phone_number":"+447712345678",
    "password":"SecretPass1!",
    "password_confirmation":"SecretPass1!"
  }'

# 4) Verify (id + hash from email deep link)
curl -s -X POST "$API/api/mobile/learner/onboarding/verify-email" \
  -H "Content-Type: application/json" \
  -d '{"id":123,"hash":"..."}'

# 5) Me
curl -s "$API/api/mobile/learner/me" -H "Authorization: Bearer TOKEN"

# 6) Pay
curl -s -X POST "$API/api/mobile/learner/payment/intent" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{}'

# after Stripe PaymentSheet success:
curl -s -X POST "$API/api/mobile/learner/payment/confirm" \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"payment_intent_id":"pi_..."}'
```

---

## Deploy notes

1. Run migration:
   ```bash
   php artisan migrate
   ```
   Migration: `2026_07_24_120000_add_payment_pending_to_learner_profiles_table`

2. Ensure Stripe keys are set in `.env`:
   - `STRIPE_KEY`
   - `STRIPE_SECRET`
   - `STRIPE_ACADEMY_AMOUNT` (pence, e.g. `300000` = £3000)
   - `STRIPE_WEBHOOK_SECRET` (recommended)

3. Configure mobile deep link for:
   `{FRONTEND_URL}/verify-email?id={id}&hash={hash}`

4. Feature tests:
   ```bash
   php artisan test --filter=MobileLearnerOnboardingApiTest
   ```

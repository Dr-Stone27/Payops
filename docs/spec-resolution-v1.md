# Watchtower — Spec Resolution v1.0

**Date:** 2026-06-13
**Resolves:** spec-review-v1.0 (all findings)
**Status:** All decisions confirmed. Engineering can proceed.
**v1.1 patch (2026-06-13):** GAP-1 `retentionLocked` added to PaymentRequest data model; GAP-2 `PSP_SINGLE_TRANSACTION_LIMIT` defined; GAP-3 OPD-01/OPD-02 closed in CLAUDE.md; GAP-4 NUBAN change behaviour during `compliance_review` defined; MINOR-1 AL-05/AL-07 added to Quick Reference.

---

## HOW TO USE THIS DOCUMENT

Work section by section through your spec. For each heading below, insert the listed items into that spec section. Items marked **[INVARIANT]** are mandatory constraints — enforce at service layer, not UI layer.

---

## §1 — SYSTEM ARCHITECTURE

### New section: Security Invariants

**[INVARIANT] Tenant isolation (Critical)**
Every read and write on any resource must include a `businessId` filter equal to the authenticated user's `businessId` JWT claim. `businessId` is never accepted from request path, query params, or body for this purpose. Any endpoint missing this filter = Critical security defect.

**[INVARIANT] Error response contract**

| Scenario | HTTP | Body |
|---|---|---|
| Role insufficient | 403 | `{"error":"Forbidden","correlationId":"$uuid"}` |
| Resource belongs to another tenant | 404 | `{"error":"Not found","correlationId":"$uuid"}` — NOT 403 (prevents enumeration) |
| Resource does not exist | 404 | `{"error":"Not found","correlationId":"$uuid"}` |
| Validation failure | 422 | `{"error":"Validation failed","fields":[{"field":"x","message":"y"}]}` |
| Internal server error | 500 | `{"error":"An unexpected error occurred","correlationId":"$uuid"}` |

Never expose stack traces, SQL errors, internal exception types, constraint names, or other-tenant IDs in any error response. `correlationId` is logged server-side for support lookups.

### Session Management

**Mechanism:** Redis session store.
**JWT TTL:** 60 minutes.
**Refresh token TTL:** 30 days.

Every JWT carries a `sessionId` (UUID v4) claim. On every authenticated request: `GET sessions:{sessionId}` from Redis. Key absent → HTTP 401. Revocation (any source) deletes all session keys for that user immediately. If `User.isActive = false` at server-side processing time → HTTP 401 regardless of token validity.

---

## §2 — DATA MODELS

### PaymentRequest — field additions

```
version                    INTEGER NOT NULL DEFAULT 1
exceptionCategory          VARCHAR(50) NULL    -- see enum below; set when status = 'exception_queue'
complianceReviewResolvedBy UUID REFERENCES users(id) NULL
retentionLocked            BOOLEAN NOT NULL DEFAULT false
```

### PaymentRequest — status enum update

Remove `failed`. Add `exception_queue`.

**Complete updated enum:**
```
draft | pending_approval | compliance_review | processing |
settled | reconciled | exception_queue | disputed | cancelled
```

`failed` does not exist as a resting status. The PSP failure path transitions directly: `processing → exception_queue` with `exceptionCategory = 'PSP_FAILURE'`.

### exceptionCategory enum (new)

```
PSP_FAILURE | AMOUNT_MISMATCH | STATUS_UNKNOWN | PARTIAL_TRANCHE_SETTLEMENT |
COMPLIANCE_REVIEW_TIMEOUT | VENDOR_BLOCKED | AMBIGUOUS_MATCH | ORPHANED_SETTLEMENT
```

Exception queue UI = `WHERE status = 'exception_queue'`. `exceptionCategory` drives filtering within that view.

### Vendor — field additions

```
nubanHash                   VARCHAR(64) NULL    -- HMAC-SHA256(NUBAN, LOOKUP_SECRET_KEY); indexed; used for all equality lookups
nubanEncrypted              TEXT NULL           -- AES-256-GCM random-IV; replaces plain NUBAN storage
manuallyApprovedBy          UUID REFERENCES users(id) NULL
manuallyApprovedAt          TIMESTAMP NULL
manualApprovalJustification VARCHAR(500) NULL   -- required when manuallyApprovedBy is set; min 20 chars; read-only once set
```

All NUBAN equality lookups (reconciliation composite fallback, duplicate NUBAN detection) use `nubanHash`. The encrypted column is for display/decryption only.

### User — field additions

```
pinHash            VARCHAR(255) NULL   -- bcrypt cost >= 10; NULL until PIN setup complete
pinFailedAttempts  INTEGER NOT NULL DEFAULT 0
pinLockedUntil     TIMESTAMP NULL
```

### AuditLog — field addition

```
retentionLocked    BOOLEAN NOT NULL DEFAULT false
```

### Invoice — field addition

```
retentionLocked    BOOLEAN NOT NULL DEFAULT false
```

**Invoice PDF storage constraints (apply to `documentUrl`):**
- Max file size: 10 MB — enforced at API boundary before S3 upload (HTTP 413 if exceeded)
- Server-side MIME validation: magic byte check — file must begin with `%PDF-`; client `Content-Type` header is not trusted
- S3 storage: `Content-Disposition: attachment`; access via pre-signed URLs (15-min TTL); bucket policy = not publicly accessible

### WebhookEvent — field changes

Replace `payloadHash VARCHAR(64)` with:
```
transactionReference  VARCHAR(255) NOT NULL    -- PSP-issued; UNIQUE index; this is the deduplication key
retentionLocked       BOOLEAN NOT NULL DEFAULT false
```

Deduplication check: `WHERE transactionReference = $incoming AND businessId = $businessId`. Match → discard silently, return HTTP 200, no processing.

### Tranche — field additions

```
pspIdempotencyKey  UUID NOT NULL    -- generated once at tranche plan confirmation; immutable for lifetime of this tranche
orphaned           BOOLEAN NOT NULL DEFAULT false
```

### New table: Invitation

```sql
CREATE TABLE invitations (
  id               UUID PRIMARY KEY,
  business_id      UUID NOT NULL REFERENCES businesses(id),
  invited_by_user_id UUID NOT NULL REFERENCES users(id),
  invited_email    VARCHAR(255) NOT NULL,
  assigned_role    VARCHAR(20) NOT NULL CHECK (assigned_role IN ('admin','finance_maker','viewer')),
  token            VARCHAR(64) NOT NULL UNIQUE,   -- cryptographically random, URL-safe
  expires_at       TIMESTAMP NOT NULL,            -- created_at + 72 hours
  accepted_at      TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One pending invitation per email per business at a time
CREATE UNIQUE INDEX invitations_pending_email_business
  ON invitations(business_id, invited_email)
  WHERE accepted_at IS NULL;
```

On acceptance: create `User` record, set `Invitation.accepted_at`, token is invalidated. Re-inviting the same email creates a new `Invitation` row; the prior row expires naturally.

### Free-text field constraints

| Field | Min | Max | Type |
|---|---|---|---|
| `rejectionReason` | 10 chars | 500 chars | VARCHAR(500) |
| `complianceReviewReason` / block justification | 20 chars | 1000 chars | VARCHAR(1000) |
| `cancelledReason` | 10 chars | 500 chars | VARCHAR(500) |
| `costCenter` | 0 (optional) | 100 chars | VARCHAR(100) |
| `blockedReason` | 10 chars | 500 chars | VARCHAR(500) |
| `manualApprovalJustification` | 20 chars | 500 chars | VARCHAR(500) |

All constraints enforced at both frontend and backend. Backend rejects inputs exceeding max with HTTP 422.

---

## §4 — COMPLIANCE REVIEW GATE

### Confirmed trigger definitions

**HIGH_VALUE:** `amount >= 5_000_000_00` kobo (₦5,000,000). Fires at submission.

**DUPLICATE_INVOICE:** A new `PaymentRequest` is submitted where `invoiceId` matches the `invoiceId` of any existing `PaymentRequest` with `status NOT IN ('cancelled')` and `businessId = $current`. Cancellation exemption: if all prior requests against that invoice are `cancelled`, trigger does NOT fire.

**BENEFICIARY_CHANGE:** Vendor's NUBAN was changed within 24 hours before the current submission timestamp.

**REPEATED_FAILURE:**
```sql
COUNT(*) >= 3
FROM payment_requests
WHERE vendor_id = $vendor_id
  AND status = 'exception_queue'
  AND exception_category IN ('PSP_FAILURE', 'STATUS_UNKNOWN')
  AND business_id = $business_id
  AND created_at >= NOW() - INTERVAL '7 days'
```
Checker rejections (`cancelled` with reason) are excluded. Rolling 7-day window from current submission timestamp.

**AMBIGUOUS_MATCH:** Vendor's Jaro-Winkler name-match score fell in the 0.70–0.84 range at KYB time (auto-triggered from vendor verification result; no additional query needed).

### Four-eyes invariant (add to approval gate)

For any `PaymentRequest` where `compliance_review_resolved_by IS NOT NULL`:
```
authenticatedUserId ≠ maker_id
AND authenticatedUserId ≠ compliance_review_resolved_by
```
Either check fails → HTTP 403, message: "You cannot approve a request you reviewed in the compliance queue." Service-layer enforcement; not UI-only.

---

## §5 — VENDOR KYB

### Name-match routing (confirmed)

Jaro-Winkler score routing:
| Score range | Vendor status | Compliance trigger on next payment |
|---|---|---|
| ≥ 0.85 | `approved` | None |
| 0.70–0.84 | `needs_review` | `AMBIGUOUS_MATCH` |
| < 0.70 | `needs_review` | None (Checker must manually approve with justification) |
| API error / name unavailable | `needs_review` | None |

**There is no `blocked` outcome for name matching.** Hard mismatches and partial mismatches both route to `needs_review`. `blocked` is reserved exclusively for duplicate NUBAN (CLAUDE.md §5.7).

### Normalisation rule

All legal suffix normalisations (`LTD`, `CO`, `NIG`, `INT'L`, `&`) are applied as **whole-token replacements only**. A token must exactly match the suffix string after whitespace tokenisation — no substring replacement. Example: `"COOP"` does not match `"CO"` and is not replaced.

### Vendor edit policy (post-approval)

| Field | Editable | By role | On edit |
|---|---|---|---|
| Legal Business Name | No | — | — |
| CAC Number | No | — | — |
| Bank Name | Yes | Maker / Checker / Owner | None |
| NUBAN | Yes | Checker or Owner only | Reverts vendor to `verification_pending`; triggers KYB re-verification |
| NUBAN (if payment in `processing`) | Blocked | — | HTTP 422: "Cannot change bank details while a payment is in progress." |
| NUBAN (if payment in `compliance_review`) | Blocked | — | HTTP 422: "Cannot change bank details while a payment is under compliance review." |

On NUBAN change: all `pending_approval` PaymentRequests against this vendor display a hold notice and cannot be approved until re-verification completes.

---

## §6 — MAKER-CHECKER ENFORCEMENT

### [INVARIANT] Self-approval

`PaymentRequest.maker_id ≠ authenticatedUserId` checked on every approval attempt using the stored `maker_id` (set at creation, immutable). This check is independent of the user's current role at approval time. Promotion from Finance Maker to Admin does not grant ability to approve own requests.

### [INVARIANT] PIN binding

PIN validation and state transition execute as a **single atomic database transaction**. Steps in order — all within one transaction:

1. Verify `payment_request.business_id = authenticated user's businessId JWT claim`
2. Verify `status = 'pending_approval'` and `version = $expected_version`
3. Verify `maker_id ≠ authenticatedUserId`
4. Verify `compliance_review_resolved_by ≠ authenticatedUserId` (if not null)
5. Verify `bcrypt.compare(submitted_pin, User.pinHash)` = true
6. Execute the UPDATE below

No separate "validate PIN" endpoint exists. PIN result is never cached or reused across requests.

### [INVARIANT] Concurrency control

```sql
UPDATE payment_requests
SET status = 'processing',
    checker_id = $checker_id,
    approved_at = NOW(),
    version = version + 1
WHERE id = $payment_request_id
  AND version = $expected_version
  AND status = 'pending_approval'
```

`rowsAffected = 0` → HTTP 409, error code `CONCURRENCY_CONFLICT`, message: "This request was already actioned. Reloading." UI discards the current view and reloads fresh state. No retry from the client.

### PIN attempt policy

- 5 failed attempts per user per 15-minute rolling window → `pinLockedUntil = NOW() + 30 minutes`
- Auto-unlock after 30 minutes. Owner or Admin can also reset via Team Management.
- Locked → HTTP 429 with `Retry-After` header (seconds until unlock)
- Counter resets to 0 on successful PIN entry
- Applies to: payment approval, tranche confirmation, all future PIN-gated actions
- Fields on User: `pinFailedAttempts`, `pinLockedUntil`

### PIN setup flow

Mandatory at first login after email verification, before the user can access any protected feature (regardless of role). Flow: email verified → set password → set PIN → access granted. PIN is bcrypt-hashed (cost ≥ 10).

**PIN change:** available in Account Settings. Requires current PIN + new PIN. Invalidates all active sessions (forces re-login).

**PIN reset:** Owner or Admin initiates via Team Management → sends 30-minute setup link to user's registered email → user sets new PIN via same first-login flow.

---

## §7 — TRANCHE SPLITTING

### PSP single-transaction limit

`PSP_SINGLE_TRANSACTION_LIMIT = ₦10,000,000 (1,000,000,000 kobo)` — confirmed in build spec §7 and §12 Resolved Blockers. Stored in system config; not hardcoded. All tranche logic references this constant by name.

Maximum payment request without splitting: `PSP_SINGLE_TRANSACTION_LIMIT`. Maximum with 5 tranches: `₦50,000,000`. Amounts above ₦50,000,000 must be submitted as separate payment requests.

### Pre-submission limit check

At PaymentRequest submission: `IF amount > PSP_SINGLE_TRANSACTION_LIMIT * 5` → HTTP 422, error code `TRANCHE_LIMIT_EXCEEDED`, message: "This payment requires more than 5 tranches. Split it into separate payment requests." No `PaymentRequest` record is created.

### Amount calculation algorithm

Equal splits with remainder to final tranche:
```
tranche_amount = floor(invoice_amount / n)          -- for tranches 1 to n-1
final_tranche  = invoice_amount - (tranche_amount * (n - 1))
```
All amounts in kobo (integer). System asserts `SUM(all tranches) = invoice_amount` before presenting the tranche plan to the Checker. If assertion fails → block execution, log error, surface to exception queue.

### Sequencing

True sequential: next tranche is not dispatched until the prior tranche's settlement webhook is received and processed. Hold timeout: 48 hours. On timeout → sequence halts, `PaymentRequest` routes to `exception_queue` with `exceptionCategory = 'PARTIAL_TRANCHE_SETTLEMENT'`.

### Outbound idempotency

`pspIdempotencyKey` (UUID v4) is generated once per tranche at plan confirmation time. It is immutable for the lifetime of that tranche. On initial dispatch and all retries, the same `pspIdempotencyKey` is sent to the PSP. A new key is never generated for a retry. PSP simulator must return the result of the first request on duplicate key — no re-execution, no new webhook.

### Cascade on parent cancellation

When a parent `PaymentRequest` transitions to `cancelled`:
1. Set `orphaned = true` on all child `Tranche` records currently in `processing`
2. AuditLog entry: "Parent cancelled while N tranche(s) in processing. Awaiting settlement webhooks."
3. Arriving settlement webhooks for orphaned tranches: stored, not reconciled to parent status, routed to `exception_queue` with `exceptionCategory = 'ORPHANED_SETTLEMENT'`
4. Owner/Admin notification: "A settlement was received for a cancelled payment. Manual review required."

---

## §8 — RECONCILIATION ENGINE

### Deduplication key

`WebhookEvent.transactionReference` (PSP-issued) is the deduplication key. Not payload hash.

```sql
SELECT id FROM webhook_events
WHERE transaction_reference = $incoming_reference
  AND business_id = $business_id
```
Match → discard silently (HTTP 200 to PSP, no processing, no audit log entry).

### NIP charge tolerance

Auto-reconcile permitted (`settled → reconciled`) when:
```
ABS(settled_amount - invoice_amount) = applicable_nip_charge(invoice_amount)
```

```
applicable_nip_charge(amount_kobo):
  if amount_kobo <= 500_000:   return 0       // ≤₦5,000 — free (CBN Guide to Bank Charges, current)
  if amount_kobo <= 5_000_000: return 1_000   // ₦5,001–₦50,000 — max ₦10
  else:                        return 5_000   // ₦50,001+ — max ₦50
```

Any other variance → `exception_queue` with `exceptionCategory = 'AMOUNT_MISMATCH'`.

⚠ NIBSS has announced a target of zero NIP transfer fees (subscription model) by 2026. If this is implemented before launch, all three tiers should return 0 and the tolerance block becomes inert. Monitor CBN/NIBSS circulars before production deployment.

---

## §9 — EXCEPTION QUEUE

### Updated permitted actions

**PARTIAL_TRANCHE_SETTLEMENT** — remove "Initiate reversal". Permitted actions:
- Retry failed tranches
- Create a new payment request for the unrecovered amount
- Cancel

**VENDOR_BLOCKED (post-processing)** — remove "Initiate reversal". Permitted actions:
- Cancel (marks `PaymentRequest` as `cancelled` in Watchtower; any subsequent settlement webhook routes to `ORPHANED_SETTLEMENT`)

Tranche reversal is not supported in MVP. Add to §13 Out of Scope.

---

## §10 — AUDIT LOG

### Immutability enforcement (PostgreSQL)

```sql
-- Application role: INSERT and SELECT only
REVOKE UPDATE, DELETE ON TABLE audit_logs FROM payops_app_role;
GRANT INSERT, SELECT ON TABLE audit_logs TO payops_app_role;

-- Compliance read role: SELECT only
CREATE ROLE payops_audit_role;
GRANT SELECT ON TABLE audit_logs TO payops_audit_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE audit_logs FROM payops_audit_role;
```

Application service connects as `payops_app_role`. Any `UPDATE` or `DELETE` on `audit_logs` from application code = Critical defect (fails at database layer).

### Retention lock

`retentionLocked` on: `AuditLog`, `Invoice`, `PaymentRequest`, `WebhookEvent`.

- Settable by `owner` role only
- Irreversible at application layer — no role can set it back to `false`
- Setting on an `Invoice` record cascades: locks all associated `AuditLog` entries and `WebhookEvent` entries for that invoice's payment requests
- Triggers S3 Object Lock (GOVERNANCE mode, no expiry) for associated stored files
- Records with `retentionLocked = true` are excluded from all scheduled retention/deletion jobs

### WebhookEvent access control

`rawPayload` column: readable by `owner` and `admin` roles only. Enforced at service layer. Stored raw (no masking). Retention: 6 years. NDPA justification: financial records retention (CBN compliance requirement).

### IP address retention

`ipAddress` in `AuditLog`: stored in full for 6-year retention period. NDPA justification: fraud detection and financial audit (legitimate interest ground). Note for production: legal review recommended before go-live.

---

## §11 — TEAM MANAGEMENT

### Invitation flow

See `Invitation` table in §2. Token expiry: 72 hours. One pending invitation per email per business enforced by partial unique index. On acceptance: `User` record created atomically with `Invitation.accepted_at` set. Re-inviting creates a new row; the prior expires naturally.

### Ownership transfer flow

1. Owner selects a target Admin and initiates transfer in Team Management
2. System sends acceptance link to target Admin's registered email. Link expires 72 hours. One pending transfer per business at a time.
3. Target Admin accepts → atomic: target role → `owner`, outgoing user role → `admin`
4. At commit: any pending Checker actions by the outgoing Owner are invalidated. Affected `PaymentRequest` records revert to `status = 'pending_approval'`, `checker_id = null`
5. Expired unaccepted transfer → no role changes; Owner can re-initiate

---

## §12 — SIMULATED PSP SPECIFICATION

### Webhook schema

```json
{
  "paymentRequestId":    "string (UUID) — Watchtower reference echoed back",
  "transactionId":       "string (UUID) — PSP-issued; unique per settlement event; used for deduplication",
  "settlementStatus":    "SUCCESS | FAILED | PENDING",
  "settledAmount":       "integer (kobo)",
  "bankReference":       "string",
  "settlementTimestamp": "ISO 8601 datetime"
}
```

`transactionId` maps to `WebhookEvent.transactionReference` for deduplication. See §8.

### Webhook signing

PSP simulator signs every outbound webhook:
- Input: raw request body bytes (before JSON parsing)
- Key: `PSP_WEBHOOK_SECRET` env var — shared between simulator and Watchtower orchestration service
- Header: `X-PSP-Signature: sha256={hex-encoded HMAC}`

Watchtower webhook receiver:
1. Read raw body as bytes before any framework JSON parsing
2. Compute `HMAC-SHA256(raw_body, PSP_WEBHOOK_SECRET)`
3. Compare with `X-PSP-Signature` using constant-time comparison
4. Mismatch → HTTP 401, log (timestamp + source IP), discard. Do not process.

### Idempotency key handling

On receiving a dispatch request: if `pspIdempotencyKey` already exists in the simulator's records, return the stored result — no re-execution, no new webhook fired.

### Reversal

Not supported in MVP. No reversal endpoint. No reversal webhook schema.

---

## §13 — OUT OF SCOPE (ADDITIONS)

Add to existing list:

- Invoice PDF amount extraction / validation (OCR) — out of scope. Checker visually verifies invoice PDF against entered payment amount. Checker approval UI must display both values side by side.
- Tranche reversal — out of scope for MVP. Partial settlements resolved via exception queue management.
- Virus/malware scanning of uploaded invoice PDFs — post-MVP.
- Aggregate outage detection / circuit breaker — post-MVP. Per-vendor retry schedule (15m/30m/60m → `needs_review`) applies per CLAUDE.md §5.7.

---

## QUICK REFERENCE — DECISIONS SUMMARY

| Finding | Decision |
|---|---|
| ST-01 | `version INTEGER` on PaymentRequest; `UPDATE WHERE version = $n` approval contract |
| ST-02 | `exception_queue` as distinct status; `exceptionCategory` differentiates |
| ST-03 | Equal splits; remainder to final tranche |
| ST-04 | True sequential; hold until prior webhook; 48h timeout |
| ST-05 | DUPLICATE_INVOICE = new PR against invoice already linked to non-cancelled PR |
| ST-06 | Acceptance required; outgoing Owner → Admin; in-flight actions invalidated |
| ST-07 | 5 attempts / 15 min / 30 min lockout; auto-unlock + Owner/Admin reset |
| ST-08 | Redis session store; JWT 60 min; refresh 30 days |
| ST-09 | Whole-token normalisation only — no substring replacement |
| ST-10 | HMAC-based `nubanHash` for lookups; AES-256-GCM for storage |
| ST-11 | Approval fields on Vendor record directly |
| ST-13 | `complianceReviewResolvedBy` added as exclusion in approval gate |
| ST-14 | New PR can reuse Invoice after cancellation; DUPLICATE_INVOICE exempt if all prior PRs cancelled |
| ST-15 | No reversal in MVP; Cancel = mark cancelled; arriving webhook → ORPHANED_SETTLEMENT |
| ST-16 | `failed` eliminated; `processing → exception_queue` direct for PSP failures |
| ST-17 | REPEATED_FAILURE counts PSP_FAILURE and STATUS_UNKNOWN only; 7-day rolling window |
| ST-18 | NUBAN editable by Checker/Owner; triggers re-verification; blocked if payment in processing |
| ST-19 | `pspIdempotencyKey` per tranche; same key reused on retry |
| ST-20 | Field maxima confirmed — see §2 table |
| ST-21 | Tranche limit check at submission time |
| ST-23 | Separate Invitation table; 72h expiry |
| ST-25 | PIN setup mandatory at first login for all users |
| AL-01 | `blocked` not a KYB name-match outcome; all mismatches → `needs_review` |
| AL-03 | NIP charge tolerance band confirmed; CLAUDE.md §5.6 updated |
| BL-01 | Dedup key = `transactionReference` (PSP-issued); not payload hash |
| BL-04 | Tranche reversal out of scope for MVP |
| BL-08 | In-flight tranches complete on parent cancellation; settlement → ORPHANED_SETTLEMENT |
| SEC-01 | HMAC-SHA256 webhook signing confirmed |
| SEC-05 | 10 MB limit; magic byte validation; virus scan out of scope |
| SEC-07 | PostgreSQL role grants in spec; app role has INSERT/SELECT only on audit_logs |
| AL-05 | Tranche splitting flow confirmed as product spec; no separate PRD section required before build |
| AL-07 | Compliance Review Gate flow confirmed as product spec; no separate PRD section required before build |
| ST-22 | Build spec §12 Resolved Blockers table: update Blocker 1 (PSP webhook schema) status to ✅ Resolved — schema defined in this document §12 |

---

*Spec Resolution v1.1 — 2026-06-13. Resolves spec-review-v1.0. All findings closed.*

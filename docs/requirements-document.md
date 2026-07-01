# Requirements Document: PayOps Control Tower

**Document Status:** Complete — Panel-ready v1.0
**Target Market:** Nigeria
**Product Layer:** B2B Payment Operations & Workflow Orchestration (Non-Funds Holding)
**Capstone Deliverable:** 2 — Requirements Document
**Last updated:** 2026-06-13

---

## Overview

Nigerian SME finance teams manage the critical stages before and after a B2B payment — vendor verification, invoice matching, maker-checker authorization, settlement tracking, and audit logging — across a fragmented web of spreadsheets, manual WhatsApp threads, and disconnected banking portals. PayOps Control Tower acts as a centralised orchestration layer that provides one workspace to solve this.

This MVP does not hold funds. It orchestrates the workflow and logs the audit trail around the movement of funds by a licensed PSP partner.

**In scope:**
- Workflow orchestration and reconciliation (no customer fund custody, no proprietary ledger)
- Vendor verification via external API calls (CAC registration, NUBAN name matching)
- Strict Maker-Checker authorization for all payment execution
- Payment execution and settlement tracking via simulated PSP webhooks

**Out of scope:**
- Direct integration with live banking rails for real funds transfer
- International or cross-border vendor payments (MVP: domestic NGN only)
- Complex treasury management (FX exposure, yield generation)
- Invoice PDF amount extraction via OCR (Checker visually verifies amounts side by side)

---

## User Stories

### Story 1 — Business Onboarding & KYB

**As a** business owner, **I want to** create an account and complete my business KYB **so that** I can access the PayOps workspace and onboard my finance team.

**Flow:**
1. User selects "Create Account" and provides registration details.
2. System sends a 6-digit verification code to the provided email.
3. User enters the code to activate credentials.
4. On first login, system prompts completion of Business KYB profile.
5. User inputs Business Name, CAC Registration Number, and uploads a valid Director ID.
6. System verifies CAC details via third-party compliance widget (e.g., Smile ID, Sumsub).
7. System updates account status to `Active` upon successful verification.

**Input fields:**

| Field | Type | Required | Validation |
|---|---|---|---|
| Full Name | Text | Yes | Non-empty |
| Work Email | Email | Yes | Unique; valid format |
| Password | Password | Yes | Min 8 characters; alphanumeric |
| Business Name | Text | Yes | Must match official CAC records |
| CAC Number | Text | Yes | Used for API lookup |

**Acceptance Criteria:**
- AC1: A user who completes email verification and Business KYB can access the Vendor, Payment, and Team modules.
- AC2: A user who fails KYB sees a specific failure reason (e.g., "CAC number not found") and a retry path — not a generic error.
- AC3: An unverified user who logs in can see their account but is hard-blocked from Vendor, Payment, and Team modules until KYB is approved.
- AC4: The user who creates the account is automatically assigned the `Owner` role.
- AC5: The KYB step cannot be skipped or bypassed via URL navigation.
- AC6: All active sessions are terminated immediately when a user's access is revoked by the Owner.

> **PM ANNOTATION — Compliance gate scope (spec-review AL-07):** The compliance review gate (Story 5) was defined in the engineering spec but had no corresponding PRD section to validate against. This was flagged in the Spec vs. PRD Alignment Audit (finding AL-07) and explicitly confirmed as product scope. Business KYB is the first compliance checkpoint: unverified businesses are hard-blocked from all operational modules. The gate is not advisory — there is no "skip for now" path.

---

### Story 2 — Vendor Onboarding & KYB Gate

**As a** Finance Maker, **I want to** onboard a vendor **so that** the system can verify their legitimacy before any payment is authorised against them.

**Flow:**
1. Maker navigates to the Vendors module and selects "Add Vendor."
2. Maker inputs vendor's Legal Business Name, CAC Registration Number, and NUBAN account details.
3. System calls CAC validation API and NUBAN lookup API.
4. System executes a string-matching algorithm comparing the fetched CAC name against the fetched NUBAN account name.
5. On successful match: vendor status → `Approved`.
6. On any mismatch, name unavailable, or API error: vendor status → `Needs Review`.

**Acceptance Criteria:**
- AC1: A vendor with a Jaro-Winkler name-match score ≥ 0.85 is automatically set to `Approved`.
- AC2: A vendor with any degree of name mismatch, API error, or unavailable name is set to `Needs Review` — not `Approved` and not `Blocked`. There is no `Blocked` outcome for name matching.
- AC3: A Finance Maker cannot attach a vendor in `Needs Review` to a payment request.
- AC4: Only a Checker can manually approve a `Needs Review` vendor; a mandatory written justification (minimum 20 characters) is required and is stored permanently on the vendor record.
- AC5: If the submitted NUBAN is already linked to a different vendor in the same business account, submission is blocked immediately and a high-priority alert is sent to Owner and Checker.
- AC6: NUBAN account numbers are displayed with only the last 4 digits visible by default. Full number is encrypted at rest.
- AC7: If the CAC or NUBAN API times out, the vendor enters `Verification Pending` with automatic retries at 15, 30, and 60 minutes. After three failures the vendor is moved to `Needs Review`.

> **PM ANNOTATION — `Blocked` KYB outcome removed (spec-review AL-01):** The engineering spec introduced a third vendor KYB outcome — `Blocked` — for Jaro-Winkler scores below 0.70, treating hard mismatches differently from partial ones. This contradicted the operating contract (CLAUDE.md §5.5), which defines only two name-match outcomes: `Approved` (match) and `Needs Review` (everything else). This was caught during the Spec vs. PRD Alignment Audit. The `Blocked` state was removed from name matching entirely. All mismatches route to `Needs Review`, with the distinction preserved internally via an `AMBIGUOUS_MATCH` compliance trigger on subsequent payments for scores in the 0.70–0.84 range. The `Blocked` state is reserved exclusively for the duplicate NUBAN scenario.

> **PM ANNOTATION — String-matching algorithm confirmed (OPD-01 resolved):** The original PRD listed the string-matching algorithm as an open product decision. This was resolved during the spec resolution pass: the algorithm is Jaro-Winkler (library: `@skyra/jaro-winkler`) with a defined preprocessing pipeline for common Nigerian legal suffixes (LTD, CO, NIG, INT'L). Normalisation applies at whole-token level only — no substring replacement, preventing mutations like "COOP" being treated as "COMPANY OP."

---

### Story 3 — Payment Request Generation

**As a** Finance Maker, **I want to** create a payment request tied to an invoice **so that** it is queued for Checker review with everything needed to approve or reject it.

**Flow:**
1. Maker navigates to Payments and selects "New Request."
2. Maker selects an `Approved` vendor from the dropdown.
3. Maker inputs Invoice Number, Payment Amount, and Cost Center.
4. Maker uploads the supporting Invoice PDF.
5. System validates: invoice number is not a duplicate, vendor is `Approved`, file is a valid PDF ≤ 10 MB.
6. System creates the payment request at status `Pending Approval` (or `Compliance Review` if a trigger fires).
7. System notifies all available Checkers via email and in-app notification.

**Acceptance Criteria:**
- AC1: A payment request cannot be created against a vendor in `Needs Review` or `Verification Pending` status.
- AC2: A payment request cannot be submitted without an attached Invoice PDF. The file must be ≤ 10 MB and pass server-side magic-byte validation (`%PDF-` prefix). Client-provided Content-Type header is not trusted.
- AC3: If a non-cancelled payment request already exists against the same invoice, the new submission routes to `Compliance Review` with trigger `DUPLICATE_INVOICE` rather than being blocked outright.
- AC4: The Maker who created the request cannot approve it, regardless of their role at approval time.
- AC5: If the payment amount exceeds ₦50,000,000 (5 × PSP per-transaction limit), the submission is rejected with error code `TRANCHE_LIMIT_EXCEEDED`. No record is created.
- AC6: The Checker approval screen displays the Invoice PDF alongside the entered payment amount — both visible simultaneously.

> **PM ANNOTATION — Invoice amount validation is intentionally absent (spec-review BL-10):** There is no OCR-based validation that the entered payment amount matches the amount on the uploaded PDF. This gap is real and intentional: OCR invoice extraction is out of scope for MVP. Rather than leave this as a silent assumption, it was acknowledged explicitly in the spec as a Checker responsibility. AC6 above is a direct result of this gap being named — the UI must surface both values side by side to support the Checker's manual verification. This was added after the Business Logic audit flagged the absence of any acknowledgment.

---

### Story 4 — Maker-Checker Authorization

**As a** Checker (Admin or Owner), **I want to** review and authorise pending payment requests **so that** funds are released only after verified, dual-control approval.

**Flow:**
1. Checker accesses the Pending Approvals queue.
2. Checker opens a request to view: Amount, Vendor details, Invoice PDF, and (if applicable) compliance review outcome.
3. Checker selects Approve or Reject.
4. On approval: Checker enters their 4-digit PIN.
5. System validates PIN server-side within the same database transaction as the status change.
6. On PIN validation success: status → `Processing`; execution payload dispatched to PSP.
7. On rejection: Checker provides a mandatory reason (minimum 10 characters); status → `Cancelled`; Maker notified with reason.

**Acceptance Criteria:**
- AC1: Only users with `Owner` or `Admin` roles can act as Checkers.
- AC2: The Maker who created the request cannot approve it. This check uses the immutable `makerId` stored at creation — it is enforced regardless of the user's current role at approval time. A Finance Maker promoted to Admin cannot approve requests they originally submitted.
- AC3: PIN validation and the status transition to `Processing` execute as a single atomic database operation. No separate PIN validation endpoint exists. The PIN is never cached or reused across requests.
- AC4: After 5 failed PIN attempts within a 15-minute rolling window, the user's PIN is locked for 30 minutes. Locked users receive HTTP 429 with a `Retry-After` header.
- AC5: If a second Checker submits an approval after the first Checker has already acted, the second action fails with "This request was already actioned" and the UI reloads the current state. No duplicate PSP dispatch occurs.
- AC6: A Checker who cleared a high-value compliance review cannot also approve the same payment request. This is enforced server-side — HTTP 403 if the same user ID appears in both the compliance resolution and the approval attempt.

> **PM ANNOTATION — Concurrent approval double-execution risk (spec-review ST-01, BL-02):** The engineering spec had no `version` field on the PaymentRequest data model, despite the operating contract explicitly requiring optimistic concurrency control (CLAUDE.md §5.9). Without it, two Checkers opening the same request simultaneously could both validate their PINs and both commit — dispatching two PSP execution payloads for the same payment. In a live system, this is a double settlement. This was caught in the PRD Stress-Test (ST-01) and the Business Logic Integrity Audit (BL-02). The fix is a `version INTEGER` field on PaymentRequest, with the approval UPDATE including `WHERE version = $expected_version`. Zero rows updated = HTTP 409 conflict. This is now an explicit invariant in the spec.

> **PM ANNOTATION — Four-eyes gap for compliance-gated payments (spec-review ST-13, BL-06):** For high-value payments (≥ ₦5M), a compliance review fires before Checker approval. The original spec's only self-approval protection was "Maker cannot approve their own request." This didn't cover the scenario where the same Checker clears the compliance review and then approves the payment — defeating the purpose of the compliance gate. This exploit was found during the Business Logic audit. AC6 above is the resolution: `complianceReviewResolvedBy` is checked at approval time, and matching IDs produce a hard block.

---

### Story 5 — Orchestration & Reconciliation

**As a** Finance User, **I want to** see payment states update automatically based on settlement webhooks **so that** I never have to manually match bank screenshots to invoices.

**Flow:**
1. System holds the payment in `Processing` awaiting an external webhook.
2. System receives a simulated webhook from the PSP containing: Transaction ID, Settlement Status, Settled Amount, and Bank Reference.
3. System validates the webhook HMAC-SHA256 signature before any processing.
4. System checks Transaction ID for deduplication — a known Transaction ID is discarded silently.
5. If Settlement Status is SUCCESS and settled amount is within the applicable NIP charge tolerance: status → `Settled` → `Reconciled`.
6. If Settlement Status is FAILED, or the amount variance exceeds NIP tolerance: status → `exception_queue` with appropriate category.
7. If no webhook arrives within 48 hours: cron job routes to `exception_queue` with category `STATUS_UNKNOWN`.

**Acceptance Criteria:**
- AC1: A payment can only reach `Reconciled` if the variance between settled amount and invoice amount equals exactly the applicable NIP charge for that transaction tier: ≤ ₦5,000 → ₦0 (free); ₦5,001–₦50,000 → max ₦10; ₦50,001+ → max ₦50. Any other variance routes to `AMOUNT_MISMATCH`.
- AC2: If the PSP fires the same settlement webhook twice (identical `transactionId`), the second is discarded silently — HTTP 200 returned to PSP, no state change, no audit log entry.
- AC3: A webhook with an invalid or missing HMAC-SHA256 signature is rejected (HTTP 401) and logged with timestamp and source IP. It is never processed.
- AC4: Webhook payloads are stored in raw format in the audit log. Access restricted to Owner and Admin roles.
- AC5: Payments with no webhook received in 48 hours are moved to `exception_queue` with category `STATUS_UNKNOWN` by background cron. Owner and Maker are notified.

> **PM ANNOTATION — Deduplication key architectural divergence (spec-review AL-02, BL-01):** The engineering spec used SHA-256 of the raw webhook payload body (`payloadHash`) as the deduplication key. The operating contract states explicitly: "Transaction ID is the deduplication key" (CLAUDE.md §5.9). These are architecturally different. Payload hash is unstable — a PSP retry with a changed timestamp or nonce produces a different hash, passes deduplication, and triggers a second reconciliation attempt. Transaction ID is a stable PSP-issued business identifier. This divergence was caught in both the Business Logic Audit (BL-01) and the Spec vs. PRD Alignment Audit (AL-02). The deduplication key is `transactionReference` (PSP-issued), not the payload hash. `WebhookEvent.payloadHash` was removed and replaced with `transactionReference`.

> **PM ANNOTATION — Webhook security gap (spec-review SEC-01):** The initial spec defined no authentication mechanism for incoming webhooks. An attacker who discovered the webhook endpoint could forge a settlement payload with a valid `paymentRequestId`, pass the deduplication check, and trigger reconciliation for a payment that never settled. This was flagged as Critical in the Pre-Launch Security Review. The fix: the simulated PSP signs every outbound webhook with HMAC-SHA256 using a shared secret (`PSP_WEBHOOK_SECRET`). The receiver reads the raw request body, computes the expected HMAC, and compares using constant-time comparison before any JSON parsing. Signature mismatch → HTTP 401, logged, discarded.

---

### Story 6 — Team & Access Management

**As an** Owner, **I want to** invite teammates and assign roles **so that** the finance workflow is distributed securely without shared credentials.

**Flow:**
1. Owner navigates to Team Settings and selects "Invite Member."
2. Owner inputs teammate's email and selects a role: `Admin`, `Finance Maker`, or `Viewer`.
3. System sends an invitation link (valid 72 hours) to the provided email.
4. Teammate accepts the link, sets their password and 4-digit PIN, then logs in.

**Role Permissions Matrix:**

| Action | Owner | Admin (Checker) | Finance Maker | Viewer |
|---|---|---|---|---|
| Invite / remove users | ✓ | ✓ | — | — |
| Change business settings | ✓ | — | — | — |
| Add / edit vendors | ✓ | ✓ | ✓ | — |
| Create payment requests | ✓ | ✓ | ✓ | — |
| Approve payments (Checker) | ✓ | ✓ | — | — |
| View audit logs | ✓ | ✓ | ✓ | ✓ |
| Transfer ownership | ✓ | — | — | — |

**Acceptance Criteria:**
- AC1: Only one `Owner` per business account. The `Owner` role cannot be assigned to an invited member via the invite flow.
- AC2: Revoking a user's access terminates all their active sessions immediately (Redis session key deleted at revocation time).
- AC3: An invitation link expires after 72 hours. Only one pending invitation per email address per business account at a time.
- AC4: Ownership transfer requires the target Admin to accept via email link (72-hour window). On completion: target role → `Owner`; outgoing user role → `Admin`. Any pending Checker actions by the outgoing Owner are invalidated and the affected payment requests return to `Pending Approval`.

---

## Edge Case User Stories

### EC-1 — Vendor Name Mismatch: Manual Checker Override

**As a** Checker, **I want to** review and manually approve a flagged vendor **so that** my team can process payments to vendors whose legal names don't match exactly.

**Context:** Vendor "XYZ Logistics LTD" is submitted. CAC API returns "XYZ LOGISTICS LIMITED." NUBAN lookup returns "XYZ LOGISTICS LTD." Jaro-Winkler score between CAC name and NUBAN name: 0.78 (falls in 0.70–0.84 range → `Needs Review` with `AMBIGUOUS_MATCH` flag).

**Acceptance Criteria:**
- AC1: The Checker's vendor review screen displays both names explicitly — the CAC-registered name and the NUBAN account name — alongside the match score.
- AC2: The Checker can approve the vendor with a mandatory written justification (minimum 20 characters). Justification is stored on the vendor record (`manualApprovalJustification`) and is read-only once set.
- AC3: After manual approval, any future payment request against this vendor automatically triggers a `COMPLIANCE_REVIEW` with category `AMBIGUOUS_MATCH`, routing the payment for review before it reaches Pending Approval.
- AC4: A Finance Maker cannot manually approve a flagged vendor — this action is restricted to Checker and Owner roles.
- AC5: The manual approval action creates an immutable audit log entry: who approved, when, and what justification was provided.

---

### EC-2 — Duplicate Settlement Webhook: Idempotency Enforcement

**As a** system, **I need** the reconciliation engine to handle PSP retry webhooks correctly **so that** a settled payment is never reconciled twice.

**Context:** The PSP fires a "Payment Settled" webhook for a ₦500,000 payment. A network retry causes the same logical event to fire a second time 30 seconds later — same `transactionId`, different `settlementTimestamp`.

**Acceptance Criteria:**
- AC1: On receiving the first webhook, the system validates the signature, processes the payload, updates the payment to `Settled` → `Reconciled`, and stores the `transactionReference` in `WebhookEvent`.
- AC2: On receiving the second webhook with the identical `transactionReference`, the system returns HTTP 200 to the PSP (to stop further retries), makes no state changes, creates no audit log entry, and enqueues no new reconciliation job.
- AC3: The `PaymentRequest` appears in `Reconciled` status exactly once. The audit log has exactly one reconciliation entry. The Reconciliation view shows one settlement record.

---

### EC-3 — Over-Limit Payment: Tranche Splitting

**As a** Checker, **I want to** see the system's tranche plan for an over-limit payment **so that** I can confirm sequential dispatch instead of one blocked transaction.

**Context:** A Finance Maker creates a payment request for ₦15,000,000 to a vendor. The PSP per-transaction limit is ₦10,000,000. The request passes submission (₦15M < ₦50M maximum) and reaches the Checker's approval queue.

**Acceptance Criteria:**
- AC1: When the Checker opens the request, they see a "Tranche Required" notice with the system-calculated split: Tranche 1 = ₦10,000,000; Tranche 2 = ₦5,000,000. Sum is asserted to equal the invoice amount (₦15,000,000) before display.
- AC2: The Checker confirms with their PIN. Tranche 1 is dispatched to the PSP. Tranche 2 is held until Tranche 1's settlement webhook is received.
- AC3: If Tranche 1 settles and Tranche 2 is dispatched but no webhook arrives within 48 hours, the PaymentRequest routes to `exception_queue` with category `PARTIAL_TRANCHE_SETTLEMENT`.
- AC4: A payment request for ₦60,000,000 (exceeds 5 × PSP limit) is blocked at Maker submission time with error `TRANCHE_LIMIT_EXCEEDED`. The Maker sees: "This payment requires more than 5 tranches. Please split into separate payment requests." No record is created.
- AC5: Each tranche uses a unique `pspIdempotencyKey` generated at plan confirmation time. On retry, the same key is reused — the PSP returns the stored result without re-executing.

---

## Compliance Gate: Compliance Review Queue

Certain payments are automatically routed to a Compliance Review queue before reaching the Checker approval flow. This is the product's visible AML-adjacent control layer.

**Compliance triggers:**

| Trigger | Condition | Purpose |
|---|---|---|
| `HIGH_VALUE` | Payment amount ≥ ₦5,000,000 | AML threshold — high-value transactions require explicit review |
| `DUPLICATE_INVOICE` | New PR references an invoice already linked to a non-cancelled PR | Prevents double-payment and invoice fraud |
| `BENEFICIARY_CHANGE` | Vendor NUBAN changed within 24 hours of payment submission | Guards against beneficiary-swap fraud |
| `REPEATED_FAILURE` | ≥ 3 PSP failures or STATUS_UNKNOWN for same vendor in 7 days | Flags problematic counterparties before further exposure |
| `AMBIGUOUS_MATCH` | Vendor KYB score was 0.70–0.84 at verification time | Escalates marginal KYB vendors for high-value operations |

**Compliance Review Acceptance Criteria:**
- AC1: If any trigger fires at submission, payment status is set to `compliance_review` instead of `pending_approval`. The Maker is notified that the payment requires compliance review.
- AC2: Owner is notified at 24 hours if the review is unresolved. At 48 hours, the payment auto-moves to `exception_queue` with category `COMPLIANCE_REVIEW_TIMEOUT`.
- AC3: Clearing the review moves the payment to `pending_approval` for a different Checker to act on. Blocking the review routes to `exception_queue`.
- AC4: The Checker who cleared the compliance review cannot also approve the same payment request. Enforced server-side — HTTP 403 if IDs match. Not a UI-only check.

---

## Failure & Exception Scenarios

Payments that fail, time out, or contain anomalies are routed to the Exception Queue. The queue differentiates exceptions by category:

| Category | Trigger | Permitted actions |
|---|---|---|
| `PSP_FAILURE` | PSP returns a failure status | Retry; Cancel |
| `AMOUNT_MISMATCH` | Settled amount ≠ invoice amount (outside NIP tolerance) | Manual fee accounting; Cancel |
| `STATUS_UNKNOWN` | No webhook received in 48 hours | Retry status check; Cancel |
| `PARTIAL_TRANCHE_SETTLEMENT` | Tranche sequence interrupted | Retry failed tranches; Create new request for remainder; Cancel |
| `COMPLIANCE_REVIEW_TIMEOUT` | Compliance review unresolved at 48 hours | Re-open review; Cancel |
| `ORPHANED_SETTLEMENT` | Settlement arrives after parent PaymentRequest cancelled | Manual review; Acknowledge |

**Tranche reversal is not supported in MVP.** If settled tranches must be recalled, this is handled outside the product via the PSP partner directly.

---

## Document Status

**Version:** 1.0 — Panel-ready
**PRD blockers status:**
- ✅ PSP webhook JSON schema — defined in `spec-resolution-v1.md §12`
- ✅ NUBAN-to-CAC string-matching algorithm — confirmed as Jaro-Winkler with defined thresholds (`spec-resolution-v1.md §5`)
- ⏳ Invoice PDF data retention period — CITA 6-year retention applied as working assumption; formal legal confirmation recommended before production

---

## PM Annotation Summary

This document was produced using AI-assisted drafting. The panel can expect questions about the following points where AI output was challenged, corrected, or required explicit product decisions before being accepted.

| Finding | What the AI got wrong | What the PM did |
|---|---|---|
| AL-01 | Spec introduced `Blocked` as a third KYB name-match outcome not present in the PRD | Removed. All name mismatches route to `Needs Review`. `Blocked` reserved for duplicate NUBAN only. |
| AL-02 / BL-01 | Spec used payload SHA-256 hash as the webhook dedup key; PRD required Transaction ID | Corrected. Architecturally different — payload hash breaks on any field change. Transaction ID is stable. |
| ST-01 / BL-02 | No `version` field on PaymentRequest despite PRD requiring optimistic concurrency control | Added. Without it, two simultaneous Checker approvals could dispatch two PSP payloads for the same payment. |
| ST-13 / BL-06 | Single Checker could clear compliance review and then approve the same high-value payment | Blocked. `complianceReviewResolvedBy` is now an exclusion condition in the approval gate. |
| SEC-01 | No webhook signature verification defined — forged settlement webhooks possible | Added HMAC-SHA256 signing requirement to simulated PSP spec and receiver contract. |
| BL-07 | No cross-cutting tenant isolation requirement — `businessId` filter missing from all service specs | Added as a security invariant to §1 of the engineering spec. |

Full audit evidence: `spec-review-v1.md` (44 findings across 4 audit modes) and `spec-resolution-v1.md` (confirmed resolutions for all findings).

# Watchtower — Spec Review Findings v1.0

**Review date:** 2026-06-13
**Spec reviewed:** `payops-control-tower-spec.md` v1.0
**Modes run:** PRD Stress-Test → Business Logic & Flow Integrity Audit → Spec vs. PRD Alignment Audit → Pre-Launch Security & Integrity Review

---

## CLAUDE CODE RESOLUTION PROMPT

```
You are working on Watchtower. Read CLAUDE.md in full before proceeding.

MODE: MID-BUILD REQUIREMENT CLARIFICATION (bulk resolution pass)

The build spec (payops-control-tower-spec.md) has been reviewed across four audit modes.
Every open question below is blocking engineering from starting build or creates a
mid-build improvisation risk. Your job is to work through each finding in order and
propose a specific, testable resolution for each open question.

For every finding:
1. Read the cited spec section and the CLAUDE.md product context
2. Determine whether the answer is already derivable from the provided context
   — if yes, state the answer and cite the source
   — if not, propose your best interpretation and flag it as a product decision required
3. State the resolution in terms that can be written directly into the spec
   (numbered requirements, data model fields, enum values, or policy statements)
4. Flag any resolution that would contradict an existing spec constraint or CLAUDE.md rule

Do not resolve open questions by choosing the least-work interpretation.
Do not mark a question resolved if it requires a product owner decision.
Surface conflicts. Propose specific language. One resolution block per finding.

Work through ALL findings below in sequence. Do not skip any.
```

---

## REVIEW FINDINGS

---

## MODE 1: PRD STRESS-TEST

### BLOCKERS

---

**ST-01 — No `version` field on `PaymentRequest`**
**Section:** §2 Data Models / CLAUDE.md §5.9
CLAUDE.md §5.9 explicitly states: "Optimistic concurrency on payment approval. Version mismatch → Checker approval fails, UI reloads fresh state." The `PaymentRequest` data model has no `version` column. Without this field the concurrency control cannot be implemented.

> **Open question:** Should `version` be added to `PaymentRequest` as an integer incremented on every state mutation? If yes, define the column name, type, default value, and the exact `UPDATE WHERE version = $n` contract for the approval service.

---

**ST-02 — Exception queue items have no defined status value**
**Section:** §2 PaymentRequest + §9 Exception Queue
The `PaymentRequest.status` enum is: `draft | pending_approval | compliance_review | processing | settled | reconciled | failed | disputed | cancelled`. There is no `exception_queue` value. Section 9 defines seven exception categories with permitted actions, but does not define what `status` a `PaymentRequest` holds while sitting in the exception queue.

> **Open question:** What is the `status` value on a `PaymentRequest` record for each exception category? Provide a mapping:
> - `AMOUNT_MISMATCH` → status?
> - `STATUS_UNKNOWN` → status?
> - `PSP_FAILURE` → status?
> - `PARTIAL_TRANCHE_SETTLEMENT` → status?
> - `COMPLIANCE_REVIEW_TIMEOUT` → status?
> - `VENDOR_BLOCKED` (post-processing) → status?
> - `AMBIGUOUS_MATCH` → status?

---

**ST-03 — Tranche amount calculation algorithm not defined**
**Section:** §7 Tranche Splitting
The spec states: "Tranche amounts are calculated by the system. They are not configurable by the Maker or Checker." No algorithm is provided. If the amount is ₦15,000,001 against a ₦10,000,000 limit, the split is not obvious. The Checker confirms the plan before execution — the plan must be deterministically reproducible.

> **Open question:** What is the tranche amount calculation algorithm? Options include: equal splits rounded to nearest kobo with remainder added to the final tranche; or first tranche maxed at the PSP limit with remainder in the last tranche. Define the rounding rule for sub-kobo remainders and confirm the total must equal the approved invoice amount exactly.

---

**ST-04 — Sequential tranche submission: hold-or-proceed on failure not defined**
**Section:** §7 Tranche Splitting
The spec says tranches are submitted "sequentially." This is ambiguous: (a) submit Tranche 1, wait for settlement webhook, then submit Tranche 2; or (b) submit all tranches in order without waiting for each settlement. These have fundamentally different failure modes and reconciliation semantics.

> **Open question:** Does sequential mean the next tranche is held until the prior tranche's settlement webhook is received? If yes, what is the hold timeout before treating the prior tranche as failed and halting the sequence?

---

**ST-05 — "Duplicate invoice" compliance trigger definition is ambiguous**
**Section:** §4 Compliance Review Gate
The `DUPLICATE_INVOICE` trigger states: "Exact match on `(vendorId, invoiceNumber)`." The `Invoice` table already enforces uniqueness on `(businessId, vendorId, invoiceNumber)` at the database level — a second Invoice record with the same number cannot be created. The compliance trigger must therefore be detecting something else: a `PaymentRequest` being submitted against an Invoice record that is already referenced by another non-cancelled `PaymentRequest`.

> **Open question:** Confirm whether the `DUPLICATE_INVOICE` compliance trigger fires when: (a) a second Invoice record with the same number is attempted (currently blocked by unique index — this trigger would never fire), or (b) a new `PaymentRequest` is submitted referencing an Invoice that is already linked to an existing non-cancelled `PaymentRequest`. State the exact query condition.

---

**ST-06 — Ownership transfer flow is completely undefined**
**Section:** §11 Role Permissions Matrix
The permissions matrix lists "Transfer ownership: Owner ✓" but no spec section defines the flow. Key unknowns: acceptance required from new owner, role assigned to previous owner after transfer, whether in-flight approvals by the previous owner are honoured.

> **Open question:** Define the ownership transfer flow. At minimum: (1) steps and confirmations required, (2) role assigned to the transferring Owner after transfer completes, (3) what happens to any pending Checker actions initiated by the transferring Owner.

---

**ST-07 — PIN brute force protection not defined**
**Section:** §6 Maker-Checker Enforcement, §7 Tranche Splitting
A 4-digit PIN has 10,000 possible values. The spec defines server-side validation but no attempt limit, lockout policy, or cooldown. Without this, automated brute force of an approval PIN is feasible within a single session.

> **Open question:** Define the PIN attempt limit (per user, per time window), the lockout behavior on threshold breach, and the unlock mechanism (time-based auto-unlock, Owner reset, or both). Does the same limit apply to the tranche confirmation PIN step?

---

**ST-08 — Session/JWT revocation mechanism not defined**
**Section:** §1 Auth Service
The spec and CLAUDE.md both state: "Revoking access terminates active sessions immediately." The Auth Service lists session management as a responsibility but provides no mechanism. Stateless JWTs cannot be invalidated without a server-side check.

> **Open question:** Define the session invalidation mechanism. Options: (a) short-lived JWTs (≤15 min) with refresh token rotation — revocation invalidates the refresh token; (b) Redis session store checked on every request — revocation deletes the session key; (c) token blacklist checked on every request. The mechanism chosen must guarantee that setting `isActive = false` on a User record takes effect within one request cycle. State which approach is adopted and define the JWT TTL and refresh token TTL.

---

### MID-BUILD RISKS

---

**ST-09 — `CO → COMPANY` normalisation is a substring risk**
**Section:** §5 Vendor KYB Preprocessing
The preprocessing step normalises `CO` → `COMPANY`. The spec does not specify whether this replacement is applied at the token level (match whole word only) or as a substring. Substring replacement would mutate names containing "CO" as part of a word after punctuation is stripped (e.g., "BLUE CO-OP LIMITED" → strip hyphen → "BLUE COOP LIMITED" → substring replace CO → "BLUE COMPANYOP LIMITED").

> **Open question:** Confirm that all legal suffix normalisations (LTD, CO, NIG, INT'L, &) are applied as whole-token replacements only — i.e., the token must exactly match the suffix string after whitespace splitting, not as a substring. If yes, state this explicitly in the preprocessing spec.

---

**ST-10 — Composite fallback lookup uses NUBAN which is encrypted at rest**
**Section:** §8 Reconciliation Engine
The reconciliation composite fallback key includes `vendorNUBAN`. The Vendor model specifies NUBAN is encrypted at rest. A `WHERE nuban = ?` query on an encrypted column is not executable without decryption or a deterministic encryption scheme.

> **Open question:** Define the NUBAN encryption scheme. If deterministic encryption (same plaintext always produces the same ciphertext), equality lookup is possible. If random-IV encryption, a separate HMAC or salted hash of the NUBAN must be stored for search purposes. State which approach is used, and define the column or mechanism used for NUBAN equality lookups in the reconciliation engine.

---

**ST-11 — No `approvedBy` / `approvedAt` / `manualApprovalJustification` on Vendor record**
**Section:** §5 Vendor KYB, §2 Vendor model
The spec requires Checker manual approval of `needs_review` vendors with a mandatory justification string. The AuditLog captures this event, but the Vendor record itself has no fields recording who approved, when, and the justification text. If a vendor's approval history is queried directly from the Vendor table (e.g., in the vendor detail view), this information is absent.

> **Open question:** Should the Vendor model store `manuallyApprovedBy` (UUID FK → User), `manuallyApprovedAt` (timestamp), and `manualApprovalJustification` (string) directly on the record? Or is the AuditLog the sole authoritative source for manual approval history, with the UI joining against it?

---

**ST-12 — Fraud flag for indefinite retention has no data model**
**Section:** §10 Audit Log Requirements
The retention policy states: "Records flagged as part of a fraud investigation are locked with no expiry date." None of the data models (`Invoice`, `PaymentRequest`, `AuditLog`, `WebhookEvent`) include a fraud flag or retention lock field. The S3 object lock mechanism is referenced but there is no application-layer flag to drive it.

> **Open question:** Which tables require a `retentionLocked` (or equivalent) boolean flag? Define the field name, default value, and which role(s) can set it. Define how the flag maps to the S3 object lock instruction — is it set at upload time, or can it be applied retroactively to existing objects?

---

**ST-13 — High-value pre-submission compliance review: single-Checker four-eyes gap**
**Section:** §4 Compliance Review Gate, Resolution Flow
A ₦6M payment triggers `compliance_review` at submission. At this point `checkerId` is null (no Checker has yet acted). Section 4 states "A Checker cannot clear a request they were also the original approver of" — but since there is no original approver, the constraint is vacuous. Any single Checker can clear the compliance review and then approve the same request, defeating the purpose of the gate.

> **Open question:** For compliance reviews triggered at submission time (where `checkerId` is null), should the Checker who clears the review be excluded from subsequently approving it? If yes, the `complianceReviewResolvedBy` field (already in the data model) must be checked as an exclusion condition in the approval gate alongside `makerId`. Confirm this behaviour.

---

**ST-14 — Invoice reuse after payment request cancellation not defined**
**Section:** §2 Invoice, §6 Maker-Checker Enforcement
The Invoice table unique index prevents a second Invoice record with the same `(businessId, vendorId, invoiceNumber)`. If a PaymentRequest against an invoice is rejected (goes to `cancelled`), the spec says "a new request must be created" — but a new request would reference the existing Invoice record (creating a new Invoice record would fail the unique constraint). The `DUPLICATE_INVOICE` compliance trigger (see ST-05) may then fire against this reuse.

> **Open question:** When a PaymentRequest is cancelled, can a new PaymentRequest reference the same Invoice record? If yes, does the `DUPLICATE_INVOICE` compliance trigger fire, or is there an exemption when the prior request was cancelled? State the exact condition.

---

**ST-15 — VENDOR_BLOCKED exception during `processing`: reversal path undefined**
**Section:** §9 Exception Queue, VENDOR_BLOCKED category
This exception can occur after a payment has been dispatched to the simulated PSP. The permitted action "Cancel" is listed but the cancellation path for an already-dispatched payment in the simulated environment is not defined. The simulated PSP may have already fired a settlement webhook.

> **Open question:** For a `VENDOR_BLOCKED` exception on a request already in `processing`, does "Cancel" mean: (a) attempt a PSP reversal instruction (requires defining a reversal webhook schema for the simulator), or (b) mark the request as cancelled in Watchtower and route the settlement webhook (when it arrives) to the exception queue with a new category? Define the simulated PSP's reversal capability.

---

**ST-16 — `failed` status: terminal or transient?**
**Section:** §2 PaymentRequest status enum, §3 State Machine
`failed` appears in both the status enum and the state machine diagram. The diagram shows PSP failure routing to `exception_queue` — but `exception_queue` is not a status value. It is unclear whether a PSP-failed request rests at `failed` status (and the exception queue is a filtered view on `failed` + `exceptionCategory IS NOT NULL`), or whether `failed` is transient.

> **Open question:** Is `failed` a resting status for PSP-failed payments? If yes, confirm that the exception queue for `PSP_FAILURE` category is a filtered view: `WHERE status = 'failed' AND exceptionCategory = 'PSP_FAILURE'`. If `failed` is transient, define what status replaces it as the resting state.

---

**ST-17 — `REPEATED_FAILURE` trigger: which event types count as a failure?**
**Section:** §4 Compliance Review Gate
The trigger fires on "≥ 3 failures to same vendor within 7 days." The spec does not define which event types count as a failure. The answer significantly changes the trigger's sensitivity: PSP failures only targets genuine settlement problems; including Checker rejections could penalise legitimate vendors.

> **Open question:** Which specific event types count toward the ≥3 failure threshold for `REPEATED_FAILURE`? State the exact list from: `PSP_FAILURE`, `STATUS_UNKNOWN`, `AMOUNT_MISMATCH`, `Checker rejection`, `Compliance review block`. State the lookback window start point (from current submission timestamp, or from a rolling 7-day window).

---

**ST-18 — Vendor edit and NUBAN change flow not defined**
**Section:** §4 BENEFICIARY_CHANGE trigger, §5 Vendor KYB
The `BENEFICIARY_CHANGE` compliance trigger fires when a vendor's NUBAN changes. But no vendor edit flow is defined. It is unknown whether NUBANs are editable, and if so, whether editing triggers KYB re-verification.

> **Open question:** Which vendor fields are editable after a vendor reaches `approved` status? If NUBAN is editable: (a) does a NUBAN change revert the vendor to `verification_pending` and trigger KYB re-verification, or (b) does it trigger only the `BENEFICIARY_CHANGE` compliance flag on the next payment? Define the edit permissions by role.

---

**ST-19 — PSP retry idempotency for outbound tranche submission not defined**
**Section:** §7 Tranche Splitting, §9 PARTIAL_TRANCHE_SETTLEMENT
The exception queue allows "Retry failed tranches." If a tranche was dispatched to the PSP and the network timed out (no failure confirmation received), a retry could result in double execution at the PSP. The spec defines deduplication for inbound webhooks but not for outbound PSP calls.

> **Open question:** What is the idempotency mechanism for outbound PSP execution calls? Define whether a `pspReference` (idempotency key sent to PSP with each execution request) is generated per dispatch attempt or per tranche. On retry, is the same `pspReference` reused (idempotent retry) or a new one generated (new execution)? The simulated PSP must implement idempotency key handling accordingly.

---

**ST-20 — Maximum character length absent on free-text fields**
**Section:** §2 Data Models, §4, §6
The following fields define a minimum length but no maximum:
- `rejectionReason` (min 10 chars, no max — §6)
- `complianceReviewReason` / block justification (min 20 chars, no max — §4)
- `cancelledReason` (no min or max)
- `costCenter` (no constraints)
- `blockedReason` (no constraints)

> **Open question:** Define the maximum character length for each of the above fields. Confirm whether these map to `VARCHAR(n)` in the schema or remain `TEXT` with application-layer validation only.

---

**ST-21 — "≥ 5 tranches exceeded" error: shown at submission or at approval?**
**Section:** §7 Tranche Splitting
The spec states: "The request is blocked at submission with an error message to the Maker." But tranche detection is triggered by Checker approval. The Maker cannot know at submission whether the amount requires more than 5 tranches without the system running a pre-check.

> **Open question:** Does the maximum-tranche check run at submission time as a pre-validation (amount > PSP limit × 5 → reject at submission, error shown to Maker immediately), or at approval time (Checker triggers tranche plan generation, system detects >5 tranches required, Checker is shown the error and must notify Maker)? Define when in the flow the check runs and who sees the error.

---

### CLARIFICATIONS

---

**ST-22 — Blocker 1 status is contradictory**
**Section:** §12 Resolved Blockers
The table marks Blocker 1 (PSP webhook JSON schema) with ✅ but the narrative reads: "Remaining engineering actions before build begins: Define the simulated PSP webhook JSON schema (Blocker 1)." The ✅ implies resolved; the narrative says it is open.

> **Action required:** Correct the table to use a consistent status indicator. If ✅ means "assigned to engineering to define," use a different marker (e.g., ⏳) to distinguish from "confirmed resolved."

---

**ST-23 — User invitation flow has no data model**
**Section:** §2 User model, §11 Permissions Matrix
"Invite / remove users: Owner ✓" is in the permissions matrix. No invitation model is defined. CLAUDE.md §5.5 states "Invitation link → teammate sets password and logs in." The token, expiry, invited-by, and consumed state are absent.

> **Open question:** Is the invitation flow modelled as additional nullable fields on the `User` table (e.g., `invitationToken`, `invitedBy`, `invitedAt`, `invitationExpiryAt`, `invitationAcceptedAt`), or as a separate `Invitation` table? Define the invitation token expiry period.

---

**ST-24 — `COMPLIANCE_REVIEW_TIMEOUT`: what status does the record hold?**
**Section:** §4 Compliance Review Gate timeout, §2 PaymentRequest enum
A request that times out in `compliance_review` "auto-moves to the exception queue with category `COMPLIANCE_REVIEW_TIMEOUT`." Since `exception_queue` is not a status value (see ST-02), the record must retain `compliance_review` status or transition to another value.

> **Open question:** Covered by ST-02. Ensure the ST-02 resolution explicitly addresses this category.

---

**ST-25 — When is a User's PIN set?**
**Section:** §2 User model
`pinHash` is required on the User record. The PIN setup flow — when it is created, how it is changed, and what happens if it has not been set — is entirely absent from the spec.

> **Open question:** When does a user set their PIN? Options: (a) mandatory step during registration flow; (b) mandatory step on first login; (c) optional until the user attempts a Checker action (prompted at that point). Define the PIN reset flow and whether a user with no PIN set can hold the `admin` or `owner` role.

---

---

## MODE 2: BUSINESS LOGIC & FLOW INTEGRITY AUDIT

---

### CRITICAL

---

**BL-01 — Webhook idempotency key is vulnerable to legitimate PSP retries**
**Section:** §8 Reconciliation Engine, `WebhookEvent.payloadHash`
**Exploit path:**
1. PSP sends settlement webhook. Payload includes a `settlementTimestamp`.
2. PSP network retry sends the same logical event with a different timestamp or nonce.
3. SHA-256 of the new payload differs → idempotency check passes.
4. A second reconciliation job is enqueued and processed.
5. System attempts a second status transition on an already-settled record.

**Business impact:** Double reconciliation attempt; audit log pollution; precursor to double-settlement in a live integration.
**Root cause:** CLAUDE.md §5.9 explicitly states "Transaction ID is the deduplication key." The spec substitutes raw payload hash. These are architecturally different.

> **Open question:** Confirm that the deduplication key should be the PSP-issued transaction reference (a business identifier within the payload), not the SHA-256 of the raw payload body. Define the field name in the simulated webhook schema that carries this value, and update the `WebhookEvent` deduplication check accordingly.

---

**BL-02 — Concurrent Checker approval: missing version guard enables double execution**
**Section:** §6 Maker-Checker Enforcement
**Exploit path:**
1. Two Checkers simultaneously open the same `pending_approval` request.
2. Both enter PIN and submit approval.
3. Without a version field, both pass the `status = 'pending_approval'` pre-condition.
4. Both transactions commit. Two PSP execution payloads are dispatched.

**Business impact:** Double execution. In a live system: double settlement.
**Root cause:** Confirmed PRD constraint (CLAUDE.md §5.9) has no implementation in the data model.

> **Open question:** Covered by ST-01. Confirm the `version` field resolution also explicitly specifies the `UPDATE WHERE version = $n AND status = 'pending_approval'` contract — zero rows updated must return a specific error code that the UI translates into "This request was already actioned. Reloading."

---

**BL-03 — PIN step-up validation is not bound to a specific payment request**
**Section:** §6 Maker-Checker Enforcement, §7 Tranche Splitting
**Exploit path:**
1. Checker enters valid PIN for PaymentRequest A.
2. An attacker replays the PIN validation result against PaymentRequest B in a concurrent call within the same session.
3. If the server validates "PIN is correct for this user" without binding the check to a specific `paymentRequestId`, PaymentRequest B is also approved.

**Business impact:** Approving a payment the Checker did not review.

> **Open question:** Confirm that the PIN validation step is explicitly bound to the `paymentRequestId` at the server — the approval request body must include both the PIN and the `paymentRequestId`, and the server must verify both together as a single atomic operation. The PIN hash check must not be decoupled from the state transition.

---

**BL-04 — Tranche reversal has no defined execution path in MVP**
**Section:** §7 Tranche Splitting, §9 PARTIAL_TRANCHE_SETTLEMENT
**Failure path:**
1. Two of three tranches settle. Tranche 3 fails.
2. Checker selects "Initiate reversal of already-settled tranches."
3. No reversal webhook schema exists for the simulated PSP. No reversal state exists in the PaymentRequest model. No reversal status value exists in the enum.
4. Engineering invents the reversal flow.

**Business impact:** Mid-build improvisation on a financially sensitive, irreversible-feeling operation.

> **Open question:** Does the MVP simulated PSP support reversal? If yes: (a) define the reversal instruction payload the orchestration service sends; (b) define the reversal webhook payload the simulator fires back; (c) define the PaymentRequest status for a reversed tranche (new value needed in enum: `reversed`?). If no: explicitly state that "Initiate reversal" is not available in MVP and remove it from the §9 permitted actions for `PARTIAL_TRANCHE_SETTLEMENT`.

---

### HIGH

---

**BL-05 — Self-approval bypass via role change**
**Section:** §6 Maker-Checker Enforcement
**Exploit path:**
1. User U (Finance Maker) creates PaymentRequest P (`makerId = U.id`).
2. Owner promotes U to Admin.
3. U (now Admin) navigates to PaymentRequest P and attempts approval.
4. If any code path checks role only ("is this user an Admin?") without the identity check, the block fails.

**Business impact:** Self-approval; bypasses four-eyes control.

> **Open question:** Confirm explicitly in the spec that the `makerId ≠ authenticatedUserId` check is applied at the service layer regardless of the authenticated user's current role at approval time. The check must use the immutable `makerId` value stored on the record, not a re-lookup of the submitter's current role. Add this as an explicit invariant statement in §6.

---

**BL-06 — Compliance review four-eyes gap for high-value pre-submission flags**
**Section:** §4 Compliance Review Gate, Resolution Flow
**Exploit path:**
1. Maker submits ₦6M → `compliance_review`. `checkerId` = null.
2. Checker C1 clears the review. `complianceReviewResolvedBy = C1.id`.
3. C1 immediately approves from the approval queue with their PIN.
4. Single Checker handled both the compliance gate and financial approval for a high-value payment.

> **Open question:** Covered by ST-13. Confirm the resolution: `complianceReviewResolvedBy` must be checked as an exclusion condition in the approval gate — a Checker whose ID appears in `complianceReviewResolvedBy` cannot approve that request. Add this as an explicit invariant in §6.

---

**BL-07 — Multi-tenancy isolation not explicitly defined at service layer**
**Section:** §1 System Architecture
No service specification includes a tenant isolation requirement. Without it, individual engineers may implement some endpoints with `businessId` filtering and others without.

> **Open question:** Add an explicit cross-cutting requirement to §1 (or a new §1.x Security Invariants section): "Every read and write operation on any resource must include a `businessId` filter equal to the authenticated user's `businessId` claim from the JWT. Business ID is never accepted from request parameters or request body for this purpose. Violation of tenant isolation is a Critical security defect."

---

**BL-08 — Orphaned child tranches when parent is cancelled**
**Section:** §7 Tranche Splitting
**Failure path:**
1. Parent P is split into T1, T2, T3. T1 is in `processing`.
2. Vendor is blocked → P enters `compliance_review`. Checker blocks P → P moves to `cancelled`.
3. T1's settlement webhook arrives. Reconciliation engine processes it. T1 is marked `reconciled`.
4. Settlement recorded against a cancelled payment order.

> **Open question:** Define the cascade behaviour when a parent PaymentRequest transitions to `cancelled` while child tranches are in `processing`. Options: (a) in-flight tranches are allowed to complete but their settlement is flagged as `ORPHANED_SETTLEMENT` in the exception queue; (b) a cancellation instruction is sent to the simulated PSP for all in-flight tranches. State which applies and add the cascade rule to §7.

---

**BL-09 — Session revocation mid-approval: outcome undefined**
**Section:** §1 Auth Service, §6 Maker-Checker Enforcement
**Failure path:**
1. Checker's approval request is in-flight. Owner revokes Checker's access (`isActive = false`).
2. The server must decide: honour the approval (token valid at dispatch) or reject it (user inactive).

> **Open question:** Define the outcome. Recommendation: if the user's `isActive` flag is false at the time the request is processed server-side, the request is rejected regardless of token validity. Add this as an explicit rule in the Auth Service spec and in §6 invariants.

---

**BL-10 — Invoice amount vs. payment request amount mismatch is an accepted, unacknowledged risk**
**Section:** §2 Invoice, §2 PaymentRequest
A Maker can enter any amount on the payment request regardless of what the uploaded invoice PDF states. There is no OCR or programmatic invoice amount validation. This gap is real and intentional (OCR is out of scope) but is not acknowledged in the spec.

> **Action required:** Add an explicit note to §2 (PaymentRequest) and §13 (Out of Scope): "Invoice PDF amount is not programmatically validated against the entered payment amount (OCR is out of scope for MVP). The Checker's review responsibility includes visually verifying the invoice PDF amount against the payment request amount before approving. The Checker approval UI must display both values prominently side by side."

---

---

## MODE 3: SPEC VS. PRD ALIGNMENT AUDIT

---

### BLOCKERS

---

**AL-01 — Vendor `blocked` KYB outcome is not in CLAUDE.md**
**CLAUDE.md §5.5:** "Match → `Approved`. Mismatch or API error → `Needs Review`." Only two KYB outcomes defined.
**CLAUDE.md §5.7 Vendor State Machine:** `blocked` exists only for "Duplicate NUBAN across different vendor records."
**Spec §5:** Introduces `blocked` as a third KYB outcome for Jaro-Winkler scores below 0.70.

This is silent scope expansion. The PRD defines two KYB outcomes for name matching; the spec introduces a third.

> **Open question:** Is `blocked` (hard mismatch for score < 0.70) an approved product outcome for vendor KYB name matching? If yes, update CLAUDE.md §5.5 and §5.7 to include it. If no, the spec must be corrected so all name-match mismatches route to `needs_review` regardless of score, and the `blocked` state for vendor KYB is reserved for duplicate NUBAN only.

---

**AL-02 — Idempotency key divergence: CLAUDE.md names Transaction ID; spec uses payload hash**
**CLAUDE.md §5.9:** "Transaction ID is the deduplication key."
**Spec §8:** `payloadHash` (SHA-256 of raw payload) is the deduplication key.

These are architecturally different. See also BL-01.

> **Open question:** Is the idempotency key the PSP-issued transaction reference (`transactionId`, a business identifier in the payload), or the SHA-256 of the raw payload body? Confirm which is authoritative. If transaction reference: update `WebhookEvent.payloadHash` to `transactionReference` (or add it as a separate indexed column) and update the deduplication check in §8. Update CLAUDE.md §5.9 to reflect the confirmed approach.

---

**AL-03 — Reconciliation tolerance band contradicts CLAUDE.md §5.6 blocked transition**
**CLAUDE.md §5.6:** "Cannot reach `Reconciled` if settlement amount ≠ invoice amount." — stated as absolute.
**Spec §8:** Auto-reconcile is permitted when the variance equals exactly the applicable statutory NIP charge — meaning `settlementAmount ≠ invoiceAmount` can result in `Reconciled`.

> **Open question:** Confirm that CLAUDE.md §5.6 should be updated to read: "Cannot reach `Reconciled` if the variance between settlement amount and invoice amount falls outside the CBN-regulated NIP charge schedule for the transaction tier." This is a PRD update, not a spec fix. Confirm the update before build begins.

---

### RISKS

---

**AL-04 — `version` field required by CLAUDE.md absent from spec (cross-reference ST-01)**
**CLAUDE.md §5.9:** "Optimistic concurrency on payment approval." No `version` field in §2.
Covered by ST-01. Ensure ST-01 resolution also closes this alignment gap.

---

**AL-05 — Tranche flow is spec-introduced with no PRD backing**
**Section:** §7 Tranche Splitting
The tranche splitting flow (second PIN, sequential submission, partial reconciliation, reversal) is not present in CLAUDE.md. It introduces new user-facing behaviour (Checker sees a tranche confirmation step) that has no PRD requirement to validate against.

> **Open question:** Should a PRD section for Tranche Splitting be drafted before the spec section is treated as authoritative? Alternatively, confirm that the tranche flow is an engineering-internal implementation detail with no separate PRD requirement — in which case note explicitly which user-visible behaviours (the tranche confirmation screen, second PIN step) are confirmed product decisions.

---

**AL-06 — PSP webhook schema omits PSP transaction identifier**
**CLAUDE.md §5.8:** PSP Webhook "Returns settlement status, Transaction ID, Bank Reference."
**Spec §12 Resolved Blockers:** Defines fields as `paymentRequestId`, `settlementStatus`, `settledAmount`, `bankReference`, `settlementTimestamp`. `transactionId` (PSP-issued) is absent.

`paymentRequestId` is Watchtower's own reference echoed back — not the PSP's transaction ID. CLAUDE.md designates transaction ID as the deduplication key (§5.9). The spec's webhook schema omits the field that performs deduplication.

> **Open question:** Add `transactionId` (PSP-issued, unique per settlement event) to the simulated PSP webhook schema in §12. Confirm this is the field used for `WebhookEvent` deduplication (resolving AL-02 and BL-01).

---

**AL-07 — Compliance Review Gate is defined only in spec; no PRD section exists**
**Section:** §4 Compliance Review Gate
CLAUDE.md's payment state machine references `Compliance Review` as a state but provides no triggers, resolution flow, or timeout escalation. The spec defines significant product behaviour (five triggers, dedicated queue, 24/48h escalation, Checker resolution flow) with no PRD requirement to validate against.

> **Open question:** Should a PRD section for Compliance Review Gate be drafted and confirmed before §4 of the spec is treated as authoritative? This is especially important because §4 defines user-facing workflows (the compliance queue, Clear/Block actions, escalation notifications) that affect Owner and Admin users directly.

---

### MINOR DISCREPANCIES

---

**AL-08 — CLAUDE.md says API error → `Needs Review`; spec adds structured retry before `Needs Review`**
**CLAUDE.md §5.5:** "API error → `Needs Review`."
**Spec §5:** API errors trigger `verification_pending` with retry at 15m/30m/60m, then `Needs Review`.
The end state is consistent; the spec adds an engineering refinement (retry schedule) not described in the PRD. This is an acceptable elaboration but should be reflected in CLAUDE.md §5.7 (Vendor State Machine) for completeness.

---

---

## MODE 4: PRE-LAUNCH SECURITY & INTEGRITY REVIEW

---

### CRITICAL

---

**SEC-01 — No webhook signature verification defined**
**Category:** Money Movement & Financial Safety
**Exploit path:**
1. Attacker discovers the webhook endpoint URL.
2. Attacker constructs a forged settlement payload with a valid `paymentRequestId`.
3. Payload hash is new — passes idempotency check.
4. Reconciliation job processes it: PaymentRequest moves to `settled` → `reconciled`.
5. Actual fund movement never occurred.

**Business impact:** Fraudulent settlement marking without actual payment. Critical integrity breach.

> **Open question:** Define the webhook authentication mechanism. The simulated PSP must: (a) sign each outbound webhook payload with HMAC-SHA256 using a shared secret; (b) include the signature in a header (e.g., `X-PSP-Signature`). The webhook receiver must: (a) compute the expected HMAC on the raw request body before any JSON parsing; (b) reject any payload where the signature does not match. Add this requirement to §1 (Orchestration Service) and §12 (Simulated PSP specification).

---

**SEC-02 — PIN brute force: no attempt limit or lockout defined (cross-reference ST-07)**
**Category:** Authentication & Session Security
4-digit PIN = 10,000 combinations. Authenticated session + no rate limit = feasible brute force.
Covered by ST-07. The resolution to ST-07 must explicitly address this as a security control, not just a UX concern.

---

### HIGH

---

**SEC-03 — Multi-tenancy isolation not defined at API layer (cross-reference BL-07)**
**Category:** Authorization & Access Control
Covered by BL-07. The resolution must be stated as a mandatory security invariant, not optional engineering practice.

---

**SEC-04 — JWT revocation mechanism unspecified; `isActive = false` may not terminate sessions (cross-reference ST-08)**
**Category:** Authentication & Session Security
Covered by ST-08. Ensure the resolution defines a concrete TTL and mechanism, not a general approach.

---

**SEC-05 — Invoice PDF upload has no file type or size validation**
**Category:** Input & Request Integrity
**Exploit path:**
1. Maker uploads a non-PDF file (or a malicious PDF with embedded JavaScript) with a `.pdf` extension.
2. Without server-side MIME type validation, the file is stored in S3 and served to Checkers.
3. Large file uploads (e.g., 500MB) cause storage cost exhaustion.

> **Open question:** Define: (a) maximum file size for invoice PDF uploads (recommendation: ≤10MB); (b) server-side MIME type validation required — Content-Type header from the client is not sufficient; actual file header inspection (magic bytes) must confirm `application/pdf`; (c) whether a virus/malware scan is in scope for MVP or a post-MVP requirement. Add these constraints to §2 (Invoice model) as field-level constraints on `documentUrl`.

---

### MEDIUM

---

**SEC-06 — NUBAN encryption scheme not specified; affects searchability and reconciliation (cross-reference ST-10)**
**Category:** Data Exposure & Privacy
Covered by ST-10. Ensure the resolution defines the encryption scheme, not just the storage intent.

---

**SEC-07 — Audit log immutability: enforcement mechanism not defined**
**Category:** Authorization & Access Control
The spec states: "Enforce via database-level row security policy." No policy is specified.

> **Open question:** Define the PostgreSQL row security policy for `AuditLog`. At minimum: the application service database role has `INSERT` only. `UPDATE` and `DELETE` are revoked from the application role. A separate read-only audit role exists for compliance queries. Include the role grant specification in the spec or reference a separate migration file.

---

**SEC-08 — `rawPayload` JSONB may contain PII subject to NDPA**
**Category:** Data Exposure & Privacy
The `WebhookEvent.rawPayload` stores full PSP webhook body, which may contain account holder names, account numbers, or other PII.

> **Open question:** Define access controls on `WebhookEvent`: which roles can query this table? Define whether `rawPayload` content is subject to the 6-year retention policy. Define whether PII fields within the payload are masked or redacted before storage (preferred) or stored raw with role-restricted access.

---

**SEC-09 — IP address in AuditLog is PII under NDPA**
**Category:** Data Exposure & Privacy
IP addresses are personal data under the Nigeria Data Protection Act.

> **Open question:** Define whether `ipAddress` in `AuditLog` is: (a) stored in full for the entire 6-year retention period (justified as a compliance record for financial audit); or (b) anonymised (e.g., last octet zeroed) after a defined period while the rest of the audit record is retained. State the NDPA justification for the chosen approach.

---

**SEC-10 — No circuit breaker for sustained external API outages**
**Category:** External Service Dependencies
The spec defines a per-vendor retry schedule (15m/30m/60m). A sustained CAC API outage generates per-vendor Owner notifications for every new vendor submission during the outage window. There is no aggregate outage detection or operator alerting.

> **Open question:** Define a circuit breaker or aggregate outage detection rule: after N consecutive failures to an external API within a time window, the system enters a "degraded mode" state. In degraded mode: (a) new vendor submissions receive an immediate "Verification temporarily unavailable — manual review required" notice rather than entering a retry queue; (b) a single high-priority alert is sent to Owner/Admins (not one per vendor); (c) the circuit closes when the API returns a successful response. Define N, the time window, and the close condition.

---

### LOW

---

**SEC-11 — Error response contract not defined**
**Category:** Input & Request Integrity
The spec defines authorization enforcement but not what HTTP response and message body is returned to unauthorized or not-found requests. Without this, engineers may return stack traces or internal IDs in error responses.

> **Open question:** Define the error response contract: (a) unauthorized actions return HTTP 403 with a generic message (no internal IDs, no stack traces); (b) resources belonging to a different tenant return HTTP 404 (not 403), preventing enumeration of valid resource IDs across tenants; (c) internal server errors return HTTP 500 with a correlation ID only — no error detail exposed to the client. Add this to §1 as an API contract requirement.

---

---

## FINDING SUMMARY

| Mode | Blockers | Mid-Build Risks | Clarifications |
|---|---|---|---|
| PRD Stress-Test | ST-01 through ST-08 (8) | ST-09 through ST-21 (13) | ST-22 through ST-25 (4) |
| Business Logic Audit | BL-01 through BL-04 (4 critical) | BL-05 through BL-10 (6 high) | — |
| Spec vs. PRD Alignment | AL-01, AL-02, AL-03 (3) | AL-04 through AL-07 (4) | AL-08 (1) |
| Pre-Launch Security | SEC-01, SEC-02 (2 critical) | SEC-03 through SEC-07 (3 high, 2 medium) | SEC-10, SEC-11 (2 low) |

**Minimum set to unblock engineering (must be resolved before any build work begins):**
ST-01, ST-02, ST-03, ST-04, ST-05, ST-06, ST-07, ST-08, AL-01, AL-02, AL-03, BL-01, BL-02, BL-03, SEC-01, SEC-02

---

*Review version 1.0 — 2026-06-13. Run this file through the Claude Code resolution prompt at the top to generate answers for all open questions.*

# Architecture Note: Watchtower

**Capstone Deliverable:** 4 — Architecture Note
**Document Status:** Complete — Panel-ready v1.0
**Last updated:** 2026-06-13

---

## System Position

Watchtower sits between the finance team and the payment rails — it does not touch the rails directly.

```
┌─────────────────────────────────────────────────────────┐
│                   PAYOPS CONTROL TOWER                  │
│                                                         │
│  Maker  ──► [Workflow + Approval Engine] ──► PSP API   │
│                     │       ▲                   │       │
│              [Audit Log]  [Webhook]          NIP Rails  │
│                     │       │                   │       │
│              [Exception  ◄──┘            Vendor Bank   │
│               Queue]                      Account      │
└─────────────────────────────────────────────────────────┘
```

Watchtower controls the **decision layer** (who can approve what, whether the vendor is verified, whether the amounts match). The **movement layer** (funds transfer, bank rails) is owned by the PSP partner.

---

## Money Movement Narrative

A payment in Watchtower follows this path from intent to settlement:

**Step 1 — Vendor Verification (no money moves)**
The Finance Maker submits a vendor's CAC number and NUBAN account number. Watchtower calls the CAC validation API and the NUBAN lookup API in parallel. The returned names are compared using a Jaro-Winkler string-match algorithm. A score ≥ 0.85 approves the vendor automatically. Anything below routes to `Needs Review` for a Checker to clear manually. Until the vendor is `Approved`, no payment can be created against them.

**Step 2 — Payment Request Creation (no money moves)**
The Maker creates an invoice-backed payment request: vendor, amount, invoice number, invoice PDF. If any of five compliance triggers fire (high-value ≥ ₦5M, duplicate invoice, beneficiary change, repeated PSP failure, ambiguous KYB match), the request enters `Compliance Review` before reaching the Checker. Otherwise it goes directly to `Pending Approval`.

**Step 3 — Maker-Checker Approval (no money moves)**
A Checker reviews the vendor details and invoice PDF side by side. Approval requires a 4-digit PIN, validated server-side within the same database transaction as the status change. No separate PIN endpoint exists. Approval is atomic: either the PIN is valid and the status moves to `Processing`, or neither change commits.

**Step 4 — PSP Execution (money moves)**
Watchtower sends an execution payload to the PSP Partner API via a signed REST request. The PSP initiates the transfer over the NIP (NIBSS Instant Payment) rail to the vendor's bank account. If the payment amount exceeds the ₦10,000,000 per-transaction limit, Watchtower has already calculated a tranche plan (equal splits, max 5 tranches). Tranches are dispatched sequentially — the next tranche is not sent until the prior tranche's settlement webhook is received.

**Step 5 — Settlement Confirmation (money has moved)**
The PSP fires a webhook to Watchtower with: Transaction ID, Settlement Status, Settled Amount, and Bank Reference. Watchtower validates the HMAC-SHA256 signature before processing. On `SUCCESS`: status → `Settled`. Watchtower then compares the settled amount against the invoice amount. If the variance equals the applicable NIP charge for that transaction tier, the payment reconciles automatically to `Reconciled`. Any other variance → `exception_queue`.

**Step 6 — Exception Handling (money may have partially moved)**
Payments that fail, time out, or mismatch enter the Exception Queue with a specific category. The Finance team sees a plain-language status and permitted actions per category. No funds are held by Watchtower at any point during this process.

---

## Rails & Partners

| Layer | Component | Provider | Notes |
|---|---|---|---|
| Vendor identity | CAC Validation API | TBD (e.g., Smile ID, Dojah) | Returns registered business name for CAC number |
| Vendor bank account | NUBAN Lookup API | TBD | Returns account name for bank account number |
| Payment execution | PSP Partner API | TBD — **simulated in MVP** | Receives execution payload; initiates transfer |
| Settlement confirmation | PSP Webhook | TBD — **simulated in MVP** | Returns Transaction ID, Settlement Status, Bank Reference |
| Underlying bank rails | NIP (NIBSS Instant Payment) | NIBSS (via PSP partner) | Watchtower does not communicate with NIP directly |

> **PM ANNOTATION — Why simulated PSP in MVP:** A live PSP integration requires contracted access, KYC onboarding with the PSP, and production credentials. For a capstone MVP, none of this is available. The simulated PSP implements the same interface — REST execution endpoint, HMAC-signed webhook response — as a live integration would. The architecture is explicitly designed so the PSP layer is swappable: the execution payload schema and webhook contract are defined in `spec-resolution-v1.md §12` as interface requirements, not implementation details. Replacing the sandbox with a live Flutterwave, Paystack, or Fincra integration requires a credential swap and endpoint URL change, not a redesign.

> **PM ANNOTATION — NIP charge tolerance (corrected June 2026):** The reconciliation engine uses the current CBN Guide to Bank Charges maximum NIP fee tiers: ≤₦5,000 → ₦0 (free); ₦5,001–₦50,000 → max ₦10; ₦50,001+ → max ₦50. The original spec used values of ₦10.75/₦25.00/₦50.00 which reflected an older fee schedule — these were corrected during the compliance research phase when real-time CBN guidance confirmed the current rates. A payment for ₦100,000 that settles for ₦99,950 (₦50 variance) still reconciles automatically. The sub-₦5k tier is now zero-tolerance (no fee expected, so settled amount must equal invoice amount exactly). Note: NIBSS has announced a target of zero fees across all tiers by 2026 via a subscription model; if implemented before launch, this tolerance block becomes inert.

---

## Float & FX Exposure

**Float — MVP: zero.**
Watchtower does not hold, pool, or intermediate customer funds at any point. Money flows directly from the business's bank account (via the PSP) to the vendor's bank account. Watchtower sees the transaction lifecycle (request → approval → execution → settlement) but is not in the money path. There is no nostro/vostro account, no prefunding requirement, and no float position to manage.

**FX — MVP: not applicable.**
All MVP payments are Nigerian Naira (NGN) to Nigerian bank accounts (NUBAN). No international transfers, no multi-currency support, no FX conversion. FX exposure is structurally zero.

**Post-MVP FX position (if cross-border is added):**
If Watchtower adds USD or GBP vendor payments, FX risk sits with the PSP partner, not Watchtower. Watchtower would continue to operate as an orchestration layer — capturing the Maker's intent in NGN, instructing the PSP partner to execute in the target currency, and reconciling the NGN-equivalent settlement amount. This would require the PSP partner to be licensed for cross-border transfers and would bring the product under additional CBN foreign exchange regulations. This is a post-MVP decision and is not in scope.

---

## Transaction Failure: What Happens

| Failure scenario | What the system does | What the user sees |
|---|---|---|
| PSP API returns failure on execution | Status → `exception_queue` / `PSP_FAILURE` | "Payment failed. Retry or cancel in the Exception Queue." |
| Settlement webhook shows FAILED status | Status → `exception_queue` / `PSP_FAILURE` | Same as above |
| Settled amount ≠ invoice amount (outside NIP tolerance) | Status → `exception_queue` / `AMOUNT_MISMATCH` | "Settled amount differs from invoice. Manual reconciliation required." |
| No webhook received in 48 hours | Cron job → `exception_queue` / `STATUS_UNKNOWN` | "No settlement confirmation received. Check with your PSP." — Owner notified by email |
| Tranche 1 settles; Tranche 2+ fails | Status → `exception_queue` / `PARTIAL_TRANCHE_SETTLEMENT` | "Tranche 1 settled. Tranche 2 failed. View the exception queue for options." |
| Webhook received after parent request is cancelled | Logged to `ORPHANED_SETTLEMENT` | Owner and Admin see alert. No state change on cancelled request. Manual review required. |

**What Watchtower does not do on failure:**
- It does not attempt automatic reversal of settled tranches (out of scope MVP — reversals require PSP-partner involvement)
- It does not retry failed PSP executions automatically (retry is a Maker/Checker action from the exception queue)
- It does not hold or buffer funds during failure — the money is either with the PSP, in transit, or already credited to the vendor

---

## Compliance Architecture

The compliance gate is not a post-processing check — it is a route change at request creation time.

```
Payment Request Submitted
        │
        ▼
 [Trigger evaluation]
        │
   Trigger fired? ──Yes──► status = compliance_review
        │                         │
        No                  Checker resolves
        │                         │
        ▼                         ▼
 status = pending_approval ◄── cleared
        │                         │
        └─────────────────────────┘
                    │
              Checker approves (PIN)
                    │
              status = processing
```

Five triggers evaluated at submission: `HIGH_VALUE` (≥ ₦5M), `DUPLICATE_INVOICE`, `BENEFICIARY_CHANGE`, `REPEATED_FAILURE`, `AMBIGUOUS_MATCH`. Compliance review timeout at 48 hours → `exception_queue / COMPLIANCE_REVIEW_TIMEOUT`. The Checker who cleared the compliance review cannot also be the Checker who approves the payment — enforced server-side on the approval action.

---

## What Is Not In This Architecture

| Out of scope | Why |
|---|---|
| Live PSP integration | MVP uses simulated PSP; swappable without redesign |
| CBN direct API integration | CBN does not expose a public reporting API; reporting is manual/portal-based in MVP |
| Invoice PDF amount extraction (OCR) | Out of scope; Checker manually verifies PDF amount vs. entered amount |
| Automatic reversal of settled payments | Reversals go through PSP partner directly; Watchtower logs the request but does not orchestrate it |
| Tranche reversal | Partially settled payment recovery is handled outside the product via PSP |
| Circuit breaker / PSP health monitoring | Post-MVP operational concern; cron-based `STATUS_UNKNOWN` is the MVP safety net |

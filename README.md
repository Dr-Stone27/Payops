# Watchtower

The control & audit layer on top of the accounts Nigerian SMEs already use. Built as a capstone submission for the ProductDive Fintech PM Program (Option C — Own Problem).

Watchtower is a **non-funds-holding** workflow product that gives finance teams one workspace to verify vendors, approve payment requests, track settlement, and reconcile invoices — without needing a full ERP. It orchestrates the audit trail around money that moves through a licensed PSP partner.

---

## What This Is

This repository contains a full-stack working prototype demonstrating the core payment operations workflow, including:

- **Vendor KYB gate** — CAC + NUBAN name-matching via Jaro-Winkler algorithm
- **Maker-Checker authorization** — four-eyes rule enforced server-side with PIN approval
- **Compliance review queue** — automatic routing for high-value (≥ ₦5M), duplicate invoice, ambiguous KYB match, and repeated PSP failure triggers
- **Simulated PSP dispatch** — 80/20 success/failure simulation reconciled in-request through the same logic as the HMAC-SHA256 webhook seam kept for a real PSP
- **Settlement reconciliation** — NIP fee tolerance bands (CBN Guide to Bank Charges, current: ₦0 / max ₦10 / max ₦50)
- **Exception queue** — PSP_FAILURE, AMOUNT_MISMATCH, ORPHANED_SETTLEMENT
- **Immutable audit log** — every action logged with actor, timestamp, and outcome

**Regulatory context:** CBN PSSP licence tier (Payment Solution Services — PSSP sub-licence). No fund custody. NDPA 2023 data controls applied. AML triggers mapped to NFIU obligations.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 16.2.9 (App Router) | Server Actions for mutations, no separate API layer needed for most flows |
| Language | TypeScript (strict) | Type safety across DB ↔ actions ↔ UI |
| Database | SQLite via Prisma 7 + libsql adapter | Zero-config local dev; swap `DATABASE_URL` to Neon PostgreSQL for production |
| Auth | JWT (jose) + bcryptjs | 8h session TTL, cookie-based, server-side session validation |
| Styling | Tailwind CSS | Utility-first, no component library dependency |
| KYB matching | @skyra/jaro-winkler | Jaro-Winkler string similarity for CAC ↔ NUBAN name matching |
| NUBAN security | Node.js crypto | HMAC-SHA256 hash for equality lookups; AES-256-GCM encryption for storage |
| Middleware | `src/proxy.ts` | Next.js 16 proxy convention (renamed from middleware) |

---

## Local Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/Dr-Stone27/Payops.git
cd Payops

# 2. Install dependencies
npm install

# 3. Generate the Prisma client
npx prisma generate

# 4. Create the database and run migrations
npx prisma migrate dev --name init

# 5. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

### Environment Variables

The app runs on sensible development defaults with no `.env` file required. For production or to override defaults, create a `.env` file:

```env
# Database — SQLite for local dev, replace with Neon PostgreSQL URL for production
DATABASE_URL="file:./prisma/dev.db"

# JWT session signing secret — change this in production
SESSION_SECRET="payops-dev-secret-change-in-production"

# PSP webhook HMAC signing secret — used to verify inbound settlement webhooks
PSP_WEBHOOK_SECRET="psp-webhook-dev-secret"

# NUBAN encryption/hashing key — change this in production
NUBAN_SECRET="nuban-dev-secret"

# Public base URL of the deployment
NEXT_PUBLIC_BASE_URL="https://your-vercel-url.vercel.app"
```

> **Note for production deployment:** Switch `DATABASE_URL` to a PostgreSQL connection string (e.g. Neon) and run `npx prisma migrate deploy`. Update all secret values.

---

## Demo Walkthrough

The panel/reviewer demo requires two users to demonstrate the four-eyes rule. Follow this sequence:

### Step 1 — Register as Owner

Go to `/register`. Fill in your name, work email, password, business name, and CAC number. You are registered as the **Owner (Checker role)**.

### Step 2 — Set Up Approval PIN

After registering, go to `/setup-pin` (or via the sidebar). Set a 4-digit PIN. This PIN is required to approve payments.

### Step 3 — Add a Team Member (Maker)

Go to **Team → Add member**. Create a second user with role **Maker**. This is the person who will submit payment requests.

> Open a second browser (or incognito window) and log in as the Maker for the next step.

### Step 4 — Add a Vendor (as Owner or Maker)

Go to **Vendors → Add vendor**.

| NUBAN ending | KYB outcome | What it shows |
|---|---|---|
| `1234` | Auto-approved (Jaro-Winkler ≈ 1.0) | Fast-path approval |
| `5678` | Needs Review (partial name match) | Manual approval by Checker required |
| `9999` | Needs Review (name mismatch) | Hard mismatch — Checker must verify |

To approve a `needs_review` vendor: go to **Vendors → Review →** enter a justification (≥ 20 characters) → Approve.

### Step 5 — Create a Payment Request (as Maker)

Go to **Payments → New payment request**.

- Amount **< ₦5,000,000** → routes directly to `pending_approval`
- Amount **≥ ₦5,000,000** → triggers `HIGH_VALUE` compliance review (you will see the warning before submitting)

### Step 6 — Compliance Review (if triggered)

The Owner sees the payment in **Compliance Queue**. They can:
- **Clear** → payment moves to `pending_approval` (the Owner who cleared it is recorded and cannot then also approve)
- **Block** → payment moves to `exception_queue` with category `COMPLIANCE_REVIEW_TIMEOUT`

### Step 7 — Checker Approval (as Owner)

Open the payment. Enter your 4-digit PIN. Click **Approve & dispatch**.

The four-eyes rule is enforced server-side:
- The Maker who created the payment cannot approve it
- The Checker who cleared the compliance review cannot also approve it

### Step 8 — Settlement (automatic)

Approval dispatches to the simulated PSP and reconciles the settlement within the same request — creating a real `WebhookEvent` record and running the NIP tolerance check, exactly as a live PSP webhook would. (Settlement resolves synchronously because Vercel's serverless lifecycle kills background work; a real async PSP webhook is a roadmap item. The external HMAC-verified webhook endpoint remains as the integration seam.)

- **Success (80%)** → settlement matches within NIP tolerance → `reconciled ✓`
- **Failure (20%)** → `exception_queue` with category `PSP_FAILURE`
- **Invoice number starting `EXC-`** → forces a PSP failure (demo lever)
- **Invoice number starting `MIS-`** → forces a settlement outside NIP tolerance → `exception_queue / AMOUNT_MISMATCH` (demo lever)

### Step 9 — Audit Log

Go to **Audit Log** to see the full immutable record of every action taken, by whom, with what outcome.

---

## Payment State Machine

```
pending_approval
    │
    ├─ [compliance trigger detected at creation] ──► compliance_review
    │                                                      │
    │                                                 [Checker clears]
    │                                                      │
    │◄─────────────────────────────────────────────────────┘
    │
    │  [Checker approves + PIN]
    ▼
processing
    │
    ├─ [PSP SUCCESS + within NIP tolerance] ──► reconciled  (terminal ✓)
    ├─ [PSP SUCCESS + outside NIP tolerance] ─► exception_queue / AMOUNT_MISMATCH
    └─ [PSP FAILURE] ──────────────────────────► exception_queue / PSP_FAILURE

cancelled  (terminal — Checker rejected)
exception_queue  (resting — requires manual review)
```

---

## Compliance Gates Visible in the Product

| Gate | Where it appears | What triggers it |
|---|---|---|
| KYB vendor block | Vendors list + payment creation | Vendor in `needs_review` cannot be used for payments |
| Compliance review queue | `/compliance` + payment detail | HIGH_VALUE ≥ ₦5M, DUPLICATE_INVOICE, AMBIGUOUS_MATCH, REPEATED_FAILURE |
| Four-eyes — maker | Payment detail approval panel | `makerId === session.userId` → blocked server-side |
| Four-eyes — compliance resolver | Payment detail approval panel | `complianceReviewResolvedBy === session.userId` → blocked server-side |
| PIN lockout | Payment detail approval panel | 5 wrong attempts → 30-minute lock |
| Concurrency guard | Approval action | `version` field prevents double-approval in concurrent sessions |
| Webhook signature | `/api/webhooks/settlement` | HMAC-SHA256 validation → 401 on mismatch |
| Webhook dedup | `/api/webhooks/settlement` | `transactionReference` unique constraint → silently deduplicated |
| NIP tolerance | Reconciliation logic | Variance > applicable NIP charge → AMOUNT_MISMATCH exception |

---

## Project Structure

```
src/
├── actions/              # Next.js Server Actions (all mutations)
│   ├── auth.ts           # register, login, logout, setupPin, inviteTeamMember
│   ├── vendors.ts        # addVendor, approveVendor
│   └── payments.ts       # createPayment, approvePayment, rejectPayment, clearComplianceReview
│
├── app/
│   ├── (auth)/           # Login, Register, Setup PIN pages
│   ├── (dashboard)/      # Protected pages — all require session
│   │   ├── dashboard/    # Overview with stats + recent payments
│   │   ├── vendors/      # Vendor list, new vendor, vendor detail (KYB review)
│   │   ├── payments/     # Payment list, new payment, payment detail (approval + polling)
│   │   ├── compliance/   # Compliance review queue
│   │   ├── exceptions/   # Exception queue
│   │   ├── audit/        # Immutable audit log
│   │   └── team/         # Team management + invite
│   └── api/
│       ├── vendors/      # GET /api/vendors, GET /api/vendors/[id]
│       ├── payments/     # GET /api/payments/[id]
│       └── webhooks/
│           └── settlement/ # POST /api/webhooks/settlement (PSP callback)
│
├── lib/
│   ├── db.ts             # Prisma singleton with libsql adapter
│   ├── session.ts        # JWT session create/get/clear (jose)
│   ├── kyb.ts            # Jaro-Winkler, NUBAN hash/encrypt, KYB decision
│   ├── compliance.ts     # Compliance trigger detection, NIP tolerance
│   └── audit.ts          # Audit log writer
│
├── generated/prisma/     # Auto-generated Prisma client (do not edit)
└── proxy.ts              # Route protection (Next.js 16 proxy convention)

prisma/
├── schema.prisma         # Data model
└── migrations/           # SQL migration history
```

---

## Key Business Logic Files

### `src/lib/kyb.ts` — Vendor Verification

- `computeJaroWinkler(nameA, nameB)` — normalises (strips legal suffixes, uppercases) then scores
- `getKybDecision(score)` — ≥ 0.85 = `approved`; 0.70–0.84 = `needs_review` + `AMBIGUOUS_MATCH` flag; < 0.70 = `needs_review`
- `hashNuban(nuban)` — HMAC-SHA256 for equality lookups (never stores raw NUBAN)
- `encryptNuban(nuban)` — AES-256-GCM for retrievable storage; IV + auth tag + ciphertext in one field
- `simulateKybLookup(legalName, nuban)` — deterministic simulation by NUBAN last 4 digits

### `src/lib/compliance.ts` — Compliance Trigger Detection

- `detectComplianceTrigger(...)` — checks HIGH_VALUE → DUPLICATE_INVOICE → AMBIGUOUS_MATCH → REPEATED_FAILURE in order; returns first trigger found or null
- `getNipTolerance(amountKobo)` — returns max allowable settlement variance per CBN Guide to Bank Charges (current): ≤ ₦5,000 = 0 kobo; ₦5,001–₦50,000 = 1,000 kobo (max ₦10); > ₦50,000 = 5,000 kobo (max ₦50)

### `src/actions/payments.ts` — Payment Authorization

- **`approvePayment`** — validates role → checks PIN lockout → fetches payment → four-eyes checks (maker + compliance resolver) → verifies PIN → atomic `updateMany` with version check → awaits the simulated PSP dispatch in-request (serverless-safe)

### `src/lib/settlement.ts` — Shared Reconciliation

- **`reconcileSettlement`** — the single settlement path: dedup by `transactionReference` → orphan handling → `WebhookEvent` record → NIP tolerance check → `reconciled` / `AMOUNT_MISMATCH` / `PSP_FAILURE` + audit entry. Used by both the simulated dispatch and the external webhook.
- **`dispatchSimulatedSettlement`** — 80% SUCCESS / 20% FAILED simulation; `EXC-` invoice prefix forces failure, `MIS-` forces an out-of-tolerance settlement

### `src/app/api/webhooks/settlement/route.ts` — Settlement Webhook

1. Validates `X-PSP-Signature` (HMAC-SHA256) → 401 on mismatch
2. Checks `transactionReference` uniqueness → deduplicates silently
3. Looks up payment by `paymentId` + `businessId`
4. On SUCCESS: computes NIP variance → `reconciled` or `AMOUNT_MISMATCH`
5. On FAILED: `PSP_FAILURE`
6. Orphaned settlement detection (payment already cancelled/reconciled)

---

## Running Tests (Postman)

A full Postman collection is included: `payops-postman-collection.json`

**Import:** Postman → Import → select the file

**Run order:** Sections 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Section | Coverage |
|---|---|
| 0 — Pre-flight | Health check, unauthenticated redirect |
| 1 — Auth | Register, login, duplicate email/CAC, wrong password, invite, role gates |
| 2 — PIN | Setup, no-PIN approval block |
| 3 — Vendors | Auto-approve, needs_review, duplicate NUBAN, role enforcement, justification length |
| 4 — Payments (Standard) | Create, four-eyes maker block, wrong PIN, state machine terminal guards |
| 5 — Payments (Compliance) | HIGH_VALUE trigger, duplicate invoice, four-eyes resolver block, tranche limit |
| 6 — Webhooks | Valid HMAC, invalid signature (401), dedup, PSP failure, amount mismatch, NIP tolerance |
| 7 — Cross-business isolation | Business B cannot read Business A payments or vendors |
| 8 — Session integrity | Tampered JWT rejection, logout + session invalidation |

> Section 6 (Webhooks) uses Postman's built-in CryptoJS in pre-request scripts to auto-generate valid HMAC-SHA256 signatures. No manual setup required.

---

## Known Limitations (MVP Scope)

| Limitation | Reason | Post-MVP path |
|---|---|---|
| PSP is fully simulated | No live PSP partner in MVP | Point a real PSP at the HMAC webhook endpoint; replace `dispatchSimulatedSettlement` with the PSP SDK call |
| Settlement resolves in-request (no async dwell) | Vercel serverless kills post-response work | Real async settlement via PSP webhook + queue/poller |
| CAC + NUBAN APIs are simulated | Deterministic by NUBAN last 4 digits | Wire to Smile ID / Dojah / NIBSS |
| No email notifications | Out of scope for prototype | Add Resend / Postmark on approval and settlement events |
| No NFIU STR filing workflow | Compliance trigger flags internally only | Build STR submission flow post-MVP |
| SQLite (local dev) | Zero-config for prototype | Switch `DATABASE_URL` to Neon PostgreSQL for production |
| No file upload for invoices | Invoice PDF name captured only | Add Cloudflare R2 / S3 upload |
| Business KYB not enforced in UI | CAC number captured at registration only | Add director ID verification step |

---

## Regulatory Context

- **CBN Licence:** PSSP (Payment Solution Services Provider) — permits payment processing gateway, payment application development, merchant services aggregation. Does **not** permit fund custody.
- **Data protection:** NDPA 2023. NUBAN stored dual-encrypted. Bcrypt cost 10 for passwords and PINs. 72-hour breach notification obligation.
- **AML:** Five compliance triggers map to NFIU suspicious transaction reporting obligations. Automated AML deployment deadline: May 2027 (CBN directive, May 2025).
- **NIP fees:** CBN Guide to Bank Charges (current): ≤ ₦5,000 = free; ₦5,001–₦50,000 = max ₦10; > ₦50,000 = max ₦50. NIBSS targeting zero fees by end of 2026.

---

## Capstone Context

This prototype is Deliverable 3 of 6 for the ProductDive Fintech PM Program capstone. The other deliverables (Product Brief, Requirements Document, Architecture Note, Compliance Summary) are maintained in a separate repository.

The prototype was built after a full spec → audit → resolution cycle:
- **44 spec issues** identified in `spec-review-v1.md`
- Key corrections include: webhook signature verification (SEC-01), four-eyes compliance resolver gap (ST-13/BL-06), missing `exception_queue` state (ST-02), NIP fee tier correction (outdated ₦10.75/₦25/₦50 → corrected ₦0/max ₦10/max ₦50)

---

*Watchtower v0.1 MVP · June 2026*

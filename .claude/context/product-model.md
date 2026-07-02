# PayOps Control Tower — Product Model (SPINE DOCUMENT)

> **Status: DRAFT skeleton — seeded from code + docs read on 2026-07-01.**
> **Not yet confirmed. Phase 0 must complete the UI drive and full code read, then this goes to the owner for sign-off before any auditing.**
> Fields marked ⟳ still require live-UI verification or deeper code read.

---

## One-line offering
Every outflow from a Nigerian SME's treasury passes through an auditable four-eyes gate before it reaches the PSP. Success bar (product's own): a Checker approves a vendor payment in **under 60 seconds**, confident the controls held.

## The user & the job
Finance/treasury operators at Nigerian SMEs. **Maker** creates payment requests + onboards vendors under AP/AR time pressure. **Checker** (Owner/Admin) reviews and PIN-approves, holding accountability for every outflow.

## Hero spine (PROPOSED — confirm at checkpoint)
Add vendor → KYB name-match verifies it → Maker raises invoice-backed payment → four-eyes Checker approves with PIN → PSP dispatch → auto-reconcile within NIP tolerance → every step on an immutable audit log.

## Module map
Auth (login/register/setup-pin) · Dashboard · Vendors (list/new/detail-KYB) · Payments (list/new/detail-approval+polling) · Compliance queue · Exception queue · Audit log · Team (list/invite). ⟳ verify nav + role visibility live.

## Data model (from `prisma/schema.prisma`)
Business · User (role, pinHash, pinFailedAttempts, pinLockedUntil) · Session (DB-backed JWT, 8h) · Vendor (nubanHash/nubanEncrypted/nubanLast4, jaroWinklerScore, manualApproval*) · PaymentRequest (status, exceptionCategory, complianceReviewResolvedBy, complianceTrigger, version, retentionLocked, transactionReference, settledAmount) · AuditLog · WebhookEvent (transactionReference @unique). No Tranche, no Invitation table.

## State machine — payment (as built, VERIFIED in code)
`pending_approval` → (compliance trigger at creation) → `compliance_review` → (Checker clears, `payments.ts:220`) → `pending_approval` → (Checker approves + PIN, `payments.ts:83`) → `processing` → `reconciled` (terminal) or `exception_queue/PSP_FAILURE`. `cancelled` terminal (reject `:167` / cancel `:291`). Compliance *block* → `exception_queue/COMPLIANCE_REVIEW_TIMEOUT` (`:236` — note: mislabeled; it is a manual block, not a timeout). `exception_queue` resting.

**⚠ Two divergent settlement paths (headline):**
- **Live UI path** — `approvePayment` → `settleDirectly()` (`payments.ts:161,328`): inline 80/20 `Math.random()`; on success writes `reconciled` with `settledAmount = amount` exactly; on fail writes `PSP_FAILURE`. **No webhook, no WebhookEvent row, no NIP check. `AMOUNT_MISMATCH` is unreachable via the UI.** `EXC-` invoice prefix forces failure (`:160`). Retries (`retryException`/`retryDispatch`) call `settleDirectly(alwaysSucceed=true)` → always reconcile.
- **Webhook path** — `api/webhooks/settlement/route.ts`: full HMAC verify (`:12`), dedup by `transactionReference` (`:23`), NIP tolerance → `reconciled` or `AMOUNT_MISMATCH` (`:64`), orphaned-settlement handling (`:36`). **Only reachable from Postman/external POST, not the product flow.**

## State machine — vendor
`verification_pending` → `approved` (JW ≥ 0.85) or `needs_review` (< 0.85; 0.70–0.84 also flags AMBIGUOUS_MATCH). Manual approval by Checker with ≥20-char justification.

## Business rules & controls (VERIFIED, with citations)
- Four-eyes: maker block `payments.ts:109`; compliance-resolver block `:114` — server-side, uses stored `makerId`/`complianceReviewResolvedBy`.
- Concurrency: `version`-checked `updateMany` inside a `$transaction` on approve — `payments.ts:139`. Zero rows → "Concurrent conflict… reload" (`:147`).
- PIN: bcrypt(10); 5-attempt → 30-min lockout `payments.ts:121`; weak-PIN blocklist on setup `auth.ts:194`; PIN required for owner/admin before approving `payments.ts:91`.
- KYB thresholds — `kyb.ts:24` (≥0.85 approved; 0.70–0.84 needs_review+AMBIGUOUS; <0.70 needs_review). Duplicate-NUBAN block on add `vendors.ts:41`.
- Compliance triggers HIGH_VALUE→DUPLICATE_INVOICE→AMBIGUOUS_MATCH→REPEATED_FAILURE — `compliance.ts:5`. ⚠ **HIGH_VALUE constant `500_000_00` = ₦500,000, not the ₦5,000,000 the comment/README/SCREENS/new-payment UI all claim** — a 10× error. VERIFIED LIVE: an ₦800,000 payment fired HIGH_VALUE in the audit log. Side effect: ₦500k–₦5M payments enter compliance_review with no high-value warning shown to the maker (UI warns only at ₦5M).
- NIP tolerance 0/₦10/₦50 — `compliance.ts:42` (⚠ only invoked in the webhook path, not the live UI path).
- Webhook HMAC-SHA256 + `transactionReference` dedup — `api/webhooks/settlement/route.ts:12,23` (⚠ webhook path only).
- Tenant isolation: every `prisma` read/write filters `businessId` from the session — VERIFIED across `payments.ts`, `vendors.ts`. Webhook trusts `businessId` from POST body (`route.ts:31`).
- Amount guard: rejects > ₦50M (`payments.ts:33`, labeled TRANCHE_LIMIT — no real tranching). Negative amounts NOT guarded (`:27` treats only 0/empty as invalid).

## Spec → build deltas (VERIFIED)
- **Live settlement bypasses the webhook** — `settleDirectly` is the real path; the signed-webhook + NIP + AMOUNT_MISMATCH route is Postman-only (see state machine). Highest-impact divergence.
- No Tranche splitting (amount capped at ₦50M, `payments.ts:33`); no Invitation table (invite = owner sets teammate password, `auth.ts:133`); no `BENEFICIARY_CHANGE` trigger; sessions are DB-backed JWT, 8h (not Redis); invoice PDF is **filename only** (no upload); SQLite not Postgres.
- Compliance *block* writes `COMPLIANCE_REVIEW_TIMEOUT` (mislabeled) — `payments.ts:236`.
- `cuid()` is a `Math.random()`+timestamp string, not a real CUID — `payments.ts:13` et al.
- Retries always succeed (`settleDirectly(alwaysSucceed=true)`) — `payments.ts:266,286`.
- README "Known Limitations" documents the simulated-PSP / SQLite / no-upload items honestly; it does NOT flag the settleDirectly-vs-webhook split.

## UX findings surfaced during ground-truth (source-level, for Phase 1)
- **Dead "processing" UX.** `approvePayment` awaits `settleDirectly` before returning, so status is already `reconciled`/`exception` on reload — the blue "Dispatched to PSP… awaiting webhook… updates automatically" card + 2s polling (`payments/[id]/page.tsx:87,182`) likely never render. Contradicts README demo step 8.
- **Overstated reconciled copy** — "Settlement matched invoice within NIP charge tolerance" (`:210`); the live path never runs the NIP check.
- **Unreachable UI branches** — `AMOUNT_MISMATCH`/`STATUS_UNKNOWN` exception copy and the `BENEFICIARY_CHANGE` trigger label (`:27`) render but are never produced by the live path.
- **Palette drift** — built palette (green `#0e7a5a`, navy `#0c1d2e`) differs from `SCREENS.md` brief (`#059669`, `#111827`); internally consistent but doc≠build.
- **Dead "Settled" filter** — Payments list has a `Settled` filter tab, but the live path jumps `processing → reconciled`; nothing rests at `settled`. VERIFIED LIVE.
- **Persistent onboarding banner** — the "Welcome to Watchtower / Setup: Step 1 of 5" banner shows on every page until dismissed; mildly intrusive on the working surfaces.

## Demo affordances (built-in)
NUBAN last-4 seeds KYB (`1234`/`0000`→1.0 auto, `5678`→0.78 review, `9999`→0.42 review) — `src/lib/kyb.ts:48`. `EXC-` invoice prefix forces PSP failure. 80/20 PSP success/fail sim, 2s delay. Role-aware onboarding walkthrough — `src/lib/walkthrough.ts`.

## Naming & brand state ⚠ (VERIFIED LIVE)
**The deployed product is branded "Watchtower" end-to-end** — sidebar wordmark "Watchtower / Payment oversight", browser tab title, welcome banner, walkthrough copy (`walkthrough.ts:18`). **Every repo doc (README, PRODUCT.md, SCREENS.md) and all code identifiers say "PayOps Control Tower."** The product a panel sees ≠ the product every capstone deliverable describes. Live nav IA is grouped cleanly: Overview / Operations / Governance / Organization.

---

### Phase 0 status: COMPLETE — ready for checkpoint
- ✅ Full source read: schema, all libs, all actions, webhook route, demo-critical pages.
- ✅ Docs reconciled (README / PRODUCT / SCREENS / spec docs).
- ✅ Live-UI pass on the deployed app (dashboard, payments list, audit log): branding, HIGH_VALUE threshold, four-eyes, compliance-clear, and retry behaviour all verified against code.
- Code-confirmed rather than driven live (invasive to reproduce): the `processing`/polling card (settlement is synchronous — barely renders), locked-PIN state, empty states. Flagged for Phase 1 / QA.
- **Headline findings feeding Phase 1:** (1) Watchtower vs PayOps naming split; (2) HIGH_VALUE 10× threshold error; (3) live settlement bypasses the signed webhook + NIP path.

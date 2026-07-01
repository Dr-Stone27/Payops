# BUILD.md — Watchtower Tier-1 Build Brief

Turnkey brief to build the pitch-critical fixes for **Watchtower** (the app in this repo), on the **Fable** model (`claude-fable-5`).
**Source of truth for scope + acceptance:** `.claude/context/improvement-plan-phase3.md`. This file adds engineer-ready change specs + a kickoff prompt.

---

## COPY-PASTE PROMPT (paste into the Fable session after attaching this repo)

```
You are building on the Watchtower repo (a Next.js 16 fintech app). Pull the latest,
check out branch `watchtower-product-audit`, then create a build branch
`watchtower-tier1-build` off it.

BEFORE writing any code, read in this order:
  1. AGENTS.md  — HEED IT. This is Next.js 16, NOT the Next.js in your training data.
     Read node_modules/next/dist/docs/ before writing. It uses Server Actions and
     src/proxy.ts (not middleware.ts).
  2. README.md, CLAUDE.md
  3. .claude/rules/connective-audit.md
  4. .claude/context/product-model.md
  5. .claude/context/improvement-plan-phase3.md   (backlog + acceptance criteria)
  6. BUILD.md                                     (the change specs)

Then implement the Tier-1 change specs in BUILD.md in this order:
  FIX-1, FIX-2, FIX-7, FIX-4a, FIX-11, then FIX-3 last (it is the trickiest).

Rules:
  - Scope = Tier 1 only. Do not add features.
  - The 4 product decisions in BUILD.md are LOCKED. Do not re-open them.
    If a NEW product decision surfaces, STOP and ask me — do not guess.
  - Preserve the working controls (four-eyes, PIN lockout, version concurrency,
    tenant isolation, audit log). Verify they still pass after each change.
  - After each fix: verify against its acceptance criteria (run the app on
    localhost:3000 and/or the Postman collection), then commit with a clear message.
  - When Tier 1 is done: run `npm run build`, confirm the working controls still pass,
    and summarise what changed and what you verified.
```

---

## Setup

1. **Branch:** `git checkout watchtower-product-audit && git pull && git checkout -b watchtower-tier1-build`
2. **Run:**
   ```
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run dev        # → http://localhost:3000
   ```
   SQLite is zero-config. **For FIX-3** set `NEXT_PUBLIC_BASE_URL=http://localhost:3000` and a consistent `PSP_WEBHOOK_SECRET` (dev default is fine) so the self-webhook works.
3. **Verify with:** `payops-postman-collection.json` (8 sections) + manual checks + each fix's acceptance criteria.

## Locked product decisions (do not re-open)
1. HIGH_VALUE = **₦5,000,000**  2. Settlement = **rebuild async webhook path**  3. STATUS_UNKNOWN = **cut**  4. Acknowledge = **real resolve action**

---

## Change specs — TIER 1 (pitch-critical)

### FIX-1 — Name: "Watchtower" everywhere (docs/copy)
The app UI is already "Watchtower"; align the rest.
- Run `grep -ri "PayOps Control Tower"` and `grep -ri "PayOps"` (exclude `node_modules`, `src/generated`). Update **user-facing + deliverable** strings (`README.md`, `PRODUCT.md`, `docs/*`, root `app` metadata/`<title>`, `package.json` name if surfaced) → "Watchtower". Internal identifiers (`payops_session` cookie, env var names) **may stay**.
- **Acceptance:** no user-facing/deliverable "PayOps Control Tower" remains.

### FIX-2 — HIGH_VALUE threshold ₦5M + reason at creation
- `src/lib/compliance.ts:3` — `HIGH_VALUE_THRESHOLD_KOBO = 500_000_00` → `500_000_000` (₦5,000,000 in kobo). This alone makes existing UI copy ("above ₦5,000,000") accurate.
- `src/app/(dashboard)/payments/new/NewPaymentForm.tsx` — ensure a **pre-submit** notice fires when amount ≥ ₦5,000,000 ("This will need a compliance review before it can be approved"). Verify it triggers at the correct number.
- **Acceptance:** ₦4,999,999 → `pending_approval`; ₦5,000,000 → `compliance_review` (`complianceTrigger=HIGH_VALUE`); maker warned before submit. (Postman §5.)

### FIX-7 — Server-side negative/zero amount guard
- `src/actions/payments.ts` → `createPayment`, right after `amountKobo` is computed (~line 31): `if (!Number.isFinite(amountKobo) || amountKobo <= 0) return { error: "Amount must be greater than zero." };`
- **Acceptance:** negative/zero/NaN rejected server-side regardless of client.

### FIX-4a — Kill dead controls; wire "Acknowledge"
- **Remove the `Settled` status filter** from the payments list page (`src/app/(dashboard)/payments/page.tsx` — nothing rests at `settled`; terminal is `reconciled`).
- **Wire "Acknowledge"** (currently a static `<span>` at `src/app/(dashboard)/exceptions/page.tsx:124`):
  - Schema: add to `PaymentRequest` — `acknowledgedAt DateTime?`, `acknowledgedBy String?`; `npx prisma migrate dev --name exception_ack`.
  - New checker-only, `businessId`-scoped server action `acknowledgeException(paymentId)` → set `acknowledgedAt`/`By`, write `AuditLog` (`EXCEPTION_ACKNOWLEDGED`).
  - Active-exception queries become `status='exception_queue' AND acknowledgedAt IS NULL`.
- **Acceptance:** Settled filter gone; Acknowledge on AMOUNT_MISMATCH/ORPHANED marks resolved, logs it, drops it from the active queue.

### FIX-11 — Dashboard → Control Tower (risk/attention console)  ← product shift
Rebuild `src/app/(dashboard)/dashboard/page.tsx` to lead with control value, not a ledger. Three stacked, `businessId`-scoped sections:
1. **Needs your attention** (role-aware): Checker → payments in `pending_approval` where `makerId != me` (awaiting my PIN) + compliance items I'm eligible to action; Maker → my requests + their status.
2. **At risk:** open exceptions count + ₦ total (`sum(amount)` where `status='exception_queue' AND acknowledgedAt IS NULL`); `needs_review` vendor count; compliance-queue count.
3. **Recent control events:** last ~8 `AuditLog` entries (approvals, rejections, blocks, KYB flags, acknowledgements).
- Demote the historical payments table below these (or link to `/payments`).
- **Acceptance:** owner/admin `/dashboard` shows "what needs me / what's at risk / recent control events" above any historical list; numbers link to filtered views; role-aware.

### FIX-3 — Real settlement through the reconciliation logic (serverless-safe)  ← the big one, do last
**Problem:** `approvePayment` (`payments.ts:161`) calls `settleDirectly()` (`:328`) — inline 80/20 randomness writing `reconciled`/`PSP_FAILURE` directly, **bypassing the signed-webhook reconciliation**: no `WebhookEvent` row, no NIP tolerance, no dedup. So `AMOUNT_MISMATCH` is unreachable via the product and the "we reconcile against NIP tolerance" claim isn't the live path. The full route exists at `src/app/api/webhooks/settlement/route.ts` but only Postman reaches it.
**⚠ Serverless constraint — READ `docs/retrospective.md` §3 first.** This app runs on Vercel. A prior **fire-and-forget** background dispatch *silently failed in production* — Vercel freezes the function once the response returns, killing background promises with no error. That is why settlement is synchronous today. **Do NOT reintroduce background dispatch, an unawaited async, or an unawaited self-`fetch`.**
**Do (serverless-safe — keep it in-request):**
1. **Extract** the reconciliation logic from `src/app/api/webhooks/settlement/route.ts` into a shared function `reconcileSettlement({ paymentId, transactionReference, settlementStatus, settledAmount, businessId })` in `src/lib/` — it creates the `WebhookEvent`, runs `getNipTolerance`, and sets `reconciled` / `AMOUNT_MISMATCH` / `PSP_FAILURE` (+ orphaned handling). The HTTP webhook route becomes a thin wrapper: verify HMAC → parse → call `reconcileSettlement`.
2. In `approvePayment`, after the version-checked transition, build the simulated PSP result and **`await reconcileSettlement(...)` before returning** (fully inside the request lifecycle — Vercel-safe). Simulation: 80% `SUCCESS` / 20% `FAILED`; `settledAmount = amount` on success; **preserve** `EXC-` invoice prefix → `FAILED`; **new** `MIS-` prefix → `SUCCESS` with `settledAmount = amount + getNipTolerance(amount) + 100` → `AMOUNT_MISMATCH` (makes mismatch demoable for the pitch).
3. Remove `settleDirectly`; route `retryDispatch`/`retryException` (`:257`,`:271`) through `reconcileSettlement` (success-forced).
4. **Keep the external HTTP webhook endpoint fully intact** (HMAC-verified) as the real-PSP integration seam — Postman §6 still exercises it; real PSPs POST to it later.
**Acceptance:**
- Normal approval → a real `WebhookEvent` row is created and status → `reconciled` (verify via Prisma Studio / audit log). **Works on Vercel** (no background execution).
- `EXC-…` → `exception_queue / PSP_FAILURE`; `MIS-…` → `exception_queue / AMOUNT_MISMATCH` (variance line shown).
- External webhook route still 401s on bad signature and dedups on duplicate `transactionReference` (Postman §6).
**Tradeoff (state honestly):** settlement resolves *within* the approval request, so there is no long "processing → live-poll → settled" dwell. The existing detail-page polling becomes inert (harmless; may remove). A genuine async settlement moment needs a real async PSP webhook + a queue/poller — that is a **roadmap** item, not MVP. Do not fake an async wait.

### FIX-12 — Orchestration-over-rails framing (copy)
- Payment-detail processing/reconciled copy (`payments/[id]/page.tsx:186,210`): "Dispatched to your PSP partner", "Watchtower never holds your funds"; the reconciled line is now truthfully "settled within NIP tolerance" (real post-FIX-3).
- README/marketing: "the control & audit layer on top of the accounts you already use."
- **Acceptance:** no user-facing copy implies Watchtower holds funds or *is* the rail.

---

## TIER 2 (after Tier 1 verified)
- **FIX-4b:** remove `PARTIAL_TRANCHE_SETTLEMENT` + `STATUS_UNKNOWN` from `exceptions/page.tsx` CATEGORY map (owner-confirmed cut); drop `BENEFICIARY_CHANGE` from compliance UI label maps (no producing path).
- **FIX-5:** duplicate-NUBAN — in `vendors.ts:41` drop the `kybStatus:"approved"` filter (check ALL vendor records by `nubanHash`); re-check in `approveVendor` (`:81`) before approving. Acceptance: two vendors with the same NUBAN can't both reach `approved`.
- **FIX-6:** relabel manual block — `clearComplianceReview` block path (`payments.ts:236`) → `exceptionCategory='COMPLIANCE_BLOCKED'`; add label/badge in `exceptions/page.tsx` + `design.ts`. Acceptance: manual block reads "Blocked by checker," not "timeout."
- **Copy:** correct AMBIGUOUS_MATCH maker message (`compliance/page.tsx:22`) — it's score-based, not "manually approved."

## TIER 3 (polish / post-pitch)
Sticky/auto-collapse onboarding banner after setup; align palette (`design.ts` ↔ `SCREENS.md`); replace `cuid()` (Math.random) with a real cuid/uuid; document audit-immutability as roadmap (real row-security needs Postgres).

---

## Definition of done (Tier 1)
All Tier-1 acceptance criteria pass · Postman green · `npm run build` clean · working controls (four-eyes, PIN lockout, version concurrency, tenant isolation, audit) still pass · no dead controls · dashboard is a control tower · the demo path (add vendor → KYB → raise → four-eyes approve → live settle → audit log) runs end-to-end on localhost.

## Roadmap (post-capstone, out of Tier scope)
Make "over existing rails" real: NIBSS name-enquiry for KYB, bank/PSP APIs for dispatch + settlement webhooks; SQLite → Postgres; audit-log DB row-security.

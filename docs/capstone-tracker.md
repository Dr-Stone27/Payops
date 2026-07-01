# PayOps Control Tower — Capstone Tracker

**Program:** ProductDive Fintech PM Program
**Option:** C — Own Problem (PayOps Control Tower)
**Last updated:** 2026-07-01 (all 6 deliverables complete)

---

## Deliverable Status at a Glance

| # | Deliverable | Status | Panel-ready? |
|---|---|---|---|
| 1 | Product Brief | ✅ Complete — `product-brief.md` | Yes |
| 2 | Requirements Document | ✅ Complete | Yes — `requirements-document.md` |
| 3 | Working Prototype | ✅ Complete — `~/Projects/payops-prototype/` | Yes |
| 4 | Architecture Note | ✅ Complete — `architecture-note.md` | Yes |
| 5 | Compliance Summary | ✅ Complete — `compliance-summary.md` | Yes |
| 6 | Retrospective | ✅ Complete — `retrospective.md` | Yes |

**Recommended build sequence:** Product Brief → Architecture Note → Compliance Summary → Requirements Document (user story layer) → Prototype → Retrospective.
Product Brief first because it forces a crisp problem/hypothesis statement that should drive every other deliverable. Architecture Note and Compliance Summary are fast (mostly drawing from existing spec content). Prototype last because it needs all decisions locked.

---

## Deliverable 1 — Product Brief

**Capstone requirement:** 1–2 pages. Internal alignment doc.

### Checklist
- [ ] Problem statement: who exactly has it (specific profile, not "Nigerian SMEs")
- [ ] Core hypothesis: what single thing must be true for this product to work?
- [ ] 3–5 success metrics covering:
  - [ ] Activation metric
  - [ ] Transaction volume metric
  - [ ] At least one compliance metric

### Status: ✅ Complete — `product-brief.md`

### What exists
- `product-brief.md` — Full panel-ready Product Brief:
  - One-Pager (page 1): problem, target user, solution, hypothesis, Phase 1 MVP scope, compliance angle, success metrics overview
  - Problem Space & Market Signals (3 named signals: World Bank MSME data, Modern Treasury 88% stat, Duplo internal fraud research)
  - Target User & Context (specific persona: Finance and Administration Lead, 20–200 employees, ₦10M–₦500M monthly payment volume)
  - Core Hypothesis (stated + three named failure conditions)
  - Success Metrics (5 metrics; 2 framed as invariants with explicit PM annotation defending the choice)
  - Strategic Scope / Guardrails (5 guardrails: no fund custody, no proprietary ledger, NGN-only MVP, B2B only, no auto-approval)
  - PM annotation on CBN PSSP licence tier (OPD-03 — partially resolved, legal confirmation still needed)

### Checklist
- [x] Problem statement: specific profile (Finance and Administration Lead, 20–200 employees, ₦10M–₦500M monthly volume)
- [x] Core hypothesis: stated explicitly with failure conditions
- [x] 3–5 success metrics — 5 defined with targets and rationale
- [x] Activation metric — Vendor & Request Onboarding Rate (14-day window, ≥ 60%)
- [x] Transaction volume metric — Payment State Completion Rate (≥ 75%)
- [x] Compliance metric — KYB Gateway Enforceability + Flagged Transaction Audit Rate (both 100% invariants)
- [x] File saved to project directory

### Next action
None — deliverable complete. Move to Deliverable 4 (Architecture Note) — fastest remaining win from existing spec material.

---

## Deliverable 2 — Requirements Document

**Capstone requirement:** AI-generated, PM-annotated. Panel will look for judgment — where you disagreed, corrected, or caught something.

### Checklist
- [x] User stories for primary flow (Payment Request → Approval → Settlement → Reconciliation)
- [x] User stories in explicit "As a [role], I want to… so that…" format
- [x] At least two edge case user stories (3 provided: EC-1 KYB mismatch, EC-2 webhook dedup, EC-3 tranche splitting)
- [x] Acceptance criteria — explicit, testable pass/fail format per story
- [x] One KYC/compliance gate (Business KYB + Vendor KYB gate)
- [x] One settlement/reconciliation flow (spec §8)
- [x] One failure/dispute scenario (Exception Queue, spec §9)
- [x] PM annotation layer visible (spec-review-v1.md = 44 findings; spec-resolution-v1.md = confirmed corrections)

### Status: ✅ Complete — `requirements-document.md`

### What exists
- `requirements-document.md` — Full panel-ready requirements document:
  - 6 primary user stories ("As a [role], I want to… so that…" format)
  - Formal acceptance criteria per story (testable, pass/fail implied)
  - 3 edge case user stories: EC-1 (KYB name mismatch), EC-2 (duplicate webhook idempotency), EC-3 (tranche splitting)
  - Explicit Compliance Gate section (5 triggers, ACs, four-eyes invariant)
  - Failure & Exception Scenarios table
  - PM Annotation Summary table (6 key corrections surfaced with finding IDs)
  - Inline PM annotation callouts throughout at each decision point
  - PRD blocker status updated (2 of 3 resolved)

### Checklist
- [x] User stories for primary flow
- [x] User stories in "As a [role], I want to… so that…" format
- [x] At least two edge case user stories (3 provided)
- [x] Acceptance criteria — explicit, testable per story
- [x] One KYC/compliance gate — Business KYB (Story 1) + Vendor KYB (Story 2) + Compliance Review Queue section
- [x] One settlement/reconciliation flow — Story 5
- [x] One failure/dispute scenario — EC-2 (duplicate webhook) + Exception Scenarios table
- [x] PM annotation layer — inline callouts + summary table, referencing spec-review-v1.md findings
- `payops-control-tower-spec.md` — full engineering build spec
- `spec-review-v1.md` — 44 audit findings (the PM annotation evidence base)
- `spec-resolution-v1.md` v1.1 — confirmed resolutions

### Next action
None — deliverable complete. Commit, then move to Deliverable 1 (Product Brief → `product-brief.md`).

---

## Deliverable 3 — Working Prototype

**Capstone requirement:** Core user journey end-to-end. Not a wireframe. Compliance gate must be visible inside the product.

### Checklist
- [x] Core journey works: Vendor onboarding → Payment Request creation → Maker-Checker approval (with PIN) → Settlement webhook → Reconciliation status
- [x] Compliance gate visible: needs_review vendor blocks payment creation; HIGH_VALUE ≥₦5M routes to compliance_review queue; four-eyes rule enforced server-side
- [x] Failure path visible: PSP_FAILURE and AMOUNT_MISMATCH both route to exception queue with explanatory UI
- [x] Missing features documented with explanations (Deployment notes section above; no live PSP, no email notifications, no NFIU STR filing)

### Status: ✅ Complete — `~/Projects/payops-prototype/`

### What exists
- Full-stack Next.js 16 application (App Router, TypeScript, Tailwind CSS)
- Prisma 7 + SQLite (libsql adapter) — production can swap to Neon PostgreSQL
- All 21 routes compiled and TypeScript-verified
- Dev server: `cd ~/Projects/payops-prototype && npm run dev` → http://localhost:3000

### Core journeys implemented
1. **Register** → business + owner account creation, JWT session (8h)
2. **Team** → Owner adds Maker (Finance Admin) and Admin (Checker) for four-eyes demo
3. **Vendor onboarding** → NUBAN 10-digit entry, Jaro-Winkler score (1234=auto-approve, 5678=needs_review, 9999=mismatch), KYB manual approval with justification ≥20 chars
4. **Payment request** → Maker creates invoice-backed request; HIGH_VALUE (≥₦5M) shows compliance warning pre-submit
5. **Compliance queue** → HIGH_VALUE / DUPLICATE_INVOICE / AMBIGUOUS_MATCH / REPEATED_FAILURE triggers; Checker can Clear → pending_approval or Block → exception_queue; four-eyes: compliance resolver cannot also approve
6. **Maker-Checker approval** → PIN input (4-digit), lockout (5 attempts → 30 min lock), optimistic concurrency (version check → 409 on conflict), immutable makerId
7. **PSP dispatch** → fire-and-forget async, 2s simulated delay, 80% SUCCESS / 20% FAILURE, HMAC-SHA256 signed webhook POST
8. **Settlement webhook** → signature validation, transactionReference dedup, NIP tolerance check (₦0/₦10/₦50), routes to reconciled or AMOUNT_MISMATCH/PSP_FAILURE exception
9. **Real-time polling** → payment detail page polls every 2s while in `processing` state
10. **Exception queue** → PSP_FAILURE, AMOUNT_MISMATCH, ORPHANED_SETTLEMENT displayed with explanations
11. **Audit log** → immutable, who/what/when/outcome for all actions
12. **PIN setup** → bcrypt cost 10, required before Checker can approve

### Compliance gates visible
- KYB vendor gate: cannot create payment against needs_review vendor
- Compliance review queue: HIGH_VALUE ≥₦5M routes to compliance_review before approval
- Four-eyes invariant: enforced server-side (maker check + compliance resolver check)
- PIN lockout: 5 wrong attempts → 30-min lock, displayed to user
- Concurrency guard: version field prevents double-approval

### Key files
- `src/lib/kyb.ts` — Jaro-Winkler, NUBAN HMAC/AES-256-GCM, KYB decision
- `src/lib/compliance.ts` — compliance trigger detection, NIP tolerance (corrected tiers)
- `src/actions/payments.ts` — maker-checker, PIN lockout, optimistic concurrency, PSP dispatch
- `src/app/api/webhooks/settlement/route.ts` — HMAC validation, dedup, reconciliation

### Checklist
- [x] Core journey works: Vendor onboarding → Payment Request → Maker-Checker (PIN) → Settlement webhook → Reconciliation
- [x] Compliance gate visible: KYB failure, needs_review, compliance_review queue, HIGH_VALUE trigger
- [x] Failure path visible: exception queue with PSP_FAILURE, AMOUNT_MISMATCH
- [x] Four-eyes invariant visible: maker blocked from approving own request; compliance resolver blocked from also approving
- [x] Team management: Owner adds Maker/Admin for realistic demo
- [x] Audit log: every action logged with who/what/when/outcome

### Next action
Deploy to Vercel. Then Deliverable 6 (Retrospective) — do last after prototype experience.

### Deployment notes (when ready)
- Switch DATABASE_URL to Neon PostgreSQL (prisma migrate deploy)
- Set env vars: SESSION_SECRET, PSP_WEBHOOK_SECRET, NUBAN_SECRET, NEXT_PUBLIC_BASE_URL, DATABASE_URL
- Set NEXT_PUBLIC_BASE_URL to Vercel URL so dispatchToPsp webhook call resolves correctly

---

## Deliverable 4 — Architecture Note

**Capstone requirement:** 1 page.

### Checklist
- [x] Money movement narrative: how does money flow from Maker's intent to vendor settlement?
- [x] Rails and partners: which payment rails, which PSP partner (even if simulated)
- [x] Float/FX exposure hypothesis: who owns the risk? Where does it sit?
- [x] Transaction failure: what happens technically AND what the user sees

### Status: ✅ Complete — `architecture-note.md`

### What exists
- `architecture-note.md` — Panel-ready Architecture Note:
  - ASCII system position diagram showing PayOps as the orchestration layer between finance team and PSP/rails
  - Money movement narrative (6 steps, PM language, no code)
  - Rails & Partners table (CAC API, NUBAN API, PSP, NIP) with simulated MVP caveat
  - PM annotation: why simulated PSP and why it's swappable without redesign
  - PM annotation: NIP charge tolerance bands are real NIBSS fee schedule values (not approximations)
  - Float/FX: zero in MVP (explicit reasoning), post-MVP FX position stated (sits with PSP partner)
  - Transaction failure table: 6 failure scenarios — what system does + what user sees
  - Compliance architecture diagram (route-change at request creation, not post-processing)
  - Out of scope table (6 items, each with explicit reason)

### Checklist
- [x] Money movement narrative: Maker intent → vendor settlement in 6 steps
- [x] Rails and partners: CAC API, NUBAN API, NIP (via PSP), simulated PSP in MVP
- [x] Float/FX exposure: zero in MVP, post-MVP FX sits with PSP partner
- [x] Transaction failure: 6 scenarios with both system action and user-visible message

### Next action
None — deliverable complete. Move to Deliverable 5 (Compliance Summary) — most research-heavy remaining deliverable; CBN licence tier needs a defended answer.

---

## Deliverable 5 — Compliance Summary

**Capstone requirement:** Panel will probe this harder than anything else.

### Checklist
- [x] CBN PSP licence categories: which tier applies to PayOps in Nigeria?
- [x] Which licences MVP operates under vs. defers (and what "defers" means operationally)
- [x] User data: what is collected, why, how stored and protected
- [x] NDPA and FCCPC coverage
- [x] AML triggers / flagged transactions: how the product handles them
- [x] 48-hour regulatory response plan: what you would do if CBN issued a directive affecting your product category

### Status: ✅ Complete — `compliance-summary.md`

### What exists
- `compliance-summary.md` — Full panel-ready Compliance Summary:
  - CBN licence: PSSP confirmed (PSS category, sub-licence PSSP); permitted activities table; fund-holding prohibition confirmed; ₦100M standalone capital requirement; MVP operating under PSP partner licence
  - Data collected/protected: full data inventory table with legal basis (NDPA 2023), retention periods (6yr CITA), storage controls (NUBAN dual encryption, bcrypt, retention lock, DB role grants)
  - NDPA 2023: obligations table, enforcement notice (1,368 orgs August 2025), DPO/NDPC registration thresholds
  - FCCPC: DEON 2025 Regulations confirmed NOT applicable (PayOps not a lender); FCCPA 2018 general obligations in scope
  - AML triggers: 5 compliance review triggers with AML rationale; NFIU STR filing obligation noted as post-MVP
  - Active directives table: 5 live CBN directives (May 2025 AML, March 2026 NRS TMS, Dec 2025 dual connectivity, Aug 2025 ISO 20022, NRS e-invoicing Phase 2)
  - 48-hour directive scenario: hour-by-hour response plan modelled on real March 2026 NRS TMS directive
  - Compliance gaps table: 7 items with status and action needed
  - **Spec correction (§8): NIP fee tiers need updating** — ₦10.75/₦25 are outdated; current CBN rates are ₦0/₦10/₦50; NIBSS targeting zero fees by 2026
  - Full source citations (14 sources)

### Checklist
- [x] CBN PSP licence categories: PSSP confirmed, capital requirement stated
- [x] Which licences MVP operates under vs. defers (PSP partner umbrella in MVP; PSSP self-licensing at scale)
- [x] User data: full inventory with legal basis, retention, and storage controls
- [x] NDPA and FCCPC coverage: both addressed; FCCPA general obligations vs. DEON 2025 distinction made
- [x] AML triggers: 5 triggers documented with AML rationale; NFIU obligation noted
- [x] 48-hour regulatory response plan: specific, actionable, modelled on real current directive

### Next action
None — deliverable complete. NIP fee tier spec correction noted — should update spec-resolution-v1.md §8 before engineering build begins. Then move to Deliverable 6 (Retrospective) — do last, after prototype decision.

---

## Deliverable 6 — Retrospective

**Capstone requirement:** ≥0.5 page. Honesty rewarded over confidence.

### Checklist
- [ ] What isn't working: what does your MVP not do well and why (honest assessment)
- [ ] Next 3 sprint priorities in order with reasoning for the ordering
- [ ] Where AI fell short: specific example, what you caught, what you did
- [ ] Compliance risk you didn't see coming: every product has one, find yours

### Status: ✅ Complete — `retrospective.md`

### Advantages from current work
The work done so far hands you most of this section:

**"Where AI fell short" — specific examples ready:**
- SEC-01: AI-generated spec had no webhook signature verification. You caught it in the security audit. The exploit path was mapped (forged settlement payloads). The fix is in spec-resolution-v1.md §12.
- AL-01: AI introduced a `blocked` KYB outcome that contradicted the PRD (CLAUDE.md §5.5). Caught in the alignment audit. Removed.
- ST-02: AI spec had no `exception_queue` status value despite the entire Exception Queue feature being defined. Structural gap caught in stress-test.

**"Compliance risk you didn't see coming":**
- The four-eyes gap (ST-13/BL-06): A single Checker could clear a high-value compliance review AND then approve the same payment — defeating the compliance gate. Not obvious until the adversarial audit.
- Multi-tenancy isolation (BL-07/SEC-03): No spec section defined the `businessId` filter requirement cross-cutting all services. An engineer building without this invariant stated would create a cross-tenant data leak.

### Next action
Do last. After prototype is built you'll have fresh examples of what the app does and doesn't do. Retrospective will be richer.

---

## Panel Prep — Critical Questions to Have Answers For

These are the questions the panel is most likely to ask based on the brief. Every answer should be ready before the defence.

| Question | Answer source | Ready? |
|---|---|---|
| What is the problem, and who exactly has it? | Product Brief | ✅ |
| What must be true for this product to work? | Product Brief (hypothesis) | ✅ |
| How do you measure success? | Product Brief (metrics) | ✅ |
| What CBN licence tier applies to your product? | Compliance Summary | ✅ |
| Show me what happens when a user fails KYC. | Prototype | ✅ |
| How does money move through your product? | Architecture Note | ✅ |
| What happens when a payment fails? | Architecture Note + Prototype | ✅ |
| Where does float/FX risk sit? | Architecture Note | ✅ |
| How does your product handle AML triggers? | Compliance Summary | ✅ |
| Where did the AI get it wrong and what did you do? | Retrospective | ✅ |
| What compliance risk surprised you? | Retrospective | ✅ |

---

*Update this file at the end of every session. Status changes go here first, then CLAUDE.md §0 summary table.*

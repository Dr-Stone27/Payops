# Phase 1 — Deep Connective Audit

**Date:** 2026-07-01 · **Against:** `context/product-model.md` (confirmed) · **Rule:** `rules/connective-audit.md`
**Method:** module-by-module, Product/UX/Backend lenses, connected, then a 5-point verification pass. Only findings that survived are listed, marked `[VERIFIED]`. Severity anchored to the 60-second success bar and the panel/investor pitch.

**Hero spine (confirmed):** Add vendor → KYB verifies → Maker raises invoice-backed payment → a *different* Checker approves with PIN → dispatch → auto-reconcile → audit log.

---

## Cross-module synthesis (ranked — start here)

| # | Finding | Class | Severity | Why it matters for the pitch |
|---|---|---|---|---|
| 1 | **Naming split: live product is "Watchtower", every deliverable says "PayOps Control Tower"** | UX-REPLACE | **High** | The panel sees one name; your brief, README, and slides say another. Reads as unfinished. Trivial to fix. |
| 2 | **HIGH_VALUE threshold is 10× too low (₦500k, not ₦5M)** | BACKEND-REPLACE | **High** | A core financial control is miscalibrated; UI copy actively misstates it. A reviewer testing "₦1M shouldn't need compliance" will see it wrongly flagged. |
| 3 | **Live settlement bypasses the signed-webhook + NIP path** | BACKEND-REPLACE | **High** | The HMAC/dedup/NIP reconciliation you lead with isn't the path the product runs; `AMOUNT_MISMATCH` is undemonstrable. Credibility risk under questioning. |
| 4 | **4 of 6 exception types + several UI branches are unreachable in the live product** | SECONDARY-TO-SPINE | **Med-High** | Hollow depth. A curious click lands on states the product can't actually produce, or a dead "Acknowledge" button. |
| 5 | **Duplicate-NUBAN control is bypassable** | BACKEND-REPLACE | **Med** | Add two `needs_review` vendors on the same account, approve both — the anti-fraud check only looks at already-`approved` vendors. |
| 6 | **`COMPLIANCE_REVIEW_TIMEOUT` mislabel** — a manual Block is shown to users as a 48-hour timeout | UX-REPLACE | **Med** | Wrong explanation of what happened; erodes the "we tell you exactly what's going on" promise. |
| 7 | **Server-side amount validation gap (negative / zero-ish)** | BACKEND-REPLACE | **Med** | `createPayment` doesn't reject negative amounts server-side (baseline P07/P13). Hard to hit via the UI, real via the action. |
| 8 | **Persistent onboarding banner + dead "Settled" filter + palette drift** | UX-REPLACE | **Low** | Polish items that cumulatively read as "prototype." |

**The through-line:** the *controls that form the spine are real and enforced* (four-eyes, PIN, concurrency, tenant isolation, KYB, audit). The risk is almost entirely **surface honesty** — the product advertises depth (webhook settlement, six exception types, ₦5M threshold, NIP tolerance) that the live path doesn't actually exercise. Fixing that gap between claim and behaviour is the single highest-leverage theme for both demo and pitch.

---

## Module 1 — Auth & Session
**Verdict:** Solid for a demo. Enforcement is real.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| WORKS | Server-side session gate on all dashboard pages; API returns 401 | `layout.tsx:23`, `proxy.ts:18` | — | — |
| WORKS `[VERIFIED]` | Revocation holds — `getSession` checks the DB session row every request; deleting it forces re-login within one request | `session.ts:47`, `auth.ts:129` | Middleware is JWT-only but not the enforcement point | — |
| WORKS | Weak-PIN blocklist on setup; bcrypt(10) for password + PIN | `auth.ts:194`, `walkthrough.ts:119` | — | — |
| LACKING `[VERIFIED]` | No invitation flow — Owner sets the teammate's password directly | `auth.ts:133` | Spec's email-invite link dropped; owner knows every password | Low (MVP) |
| BACKEND-REPLACE | `cuid()` is `Math.random()`+timestamp, not a real CUID | `auth.ts:9` (and payments/vendors) | Predictable/collision-prone IDs; mitigated by tenant scoping | Low |

## Module 2 — Vendors & KYB
**Verdict:** Strong and demo-ready; one real control gap.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| WORKS | KYB thresholds + seeded NUBAN scenarios; clean score UI with legend | `kyb.ts:24,48`, `vendors/[id]/page.tsx:95` | The spine's verification step demos beautifully | — |
| WORKS | Manual approval requires ≥20-char justification, stored on record + audit | `vendors.ts:81`, `vendors/[id]/page.tsx:117` | — | — |
| WORKS | `Review →` is role-gated in UI; approval is enforced server-side | `vendors/page.tsx:90`, `vendors.ts:84` | Frontend gate is UX-only, backend holds | — |
| BACKEND-REPLACE `[VERIFIED]` | **Duplicate-NUBAN block only checks `approved` vendors** — add two `needs_review` with the same NUBAN, approve both; `approveVendor` never re-checks | `vendors.ts:42` (`kybStatus:"approved"`), `vendors.ts:81` | The anti-fraud "one account, one vendor" control is bypassable | Med |
| LACKING | No vendor edit → `BENEFICIARY_CHANGE` trigger can never fire | `compliance.ts` (no path) | Dead trigger surfaced in payment/compliance copy | Low |

## Module 3 — Payments & Maker-Checker
**Verdict:** The four-eyes core is genuinely well-built. Amount handling is the weak spot.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| WORKS `[VERIFIED live]` | Four-eyes: maker block + compliance-resolver block, server-side, identity-based | `payments.ts:109,114`; live audit log | The trust story holds up under inspection | — |
| WORKS | Version-checked atomic approval in a transaction; 409-style conflict message | `payments.ts:139,147` | Real concurrency safety | — |
| WORKS | PIN 5-attempt → 30-min lockout; PIN required before approve | `payments.ts:121,91` | — | — |
| BACKEND-REPLACE `[VERIFIED]` | **No server-side guard on negative amounts** — `!amountNaira` only rejects 0/empty; a negative passes | `payments.ts:27,31` | Baseline P07/P13 (frontend ≠ backend enforcement); hard via UI, real via action | Med |
| SECONDARY-TO-SPINE | `TRANCHE_LIMIT_EXCEEDED` reject at >₦50M with no actual tranching | `payments.ts:33` | Leftover spec vocabulary; harmless but confusing | Low |

## Module 4 — Compliance Review
**Verdict:** Good role-aware UX, undermined by the threshold bug and stale copy.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| BACKEND-REPLACE `[VERIFIED live]` | **HIGH_VALUE fires at ₦500,000, not ₦5,000,000** — constant `500_000_00` (=50M kobo). Live audit: ₦800k → compliance_review | `compliance.ts:3`; audit log | ₦500k–₦5M payments get flagged with **no** high-value warning to the maker (form warns only at ₦5M) | High |
| UX-REPLACE | Compliance copy states "above ₦5,000,000" in two places — contradicts actual behaviour | `compliance/page.tsx:11,18`; `payment/[id]:25` | Misleads the maker about why they were flagged | Med (rides on #2) |
| WORKS | Clear/Block gated to a non-maker Checker; maker sees why they can't act | `payments.ts:216`, `compliance/page.tsx:96` | Four-eyes extends to the compliance gate | — |
| UX-REPLACE | `AMBIGUOUS_MATCH` maker copy says "manually approved vendors"; trigger is actually score-based and re-fires on **every** payment to that vendor | `compliance.ts:24`, `compliance/page.tsx:22` | Copy ≠ logic; possibly unintended recurring friction | Low-Med |

## Module 5 — Settlement & Reconciliation
**Verdict:** The advertised mechanism and the running mechanism are different. Headline risk.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| BACKEND-REPLACE `[VERIFIED]` | **Live path = `settleDirectly` (inline 80/20 random), not the signed webhook.** No `WebhookEvent`, no NIP check; `settledAmount` hard-set = amount on success | `payments.ts:161,328` | The signed-webhook/NIP/dedup story is Postman-only; `AMOUNT_MISMATCH` unreachable in demo | High |
| UX-REPLACE `[VERIFIED]` | Reconciled card claims "matched within NIP charge tolerance" though NIP is never run on this path | `payments/[id]/page.tsx:210` | Overstates what the system verified | Med |
| SECONDARY-TO-SPINE `[VERIFIED]` | "Processing / awaiting webhook / updates automatically" card + 2s polling barely render — settlement is synchronous in `approvePayment` | `payments/[id]/page.tsx:87,182` | The most "live-feeling" moment of the demo is effectively invisible | Med |
| WORKS | The webhook route itself is correct: HMAC verify, dedup, NIP tiers, orphaned handling | `api/webhooks/settlement/route.ts:12,23,64` | Good code — just not wired to the UI flow | — |

## Module 6 — Exception Queue
**Verdict:** Beautiful UI over mostly-unreachable states.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| SECONDARY-TO-SPINE `[VERIFIED]` | **Only 2 of 6 categories are reachable live** (`PSP_FAILURE`, `COMPLIANCE_REVIEW_TIMEOUT`). `AMOUNT_MISMATCH`/`ORPHANED` are webhook-only; `STATUS_UNKNOWN`/`PARTIAL_TRANCHE_SETTLEMENT` have no producing code | `exceptions/page.tsx:9-40` vs `payments.ts` | Presents depth the product can't generate | Med-High |
| UX-REPLACE `[VERIFIED]` | "Acknowledge" action is a static `<span>` — no handler, does nothing | `exceptions/page.tsx:124` | A dead control on a governance screen | Med |
| WORKS | Copy is genuinely good — plain-language, "nothing is lost", variance line for mismatches | `exceptions/page.tsx:57,104` | Strong when the state is real | — |

## Module 7 — Audit Log
**Verdict:** A genuine strength. Lead with it.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| WORKS `[VERIFIED live]` | Who/what/when/outcome on every action; "System" actor for automated events; monospace action codes | `audit.ts`, live `/audit` | The most pitch-ready screen in the product | — |
| LACKING | `retentionLocked`/immutability is a column default, not DB-enforced (SQLite; no row-security) | `schema.prisma:112` | "Immutable/tamper-evident" is aspirational at MVP | Low (disclose) |

## Module 8 — Team
**Verdict:** Functional; carries the invitation-flow limitation from Module 1.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| WORKS | Role assignment, PIN-status visibility, four-eyes explainer | `SCREENS.md` §13, live | Supports the demo's two-user setup | — |
| LACKING | Owner-set passwords (no invite link); only Owner is unique — no ownership transfer | `auth.ts:133` | Spec features dropped; fine for MVP if disclosed | Low |

## Module 9 — Dashboard, Nav & Shell
**Verdict:** Clean, credible IA. Minor polish.

| Class | Finding | Evidence | Through-line | Severity |
|---|---|---|---|---|
| WORKS | Grouped IA (Overview/Operations/Governance/Organization); urgency rings on Compliance/Exceptions; good empty states | `layout.tsx`, `dashboard/page.tsx:79`, live | Reads like a real ops product | — |
| UX-REPLACE `[VERIFIED live]` | Onboarding banner persists on every page until dismissed | live; `WalkthroughBanner` | Eats vertical space on working surfaces | Low |
| UX-REPLACE `[VERIFIED live]` | Payments list has a `Settled` filter, but nothing rests at `settled` | live `/payments` | Dead filter | Low |
| UX-REPLACE | Palette drift: built `#0e7a5a`/`#0c1d2e` vs `SCREENS.md` `#059669`/`#111827` | `design.ts` vs `SCREENS.md:19` | Doc≠build; internally consistent | Low |

---

## What I did NOT verify (honesty log)
- Did not drive a full create→approve→settle flow live (writes data, needs 2 users) — settlement/processing findings are code-confirmed.
- Did not trigger the PIN lockout or empty-account states live — code-confirmed.
- Did not read every leaf (auth pages, `NewPaymentForm` client, `NavLinks`/`TopBar`, remaining GET routes) line-by-line; module logic and patterns are covered. `NewPaymentForm` client-side min-amount guard is unconfirmed (server-side gap stands regardless).

*Phase 1 complete. Feeds Phase 2 (research) and Phase 3 (improvement synthesis).*

# Phase 3 — Improvement Synthesis

**Date:** 2026-07-01 · **Prompt:** `.claude/prompts/03-improvement-synthesis.md`
**Locked decisions:** Name = **Watchtower**. Positioning = **A+B** — the control & audit layer (category), led by *"no payment leaves without a verified vendor and a second set of eyes"* (headline).
**Principle:** completeness with focus — demote/simplify before deleting; make the spine *honest and legible*, don't widen it.

---

## The sharpened spine (target state)

> In **Watchtower**: add a vendor → we confirm the bank account name matches the CAC business (you never pay the wrong account) → a Maker raises an invoice-backed request → a **different** Checker approves with a PIN (nothing moves on one person's say-so) → the payment dispatches and settles with **live status** → every step lands on a **permanent audit trail**.

Everything below serves that sentence. Anything that doesn't is demoted behind it.

---

## Per-module fix plan

| # | Finding | Disposition | Concrete, testable change | Borrowed pattern | Effort | Tier |
|---|---|---|---|---|---|---|
| 1 | Naming split | **REBUILD (docs)** | App is already "Watchtower" — rename it across **all deliverables** (README, PRODUCT.md, product-brief, requirements, architecture-note, compliance-summary, capstone-tracker) and any user-facing "PayOps" copy. Acceptance: zero user-facing/deliverable "PayOps Control Tower" strings remain (internal identifiers like `payops_session` may stay). | Every comparable has one crisp name | S | 1 |
| 2 | HIGH_VALUE 10× too low | **REBUILD** | Fix `compliance.ts:3` to ₦5,000,000 (`500_000_000` kobo). Surface the trigger reason **at payment creation** ("This will need a compliance review because…"), not just after. Align all copy (`compliance/page.tsx`, `payment/[id]`, new-payment form) to the real number. Acceptance: ₦4.9M → no review; ₦5M → review, with maker warned pre-submit. | P1 transparent routing | S + M | 1 |
| 3 | Live settlement bypasses signed webhook + NIP | **REBUILD** | Make `approvePayment` dispatch **asynchronously** to the real signed-webhook route (HMAC + dedup + NIP), instead of `settleDirectly`. Result: advertised path = real path; `processing`/polling UX comes alive; `AMOUNT_MISMATCH` becomes demonstrable. Acceptance: an approved payment sits in `processing`, then flips to `reconciled`/exception via a `WebhookEvent`; a seeded off-by-fee amount yields `AMOUNT_MISMATCH`. | P4 real-time status | M–L | 1 |
| 7 | No server-side negative-amount guard | **REBUILD** | `createPayment`: reject `amountKobo <= 0` server-side. Acceptance: negative/zero rejected by the action regardless of client. | — (baseline P07/P13) | S | 1 |
| 4a | Dead "Settled" filter + no-op "Acknowledge" button | **CUT + REBUILD** | Remove the `Settled` filter tab (nothing rests there); **wire "Acknowledge" to mark the exception resolved + write an audit entry** (owner-confirmed — not removed). Acceptance: no control leads to a dead end; Acknowledge changes state + logs. | P5 show only real states | S | 1 |
| 4b | Unreachable exception categories | **SIMPLIFY** | After #3, `AMOUNT_MISMATCH`/`ORPHANED` are reachable. `PARTIAL_TRANCHE_SETTLEMENT` → **CUT** (no tranching). `STATUS_UNKNOWN` → **CUT** (owner-confirmed; no 48h job for MVP). Acceptance: every category shown is producible. | P5 | S | 2 |
| 5 | Duplicate-NUBAN control bypassable | **REBUILD** | Broaden the check to **all** vendor records (drop `kybStatus:"approved"` filter, `vendors.ts:42`) and re-check at `approveVendor`. Acceptance: two vendors with the same NUBAN cannot both reach `approved`. | P6 verification integrity | S | 2 |
| 6 | `COMPLIANCE_REVIEW_TIMEOUT` mislabel | **REBUILD** | Manual Block → new category `COMPLIANCE_BLOCKED` with honest copy ("A checker blocked this payment"); reserve `TIMEOUT` for an actual timeout. Acceptance: blocked payment reads as blocked, not timed-out. | P2 honest audit story | S | 2 |
| 4c | Reconciled copy overstates NIP | **SIMPLIFY** | Fixed automatically once #3 lands (NIP really runs). Until then, soften copy. | — | S | 2 |
| 9 | AMBIGUOUS_MATCH copy ≠ logic; re-fires every payment | **SIMPLIFY + decide** | Correct the maker copy (it's score-based, not "manually approved"). Decide whether re-flagging every payment to an ambiguous vendor is intended. | P1 | S | 2 |
| 8a | Persistent onboarding banner | **SIMPLIFY** | Auto-collapse after setup complete / make dismissal sticky per user. | — | S | 3 |
| 8b | Palette drift doc↔build | **SIMPLIFY** | Align `SCREENS.md` to the built palette (or vice-versa). | — | S | 3 |
| 10 | `cuid()` is `Math.random()` | **REBUILD** | Swap for a real `cuid`/`uuid`. | — | S | 3 |
| — | Audit immutability is a column default | **KEEP + disclose** | Real DB-level enforcement is post-MVP (needs Postgres row-security); disclose honestly in the pitch. | — | — | 3 |

---

## Sequenced roadmap

**Tier 1 — Pitch-critical (before any demo/panel):**
`#1` rename to Watchtower · `#2` threshold + creation-time warning · `#7` negative guard · `#4a` kill dead filter/button · `#3` make settlement real (the big one — highest credibility payoff).

**Tier 2 — Strong signal next:**
`#4b` prune/settle exception states · `#5` duplicate-NUBAN integrity · `#6` block relabel · `#4c`/`#9` copy accuracy.

**Tier 3 — Post-pitch polish:**
`#8a` banner · `#8b` palette · `#10` IDs · audit-immutability (disclose now, build later).

---

## Explicitly demoted / cut (nothing removed silently)
- **CUT:** `Settled` filter tab; `PARTIAL_TRANCHE_SETTLEMENT` exception category; (conditionally) `STATUS_UNKNOWN` if the timeout job isn't built.
- **DEMOTE:** nothing structural — the spine already dominates the IA; the work is making it honest, not reordering it.

## Product decisions — RESOLVED (owner-confirmed 2026-07-01)
1. **HIGH_VALUE threshold = ₦5,000,000.** ✓ Fix `compliance.ts:3` to `500_000_000` kobo.
2. **Settlement → REBUILD the async webhook path.** ✓ Route approval through the real signed-webhook (HMAC + dedup + NIP); no narrowing of the claim.
3. **`STATUS_UNKNOWN` → CUT.** ✓ Remove the category from the exceptions UI; do not build a 48h timeout job for MVP.
4. **"Acknowledge" → make it a REAL resolve action.** ✓ Wire it to mark the exception resolved + write an audit entry (not a static span).

---

## v2 revision — post-research reframe

Phase 2 v2 reframed Watchtower as *the independent assurance layer over the accounts you already use* (not a parallel rail). Two structural additions:

- **NEW #11 — Dashboard → Control Tower (not a ledger). [Tier 1]** Replace the payments-ledger dashboard with a **risk/attention console**: (a) *what needs me* — payments awaiting my approval, compliance queue; (b) *what's at risk* — flagged vendors, open exceptions, ₦ sitting in exception; (c) *recent control events* — approvals, blocks, KYB flags. Demote the historical payments table below this. **Acceptance:** an owner/admin opening the dashboard sees "what needs me / what's at risk" *above* any historical list. This is the single change that flips nice-to-have → need-to-have, and it's the screen a panel sees first.

- **NEW #12 — Reframe settlement as orchestration *over existing rails*, not a parallel PSP. [Tier 1 framing / roadmap build]** Stop presenting Watchtower as a place you route money *through*. **Near-term (demo):** copy + framing ("dispatched to your PSP partner", "we never hold your funds") + the #3 async-webhook fix so it reads as orchestration. **Roadmap (post-capstone):** real integration — NIBSS name-enquiry for KYB, bank/PSP APIs for dispatch + settlement. **Acceptance:** nothing in the demo implies Watchtower holds funds or *is* the rail.

**Re-prioritisation:** #11 joins **Tier 1** (clearest "why this matters"; first screen a panel sees). #12's *framing* is Tier 1 (copy/narrative); its *real integration* is explicitly roadmap.

**Positioning thread:** every fix now serves one thesis — independent assurance (verify vendor + four-eyes + tamper-evident audit) over the accounts you already use, no migration. If a fix doesn't serve that, it's not Tier 1.

*Phase 3 (v2) complete. Feeds Phase 4 (pitch & demo readiness).*

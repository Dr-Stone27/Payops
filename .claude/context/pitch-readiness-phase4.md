# Phase 4 — Pitch & Demo Readiness

**Date:** 2026-07-01 · **Prompt:** `.claude/prompts/04-pitch-readiness.md`
**Built on the reframe:** Watchtower = the *independent* payment-controls & audit layer, over the accounts you already use.

---

## The one-liner
> **Watchtower is the control room for business payments — verify every vendor, require a second set of eyes, and keep a tamper-proof record, on top of the bank accounts you already use.**

Short form for the demo open: *"No payment leaves without a verified vendor and a second set of eyes — and everything is on the record."*

## Problem worth solving (why now)
- Nigerian businesses lost **₦52.26bn to fraud in 2024** (+196% over five years); **26% of SMEs** lost revenue to fraud. [NIBSS](https://nairametrics.com/2025/02/26/nigerias-financial-sector-suffers-n52-26-billion-loss-to-fraud-in-2024-nibss-report/)
- The dominant vector is **vendor-account / BEC fraud** — someone changes a vendor's bank details and the money goes to the wrong account. The prescribed defense is **verify the account name + dual-approve vendor changes** — which most SMEs do informally over WhatsApp/phone, or not at all. [AP Fraud Playbook](https://www.ap-professionals.com/2026/02/ap-fraud-playbook.html)
- SMEs run payments across **fragmented tools** (email invoices, bank portals, spreadsheets) with **no audit trail** — when money goes wrong, there's no record of who approved what.
- Existing tools force a trade: **move your whole treasury onto their rails** (Duplo/Ramp/Bujeti) to get controls. Most SMEs won't migrate.
- **Watchtower gives the controls + audit on top of the accounts they already use — assurance without migration.**

## Why it's a product, not a feature (the challenge, answered)
Verification-as-control is sold standalone (**Positive Pay**, **BILL AP Controls**). Best practice mandates **separation of duties** — the party that moves money shouldn't be its own auditor. Watchtower's independence *is* the product.

## Hero demo script (~3 min, deployed app) — story of one payment
> Target state — assumes Tier-1 fixes (#1, #2, #3, #4, #7, #11) are in.

1. **Dashboard = Control Tower** — "First thing a finance lead sees: what needs my approval, what's at risk, what got flagged. A control room, not a ledger." *(needs #11)*
2. **Add vendor → KYB match** — enter vendor + account; Watchtower matches the CAC business name to the bank-account name. Show a **strong match** (auto-approve, NUBAN `…1234`) and a **mismatch** (needs review, `…9999`). "This is the anti-fraud gate — you can't pay an account whose name doesn't match the business."
3. **Raise a payment (as Maker)** — invoice-backed; show the compliance flag firing correctly at ₦5M with the **reason shown at creation**. *(needs #2)*
4. **Four-eyes approval (as a *different* Checker)** — enter PIN. Show the block: the raiser can't approve; the compliance-clearer can't approve. "Server-enforced — not a UI nicety."
5. **Settlement** — "Dispatched to your PSP partner." Live status → reconciled (or exception). "We never hold your money — we orchestrate and reconcile against the rail you already use." *(needs #3 + #12 framing)*
6. **Audit Log** — "Every step — who, what, when, outcome — permanent. This is what you hand your auditor or your bank." **The closer.**

## Show vs keep backstage
- **Show:** dashboard-as-control-tower, KYB match, four-eyes block, compliance reason, live settlement, audit log.
- **Backstage:** simulated PSP internals, SQLite, dev secrets, unreachable exception types, walled-garden mechanics. Disclose simulation honestly *if asked* (below).

## Panel Q&A prep
- **"Isn't this just a feature of Ramp/Duplo?"** → They require migrating your treasury onto them. Watchtower is provider-agnostic assurance over existing accounts. Positive Pay proves verification-as-control sells standalone; separation of duties says the mover of money can't be its own auditor.
- **"What's real vs simulated?"** → *Real:* four-eyes, PIN + lockout, concurrency guard, tenant isolation, KYB name-match, audit log, compliance triggers. *Simulated (MVP):* PSP dispatch/settlement (sandbox), CAC/NUBAN lookup (deterministic). *Roadmap:* NIBSS name-enquiry + bank/PSP APIs.
- **"Why not hold funds?"** → Deliberate — no custody means lighter licensing (CBN PSSP, not deposit-taking) **and** independence. We're the control layer, not the mover.
- **"Why would an SME pay?"** → ₦52bn fraud; a single prevented wrong-account payment exceeds a year's subscription — plus audit/compliance for their bank and regulators.
- **"What breaks at scale?"** *(honest)* → real bank/PSP integration, webhook volume, KYB rate limits, SQLite→Postgres. All roadmap.
- **"Regulatory posture?"** → CBN PSSP (no custody); NDPA for data (NUBAN dual-encrypted); AML triggers map to NFIU obligations.

## Credibility gaps to close BEFORE pitching (the demo's critical path)
`#1` naming → Watchtower (positioning done) · `#2` fix ₦5M threshold + reason-at-creation · `#3` real settlement (orchestration) · `#4` remove dead controls · `#7` negative-amount guard · `#11` dashboard-as-control-tower. If any of these is skipped, a curious click during the demo breaks the story.

## Deck narrative arc
Problem (fraud + fragmentation, cited) → why existing tools don't fit SMEs (migration cost) → Watchtower (independent assurance over existing rails) → demo (the one payment) → roadmap (real integrations) → ask.

*Phase 4 complete. Pipeline (Phases 0–4) done. Build-ready package below.*

---

## Build-ready package (what a build session picks up)
- **Tier 1 (pitch-critical):** `#1` naming · `#2` threshold + reason-at-creation · `#3` real async settlement · `#4a` kill dead filter/button · `#7` negative guard · `#11` dashboard-as-control-tower · `#12` orchestration framing (copy). Each has acceptance criteria in `improvement-plan-phase3.md`.
- **Tier 2:** prune/settle exception states · duplicate-NUBAN integrity · block relabel · copy accuracy.
- **Tier 3:** banner · palette · real IDs · audit-immutability (disclose now).
- **Roadmap (post-capstone):** NIBSS name-enquiry + bank/PSP integration to make "over existing rails" real.
- **Product decisions — RESOLVED (2026-07-01):** HIGH_VALUE = ₦5,000,000 · settlement = rebuild async webhook · STATUS_UNKNOWN = cut · Acknowledge = wire as a real resolve action. Package is fully locked for build.

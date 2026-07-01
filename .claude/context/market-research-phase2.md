# Phase 2 — Market & Comparable Research (v2)

**Date:** 2026-07-01 · **Prompt:** `.claude/prompts/02-market-research.md`
**v2 note:** v1 jumped to "sharpen the spine" without answering the harder question the product owner raised — *is this a product or a feature, why would anyone pay, and does it add friction?* v2 answers those first.

---

## The interrogation (answered first)

**1. Product or feature?** → **A real, paid, standalone category.**
- **Positive Pay** — a service businesses pay their bank for; its whole job is "verify payment details before processing" and "confirm the payee name." That is Watchtower's KYB name-match, sold standalone. [BILL](https://www.bill.com/learning/positive-pay), [Ramp](https://ramp.com/blog/what-is-positive-pay)
- **BILL "Accounts Payable Controls"** is a named product; **HighRadius** sells ERP-agnostic payment controls; "approval process control" is a whole software category. [GetApp](https://www.getapp.com/finance-accounting-software/accounts-payable/f/approval-process-control/)
- Best practice prescribes **separation of duties**: "dual approval for vendor master changes, *separate from* invoice approval." [AP Fraud Playbook](https://www.ap-professionals.com/2026/02/ap-fraud-playbook.html)
→ Verdict: controls + verification + audit is not merely a feature. Watchtower is in a legitimate space.

**2. Why would anyone pay?** → **The pain is large, rising, and specifically the pain Watchtower addresses.**
- **₦52.26bn** lost to fraud in Nigeria in 2024, +196% over five years. [NIBSS/Nairametrics](https://nairametrics.com/2025/02/26/nigerias-financial-sector-suffers-n52-26-billion-loss-to-fraud-in-2024-nibss-report/)
- **26% of Nigerian SMEs** lost revenue to fraud-related disruption. **80% of organizations** were hit by payment-fraud attempts (AFP 2023). Billing + tampering ≈ **50%** of payment fraud. [Ramp AP controls](https://ramp.com/blog/accounts-payable/internal-controls-for-accounts-payable)
- Vendor-account / BEC fraud is the marquee vector — attackers change vendor bank details; recommended defense = **verify via trusted channel + dual approval of vendor-master changes.** [FBI/First Business Bank](https://firstbusiness.bank/resource-center/business-email-compromise-fraud-real-case-studies/)
→ The market's own anti-fraud checklist *is* Watchtower's feature list.

**3. Friction or connector?** → **Today it's built as a detour; the wedge requires it to be a connector.**
- Real pain is **fragmentation**, not failed payments: "finance teams lose time because payment operations remain fragmented across systems, providers, and workflows" — invoices in email/WhatsApp, approvals verbal, payments in bank portals, reconciliation in spreadsheets. [glbank](https://www.glbank.com/sme-fragmented-financial-workflows)
- Watchtower's charter ("non-funds-holding, orchestrates around money moving through a licensed PSP") is a **connector** thesis. But the build behaves like a walled garden with its own simulated PSP you route *through* — a detour. **This is the flaw the product owner correctly sensed.** Fix = position/build as the layer *over existing rails*, not a parallel rail.

**4. Incumbent right-to-win vs ours.**
- **They do right:** own money movement (stickiness + float/interchange monetisation), integrated suite, automation/speed. That's why their software can be near-free.
- **We can do what they structurally can't:** (a) **provider-agnostic — no treasury migration** (most SMEs bank with GTB/Zenith/Access/Moniepoint and won't move); (b) **independence / separation of duties** — the entity that moves your money can't be its own auditor (why Positive Pay is a separate service); (c) **verification-gate as the product**, purpose-built for the #1 fraud vector, not a buried feature.

**5. Monetisation reality.** → Incumbents earn on **float/interchange/rails**; Watchtower holds no funds, so it **can't**. It must charge for **assurance itself (SaaS)**. That only works because the pain is acute enough (₦52bn; 80% targeted) to pay to prevent — but it means the value story must be fraud/error prevention + audit/compliance, not convenience.

---

## Landscape map

| Player | Strategy | Monetises on | Relevance to Watchtower |
|---|---|---|---|
| Duplo (NG/ZA) | Hold funds, move money, automate (PSSP) | Rails/float | Opposite strategy: own the money. High switching cost. |
| Ramp / Brex (US) | Cards + spend + AP suite | Card interchange | Controls are a buried feature; software ~free. |
| Bill.com (US) | High-volume AP; **sells "AP Controls"** | Subscription + txn | Proof controls sell standalone. |
| Bujeti (NG) | "Finance Control Centre" + cards | Cards/payments | Bundler; leads on efficiency. |
| **Avetium Technologies (NG)** | Integrated enterprise-ops suite (payroll, POS, eProcurement) — "replace disconnected tools with integrated systems" | Software licences | **Bundler / opposite strategy.** Validates demand for integrated finance ops; contrast to Watchtower's independent-overlay play. [site](https://avetiumtechnologies.com/) |
| Positive Pay (banks) | Verify-before-pay + payee-name match | Paid bank service | **Closest analogue to the core** — proves verification-as-control is monetised standalone. |
| Youverify / Dojah / NIBSS | KYB + bank-account-name verification APIs | API usage | The real integration path to make KYB genuine post-MVP. |

---

## The reframe (evolves A+B)

**Watchtower = the independent payment-controls & audit layer for Nigerian SMEs — verify the vendor, enforce four-eyes, keep a tamper-evident record, on top of the bank accounts you already use.**
Not a new place to move money — the **assurance layer over the money you already move.**
- **Wedge:** assurance *without migration* + independence/separation of duties.
- **Pain:** ₦52bn fraud, vendor-account BEC, fragmented unauditable ops.
- **Monetisation:** SaaS for assurance (can't earn float — must sell prevention + compliance).

## Product implications (feed Phase 3 revision)

1. **Dashboard must become a control tower, not a ledger.** Lead with *what needs my attention / what's at risk*: money exposed, approvals waiting on me, flagged vendors, open exceptions, recent control events. This is the single change that flips it from nice-to-have to need-to-have. (New Phase-3 item.)
2. **Reposition settlement as orchestration over existing rails**, not a parallel PSP — narrative + roadmap (real bank/NIBSS integration via Youverify/Dojah/NIBSS name-enquiry).
3. Everything in the prior audit still holds — but the *why* is now fraud-prevention + audit + no-migration independence, not "controls are nice."

## Honest caveat
If Watchtower can never integrate real bank rails (name-enquiry, bank/PSP APIs), the "on top of your existing accounts" wedge stays aspirational and it risks remaining a walled-garden demo. For the capstone that's acceptable *as stated roadmap* — but the positioning and demo must stop presenting a parallel rail and start presenting a control layer over existing rails.

## Sources
NIBSS fraud: [Nairametrics](https://nairametrics.com/2025/02/26/nigerias-financial-sector-suffers-n52-26-billion-loss-to-fraud-in-2024-nibss-report/), [Fintech Magazine Africa](https://fintechmagazine.africa/2025/02/26/nigerian-financial-institutions-lose-n52-26-billion-to-fraud-in-2024/) · Positive Pay: [BILL](https://www.bill.com/learning/positive-pay), [Ramp](https://ramp.com/blog/what-is-positive-pay) · AP controls/fraud: [Ramp](https://ramp.com/blog/accounts-payable/internal-controls-for-accounts-payable), [AP Fraud Playbook](https://www.ap-professionals.com/2026/02/ap-fraud-playbook.html), [GetApp](https://www.getapp.com/finance-accounting-software/accounts-payable/f/approval-process-control/) · BEC: [First Business Bank](https://firstbusiness.bank/resource-center/business-email-compromise-fraud-real-case-studies/), [Absa](https://cib.absa.africa/home/insights-and-events/business-email-compromise/) · Fragmentation: [glbank](https://www.glbank.com/sme-fragmented-financial-workflows) · Comparables: [Duplo](https://tryduplo.com/), [Bujeti](https://www.bujeti.com/), [Avetium](https://avetiumtechnologies.com/), [Ramp Bill Pay](https://ramp.com/accounts-payable) · KYB: [Youverify](https://doc.youverify.co/know-your-customer-services-kyc/id-data-matching-eidv/nigeria/bank-account-verification), [NIBSS Name Enquiry](https://nibss-plc.com.ng/name-enquiry/), [Dojah](https://docs.dojah.io/overview/business-verification/cac)

*Phase 2 (v2) complete. Feeds a Phase 3 revision (dashboard-as-control-tower; orchestration-over-rails framing).*

# Product Brief: PayOps Control Tower

**Capstone Deliverable:** 1 — Product Brief
**Document Status:** Complete — Panel-ready v1.0
**Last updated:** 2026-06-13

---

## One-Pager

**The Idea**
A centralised payment operations workspace for Nigerian SMEs that replaces spreadsheets, screenshots, and WhatsApp approval threads with a workflow tool built for the finance team — not the bank.

**The Problem**
Nigerian SME finance teams that manage B2B vendor payments operate across at least three disconnected systems: a corporate bank portal for execution, a spreadsheet or accounting tool for records, and informal channels (email/WhatsApp) for approvals. The result is:
- No dual-control enforcement — a single finance user can create and self-approve a payment
- No real-time reconciliation — settlement confirmation is a manual bank statement hunt
- No audit trail — approvals live in chat threads that can be deleted

Internal payment fraud in Nigerian SMEs is primarily a process problem, not a technology problem. The controls exist in bank products; the workflow connecting them does not.

**The Target User**
Finance and Administration Lead at a mid-sized Nigerian company (logistics, agency, clearing, or professional services). Company size: 20–200 employees, ₦10M–₦500M monthly B2B payment volume. This person manages vendor relationships, coordinates payment approvals with one other authoriser, and is accountable for reconciliation at month-end. They do not have a treasury team.

**The Solution**
A non-funds-holding orchestration layer that:
1. Verifies vendors before they are paid (CAC + NUBAN name matching)
2. Enforces maker-checker approval before funds leave (PIN-authenticated, dual-control)
3. Tracks settlement state in real time (PSP webhook-driven reconciliation)
4. Produces a complete, tamper-resistant audit log of every decision

**Core Hypothesis**
Finance operations teams at Nigerian SMEs will adopt a structured payment workflow product if it removes the friction of self-built controls (approvals in WhatsApp, reconciliation in Excel) without requiring them to change their bank. If we can reduce the reconciliation cycle from 2–3 days to under 4 hours, and eliminate maker-self-approval, the product earns its place in the workflow.

**Phase 1 MVP Scope**
- Business KYB onboarding and team management (Owner + Admin + Maker + Viewer)
- Vendor onboarding with CAC and NUBAN verification (Jaro-Winkler string matching)
- Invoice-backed payment request creation
- Maker-Checker PIN-authenticated approval flow
- Compliance review gate (high-value, duplicate invoice, beneficiary change triggers)
- Simulated PSP execution + webhook-driven settlement and reconciliation
- Exception queue for failed, mismatched, or timed-out payments
- Full immutable audit log

**Compliance Angle**
The product does not hold customer funds. It acts as a workflow layer between the SME and their existing licensed PSP partner. In MVP, PayOps operates under the PSP partner's CBN licence umbrella while the company pursues its own Payment Solution Service Provider (PSSP) classification under the CBN PSP Framework 2020.

**Success Metrics**
- Activation: Vendor & Request Onboarding Rate
- Transaction Operations: Payment State Completion Rate
- Reconciliation: Reconciliation Velocity
- Risk Control: KYB Gateway Enforceability
- Compliance: Flagged Transaction Audit Rate

---

## Product Brief

### 1. Problem Space & Market Signals

Nigerian SMEs represent approximately 96% of all Nigerian businesses and contribute nearly 50% of GDP (World Bank, Nigeria MSME survey). The dominant payment problem is not access — most mid-sized companies have corporate bank accounts and PSP integrations. The problem is internal workflow: how payment decisions are made, authorised, and confirmed before and after funds move.

Three signals define the opportunity:

**Signal 1 — The bottleneck is internal, not infrastructural.** Modern Treasury (2023) found that 88% of finance teams at companies below enterprise scale identified payment operations — not payment rails — as the primary source of delays and reconciliation errors. The infrastructure works. The process around it does not.

**Signal 2 — Internal fraud risk is workflow-shaped.** Duplo's research into Nigerian SME financial operations found that vendor payment fraud in this segment is predominantly driven by process failures: no dual-control enforcement, informal approval chains, and no real-time reconciliation. These are not technology gaps; they are the absence of a system that enforces the controls a larger company would have from their ERP.

**Signal 3 — Month-end is a crisis, not a process.** The target user's reconciliation cycle is manual: download bank statement, match against spreadsheet, chase outstanding items. 2–3 days is the norm. This is a solved problem at enterprise scale. It is unsolved at SME scale in Nigeria specifically because the available products (corporate banking portals, basic accounting tools) do not communicate.

---

### 2. Target User & Context

**Primary Persona:** Finance and Administration Lead

| Attribute | Detail |
|---|---|
| Role | Head of Finance / Finance Manager / Admin Manager |
| Company type | Mid-sized Nigerian logistics company, clearing agent, recruitment firm, or professional services agency |
| Company size | 20–200 employees |
| Monthly B2B payment volume | ₦10M–₦500M |
| Current tooling | Corporate bank portal + Excel/Google Sheets + WhatsApp |
| Reporting to | CEO / COO |
| Key frustration | Month-end reconciliation takes 2–3 full working days; approvals are informal and deniable |
| What they want | One place to see what was approved, who approved it, and whether it settled — without switching between tools |

**What this user is NOT:**
- A treasury manager at a large enterprise (they have a TMS)
- A freelancer or micro-business (volume too low to justify structured workflow)
- A fintech-native user (they are not building an API product; they need a form-driven UI)

---

### 3. Core Hypothesis

> If Nigerian SME finance teams can verify vendors, route payments through a maker-checker approval flow, and see settlement confirmation in one workspace — without changing their bank — they will adopt this product over their current spreadsheet and WhatsApp workflow.

**This works if and only if:**
- The vendor verification step has a low enough false-positive rate that legitimate vendors are not systematically blocked
- The approval flow is fast enough that it does not slow down routine payments (target: <60 seconds to approve a pre-verified vendor payment)
- The reconciliation step is automatic enough that finance teams do not need to do manual matching on the majority of payments

**Where the hypothesis could fail:**
- CAC API reliability — if the CAC lookup is unreliable, verification becomes a manual fallback queue and the KYB gate loses credibility
- PSP webhook latency — if settlement confirmation takes hours, the reconciliation speed advantage disappears
- Maker-Checker UX — if the approval flow is cumbersome, approvers will route around it (back to WhatsApp)

> **PM ANNOTATION — Non-funds-holding as product positioning, not just compliance:** The "we do not hold funds" framing is a deliberate go-to-market decision, not only a regulatory constraint. It removes the CBN banking licence requirement from the critical path (the PSSP licence is a lighter-touch classification), reduces fraud and operational risk materially, and allows an MVP to be launched and tested with a simulated PSP backend. It also lowers the trust barrier with the target user — adopting a workflow tool that sits alongside their existing bank is a smaller commitment than adopting a new payment provider. This framing was explicitly confirmed during the spec alignment review and is a defended product decision, not an assumption.

---

### 4. Success Metrics

The five metrics below measure whether the product is working as a payment operations tool, not just as a software product.

| Metric | Definition | Target (90 days post-launch) | Why this metric |
|---|---|---|---|
| **Vendor & Request Onboarding Rate** | % of businesses that complete vendor KYB onboarding and submit their first payment request within 14 days of account creation | ≥ 60% | Activation gate. If businesses can't onboard a vendor in 14 days, the product is too slow to start |
| **Payment State Completion Rate** | % of payment requests that reach `Reconciled` status without manual exception handling | ≥ 75% | Operational health. Exception queue volume is an early warning signal for PSP, KYB, or reconciliation logic issues |
| **Reconciliation Velocity** | Median time from payment execution to `Reconciled` status | ≤ 4 hours | Core value prop. The hypothesis requires this to be significantly faster than the current 2–3 day manual process |
| **KYB Gateway Enforceability** | % of payment requests submitted against vendors who have completed KYB (i.e., no bypass is occurring) | 100% (invariant, not a target) | Compliance gate. If this is < 100%, the KYB bypass path exists in the product and must be closed |
| **Flagged Transaction Audit Rate** | % of payments that triggered a compliance review gate that have a complete audit trail (reviewer ID, decision, timestamp) | 100% (invariant, not a target) | Compliance and AML readiness. If the audit trail is incomplete, the compliance gate is not a gate — it is a suggestion |

> **PM ANNOTATION — Two metrics as invariants, not targets:** KYB Gateway Enforceability and Flagged Transaction Audit Rate are both set at 100% as invariants. This was a deliberate product decision during the spec review process: these are not metrics to optimise toward, they are binary requirements. A payment reaching execution without a KYB-verified vendor is a product defect, not a missed target. Framing them as metrics (even at 100%) forces the PM and the engineering team to instrument and monitor them explicitly — they cannot be assumed to be passing because the code theoretically enforces them.

---

### 5. Strategic Scope (The Guardrails)

PayOps is a **workflow-control orchestration layer**. It is not a bank, not a PSP, and not an accounting tool. These guardrails are not temporary constraints — they define the product category.

| Guardrail | What this means | Why it matters |
|---|---|---|
| **No fund custody** | PayOps does not hold, pool, or move customer money directly. All fund movement goes through a licensed PSP partner | Keeps the CBN regulatory path lighter (PSSP, not Payment Service Bank). Reduces operational risk. Lowers the trust barrier for adoption |
| **No proprietary ledger** | PayOps is not a source of truth for balances. It is a source of truth for workflow state (approvals, audit logs, reconciliation outcomes) | Prevents scope creep into accounting/ERP territory. Finance teams keep their existing accounting tool |
| **Domestic NGN only (MVP)** | All MVP payments are NGN to Nigerian bank accounts (NUBAN). No FX, no cross-border | Removes CBN FX licence requirement from MVP. Single-currency reconciliation logic. Post-MVP expansion path exists |
| **B2B vendor payments only (MVP)** | Payroll, petty cash, and consumer disbursements are out of scope for MVP | Payroll requires PAYE/statutory compliance logic. Keeps the MVP focused on the highest-value use case for the target persona |
| **Workflow orchestration, not process automation** | PayOps does not auto-approve payments. Every payment that reaches execution has a human Checker's PIN on it | Dual-control is the product's core value. Removing the human from the loop removes the audit trail value |

> **PM ANNOTATION — CBN licence tier (OPD-03 — partially resolved):** The panel will ask which CBN licence tier applies. The current position: in MVP, PayOps operates under the PSP partner's licence umbrella, which is standard practice for early-stage Nigerian fintech products that are building on top of a licensed partner. As the product scales, the relevant self-licensing path is the **Payment Solution Service Provider (PSSP)** tier under the CBN Regulatory Framework for Payment Service Providers (2020). PSSP covers technology providers that build payment infrastructure — orchestration, workflow tools, reconciliation layers — without themselves moving funds. It does not require the same capital requirements as a Payment Service Bank or PTSP. This classification is a defended position but requires formal legal confirmation from a CBN-specialist lawyer before a production launch. It is noted as an open item (⏳) in the Requirements Document and Compliance Summary tracker.

---

## Document History

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-06-13 | Initial version — panel-ready |

# Compliance Summary: PayOps Control Tower

**Capstone Deliverable:** 5 — Compliance Summary
**Document Status:** Complete — Panel-ready v1.0
**Last updated:** 2026-06-13

> All regulatory positions in this document are based on real-time research conducted June 2026 against primary CBN circulars, NDPA 2023, and current CBN licensing guidance. Sources are cited where specific claims are made.

---

## 1. CBN Licence Classification

### Which tier applies

PayOps is a **Payment Solution Service Provider (PSSP)** under the CBN's 2020 payment system licence categorisation (Circular Ref No. PSM/CIR/GEN/CIR/01/22, issued December 9, 2020).

The CBN defines four broad licence categories for payment companies in Nigeria:

| Category | Who it covers | Can hold customer funds? |
|---|---|---|
| Switching and Processing | Switches, card processors, settlement agents | No |
| Mobile Money Operations (MMO) | E-money issuers, wallet operators | **Yes — only MMOs** |
| Payment Solution Services (PSS) | PSSPs, PTSPs, Super-Agents | No |
| Regulatory Sandbox | Innovators testing new products | No (test only) |

Within the Payment Solution Services category, three sub-licences exist:

| Sub-licence | Permitted activities |
|---|---|
| **PSSP** | Payment processing gateways and portals, payment application development, merchant services aggregation and collections |
| PTSP | POS terminal deployment and management, payment terminal support |
| Super-Agent | Agent recruitment and management for banking access |

**PayOps maps to PSSP.** Its core activities — payment orchestration workflow, merchant/vendor collections, invoice-backed payment processing — are the exact activities the PSSP licence covers. It does not operate POS terminals (PTSP) and does not run an agent network (Super-Agent).

**The prohibition on fund holding is statutory**, not optional. No PSSP, PTSP, or Super-Agent licence permits holding customer funds. Fund movement must go through a licensed PSP partner or bank. This directly validates PayOps's architectural decision to hold zero customer funds.

### Minimum capital requirement

- Standalone PSSP licence: **₦100 million** minimum paid-up capital
- Combined PSS licence (PSSP + PTSP + Super-Agent): ₦250 million

PayOps would apply for a standalone PSSP licence. The ₦250M requirement applies only to the combined PSS holding structure.

### MVP operating position

PayOps MVP operates under its licensed PSP partner's CBN authorisation. This is standard practice for early-stage Nigerian payment products — the PSP partner is the licenced entity for execution; PayOps is the workflow layer on top. The PSSP self-licensing application would be initiated when the product moves toward live payment processing at scale.

---

## 2. User Data: What Is Collected, Why, and How It Is Protected

### Data collected and legal basis

| Data type | What is stored | Legal basis (NDPA 2023) | Retention |
|---|---|---|---|
| Business identity | Legal name, CAC number, Director ID | Contractual necessity (onboarding required by KYB gate) | Duration of account + 6 years (CITA) |
| User identity | Full name, work email, bcrypt-hashed password, bcrypt-hashed PIN, `pinFailedAttempts`, `pinLockedUntil` | Contractual necessity | Duration of account |
| Vendor identity | Legal business name, CAC number | Contractual necessity | Duration of vendor record + 6 years |
| Vendor bank account | `nubanHash` (HMAC-SHA256, for duplicate lookups), `nubanEncrypted` (AES-256-GCM random IV, for display/retrieval) | Contractual necessity | Duration of vendor record + 6 years |
| Payment records | Amount, invoice number, invoice PDF, payment status, PSP webhook payload (raw) | Contractual necessity + Legitimate interest (audit trail) | 6 years (CITA — Companies Income Tax Act requirement for financial records) |
| Audit log | User ID, action, timestamp, IP address, outcome | Legitimate interest (fraud prevention, regulatory compliance) | 6 years |
| Session data | JWT (60-min TTL), refresh token (30-day TTL), `sessionId` in Redis | Contractual necessity | Deleted on expiry or revocation |

### How data is protected

- **NUBAN encryption:** Dual-storage model — `nubanHash` (HMAC-SHA256) for equality checks without decryption; `nubanEncrypted` (AES-256-GCM, random IV per encryption) for storage and display. Raw NUBAN never stored in plaintext.
- **Password and PIN:** bcrypt (cost factor ≥ 10). No plaintext storage. No retrieval path — only compare-and-verify.
- **Retention lock:** Audit logs, invoices, webhook events, and payment records can be Owner-locked (`retentionLocked = true`), making them irreversible. S3 Object Lock in GOVERNANCE mode for binary assets.
- **Database access controls:** `payops_app_role` has INSERT/SELECT only on audit_logs (no UPDATE/DELETE). `payops_audit_role` has SELECT only on audit_logs. No application path can modify an existing audit entry.
- **NUBAN display masking:** Only last 4 digits visible in the UI by default.

### NDPA 2023 compliance posture

The Nigeria Data Protection Act (effective June 12, 2023) and its General Application and Implementation Directive (GAID, 2025) set the current data protection obligations.

Key obligations and PayOps's position:

| NDPA obligation | PayOps position |
|---|---|
| Lawful basis for processing | Contractual necessity (payment workflow) + Legitimate interest (fraud prevention, audit trail) |
| Data minimisation | Collect only what is needed for payment processing and compliance (no marketing data, no behavioural profiling) |
| Breach notification: 72 hours to NDPC | In-scope. Breach response plan required before production launch |
| Data Protection Officer (DPO) | Required for "major importance" entities (>200 data subjects in 6 months, or major economic sector). At MVP scale this threshold may not be met immediately, but should be monitored |
| NDPC registration | Required once classified as major importance. Apply proactively when active user base reaches 200+ |
| Cross-border data transfers | Not applicable in MVP (all data stays within Nigerian infrastructure, all payments are domestic NGN) |
| Penalties for non-compliance | Up to 2% of annual gross revenue or ₦10,000,000, whichever is greater |

> In August 2025, the NDPC issued compliance notices to 1,368 organisations. NDPA enforcement is active, not theoretical.

---

## 3. FCCPC Coverage

The Federal Competition and Consumer Protection Commission (FCCPC) governs consumer protection in Nigeria under the Federal Competition and Consumer Protection Act (FCCPA) 2018.

**PayOps's FCCPC exposure:**

| Regulation | Applies to PayOps? | Basis |
|---|---|---|
| FCCPA 2018 (General Consumer Protection) | Yes | Any business dealing with consumers must maintain fair practices, provide clear disclosures, and operate a dispute resolution mechanism |
| FCCPC Digital, Electronic, Online and Non-Traditional Consumer Lending Regulations 2025 | **No** | These regulations target digital lenders. PayOps does not extend credit — it orchestrates B2B payment workflows. No lending, no consumer credit, not in scope |

**Active FCCPC obligations for PayOps:**
- Fee disclosures must be clear and upfront before any transaction
- Dispute resolution path must exist (Exception Queue serves this purpose for payment disputes)
- Unfair commercial practices prohibited

---

## 4. AML Framework

### How PayOps handles AML-adjacent transactions

PayOps is not a reporting entity under Nigeria's Money Laundering Prevention Act in the same way as a bank or MMO — it does not hold funds or originate transfers. However, as a PSSP, it operates within the CBN AML/CFT/CPF framework and has obligations to the Nigerian Financial Intelligence Unit (NFIU).

The compliance review gate is PayOps's primary AML-adjacent mechanism. It is not a cosmetic feature — it is the product's implementation of transaction monitoring at the workflow layer.

**Compliance triggers and their AML rationale:**

| Trigger | Threshold | AML rationale |
|---|---|---|
| `HIGH_VALUE` | ≥ ₦5,000,000 | Aligns with NFIU high-value transaction reporting thresholds. Single payments at this scale require explicit dual-control human review before execution |
| `DUPLICATE_INVOICE` | Same invoice, non-cancelled prior request | Prevents double-payment fraud and invoice manipulation schemes |
| `BENEFICIARY_CHANGE` | Vendor NUBAN changed within 24 hours of payment | Guards against beneficiary-swap fraud — a known vector for payment diversion |
| `REPEATED_FAILURE` | ≥ 3 PSP failures or STATUS_UNKNOWN for same vendor in 7 days | Flags counterparties that may be associated with accounts under sanction or suspension |
| `AMBIGUOUS_MATCH` | Vendor KYB Jaro-Winkler score 0.70–0.84 at verification | Escalates marginal identity matches for review before funds are sent |

**Suspicious Transaction Reporting:**
In production, a PSSP must file Suspicious Transaction Reports (STRs) with the NFIU within 24 hours of identifying a suspicious transaction. PayOps's exception queue and compliance review gate generate the audit trail required to support STR filings. Formal NFIU reporting integration is a post-MVP compliance obligation.

### New CBN automated AML requirement (active)

On May 20, 2025, the CBN issued a directive requiring all digital payment service providers to deploy **automated real-time AML transaction monitoring systems** (Circular BSD/DIR/PUB/LAB/019/002). Key compliance timeline:

- Non-bank financial institutions (including PSSPs): 24-month implementation window from May 2025 → **by May 2027**
- Implementation roadmap submission to CBN: **June 10, 2026** (deadline)

PayOps's compliance review queue and exception queue logic are the architectural foundation for meeting this requirement. The automated trigger evaluation at payment submission time is the in-product implementation of the "real-time monitoring" the directive requires.

---

## 5. Active Regulatory Obligations (June 2026)

These are live CBN directives that a PSSP launching today must be aware of:

| Directive | Date issued | Obligation | PayOps impact |
|---|---|---|---|
| Automated AML Systems (BSD/DIR/PUB/LAB/019/002) | May 2025 | Deploy automated real-time AML monitoring; submit implementation roadmap | Foundation is built (compliance review queue). Formal CBN submission and NFIU integration required pre-launch |
| NRS Transaction Monitoring System Integration | March 16, 2026 | All PSSPs must integrate with Nigeria Revenue Service Transaction Monitoring System | Integration required before operating as a licenced PSSP |
| Mandatory Dual Connectivity | December 2025 | Acquirers and processors must maintain active connections with both NIBSS and UPSL | Applies to PSSP at PSP integration layer, not to PayOps's application layer directly |
| ISO 20022 Migration | August 2025 | Full migration to ISO 20022 payment messaging | PSP partner's responsibility; PayOps's webhook contract should be validated for ISO 20022 alignment |
| NRS E-Invoicing Integration | Phase 2 deadline July 1, 2026 | PSSPs handling ₦1B–₦5B annual turnover must integrate NRS e-invoicing | Not applicable at MVP scale; becomes relevant at growth stage |

> **PM NOTE:** The NRS TMS integration directive (March 2026) is the single most operationally impactful recent directive for a PSSP. It requires integration with the Nigeria Revenue Service's transaction monitoring layer — effectively giving the NRS real-time visibility into payment flows. This is a compliance obligation that must be scoped into the first production sprint, not deferred.

---

## 6. The 48-Hour Directive Scenario

**Scenario:** CBN issues an emergency directive requiring all PSSPs to suspend new payment request creation pending validation of NRS TMS integration status. (Modelled on the March 2026 NRS TMS circular — the real directive required integration; the 48-hour extension of this scenario assumes the CBN adds a suspension clause for non-integrated operators.)

**Hour 0–4: Read and confirm scope**
- Read the directive in full. Confirm that it applies to PSSPs (not only banks or MMOs).
- Confirm whether "new payment request creation" is specifically suspended or whether the directive is broader (execution only, or full platform).
- Escalate to founding team and legal counsel immediately. Do not act on a summary — read the primary document.

**Hour 4–24: Contain and communicate**
- If the directive requires suspension of payment request creation: disable the "New Request" action in the UI for all users. Do not delete any data.
- Payments already in `Processing` state: flag in the exception queue as `COMPLIANCE_REVIEW_TIMEOUT` pending guidance from CBN on whether in-flight payments may settle.
- Draft customer communication: acknowledge the directive, explain what is paused and what is not affected (audit log access, vendor records, historical payment history remain available).
- Document every action taken — time-stamped, name-stamped — for the regulatory response audit trail.

**Hour 24–48: Respond and comply**
- Submit formal written response to CBN confirming: (1) suspension implemented, (2) no new payments processed during the suspension window, (3) NRS TMS integration timeline with specific dates.
- Engage NRS/CBN for integration requirements and expedited review pathway.
- Issue customer update with expected resolution timeline.
- Do not restart payment request creation until written CBN confirmation of compliance is received.

**What we would NOT do:**
- Route around the suspension by processing payments via alternative channels while the directive is in effect
- Claim the directive does not apply pending legal review — implement conservatively and resolve the ambiguity through official channels
- Allow in-flight payments to continue processing without explicit CBN guidance

---

## 7. Known Compliance Gaps and Open Items

| Item | Status | Action needed |
|---|---|---|
| PSSP formal licence application | Not applicable (MVP operates under PSP partner licence) | Initiate application process at growth stage |
| NFIU STR filing integration | Not built (post-MVP) | Required before production launch at scale |
| PCI-DSS certification | Not obtained (MVP) | Required before processing live card or payment data |
| NRS TMS integration | Not built | Required for licenced PSSP operation (March 2026 directive) |
| DPO appointment | Not required at MVP scale | Required once >200 data subjects processed in 6-month window |
| NDPC registration | Not required at MVP scale | Monitor user growth; register when threshold approaches |
| Invoice PDF retention legal confirmation | Working assumption: 6 years (CITA) | Formal legal opinion recommended before production |

---

## 8. Spec Correction: NIP Fee Tiers

> **PM ANNOTATION — NIP charge tiers in the engineering spec require updating.**

The reconciliation engine in `spec-resolution-v1.md §8` uses these NIP tolerance bands for auto-reconciliation:
- ≤ ₦5,000: ₦10.75 tolerance
- ₦5,001–₦50,000: ₦25.00 tolerance
- ₦50,001+: ₦50.00 tolerance

Real-time research (June 2026) against the CBN Guide to Bank Charges finds the current CBN-mandated maximum NIP fees are:
- ≤ ₦5,000: **Free (₦0)**
- ₦5,001–₦50,000: **Maximum ₦10**
- ₦50,001+: **Maximum ₦50**

The ₦10.75 and ₦25.00 tiers appear to reflect an older fee schedule (pre-2020). The current maximum fees are ₦10 and ₦50 for the upper two tiers, and zero for sub-₦5k transactions.

**Impact on the reconciliation engine:**
- The ₦10.75 tolerance should be updated to ₦0 (sub-₦5k transfers are free; no NIP fee deduction expected)
- The ₦25.00 tolerance should be updated to ₦10 (the current max fee for the ₦5k–₦50k band)
- The ₦50.00 tolerance for the upper band is correct and unchanged

**Additional note:** NIBSS has announced a target of zero transfer fees on the NIP platform by 2026, moving to a subscription-based model. If this is implemented before the product launches, the NIP tolerance logic in the reconciliation engine would need to be disabled or reconfigured to ₦0 across all bands.

This is a spec correction that should be applied to `spec-resolution-v1.md §8` before the engineering build begins.

---

## Sources

- [CBN New Licence Categorisations for the Nigerian Payments System (Nairametrics)](https://nairametrics.com/2020/12/11/cbn-approves-new-license-categorizations-for-payment-systems/)
- [PSS Sub-categories and PSSP Definition (Mondaq)](https://www.mondaq.com/nigeria/financial-services/1017880/new-licence-categorisations-for-the-nigerian-payments-system)
- [How to Obtain PSSP License in Nigeria (Resolution Law)](https://www.resolutionlawng.com/how-to-obtain-pssp-license-in-nigeria/)
- [PSSP License in Nigeria 2026 Guide (GoIdara)](https://www.goidara.com/blog/how-to-obtain-a-payment-solution-service-provider-pssp-license-in-nigeria)
- [Payment Gateway Compliance in Nigeria: CBN, PCI-DSS, NDPA & NRS (Duplo)](https://tryduplo.com/blog/payment-gateway-compliance-nigeria)
- [Nigeria Data Protection Act 2023 — Compliance Requirements (Mondaq)](https://www.mondaq.com/nigeria/data-protection/1748516/ndpa-2023-demystified-essential-compliance-requirements-for-nigerian-businesses)
- [NDPA 2023 Guide for Businesses (CookieYes)](https://www.cookieyes.com/blog/nigeria-data-protection-act-ndpa/)
- [CBN AML/CFT Tightening Obligations (Banwo & Ighodalo)](https://www.banwo-ighodalo.com/grey-matter/aml-cft-regimes-cbn-tightens-compliance-obligations-of-financial-institutions/)
- [CBN New Automated AML Rules: Fintechs Given 90 Days (The Condia)](https://thecondia.com/cbn-automated-aml-standards-fintech-banks-nigeria/)
- [Nigeria Fintech Regulatory Framework: Key 2025 Developments (Mondaq)](https://www.mondaq.com/nigeria/fin-tech/1740656/nigerias-fintech-regulatory-framework-key-2025-developments-and-outlook-for-2026)
- [NIBSS NIP Fee Reduction (TechCabal)](https://techcabal.com/2023/06/07/nibbs-cuts-instant-transfer-fees/)
- [NIBSS Zero Transfer Fee Target by 2026 (Nigeria Communications Week)](https://www.nigeriacommunicationsweek.com.ng/nibss-targets-zero-transfer-fees-on-instant-payments-by-2026/)
- [FCCPC Digital Lending Regulations 2025 (Mondaq)](https://www.mondaq.com/nigeria/dodd-frank-consumer-protection-act/1701824/the-fccpc-digital-electronic-online-and-non-traditional-consumer-lending-regulations-2025-potential-implications-for-the-nigerian-digital-lending-landscape)
- [CBN KYC and AML Requirements 2026 (Youverify)](https://youverify.co/en/blogs/cbn-kyc-aml-requirements-2026)

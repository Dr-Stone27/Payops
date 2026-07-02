# Watchtower — Capstone Submission Pack
**ProductDive Fintech PM Program · Option C (Own Problem) · July 2026**

Watchtower is the independent payment-controls and audit layer for Nigerian SMEs — vendor KYB verification, maker-checker approval, compliance escalation, settlement reconciliation, and an immutable audit trail over the accounts a business already uses. No fund custody.

---

## How to Review This Submission (guide for the panel/reviewer)

**Suggested order (~45 minutes):**
1. **Product Brief** (5 min) — the problem scene, hypothesis, and metrics. Everything else serves this.
2. **Live product** (15 min) — the fastest way to judge the work is to use it. Follow the *Demo Walkthrough* below; the product's value shows most where it says **no**.
3. **Requirements Document** (10 min) — note the PM annotations: places where AI output was challenged, corrected, or overruled (e.g. the invented `Blocked` KYB state, removed with its reasoning documented).
4. **Architecture Note + Compliance Summary** (10 min) — how money moves, where risk sits, which CBN licence tier applies (PSSP under a partner's licence at MVP), NDPA data handling, AML/NFIU mapping, and the 48-hour directive playbook.
5. **Retrospective** (5 min) — read §3 and §6 even if pressed for time: six specific, named cases of AI being wrong and how each was caught. This is where the "PM behind the output" is most visible.

**Demo walkthrough (self-service):** register a business → set a PIN → Team: add a second user (Maker) → Vendors: add one with NUBAN ending `1234` (auto-verifies) and one ending `9999` (fails name-match — the KYB compliance gate, visible in-product) → as Maker, raise a payment → as Owner, approve with PIN. Then the three moments that prove the thesis:
- Open a payment **you raised yourself** → the four-eyes wall (the control WhatsApp approval can't enforce).
- Raise a payment **≥ ₦5,000,000** → compliance hold; the checker who clears it cannot also approve it.
- Raise invoices prefixed **`EXC-`** (forced PSP failure → retry to recovery) and **`MIS-`** (settlement mismatch, variance shown to the kobo → acknowledge, audited).
Finish on the **Audit Log**: every action above is on it, permanently.

**What was deliberately not built** (documented in README §Known Limitations and Retrospective): live PSP (simulated behind a real HMAC-verified webhook seam), live CAC/NUBAN lookups (deterministic simulation), invoice OCR, DB-level audit row-security. Each has a stated post-MVP path.

---

## Deliverable → Requirement Map

| Brief requirement | Where | Notes |
|---|---|---|
| 1. Product Brief: problem/persona, hypothesis, 3–5 metrics incl. compliance | `product-brief.md` | Metrics mix includes activation, volume, and compliance |
| 2. Requirements: stories, acceptance criteria, ≥2 edge cases, KYC gate, reconciliation flow, failure scenario, **PM annotations on AI output** | `requirements-document.md` | 6 stories, 11 edge cases; AI corrections annotated inline |
| 3. Working prototype, end-to-end journey, **compliance gate visible in-product** | Live app + repo | KYB gate, ₦5M compliance hold, four-eyes blocks, PIN lockout — all user-visible states |
| 4. Architecture Note: rails/partners, float/FX risk owner, failure handling | `architecture-note.md` | PSP partner owns settlement risk; failure paths mapped tech + UX |
| 5. Compliance Summary: CBN licence tier, data (NDPA/FCCPC), AML triggers, 48-hour directive response | `compliance-summary.md` | PSSP categorisation, NUBAN encryption+hashing, NFIU mapping, NRS TMS finding |
| 6. Retrospective: what isn't working, next 3 priorities, **where AI fell short (specific)**, unforeseen compliance risk | `retrospective.md` v1.2 | Six named AI-failure cases incl. two from the build cycle itself; NRS TMS as the unseen risk |

**Supporting documents:** `demo-script.md` (8-minute panel demo), `pitch-deck-outline.md`, `design-language.md`, `capstone-tracker.md`, README (setup + payment state machine), Postman collection (8 test sections incl. webhooks, tenant isolation, session integrity).

**Repo:** github.com/Dr-Stone27/Payops · main branch is the submitted state.

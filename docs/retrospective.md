# Retrospective: PayOps Control Tower

**Capstone Deliverable:** 6 — Retrospective
**Document Status:** v1.0 — Panel-ready
**Last updated:** 2026-07-01

---

## What This Section Is

The retrospective is the most honest document in this submission. It covers four things: what the MVP does not do well, what the next sprint priorities would be and why in that order, where AI fell short during the build with a specific example, and the compliance risk that was not visible at the start. None of these answers are generic. They are sourced from the actual build.

---

## 1. What Isn't Working

### The product brief was written for engineers, not for users

The original product brief — v1.0 — opened with system architecture. It described disconnected tools, dual-control enforcement gaps, and reconciliation cycles. All of that was accurate. None of it put a human being in the room.

The problem with this is not cosmetic. A product brief that leads with the system rather than the person signals that the PM understands what was built but has not yet stress-tested whether the right thing was built. The capstone panel is not evaluating a technical spec. They are evaluating whether the PM can hold the user's problem and the system's solution in the same frame simultaneously, and communicate the connection between them.

This was identified during a curriculum mapping exercise — specifically against Module 1 (UX for Payments: Building Intuitive Flows) and Module 10 (end-to-end user flow as a capstone requirement). The brief was rebuilt from a concrete scene: a Finance Manager, a Lagos logistics company, a double payment that cost ₦3.2 million because "ok" in WhatsApp was the approval record. That scene unlocks every subsequent design decision — the maker-checker flow, the audit log, the compliance gate — in a way that system language does not.

The revised product brief (v2.0) fixes this. But the fact that it took external pressure to surface the problem is worth naming. A PM working alone with AI tools has a specific failure mode: the AI drafts fluent, well-structured content that answers the question asked rather than the question that matters. The question asked was "write a product brief." The question that mattered was "make the panel feel the problem before they understand the solution." Those are different prompts, and the first one produces the weaker document.

### The user journey was implicit, not explicit

The requirements document has six user stories and eleven edge cases. The acceptance criteria are specific and defensible. But nowhere in the original submission was there a document that answered the question a designer or developer actually asks first: what does this user see, and what do they do next?

The user stories describe system behaviour from the inside. The user journey map describes product experience from the outside. Both are necessary. Only one was written initially. This meant the prototype — which the capstone brief requires to be functional and to show the compliance gate in the UI — was being built against engineering requirements rather than a UX reference. That is a sequencing error. The journey map should precede the engineering spec, not follow it.

This was corrected. The user journey map now covers four journeys, three role-specific first-run walkthrough sequences, and a complete set of empty states and tooltip copy. But the correction came late — after the requirements document and architecture note were already finalised — which means any prototype built before the journey map existed may have gaps in how compliance gates and exception states are surfaced to the user.

### The OCR gap is a real usability weakness, not just an out-of-scope item

The requirements document acknowledges explicitly that there is no OCR-based validation of invoice amounts. A Maker enters ₦3,200,000 manually. The invoice PDF shows ₦3,200,000. The Checker sees both side by side and is expected to verify they match visually. The acceptance criteria adds a UI requirement — both values visible simultaneously — specifically to compensate for this absence.

This is a reasonable MVP tradeoff. But it is worth being direct about what it means in practice: the primary fraud control on invoice amount accuracy is a human being looking at two numbers on the same screen. For a product whose entire value proposition is removing human error from the payment process, this is a structural irony. It is not fatal — the Checker's PIN is still on the record, and the audit trail captures who reviewed what. But if a Checker approves a payment for ₦3,200,000 against an invoice for ₦320,000 because they misread a zero, PayOps has no automatic catch for that. The reconciliation engine would settle and reconcile that payment as correct because the PSP transferred exactly what was requested.

In a production context, OCR invoice extraction is the next meaningful fraud control after maker-checker approval. It is not a nice-to-have feature. It is the gap between "the Checker has to be careful" and "the system catches what the Checker misses."

---

## 2. Next Sprint Priorities

If PayOps were to continue past this MVP, the next three priorities in order are:

### Priority 1 — Live PSP Integration

The entire MVP runs on a simulated PSP. The simulated PSP implements the same interface as a real integration — REST execution endpoint, HMAC-signed webhook, idempotency keys — so the architecture is production-ready in shape. But no real money has moved, no real settlement has been confirmed, and no real webhook has been received.

This is the highest priority because it is the thing that makes every other metric real. Reconciliation Velocity cannot be measured without live webhook latency. Payment State Completion Rate cannot be measured without real PSP failure rates. The product's core hypothesis — that finance teams will adopt this over WhatsApp if reconciliation is automatic — cannot be validated without real settlement data.

The integration path is well-defined: Flutterwave, Paystack, or Fincra are the likely candidates, all of whom have NIP rail access and documented webhook contracts. The architecture note specifies that replacing the simulated PSP requires a credential swap and endpoint URL change, not a redesign. This is sprint one work, not a future project.

### Priority 2 — NRS TMS Integration

The CBN issued a directive in March 2026 requiring all PSSPs to integrate with the Nigeria Revenue Service Transaction Monitoring System. This is not a future compliance obligation — it is a current one. A PSSP operating today without NRS TMS integration is operating outside the directive.

This is priority two rather than priority one because without a live PSP integration, there are no real payment flows to report to the NRS TMS. The two are sequentially dependent. But NRS TMS integration must be scoped into the first production sprint, not deferred to a compliance review cycle months later. The compliance summary flags this explicitly: the implementation roadmap submission to CBN had a deadline of June 10, 2026. That deadline has passed. Any production launch planning must account for the regulatory gap this creates.

### Priority 3 — OCR Invoice Extraction

Once a live PSP integration is in place and real payments are flowing, the OCR gap becomes the most visible remaining fraud risk. A Maker entering ₦32,000,000 when the invoice says ₦3,200,000 is a decimal error that the current system would process, approve, execute, and reconcile without flagging anything.

OCR invoice extraction — reading the invoice amount from the uploaded PDF and comparing it to the entered payment amount before submission — closes this gap at the Maker stage rather than relying on the Checker to catch it at the approval stage. This is the right place to close it. The earlier in the flow a fraud vector is blocked, the less work the downstream controls have to do.

This is priority three rather than priority two because it requires reliable PDF parsing infrastructure and will have a non-trivial false positive rate on invoices with non-standard formatting. Building it on top of a live PSP integration, with real invoice data, allows the extraction accuracy to be tuned against actual usage rather than hypothetical PDFs.

---

## 3. Where AI Fell Short

There were multiple specific instances during this build where AI output was accepted provisionally and later found to require correction. Three are worth naming in detail. One is the most important.

### The specific example: NIP fee tiers were wrong, and the error was quietly authoritative

The reconciliation engine in the engineering spec was built around three NIP fee tolerance bands used to determine whether a payment should auto-reconcile or route to an exception:

- ≤ ₦5,000: ₦10.75 tolerance
- ₦5,001–₦50,000: ₦25.00 tolerance
- ₦50,001+: ₦50.00 tolerance

These numbers were plausible. They were formatted like real fee schedules. They appeared in a technically detailed engineering spec where specificity reads as accuracy. They were wrong.

Research against the CBN Guide to Bank Charges (June 2026) found the current NIP maximum fees are:

- ≤ ₦5,000: ₦0 (free)
- ₦5,001–₦50,000: maximum ₦10
- ₦50,001+: maximum ₦50

The ₦10.75 and ₦25.00 figures appear to reflect a pre-2020 fee schedule that the CBN has since updated. The AI had learned these numbers from training data that predated the fee reduction. It had no way of knowing they were stale. It presented them with the same confidence it would present any other technical specification.

The downstream impact was real. The reconciliation engine, as originally specced, would have treated a ₦5,000 transaction that settled for ₦4,989.25 as reconciled — because ₦10.75 variance was within tolerance. Under the current fee schedule, that same transaction should have a zero-tolerance check: the transfer is free, so the settled amount must equal the invoice amount exactly. An engine built on the wrong fee tiers would systematically misclassify sub-₦5k transactions.

The correction was made in the compliance summary (Section 8) and carried through to the architecture note. The fix required both a rate change and a logic change for the sub-₦5k band — not just updating the numbers, but changing what the tolerance means for that tier.

What caught this was not a compliance checklist or a peer review. It was the decision to research the regulatory context from primary sources rather than accepting the spec's figures as given. The lesson is not that AI makes mistakes. The lesson is that AI mistakes in financial products have a specific character: they are precise, well-formatted, and drawn from real historical data that may no longer be current. They are harder to question than vague errors. They require the PM to independently verify numbers that look like they have already been verified.

### The secondary example: the `Blocked` KYB state that should not have existed

The engineering spec introduced a third outcome for vendor name matching: `Blocked`, applied when the Jaro-Winkler score fell below 0.70. The product brief defined only two outcomes — `Approved` and `Needs Review`. The spec created a third state that had no corresponding user story, no acceptance criteria, no place in the role permissions matrix, and no defined retry path.

This was caught during the Spec vs. PRD Alignment Audit (finding AL-01). The catch required reading the spec against the product document line by line and noticing that `Blocked` appeared in the data model but nowhere in the PRD. If it had gone unnoticed, the product would have shipped with a state that could permanently block a vendor with no resolution path — which would have silently broken the KYB flow for any vendor whose CAC name and NUBAN name differed significantly, even legitimately.

The resolution removed `Blocked` from name matching entirely and preserved the risk signal in a different way: scores in the 0.70–0.84 range trigger an `AMBIGUOUS_MATCH` compliance flag on future payments rather than blocking the vendor at onboarding. This is a better design because it allows the vendor relationship to proceed under elevated monitoring rather than halting it with no explanation.

### The third example: the fire-and-forget PSP dispatch that silently failed in production

After the four-eyes approval gate passed PIN verification, the implementation set the payment status to `processing` and triggered the simulated PSP dispatch using a fire-and-forget pattern: start the async function, return `{ success: true }` to the client immediately, and let the promise resolve in the background. In standard Node.js — or in local development — this pattern works. The background promise completes after the response is sent, the webhook fires, and the payment settles.

On Vercel's serverless platform, it does not work. Vercel freezes the function container the moment the response is returned. Any work that has not already completed at that point is silently killed. There is no error, no log entry, no failure state. The payment approval appears to succeed. The status moves to `processing`. Then nothing happens.

The failure mode was invisible during development because the local Next.js dev server is not serverless — background promises survive there. It was invisible on first code review because the pattern is architecturally correct and commonly documented. It only became visible in production: every approved payment sat in `processing` indefinitely, and no settlement webhooks ever arrived.

Diagnosing it required recognising that the absence of an error was itself the signal. If the webhook were failing, there would be logs. The silence indicated the webhook was never called. That pointed to the lifecycle issue. The fix was to move the settlement call inside the request lifecycle — awaiting it before returning — rather than deferring it to a background promise that the platform was terminating.

The parallel to the NIP fee example is precise. The AI generated a pattern that was correct for the context it knew: long-running servers, local development, traditional Node.js deployments. It had no way of knowing the deployment target was serverless, or that the serverless lifecycle would make a standard async pattern silently non-functional in production. The error was well-formed, technically legitimate, and wrong under the actual constraints. It required platform-specific knowledge to catch — knowledge that sits outside the AI's training context for this particular failure mode.

---

## 4. The Compliance Risk That Was Not Visible at the Start

### The product brief led with system architecture and buried the user

This is covered in section 1, but it belongs here too because it is a compliance risk in a specific sense: a product whose documentation leads with infrastructure and buries the user experience is a product the panel cannot easily evaluate for regulatory appropriateness. Compliance in fintech is not only about what the system does. It is about what the user understands they are consenting to, what information they receive when a payment is flagged, and whether the product's design actively supports or undermines the compliance controls built into it.

The original product brief described a compliance gate. It did not describe what a Finance Maker reads when their payment is routed to compliance review, what a Checker sees when they are told they cannot approve a payment they reviewed, or what an Owner receives when a compliance review times out at 48 hours. Those are not engineering questions. They are the compliance layer made visible to the user. And they were missing from the documentation entirely until the user journey map was built.

### The NRS TMS integration obligation was discovered mid-build, not at the start

When compliance research began, the working assumption was that the primary regulatory obligation for an MVP operating under a PSP partner's licence was CBN PSSP categorisation and NDPA data protection compliance. Both were well-understood at the outset.

What was not anticipated was the March 2026 CBN directive requiring all PSSPs to integrate with the Nigeria Revenue Service Transaction Monitoring System. This directive was issued three months before this capstone was submitted. It requires real-time visibility into payment flows by the NRS — which means a PSSP operating without NRS TMS integration is not operating in a compliance-lite zone, it is operating in active non-compliance with a current directive.

This changes the go-to-market calculus materially. The original framing was: PayOps operates under the PSP partner's licence in MVP, pursues its own PSSP licence at scale. The NRS TMS directive means that the moment PayOps self-licences as a PSSP, it inherits an integration obligation that is not trivial to fulfil. The implementation roadmap submission deadline was June 10, 2026. Any production launch plan must account for the fact that this deadline has passed and that engaging CBN on an expedited pathway is now the correct first action, not a growth-stage consideration.

This was not visible at the start because it required reading the current regulatory environment, not the 2020 framework documents. The compliance summary identifies it explicitly in Section 5 and flags it as the single most operationally impactful recent directive for a PSSP launching today. But finding it required active research rather than framework knowledge — and that research happened late in the build, not before the architecture was designed.

The architecture is not broken by this discovery. PayOps's compliance review queue and real-time trigger evaluation are, as the compliance summary notes, the correct architectural foundation for NRS TMS integration. The direction of travel is right. The timeline to compliance is more compressed than initially anticipated.

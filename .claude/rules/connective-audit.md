# Rule: Connective Audit Discipline

**Type:** Always-on for every phase of the audit → research → improvement pipeline.

This rule exists because the failure mode of an AI audit is a *disconnected laundry list* — findings that read one line at a time and never connect. Everything below is designed to prevent that.

---

## The prime directive: ground truth before findings

No phase produces findings until `context/product-model.md` exists and is confirmed. Every later phase reasons *against* that model. If the model is wrong, stop and fix it — do not audit on top of a wrong model.

## Every finding is connective

A finding is not valid unless it connects across at least two of these layers:

- **Product** — the job the user is trying to do, the offering, the spine.
- **UX** — the screen, copy, state, flow the user experiences.
- **Backend** — the code path, data model, business rule that produces it.

Examples of the standard:
- A UX finding must name the code path or data field that produces the behaviour.
- A backend finding must name the user-visible consequence.
- A product finding must cite the concrete screens/flows that embody or betray it.

## Evidence standard

- Every finding cites a concrete artifact: `file:line`, a screen URL, or a named flow. No citation → not a finding.
- No speculative risks. If a concern requires a condition the product prevents, drop it or label it clearly as unverified.
- Distinguish **what the docs claim**, **what the code does**, and **what the running UI shows**. When they disagree, that disagreement *is* the finding.

## Classification (use these exact labels)

- **WORKS** — verified good; note it so we don't re-litigate.
- **LACKING** — missing behaviour, state, or coverage.
- **UX-REPLACE** — the screen/flow/copy needs rework.
- **BACKEND-REPLACE** — the logic/model/contract needs rework.
- **SECONDARY-TO-SPINE** — works, but competes with the hero journey; demote or progressively disclose.

## Completeness with a touch of focus (product owner decision, locked)

- Default is **preserve**. The lever is **hierarchy and progressive disclosure**, not deletion.
- "Cut" is the last resort and must be justified against the hero spine.
- The bias: make one journey read in ~60 seconds (the product's own success bar) without gutting the depth that makes it credible.

## Severity anchor

Rate every finding against two anchors, not abstract best practice:
1. **The 60-second success bar** — "a Checker approves a payment in under 60 seconds, confident the controls held."
2. **The pitch** — would this finding cost credibility in front of a panel/investor?

## Never

- Never flag without a citation.
- Never present doc-claims as verified behaviour.
- Never recommend deletion of a working control without tying it to the spine.
- Never let a UX and a backend finding about the same root cause live as two findings — consolidate to the root.

# Phase 1 — Deep Connective Audit

**Prerequisite:** `context/product-model.md` confirmed. Obey `rules/connective-audit.md`.

**Goal:** Module by module, find where the product works, where it's lacking, and what needs UX or backend rework — every finding connective and cited.

## Method

Go **module by module** (from the model's module map). For each module, run three lenses and connect their findings:

1. **Product lens** — Does this module serve the hero spine or dilute it? Is the offering legible here? Classify anything that competes with the spine as **SECONDARY-TO-SPINE**.
2. **UX lens** — Drive the real screens. State completeness (empty/loading/success/failure/blocked/locked), hierarchy, copy, the 60-second bar. Cite screen + the component/`file:line`.
3. **Backend lens** — Read the real code path. Correctness, state-machine integrity, auth/tenant isolation, financial safety, error handling. Cite `file:line`.

Then **connect**: for each module, state the through-line from backend behaviour → UX consequence → product impact. Consolidate UX+backend findings that share a root cause.

## Verification pass (required, before synthesis)

Before any finding is reported, put it through a false-positive filter:
1. **Reference check** — does the cited `file:line` / screen actually support the claim? If not, drop it.
2. **Already-addressed check** — is the concern handled elsewhere in the code or flow? If yes, drop it (note that you checked).
3. **Failure-path walk** — walk the exploit/failure step by step. If it requires a condition the product prevents, downgrade or drop it.
4. **Severity re-rate** — against the 60-second bar and the pitch, not abstract best practice.
5. **Dedup** — consolidate to the root cause.

Only findings that survive all five are reported. Mark each survivor `[VERIFIED]`.

## Output

For each module:
- **Verdict** — one line: does it hold up for a demo/pitch?
- **Findings table** — `Classification | Finding | Evidence (file:line / screen) | Connective through-line | Severity (vs 60s bar & pitch)`.
- **WORKS** notes — what's genuinely good (so it's not re-litigated).

End with a **cross-module synthesis**: the 5–8 findings that most affect the offering's clarity and the demo, ranked. This synthesis feeds Phase 3.

Do not propose solutions yet beyond naming the classification. Phase 3 designs the fixes.

# RUN — PayOps Audit → Research → Improvement Pipeline

Runner for the full product-maturation pipeline. Governed by `rules/connective-audit.md`.

## Sequence

0. **Ground truth** → `prompts/00-ground-truth.md` → writes `context/product-model.md`.
   **⛔ CHECKPOINT — human confirms the product model before proceeding.**
1. **Deep audit** → `prompts/01-deep-audit.md` → module-by-module findings + cross-module synthesis.
2. **Market research** → `prompts/02-market-research.md` → landscape, borrowable patterns, positioning options.
3. **Improvement synthesis** → `prompts/03-improvement-synthesis.md` → per-module plan + sequenced roadmap.
4. **Pitch readiness** → `prompts/04-pitch-readiness.md` → one-liner, problem case, demo script, Q&A.

## How to invoke in a fresh session

> Read `.claude/rules/connective-audit.md`, then run the pipeline in `.claude/prompts/RUN.md` starting at Phase 0. Repo is here; deployed app is at <URL>. Stop at the Phase 0 checkpoint for my confirmation.

## Locked decisions (carried through every phase)

- **Completeness with a touch of focus** — demote/progressively-disclose before deleting; justify any cut against the hero spine.
- **UX + positioning blend** — research explains not just *what* comparables do but *why they play their lane*; feeds both screen simplification and the one-liner.
- **Ground truth before findings** — no audit on an unconfirmed model.

## Notes

- Prompts are harness-neutral markdown; usable via Claude Code or the repo's AGENTS setup.
- Each phase's output is an input to the next — keep them as durable files under `.claude/` or `docs/` so a later session can resume mid-pipeline.

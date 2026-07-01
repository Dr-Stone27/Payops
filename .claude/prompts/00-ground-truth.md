# Phase 0 — Ground Truth ("what this product is")

**Goal:** Produce/refresh `context/product-model.md` — the canonical spine every later phase reasons against. Read everything and connect it. Do not audit yet.

**Inputs:** the full repo (code + docs), and the running app (deployed URL or local).

> If `context/product-model.md` already exists as a draft, **update it in place** and clear every `⟳` marker with a verified fact — do not regenerate from scratch. The draft records what was already established; your job is to complete and confirm it.

## Do this

1. **Read the code, not just the docs.** At minimum, fully read: `prisma/schema.prisma`, everything in `src/lib`, all of `src/actions`, every `src/app/api/**/route.ts`, and every page under `src/app`. Docs (`README.md`, `PRODUCT.md`, `SCREENS.md`, `docs/`) are context, not ground truth.
2. **Drive the running app.** Walk every screen. Observe real states: empty vs populated, loading/polling, success, failure, locked, blocked. Note where the running UI diverges from the code or docs.
3. **Reconcile three sources.** For each capability, record what the docs claim, what the code does, and what the UI shows. Where they disagree, capture it — that becomes audit input.

## Produce `context/product-model.md` with these sections

- **One-line offering** — what this is, in the product's own honest terms.
- **The user & the job** — who, under what pressure, trying to do what.
- **The hero spine** — the single ~60-second journey that tells the whole story. (Proposed; confirmed at checkpoint.)
- **Module map** — every module, its purpose, its screens, its entry/exit.
- **Flows as built** — arrow-chain journeys for each core flow, matching the real code paths.
- **Data model** — entities, key fields, relationships (from `schema.prisma`).
- **State machines** — payment + vendor, exactly as implemented.
- **Business rules & controls** — four-eyes, KYB thresholds, compliance triggers, NIP tolerance, PIN/lockout, webhook signing/dedup, tenant isolation — with `file:line`.
- **Spec→build deltas** — what the spec/resolution defined that the build changed, dropped, or simplified.
- **Demo affordances** — seeded behaviours built for demonstration.
- **Naming & brand state** — any inconsistency in what the product calls itself.

## Stop at the checkpoint

End Phase 0 by presenting the product model and asking the product owner to confirm it is accurate **before** any auditing. Do not proceed to Phase 1 without that confirmation.

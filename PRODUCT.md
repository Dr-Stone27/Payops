# Product

## Register

product

## Users

Finance and treasury operators at Nigerian SMEs. Two roles in every session:

- **Maker** — creates payment requests, attaches invoice PDFs, initiates vendor onboarding. Works in batches, under time pressure from AP/AR deadlines.
- **Checker** (Owner/Admin) — reviews and approves payments, enters a 4-digit PIN to authorise, resolves compliance flags. Holds accountability for every outflow.

Context: bright office environment, desktop browsers, high cognitive stakes — real money moving to real vendors. Not a casual app.

## Product Purpose

Watchtower is a payment operations tool that enforces a Maker-Checker four-eyes rule, KYB vendor verification via Jaro-Winkler CAC/NUBAN name matching, compliance escalation for high-value or flagged transactions, and post-settlement reconciliation against NIP tolerance bands. Every outflow from an SME's treasury passes through an auditable gate before reaching the PSP.

Success = a Checker can approve a vendor payment in under 60 seconds, confident that the controls held.

## Brand Personality

Efficient. Precise. Trustworthy.

Voice: direct, no filler, no marketing speak. Labels say exactly what they mean. Error messages say what went wrong and what to do. Empty states don't apologise — they instruct.

## Anti-references

- **Legacy banking portals (NIBSS, old CBN tools):** table-heavy grids, grey-on-grey hierarchy, 2008 enterprise density, no breathing room. Watchtower must feel like a deliberate step forward from this — not a clone of what Nigerian operators already mistrust.
- **Generic SaaS dashboard (hero-metric template):** big number + small label + gradient card, repeated four times in a grid. If it looks like a Vercel dashboard starter, rework it.
- **Consumer fintech (Revolut/Monzo register):** playful illustrations, pastel gradients, casual copy. Wrong register for high-stakes B2B ops.

## Design Principles

1. **Hierarchy earns trust.** The most important information (amount, status, action required) must win visual attention before anything else. If a Checker has to scan to find the PIN field, hierarchy has failed.
2. **Density without noise.** Finance operators read tables for a living. Compact information is fine; visual clutter is not. Every element on screen must justify its space.
3. **State is the UX.** This product has eight payment statuses, four exception types, two compliance paths, and a lockout state. Every status must be legible at a glance — badge colour, icon, and label must all agree.
4. **No decoration for decoration's sake.** No gradients on data, no side-stripe borders, no identical card grids. If an element doesn't carry information or guide action, remove it.
5. **Controls feel consequential.** The approval PIN input, the "Approve & dispatch" button, the compliance clear/block buttons — these are high-stakes actions. They should look and feel like it: deliberate, sized for confidence, not buried.

## Accessibility & Inclusion

- WCAG AA minimum (4.5:1 body text, 3:1 large text / UI components)
- All interactive elements keyboard-accessible and focusable with visible ring
- Status badges must not rely on colour alone — label text is always present
- Reduced motion respected via `@media (prefers-reduced-motion: reduce)`

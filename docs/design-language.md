# Watchtower Design Language

**References:** Mercury (feel: calm, generous, one quiet accent) + Modern Treasury (information design: payment lifecycle, ledger-grade precision). **Identity stays ours:** emerald `#0e7a5a` + navy `#0c1d2e` on light surfaces.

**The test for every screen:** would a finance operator trust this with ₦50M? Calm beats clever. Quiet beats loud. Precise beats friendly.

---

## Color roles (tokens in `globals.css`)

| Role | Value | Use |
|---|---|---|
| Ink | `#0c1d2e` | Headings, primary data, hero numbers |
| Ink-2 | `#6b7785` | Body/supporting text |
| Ink-3 | `#8a97a6` | Labels, captions |
| Ink-4 | `#9aa6b2` | Hints, disabled |
| Emerald | `#0e7a5a` | THE interactive color: primary buttons, links, success. One accent per view working hard — never decorative |
| Navy | `#0c1d2e` | Dark surfaces (auth panel, toasts, tooltips), active filter pills |
| Surface | `#fff` on `#f5f6f8` | Cards on app background |
| Borders | `#e8eaed` (card) / `#f1f3f5` (row dividers) | Hairlines carry structure — never heavier |

Status tints (existing badge system) are the only other color on a screen. Red/amber are reserved for genuine risk — if everything shouts, nothing does.

## Typography & numbers

- Scale: 22 page title / 14 section·card title / 13 body / 12–12.5 supporting / 11.5 caption / 10–11 uppercase micro-labels (`letter-spacing: .06em`, Ink-3).
- **Money is the protagonist** (Mercury's hero-balance move): amounts being decided on render 28–34px, weight 650–700, tight tracking, `tabular-nums`, kobo de-emphasized where shown.
- **Identifiers are evidence** (MT's move): invoice numbers, tx refs, NUBANs, CAC numbers always mono (`var(--font-mono)`), never bold.
- Weight contrast does hierarchy, not size explosions: 600–700 for data, 400–500 for labels.

## Space & surfaces

- 4px base grid; sections separated by 24–28px; cards padded 18–22px; let whitespace group, not boxes-in-boxes.
- Cards: radius 13, hairline border, shadow only when floating (menus, dialogs, toasts). Flat is trustworthy.
- Tables: header row 11px Ink-3, no vertical rules, row hover `wt-row-click`, whole row clickable.

## Components (the kit is law)

`src/components/ui/` — ConfirmDialog, Toast, EmptyState, ClickableRow — plus the badge/avatar helpers in `src/lib/design.ts`. New UI composes these; don't hand-roll variants. Buttons: primary emerald / secondary hairline / danger red, height 36–44, radius 8–9, `wt-btn` feedback class, label always verb-first.

## States

- Every list has an EmptyState: neutral (nothing yet → one CTA) or positive tone (clear queue = good news, say so).
- Loading: spinner + "Loading…" inline; never blank.
- Errors: inline red panel near the action that caused them, message says what to do next.
- Success: toast, one sentence, states the consequence ("Approved — dispatched to your PSP partner.").

## Voice & copy

1. Sentence case everywhere — titles, buttons, labels. No Title Case, no ALL CAPS outside micro-labels.
2. Verb-first buttons: "Approve & dispatch", "Add vendor", "Block payment". Never "Submit"/"OK"/"Yes".
3. Terse by default, explicit where trust is at stake. Control explanations (four-eyes, PIN-as-signature, exception guidance) stay full sentences — that's product, not padding.
4. Say the consequence, not the mechanism: "The maker can see your reason", not "Reason saved to database".
5. Numbers always formatted (`formatNaira`), never raw. Dates short (`7 Jul`), times only when they matter (audit).
6. No exclamation marks. No "oops/whoops". Errors are calm and specific.
7. Nigerian context is assumed, not explained: NUBAN, CAC, NIP need no glossary in-flow (tooltips carry the depth).

## What we do NOT copy

Mercury's dark theme (light reads auditable; dark is a product decision, not a restyle), their trade dress (logo shapes, exact blues), or consumer-app warmth. Watchtower is an instrument, not a companion.

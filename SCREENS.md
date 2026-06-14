# PayOps Control Tower — Screen Design Brief

Use this document in **claude.ai** (the web app) to generate visual mockups.  
Suggested prompt: *"Render [screen name] from this design brief as a full-page HTML/CSS mockup I can see in the preview."*  
Iterate in claude.ai until each screen looks right, then bring the final HTML/CSS back here to implement.

---

## Product context

**What it is:** Payment operations dashboard for Nigerian SMEs. Every outgoing payment must pass through a Maker-Checker gate before hitting the PSP.

**Who uses it:** Two roles share one business account —  
- **Maker** — submits payment requests, uploads invoices  
- **Checker** (Owner/Admin) — reviews, enters a 4-digit PIN, approves or rejects

**Personality:** Efficient. Precise. Trustworthy. Think Stripe Dashboard or Linear — not a consumer banking app.

**Palette:** Primary action: emerald green (`#059669` / `emerald-600`). Danger: red. Warning/compliance: orange. Info/processing: blue. Background: near-white gray (`#f9fafb`). Surface: white. Text: `#111827` (primary), `#6b7280` (secondary).

**Typography:** Inter (loaded via next/font). One family, multiple weights. No display fonts.

**Anti-references:** NOT NIBSS/legacy Nigerian banking portals (grey-on-grey, table soup). NOT Revolut/Monzo consumer feel. NOT generic SaaS with gradient metric cards.

---

## Layout shell

**Sidebar** (fixed, 240px wide):
- Top: "P" logomark in emerald square + "PayOps / Control Tower" wordmark
- Nav items (with SVG icons, not emoji): Dashboard, Vendors, Payments, Compliance Queue, Exception Queue, Audit Log, Team
- Active item: emerald-50 background, emerald-700 text, coloured icon
- Bottom: user name + role badge, Update PIN link, Sign out
- Sidebar is white, `border-r border-gray-200`

**Main area:** gray-50 background, scrolls independently. Max-width varies by page (dashboard: 1024px, forms: 512px, lists: 896px).

---

## Screen 1 — Login

**URL:** `/login`  
**Layout:** Centered card, no sidebar. Full-height white or very light gray background.

**Elements:**
- Logomark (emerald square "P" + "PayOps Control Tower") — top of card, centred
- Tagline below logo: *"Secure payment operations for Nigerian SMEs"* — 13px, gray-500
- `Work Email` input
- `Password` input
- `Sign in` button (full-width, emerald-600, 40px height)
- Below card: "Don't have an account? Register your business" in small gray text with emerald link

**Design notes:**
- Card should feel deliberate — slightly elevated (`shadow-sm` or `shadow-md`), white, rounded-xl, max-w-sm or max-w-md
- No decorative gradients or illustrations
- Consider a subtle left column on desktop (1/3 width) with a short list of what PayOps enforces: "Four-eyes approval", "CAC/NUBAN KYB verification", "NIP reconciliation" — a trust signal before login

---

## Screen 2 — Register

**URL:** `/register`  
**Layout:** Same as Login (centred card), but taller — 5 fields across two logical groups.

**Field groups:**
1. **Your details:** Full Name, Work Email, Password
2. **Business details:** Business Name, CAC Registration Number

**Group separator:** thin `border-b border-gray-100` with a small `text-xs text-gray-500` label (NOT uppercase, NOT letter-spaced — that's the old version)

**Submit:** `Create account` — full-width emerald, `font-medium`

**Design notes:**
- Keep it airy — this is the first impression for a new business
- CAC Number placeholder should say `RC-1234567` to set expectations

---

## Screen 3 — Dashboard

**URL:** `/dashboard`  
**Greeting:** "Good day, [First name]" in `text-xl font-semibold` + `"Payment operations overview"` subtitle

**Stat cards (4-column grid):**
- Total Payments → links to /payments — neutral
- Approved Vendors → links to /vendors — neutral
- Compliance Queue → links to /compliance — **red ring + "Needs action" label if count > 0**, otherwise neutral
- Exception Queue → links to /exceptions — **red ring + "Needs action" label if count > 0**

Each card: white background, rounded-xl, no gradient, no icon decoration. Just label (xs, gray-500) + number (2xl, bold) + optional urgency label.

**Recent Payments table (below stats):**
- White card with header row: "Recent Payments" (sm, semibold) + "+ New payment" link (emerald, xs)
- Table columns: Vendor name (link → payment detail), Invoice #, Amount (right-aligned, tabular nums), Status badge, Date
- Status badges: coloured pill (yellow=pending, orange=compliance, blue=processing, cyan=settled, emerald=reconciled, red=exception, gray=cancelled)
- Row hover: `bg-gray-50`

**Empty state (no payments yet):**
- Centred in the table card, ~14 lines of padding
- "No payments yet" in `text-sm font-medium text-gray-700`
- "You'll need at least one approved vendor before submitting a payment request." in `text-xs text-gray-400`
- Small "Add first vendor" button in emerald (not just a text link)

---

## Screen 4 — Vendors list

**URL:** `/vendors`  
**Header:** "Vendors" + "CAC-verified vendor registry" subtitle | "+ Add vendor" button (emerald, right)

**Table:**
- Columns: Legal Name, Bank, Account (last 4 masked as ••••••1234), KYB Score (decimal or —), Status badge, Action
- Status: Approved (emerald), Needs Review (yellow), Pending (gray)
- Action column: "Review →" link (emerald, xs) visible only for `needs_review` items and only to Checkers

**Empty state:** "No vendors yet — add one to start submitting payment requests."

---

## Screen 5 — New vendor form

**URL:** `/vendors/new`  
**Layout:** Single column, max-w-lg, white card

**Fields:**
- Legal Name (as registered with CAC)
- CAC Registration Number
- Bank Name (select — list of Nigerian banks)
- Account Number (10-digit NUBAN — masked on blur, stored encrypted)
- CAC Registered Name (what appears on the CAC certificate)
- NUBAN Account Name (what the bank returns for this account)

**Below form:** info callout explaining Jaro-Winkler KYB check — *"We compare your CAC name against the NUBAN account name. A strong match auto-approves. A weaker match flags for manual review."*

**Submit:** "Run KYB check & save vendor" — full-width emerald

---

## Screen 6 — Vendor detail / KYB review

**URL:** `/vendors/[id]`  
**Layout:** max-w-lg, stacked cards

**Card 1 — Identity comparison:**
- 2×2 grid: CAC Registered Name | NUBAN Account Name | Bank | Account (masked)
- Jaro-Winkler score panel below the grid: coloured (emerald/yellow/red) with score percentage + text label ("Strong match — auto-approved", "Partial match — requires manual review", "Weak match — review carefully")

**Card 2 — Manual approval (visible only if `needs_review`):**
- "Manual approval" heading
- Textarea for justification (min 20 chars) with character counter
- "Approve vendor" button — disabled until 20 chars minimum

---

## Screen 7 — Payments list

**URL:** `/payments`  
**Header:** "Payments" + "All payment requests across states" | "+ New payment" button

**Table:** Vendor, Invoice, Amount (right, tabular), Maker, Status badge, Date

**Empty state:** "No payments yet. Add an approved vendor first, then submit your first payment request."

---

## Screen 8 — New payment form

**URL:** `/payments/new`  
**Layout:** max-w-lg, white card, single column

**Fields:**
- Vendor selector (dropdown — only approved vendors, shows bank + last 4)
- Invoice Number
- Amount (₦) — with "High value" label if ≥ ₦5,000,000
- Cost Center (optional)
- Invoice PDF (file input)

**Conditional callout:** if amount ≥ ₦5M, show orange info box: "Compliance review will be triggered before this reaches a Checker."

**Submit:** "Submit payment request" — full-width emerald. Disabled if no approved vendors exist.

**No vendors state:** Red text "No approved vendors yet. Add one first." with link.

---

## Screen 9 — Payment detail (most complex)

**URL:** `/payments/[id]`  
**Layout:** max-w-2xl

**Header:**
- "← Back to payments" breadcrumb
- Vendor name (xl, semibold) + "Invoice [number] · Created by [maker name]" (sm, gray-500)
- Status badge (top-right, pill, coloured)

**Card — Payment info:**
- Amount: `text-2xl font-bold` — most prominent element on the page
- Vendor account (bank + masked NUBAN)
- Cost center (if present)
- Invoice PDF filename (monospace, sm, gray-50 background chip)
- Transaction reference (if dispatched, monospace, xs)
- Settled amount (if settled — green if matches, red if mismatch)

**State panels (only one visible at a time, stacked below info card):**

### Processing state
Blue card: spinning indicator + "Dispatched to PSP" heading + "Awaiting settlement webhook — page updates automatically" — auto-polling every 2s.

### Reconciled state
Emerald card: "✓ Reconciled" + "Settlement matched within NIP tolerance. No action required."

### Exception state
Red card: exception category label + specific description per type (PSP_FAILURE / AMOUNT_MISMATCH / STATUS_UNKNOWN / COMPLIANCE_REVIEW_TIMEOUT).

### Compliance review state
Orange card: "Compliance Review Required" + trigger reason.  
If Checker (who didn't create the request): two buttons — "Clear review — proceed to approval" (orange, primary) | "Block payment" (red outline, secondary).  
If Maker: "Awaiting Checker review. You cannot action the compliance review."

### Checker approval state (pending_approval + canApprove)
White card titled "Approve or reject":
- **PIN input area (tinted gray-50 box):** label "4-digit approval PIN", large centred PIN input (xl text, tracking wide, monospace, autofocus), subtext "PIN is validated server-side — this approval is your digital signature."
- **"Approve & dispatch to PSP" button** — full-width, emerald-600, `font-semibold`, 44px height — this is the highest-stakes action on the page
- Separator + collapsible "Reject with reason" section: textarea + "Reject payment" button (red outline)

### Maker waiting state
Yellow card: "Awaiting Checker approval."

### Four-eyes blocked state (isChecker but isMaker or isComplianceResolver)
Gray informational text: explains which rule prevents action.

### Rejected / cancelled state
Gray card: "Rejection reason" label + reason text.

---

## Screen 10 — Compliance queue

**URL:** `/compliance`  
**Header:** "Compliance Queue" + description: "Payments flagged for review before reaching a Checker."

**Queue items (when populated):** White card with orange border per item:
- Vendor name (semibold) + Invoice # + Created by [maker] (xs, gray-500)
- Amount (lg, bold, right) + trigger badge (orange pill: High-value / Duplicate invoice / etc.)
- "Review this payment →" full-width button (orange-600)

**Empty state (no items):**
- Small emerald icon (shield with checkmark)
- "Compliance queue is clear" (sm, font-medium, gray-700)
- "Payments ≥ ₦5M, duplicate invoices, or ambiguous KYB matches appear here before reaching a Checker." (xs, gray-400)

---

## Screen 11 — Exception queue

**URL:** `/exceptions`  
**Header:** "Exception Queue" + "Failed, mismatched, or timed-out payments requiring manual review."

**Exception items:** White card with red border per item:
- Exception category badge (red pill) + vendor name + invoice #
- Amount (lg, bold, right)
- Description (xs, red-700 — explains what went wrong)
- Variance line if AMOUNT_MISMATCH (settled vs invoice vs gap)
- "View payment details →" link (red, xs, font-medium)

**Empty state:**
- Small emerald checkmark icon
- "No exceptions" (sm, font-medium, gray-700)
- "PSP failures, amount mismatches outside NIP tolerance, and timed-out settlements appear here." (xs, gray-400)

---

## Screen 12 — Audit log

**URL:** `/audit`  
**Header:** "Audit Log" + "Tamper-evident record of all system events."

**Table:** Timestamp | Actor | Action (monospace badge — `PAYMENT_APPROVED`, `VENDOR_KYB_PASSED`, etc.) | Details (truncated, expandable)

**Design notes:** Monospace action codes distinguish this from other tables. Alternating row shading (`bg-gray-50` on even rows) or consistent hover. Dense — auditors scan these, they want information.

---

## Screen 13 — Team

**URL:** `/team`  
**Header:** "Team" | "+ Add member" button (emerald, owner/admin only)

**Info callout (always visible):** "Four-eyes rule: a Maker cannot approve their own payment request. Checkers (Owners and Admins) can approve payments they did not create."

**Team member list:** White card per member:
- Avatar circle (initials, emerald-100 / emerald-700)
- Full name + role badge (Checker = emerald, Maker = blue, gray for others)
- PIN status: "PIN set" (emerald) or "PIN not set" (yellow warning)

---

## Screen 14 — Add team member

**URL:** `/team/new`  
**Layout:** max-w-lg, single card

**Fields:** Full Name, Work Email, Password, Role (radio or select: Maker / Admin)

**Demo tip callout:** "For the four-eyes demo: create a Maker here, log in as that Maker in a second browser tab to submit a payment, then switch back here as Checker to approve it."

---

## Screen 15 — Setup PIN

**URL:** `/setup-pin`  
**Layout:** Centred card (no sidebar), max-w-sm

**Fields:** New PIN (4-digit, numeric, large tracking), Confirm PIN

**Context:** "Your PIN is your digital signature on every payment approval. Set one before you can approve payments."

---

## How to use this in claude.ai

1. Open a new chat at **claude.ai**
2. Paste this entire document
3. Ask: *"Render Screen 3 (Dashboard) from this brief as a full HTML/CSS page with realistic sample data. Show it with 2 items in the Compliance Queue (urgent state) and 6 recent payments in the table."*
4. Iterate: *"Make the stat cards less generic — try giving the two urgent ones a stronger visual treatment."*
5. Once happy with a screen: ask *"Give me just the HTML/CSS for this — I'll implement it in my Next.js/Tailwind project."*
6. Bring the final design decisions back here to implement in code.

Focus on Screens 3, 9, 1, and 10 first — those are the panel demo critical path.

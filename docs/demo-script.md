# Watchtower — Panel Demo Script (~8 minutes)

**Thesis to land:** the system says no, and tells the user why. Happy paths prove it runs; refusals prove it protects.

**Setup (before the panel):** two browsers — **Browser A**: Owner/Checker (PIN set). **Browser B**: a Maker (invite via Team → Add member). One auto-approved vendor already added (NUBAN ending `1234`). Know your demo levers:

| Lever | Effect |
|---|---|
| NUBAN ending `1234` | KYB auto-approves (score ≈ 1.0) |
| NUBAN ending `9999` | KYB name mismatch → needs review |
| Amount ≥ ₦5,000,000 | Compliance review before approval |
| Invoice starting `EXC-` | Forces PSP failure → exception |
| Invoice starting `MIS-` | Forces settlement ₦51 over tolerance → amount mismatch |

---

### Beat 1 — The control tower (30s, Browser A)
Open the dashboard. *"A finance lead doesn't need a ledger — they need to know what needs them and what's at risk."* Point: needs-your-attention, ₦ held up in exceptions, recent control events. Every number links to its queue.

### Beat 2 — The KYB gate (90s, Browser A)
Vendors → Add vendor, NUBAN ending `9999`. It lands in **needs review** with the match score and both registered names side by side. *"The account name doesn't match the CAC record — the most common vendor-fraud vector in Nigeria. Watchtower won't let anyone pay this account yet."* Try Payments → New payment: the vendor isn't selectable. Then approve it manually with a written justification — *"a human can override, but never silently: the justification is permanent."*

### Beat 3 — Maker raises, Checker approves (2m, both browsers)
Browser B: New payment — vendor, invoice number, ₦1,850,000, attach PDF. Pause on the formatted amount preview: *"decimal slips are how a ₦320k invoice becomes ₦3.2M — the maker sees the formatted amount before submitting."* Submit. Browser A: open it — amount and invoice number sit together on one line for the visual match — enter PIN, **Approve & dispatch**. Settlement reconciles with a real webhook record and the NIP tolerance check. *"Under 60 seconds, and every step just landed on the audit log."*

### Beat 4 — The four-eyes wall (90s — the moment)
Browser A: raise a payment *as the Owner*, then open it. The shield: **"The maker-checker rule applies… no payment leaves on one person's say-so."** *"This is the control a WhatsApp 'ok' can never enforce — and note it's not an error screen. This is the product working."* If time: raise ₦6.2M in Browser B → compliance hold → clear it in Browser A as one checker → show that same checker blocked from also approving.

### Beat 5 — When money doesn't move (90s, Browser B → A)
Raise invoice `EXC-DEMO-1` → approve in Browser A → it fails to the exception queue: plain-language explanation, *"no funds left your account."* **Retry** → reconciled. Then invoice `MIS-DEMO-1` → the mismatch card shows settled vs. invoice vs. variance to the kobo → **Acknowledge** (audited) and it leaves the queue. *"Every payments product demos success. This is what an answer for failure looks like."*

### Beat 6 — Close on the trail (30s, Browser A)
Audit log: every action of the last eight minutes — approvals, blocks, KYB flags, the acknowledgement — actor, timestamp, outcome. *"Tamper-evident by design; database-level row security is the roadmap item, and we say so."* Back to dashboard. *"The independent control and audit layer over the accounts an SME already uses. No migration, no fund custody."*

**If something breaks live:** every beat is independent — skip forward; the audit log at the end still tells the whole story.

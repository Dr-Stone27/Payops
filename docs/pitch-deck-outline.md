# Watchtower — Pitch Deck Outline (12 slides)

**Narrative spine:** a real loss → why it keeps happening → the wedge incumbents can't take → the product saying no → proof it's real → honest roadmap.

1. **The scene.** A Lagos logistics company loses ₦3.2M to a double payment. The approval record was "ok" on WhatsApp. One sentence, no product yet.
2. **The problem.** SME payment ops live across spreadsheets, WhatsApp, and bank portals: no enforced second approver, no vendor verification, no audit trail. The person who moves the money audits themselves.
3. **The stakes.** ₦52.26bn lost to fraud in Nigeria in 2024 (+196% over five years); vendor-account/BEC fraud is the marquee vector. The prescribed defence — verify the account, require dual approval — is exactly what the tools SMEs use can't enforce.
4. **The thesis.** Watchtower is the *independent* payment-controls and audit layer **over the accounts you already use**. Not a wallet, not a rail, no fund custody, no migration. (Category proof: Positive Pay, BILL AP Controls — separation of duties is a paid product elsewhere.)
5. **The spine (one diagram).** Add vendor → KYB name-match (CAC ↔ NUBAN) → invoice-backed request → a *different* checker approves with PIN → dispatch via licensed PSP → NIP-tolerance reconciliation → immutable audit trail.
6. **The controls (the demo's skeleton).** Four-eyes (maker + compliance-resolver rules, server-enforced) · KYB gate with human override + permanent justification · ₦5M compliance threshold + duplicate-invoice detection · exception queue with recovery · PIN-as-signature with lockout. Screenshot: the four-eyes wall.
7. **Live demo.** (Hand off to `docs/demo-script.md` — the system saying no, three ways.)
8. **Built like we mean it.** The audit→fix cycle as engineering credibility: 44 spec issues caught pre-build; post-build audit found and fixed a 10× threshold error and a settlement path that bypassed its own reconciliation; controls re-verified after every change. One slide, specifics, no adjectives.
9. **Regulatory posture.** PSSP category under the PSP partner's licence at MVP; NDPA data controls (NUBAN encrypted + hashed); AML triggers mapped to NFIU obligations; NRS TMS integration identified as the first production-sprint item — deadline honesty included.
10. **Honest limits & roadmap.** Simulated PSP behind a real HMAC webhook seam → Flutterwave/Paystack/Fincra; NIBSS name-enquiry for live KYB; invoice OCR (the named gap after maker-checker); DB-level audit row-security. Each limit paired with its path.
11. **Why this wins.** Incumbents (Duplo, Ramp-likes, Bujeti) require moving your treasury onto their rails — they can't be the independent auditor of accounts they operate. Assurance-without-migration is the structural wedge.
12. **Close.** Return to the scene: same company, same invoice — this time the duplicate is flagged, the wrong account never verifies, and the "ok" is a PIN on a permanent record. *No payment leaves without a verified vendor and a second set of eyes.*

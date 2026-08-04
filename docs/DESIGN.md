# DESIGN.md — Shreeja Finance Platform
**Version:** v1.1 · **Date:** 02 Aug 2026 · **Companions:** PRD.md v3.0, SCREEN-MAP.md v3.0, ARCHITECTURE.md v2.0

**Change from v1.0:** Sections 1–12 are otherwise unchanged in full — see v1.0 for complete content (tokens, components §3.1–3.13, states, interaction, content, accessibility, platform conventions, flow patterns, governance, implementation stack, web panel standards §12). Two targeted additions below for the reworked Admin Panel lender screens (SCREEN-MAP.md v3.0 A6–A7).

**⚠ Draft status carried over from v1.0:** brand colors still pending Prateek confirmation (O5).

---

## 3.14 Lender Rules Reference card (new component)

Read-only display, used on Admin Panel Screen A6. Structured as a set of labeled sections mirroring `getRulesSummary()`'s shape — Eligibility (age/CIBIL/LTV as a compact stat row), Customer Types (chip row), Documents (grouped list by party, reusing the Document checklist row component §3.11 in display-only mode — no upload affordance), Guarantor Conditions (plain-language sentence, not raw JSON). A small `caption`-styled footer shows `RULES_VERSION` and, if available, last-updated date — this is the visible "proof of maintenance work" surface, so it should read clearly, not be buried.

No edit affordances anywhere on this screen — no pencil icons, no inline-editable fields. If a future task asks to add editing here, that's a scope change against a locked decision (PRD.md v3.0 L11) and should be flagged, not built.

## 3.15 Lender Settings row (new component)

Used on A7. Per lender: name + logo, `is_active` toggle (§3.3 Switch), priority as a numeric stepper or drag-handle for reordering. Nothing else on this screen — no rule fields, no document fields. Keep it visually minimal precisely because it does very little; a sparse screen here is correct, not unfinished.

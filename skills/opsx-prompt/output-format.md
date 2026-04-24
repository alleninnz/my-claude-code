# Output Format — Generated Prompt Structure

## Two-layer output

Phase 5 displays two distinct pieces in this order:

1. **The prompt (layer 1)** — inside a fenced code block. This is what `opsx:new` consumes. Strict domain-level rule applies: no file paths, function names, struct fields, or other code-level identifiers.
2. **User-only notes (layer 2)** — rendered AFTER the fenced block, as regular message sections visible to the user only. openspec never sees these. Layer 2 is where code-level detail may appear (for user review), since it doesn't feed downstream.

Full-mode `[adjacent]` and `[mismatch:*]` findings go in layer 2 (user-only). Narrow-mode `Verified` ⚠️ entries also go in layer 2. `[verified:claim]` / `[verified:scope]` entries are NOT rendered in either layer — they inform the wording of layer-1 bullets (grounding the prompt in what actually exists) but never become bullets themselves. The remaining tagged findings (`[ticket-requested]`, `[must-include]`, `[breaking]`, `[existing]`, `+breaking` variants) go in layer 1 — but ONLY after the domain-level rule is applied, so symbols from `Evidence` fields are stripped before rendering.

## Template (layer 1 — inside the fenced block)

```
<optional Skip-mode annotation: (no code exploration — ticket scope trusted as-stated)>

<service> | <issue-id or "no-issue"> | <short description>

<Why — 1-2 sentences: business problem, why now, what breaks if we don't. In Full/Narrow modes this reflects the Refined intent; in Skip mode it reflects the Phase 1 intent summary.>

<Already in place — describes pre-existing infrastructure this change builds on. Populated from Phase 1's linked-PR context (always, regardless of triage mode) AND Full-mode [existing] findings (if any). Omit only if both are empty.>

This change:
- <functionality point from the issue>
- ...
- <Full-mode [must-include] discovery — marked with (discovered)>

<Breaking changes + Expand/Migrate/Contract phase — populated from: (a) domain-level paraphrases of Phase 1's `breaking` AND `breaking-uncertain` explicit asks (all modes). Phase 1 only does pre-grounding classification — it cannot determine Expand/Migrate/Contract phasing and cannot definitively confirm whether ambiguous renames are externally breaking. In Narrow/Skip modes, append `(phase not determined — Full mode required for Expand/Migrate/Contract sequencing)` to every bullet; for `breaking-uncertain` asks also append `(breaking classification uncertain — run Full for confirmation)`. Do NOT fabricate phase labels or certainty. (b) Full-mode [breaking] findings (Full CAN determine phasing — its bullets should include the phase). (c) Full-mode findings with the `+breaking` modifier ([must-include +breaking] and [ticket-requested +breaking] — these may be GAP refinements beyond the literal ask OR phasing refinements of a literal ask). **Full-mode override**: Full's grounded findings authoritatively replace Phase 1's pre-grounding guesses ONLY when Full emits an explicit signal — silent Full passes do NOT confirm a non-breaking reclassification (Full is told not to re-emit literal asks without refinements). See SKILL.md "Breaking changes" section for the precise override rules (a)-(d). **Filter (mirrors Non-scope and This change:)**: for any breaking bullet whose substance matches a `[mismatch:claim]` finding (Full) or a `[claim]` ⚠️ Verified entry (Narrow), try to rewrite against the corrected target. If rewrite is possible, **re-evaluate the breaking classification for the corrected target** — if the corrected target is internal (not a public contract) or otherwise non-breaking, move the rewritten bullet to `This change:` instead of keeping it in `Breaking changes`. If rewrite is NOT possible, this is a HARD STOP (same rule as `This change:` — see SKILL.md Phase 5 STOP conditions); do NOT silently drop the rollout-sensitive bullet. **Already-satisfied filter (mirrors `This change:`)**: drop any breaking bullet whose substance matches an item in `Already in place` — landed rollout work shouldn't re-appear as planned. **Dedup preference (a) vs (c)**: when a Phase 1 ask paraphrase (source a) and a Full-mode finding (source c) describe the same change by substance, KEEP THE FULL-MODE VERSION — it has Expand/Migrate/Contract phase detail that Phase 1 couldn't supply. Never drop the more-phased version in favor of the less-phased one. Omit the section only if all sources were legitimately empty (not when filter would have dropped everything).>

<Non-scope — what this change explicitly does NOT cover. Populated from: (a) domain-level paraphrases of scope statements in Raw ticket claims (Non-goals, "do NOT change X", scope-boundary phrases) and (b) any Non-scope language already in the ticket body. Strip code-level identifiers when paraphrasing. **Filter (applies to BOTH sources a AND b)**: drop any scope statement whose substance matches a `[mismatch:scope]` finding (Full) or a `[scope]` ⚠️ Verified entry (Narrow) — same boundary, same paraphrase, so the filter matches it no matter which source it came from. `[mismatch:claim]` / `[claim]` ⚠️ entries concern wrong symbol names and never affect Non-scope (they affect `This change:` asks instead). Keeping contradicted boundaries here would produce a self-contradictory prompt; those statements still appear in layer 2. Omit the section if no surviving scope statements remain.>
```

All sections except the title line and "This change" are conditional — omit if not applicable.

## Layer 2 — outside the fenced block (user-only)

Render as separate sections, AFTER the code block, each with a heading that makes clear it's NOT part of the prompt. Include only the sections that have content; omit empty ones.

```
### ⚠️ Ticket-vs-code mismatch (NOT sent to opsx:new — review before running)

- <one line per mismatch; may include code-level identifiers, since this is for user review>

### ⚠️ Un-sanitizable findings (NOT sent to opsx:new — review before running)

- <one line per required finding ([must-include], [breaking], [existing], [ticket-requested], including +breaking) whose Description could not be paraphrased to domain level without losing meaning; keeps the raw Evidence so the user can manually incorporate it>

### Related findings (out of requested scope — NOT sent to opsx:new)

- <one line per [adjacent] finding>
```

Source mapping for layer 2:
- Full-mode `[mismatch:claim]` / `[mismatch:scope]` findings → `⚠️ Ticket-vs-code mismatch` section
- Required Full-mode findings that failed Phase 4 reader-pass sanitization → `⚠️ Un-sanitizable findings` section (+ add a top-of-layer-1 note flagging deferred findings)
- Full-mode `[adjacent]` findings → `Related findings` section
- Narrow-mode `Verified` ⚠️ entries (except `(implies-breaking)`) → `⚠️ Ticket-vs-code mismatch` section
- Narrow-mode `[scope] ⚠️ (implies-breaking)` → STOP; Phase 5 does not render a prompt at all, instead surfaces the discovery and recommends Full
- Narrow-mode Refined intent = ⚠️ (whole-premise failure) → STOP; present the mismatch and do NOT render a prompt at all

## Tagging by triage mode

- **Full**:
  - The subagent's `Refined intent` replaces the Phase 1 intent sentence in layer 1. If the Refined intent is ⚠️ (whole-premise failure), STOP — do not generate a prompt.
  - Issue points first (from the issue body). Raw ticket claims' explicit asks are always paraphrased into `This change:` (domain-level, untagged) regardless of mode. `[ticket-requested]` findings are GAP refinements beyond the literal asks, merged into the issue points (no `(discovered)` tag).
  - `[must-include]` findings render as `(discovered)` bullets in `This change:`.
  - `[breaking]` findings render in the `Breaking changes + Expand/Migrate/Contract phase` section of layer 1.
  - `+breaking` modifier (on `[ticket-requested]` or `[must-include]`): the finding renders in BOTH its primary section AND the `Breaking changes` section, so rollout guidance is preserved without losing ticket provenance.
  - `[existing]` findings render in the `Already in place` section of layer 1, merged with Phase 1's linked-PR context.
  - `[verified]` entries inform bullet wording only; NOT rendered as their own bullets.
  - `[adjacent]` findings render in layer 2 (`Related findings`). Never in the prompt opsx:new consumes.
  - `[mismatch]` findings render in layer 2 (`⚠️ Ticket-vs-code mismatch`). Never in the prompt. Layer 1 already reflects the correction via the Refined intent; the layer-2 note exists for user awareness only.
  - Layer 1's `Non-scope` section is populated from Raw ticket claims' scope statements (domain-level paraphrases) + any Non-scope language already in the issue body.
- **Narrow**: replace the original intent sentence with the subagent's `Refined intent`. Every `Verified` entry is prefixed `[claim]` or `[scope]`. `[claim]`/`[scope]` ✓ entries inform bullet wording (no-code-level-references rule still holds) but are NOT rendered as their own bullets. `[claim]` ⚠️ and `[scope]` ⚠️ entries both render in layer 2 (`⚠️ Ticket-vs-code mismatch`), NOT inside the prompt; additionally, `[scope]` ⚠️ entries drive the `Non-scope` filter (drop matching boundaries from layer 1). If the `Refined intent` itself is ⚠️, STOP — do not generate the prompt; re-present the mismatch to the user. `Already in place` is populated from Phase 1's linked-PR context. `Non-scope` from both Raw ticket claims' scope statements AND issue-body Non-scope prose (same two-source rule as Full/Skip). `This change:` is populated from issue points + Raw ticket claims' explicit asks (paraphrased, untagged). `Breaking changes + Expand/Migrate/Contract phase` is populated from Phase 1's `breaking` and `breaking-uncertain` asks — append `(phase not determined — Full mode required for Expand/Migrate/Contract sequencing)` and for `breaking-uncertain` ALSO `(breaking classification uncertain — run Full for confirmation)` — so Narrow does not emit a false-certainty rollout requirement.
- **Skip**: top-of-prompt annotation `(no code exploration — ticket scope trusted as-stated)` inside the fenced block. `This change:` is populated from issue points + Raw ticket claims' explicit asks (paraphrased, untagged) — same baseline as Full and Narrow. `Breaking changes + Expand/Migrate/Contract phase` is populated from Phase 1's `breaking`-classified asks and `breaking-uncertain` asks (same baseline as Narrow; append `(phase not determined — Full mode required for Expand/Migrate/Contract sequencing)` and additionally `(breaking classification uncertain — run Full for confirmation)` for uncertain asks). `Already in place` from Phase 1 linked-PR context. `Non-scope` from BOTH Raw ticket claims' scope statements AND any Non-scope prose in the issue body (same two-source rule as Full).

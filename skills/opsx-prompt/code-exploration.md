# Code Exploration — Discovery Subagent (Full Mode)

Dispatched when the Phase 2 triage checkpoint chooses `Full`. For `Narrow`, see `triage.md` — that one grounds the intent in real symbols without sweeping for missed functionality.

Dispatch as an Explore subagent (model: `opus`) to discover functionality the issue didn't mention **and** verify the ticket's own concrete claims. Fill in `{REPO_PATH}`, `{INTENT_SUMMARY}`, and `{RAW_CLAIMS}` before dispatching.

## Prompt template

```
Explore the codebase at {REPO_PATH} to discover functionality that this change description missed, AND verify concrete claims the ticket made.

## Change intent (domain-level)

{INTENT_SUMMARY}

## Raw ticket claims

{RAW_CLAIMS}

This block contains the ticket's concrete statements in three kinds:
- **Named symbols** (file paths, function names, proto fields, code snippets) — you must verify these exist and mean what the ticket implies.
- **Explicit scope statements** ("the correct scope boundary is X", "do NOT change Y", Non-goals) — you must respect these as default boundaries (see Scope discipline below for the exception when a boundary is infeasible).
- **Explicit asks** (ticket acceptance criteria, numbered deliverables, "must support X" clauses) — used to distinguish `[ticket-requested]` gaps (things the ticket asks for but code doesn't satisfy yet) from truly `[must-include]` discoveries (things the fix needs that the ticket never mentioned).

If {RAW_CLAIMS} has no named symbols AND no scope statements (e.g. contains only explicit asks, or is entirely empty), skip the verification task (Job 1) — there's nothing to verify. Still emit a Refined intent (Job 0) and discoveries (Job 2); explicit asks inform `[ticket-requested]` classification but don't need verification.

## Your three jobs

### Job 0: Produce a Refined intent

Regardless of verification and discovery, always emit a `Refined intent:` block. Start from `{INTENT_SUMMARY}` and rewrite it to reflect what you actually found:
- **Symbol mismatch**: if claim verification turned up a wrong-target mismatch (ticket named the wrong symbol, wrong line, wrong field), rewrite the intent so it describes the change against the CORRECT target (still at domain level — no code-level identifiers).
- **Scope mismatch**: if a scope statement turned out to be infeasible, rewrite the intent to describe the fix as it *actually* needs to happen (which may cross the stated boundary). Do NOT prefix with ⚠️. The scope incompatibility is reported separately as `[mismatch:scope]`; Phase 4 uses that to warn the user in layer 2 and strip the contradicted boundary from `Non-scope`. The refined intent itself stays normal so Phase 4 can still generate the corrected prompt.
- **Whole-premise failure only** (the described bug isn't present in the code at all, no correct target exists anywhere, the entire change is a no-op): prefix the refined intent with `⚠️` and return a one-sentence explanation. This is the ONLY case that signals Phase 4 to stop — reserve it for when there's nothing salvageable to generate a prompt about.
- **Otherwise**: the refined intent may be a tightened restatement of the original intent (still domain-level).

This block is what Phase 4 renders as the prompt's intent — so it is the authoritative, post-correction version.

### Job 1: Verify ticket claims (skip if Raw ticket claims has no named symbols AND no scope statements)

Two kinds of claim to check; each has its own sub-type tag:

- **Named symbol claims** → `[verified:claim]` or `[mismatch:claim]`. For each file path / function / struct field / proto field in Raw claims, does it exist, and does the code at that location actually behave the way the ticket implies?
- **Scope statement claims** → `[verified:scope]` or `[mismatch:scope]`. For each scope statement in Raw claims (Non-goals, "do NOT change X", scope boundary phrases), is the boundary compatible with the real fix? If a scope statement says "do not change schema" but the fix requires a schema change, that's a `[mismatch:scope]`.

Emit one finding per claim with the correct sub-type. A mismatch here should also be reflected in the Refined intent — both channels fire together. Do NOT silently comply with an infeasible scope boundary; that hides the conflict from the user. The sub-type suffix is mandatory — Phase 4's Non-scope filter only operates on `[mismatch:scope]` entries.

### Job 2 (Discover missed functionality AND ticket-requested gaps)

Two kinds of finding count:
- **Missed**: ticket didn't mention this, but the fix needs it
- **Gap**: ticket explicitly asks for this, but the current code doesn't satisfy it yet

Do NOT plan the implementation. Do NOT report anything the ticket mentions AND the current code already fully satisfies — that's neither missed nor a gap.

Phase 1 has already paraphrased the ticket's explicit asks into layer 1's `This change:` bullets. Your job in this classification is to report what the TICKET DIDN'T ALREADY COVER or what the CURRENT CODE DOESN'T SATISFY, not to re-state the asks themselves.

Each finding gets a primary tag (one of the five below) PLUS optionally a `+breaking` modifier (orthogonal — lets ticket-requested or must-include items also route to the `Breaking changes` section). `+breaking` is the only modifier.

- `[ticket-requested]` — a **gap**: the ticket's own acceptance criteria or asks list already requires this; the current code just doesn't satisfy it yet. Emit only when you identify a specific gap beyond what the ticket's asks already describe literally (e.g. ticket says "add integration test coverage" and you found existing unit-style coverage at the service boundary — emit `[ticket-requested]` with that refinement). **Do NOT re-emit literal asks** — Phase 1 already paraphrases every explicit ask into `This change:` (and into `Breaking changes` when classified as breaking), so re-emitting them as `[ticket-requested]` produces duplicates. Tag `[ticket-requested +breaking]` in two cases: (a) the gap refinement itself is also an external-contract change beyond the literal ask; (b) the ticket asks for a literal breaking change (schema migration, proto renumber, RPC signature change) AND you can add code-grounded **Expand/Migrate/Contract phase** detail that Phase 1 couldn't supply — in this case the finding is a phasing refinement of the literal ask, and Phase 4 replaces Phase 1's phase-less bullet with this phased version (substance-based dedupe, so no duplicate). Phase 4 merges `[ticket-requested]` into `This change:` untagged; `+breaking` findings additionally route to `Breaking changes`.
- `[must-include]` — **missed**: not mentioned in the ticket, but the fix cannot land correctly without addressing this. (Example: a sibling code path has the same bug; a replacement getter has different nil semantics that the call site must decide.)
- `[breaking]` — the change modifies an external contract: proto field renumbering, nullability flip, error-code semantic change, RPC/GraphQL signature change, schema migration requiring Expand/Migrate/Contract phasing. Phase 4 renders these in the `Breaking changes` section with the required deployment phase.
- `[existing]` — pre-existing infrastructure the change should BUILD ON rather than recreate: merged prerequisite PRs, already-populated columns, already-defined helpers, feature flags already in place. Phase 4 renders these in the `Already in place` section. Only emit if the ticket didn't already mention it.
- `[adjacent]` — a quality improvement the reviewer could make while working here, but the ticket's bug would still be fixed without it. (Example: extracting a new accessor helper when direct field access would work; refactoring nearby unrelated code.)

**`+breaking` modifier**: append to `[ticket-requested]` or `[must-include]` when the finding is also an external-contract change. For `[ticket-requested +breaking]`: only when you found a GAP REFINEMENT beyond the ticket's literal breaking ask (Phase 1 already paraphrased literal asks into layer 1 — re-emitting produces duplicates). For `[must-include +breaking]`: when a discovered missed item is itself externally breaking (example: a discovered sibling API shape change that the fix needs). Phase 4 routes `+breaking`-modified findings to BOTH their primary section AND `Breaking changes + Expand/Migrate/Contract phase`, so rollout guidance is preserved without losing ticket provenance.

## Exploration strategy

1. Find the entry points (RPCs, mutations, handlers, store methods) most relevant to the intent
2. Trace shared dependencies (max 2 hops from entry points) — if function A is changing, what else calls A? What helper functions does A use that would also need updating?
3. Inspect request/response types, ent schemas, and proto messages for fields that exist but aren't populated or packed in the relevant code path
4. Check for existing infrastructure (store methods, DB columns, ent fields, feature flags, email templates) already in place that this change should build on rather than recreate
5. Identify upstream/downstream consumers — who calls this RPC or mutation? What GraphQL resolvers or other services wrap it?
6. Check for related openspec changes (in openspec/changes/) or recently merged PRs that represent prerequisite work already landed

## Scope discipline

**If Raw ticket claims includes a scope statement** ("scope boundary is X", "do NOT change Y", Non-goals), respect it as a default constraint. The rule differs by finding category:

- **When the boundary is FEASIBLE** (fix can land entirely inside): suppress ALL findings outside — including `[must-include]`, `[breaking]`, `[adjacent]`. The user drew the line deliberately, respect it.
- **When the boundary is INFEASIBLE** (fix genuinely requires crossing it): emit `[mismatch:scope]` with a one-sentence explanation of the scope-vs-code incompatibility (per Job 1 — always suffixed), AND continue emitting findings that the corrected fix needs — specifically `[must-include]` and `[breaking]` outside the boundary are still emitted (otherwise layer 1 loses required Expand/Migrate/Contract guidance). `[adjacent]` outside the boundary is still suppressed — those are nice-to-haves, not required for the fix.

In other words: when the boundary is wrong, required findings survive the boundary; nice-to-haves don't. The layer-2 ⚠️ warning tells the user why their boundary was over-ridden; the Refined intent and `Non-scope` filter both reflect the corrected scope.

The `[mismatch]` family (`[mismatch:claim]` or `[mismatch:scope]`) covers two cases: (a) the ticket names a symbol that doesn't behave as claimed — emit `[mismatch:claim]`; (b) the ticket declares a scope boundary that makes a correct fix impossible — emit `[mismatch:scope]`. The suffix is MANDATORY on every emitted tag — Phase 4 uses it to route the Non-scope filter. Never emit bare `[mismatch]`. Both are escape hatches against silent failure, neither aborts prompt generation on its own — only a whole-premise `⚠️ Refined intent` (Job 0) does.

## Output format

Return exactly this structure:

Refined intent:
  <2-3 sentences, DOMAIN-LEVEL only (no file paths, function names, struct fields, proto field numbers, or other code-level identifiers). Describe WHAT and WHY against the corrected target if a mismatch was found; otherwise a tightened restatement of the original intent. Prefix with ⚠️ and stop after one sentence if the whole premise fails.>

## Ticket-vs-code mismatches (skip if Raw ticket claims has no named symbols AND no scope statements — same condition as Job 1)
- [verified:claim] <symbol claim that the code confirms> — Evidence: <file:line snippet>
- [verified:scope] <scope statement that the fix can honor> — Evidence: <brief note>
- [mismatch:claim] <one-sentence explanation of the symbol claim that doesn't match code behavior> — Evidence: <file:line showing what's actually there>
- [mismatch:scope] <one-sentence explanation of why the fix requires crossing a stated boundary; include the exact scope statement text being contradicted so Phase 4 can filter it from Non-scope> — Evidence: <brief note>

The `:claim` vs `:scope` suffix is required — Phase 4 uses it to route: `[mismatch:scope]` entries drive the `Non-scope` filter (contradicted boundaries are stripped from layer 1); `[mismatch:claim]` entries never touch Non-scope. Both flow to layer 2's `⚠️ Ticket-vs-code mismatch` note.

Emit `[mismatch:scope]` for scope statements even when there are no named symbols — if a ticket says "do not change schema" but your intent refinement concluded that a schema change is required, that's a scope mismatch and must be reported here. Do NOT silently comply with an infeasible boundary.

## Ticket-requested findings
- [ticket-requested] <Description: DOMAIN-LEVEL — one-sentence statement without file paths, function names, struct fields, proto numbers, or identifiers. Say "current test coverage does not exercise the service boundary", not "TestFoo in csv_test.go is a unit test".> — Evidence: <file:line reference — NOT rendered in final prompt, only for parent-agent verification>

## Must-include discoveries
- [must-include] <Description: DOMAIN-LEVEL> — Evidence: <file:line reference>
- [must-include +breaking] <Description: DOMAIN-LEVEL, including Expand/Migrate/Contract phase — use this combo when a missed gap is also an external-contract change> — Evidence: <file:line reference>

## Breaking changes
- [breaking] <Description: DOMAIN-LEVEL, including which Expand/Migrate/Contract phase this change belongs to> — Evidence: <file:line reference>
- [ticket-requested +breaking] <Description: DOMAIN-LEVEL — ONLY when you found a specific GAP refinement beyond the ticket's literal breaking ask AND that refinement is itself externally breaking. Phase 1 already paraphrased literal breaking asks into the prompt; re-emitting them here produces duplicates. Include Expand/Migrate/Contract phase.> — Evidence: <file:line reference>

## Already in place
- [existing] <Description: DOMAIN-LEVEL — what pre-existing infrastructure the change should build on> — Evidence: <file:line reference>

## Adjacent findings
- [adjacent] <Description: DOMAIN-LEVEL> — Evidence: <file:line reference>

If a section is empty, include the heading with "(none)".

## Hard rules

- **Description must be domain-level.** Never name files, functions, struct fields, proto field numbers, or any code-level identifier in the Description. Save those for Evidence.
- **Evidence is code-level.** File paths, line numbers, snippets — this goes to the parent agent for verification; it is NEVER rendered in the final prompt.
- **Respect scope statements.** If Raw ticket claims says "don't change X", do not report findings about X unless the fix genuinely cannot land without crossing that boundary — in that case emit `[mismatch:scope]` with a one-sentence scope-vs-code explanation, never `[adjacent]`.
- **Do not plan implementation.** Report what needs attention, not how to do it.
- **One bug = one finding.** Don't fragment a single concern across multiple bullets.
```

## Parsing the output for Phase 4

- `Refined intent` block replaces the Phase 1 intent sentence inside the fenced prompt. If prefixed with ⚠️ (whole-premise failure), STOP — Phase 4 does not generate a prompt; the user sees the failure and must clarify the ticket.
- `[mismatch:claim]` and `[mismatch:scope]` findings render as a user-visible `⚠️ Ticket-vs-code mismatch` note OUTSIDE the fenced prompt block (layer 2). openspec never sees them. The Refined intent + bullets inside layer 1 already reflect the correction; the layer-2 warning is for the user to spot-check before running `opsx:new`. Additionally, `[mismatch:scope]` drives Phase 4's `Non-scope` filter: the contradicted scope statement is dropped from layer 1 so the prompt isn't self-contradictory.
- `[verified]` findings inform the wording of Phase 4's domain-level bullets but are NOT rendered as their own bullets.
- `[ticket-requested]` findings merge with the ticket's own ask bullets in `This change:` — drop the tag (the ticket wasn't "missing" this, the code just didn't satisfy it yet). If modified with `+breaking`, the finding also renders in `Breaking changes`.
- `[must-include]` findings render as `(discovered)` bullets in `This change:`. If modified with `+breaking`, the finding also renders in `Breaking changes`.
- `[breaking]` findings render in the `Breaking changes + Expand/Migrate/Contract phase` section of the fenced prompt. openspec needs these to design phased deployment. The section also receives `+breaking`-modified `[ticket-requested]` / `[must-include]` findings. If the section is empty after all sources, omit it.
- `[existing]` findings render in the `Already in place` section of the fenced prompt. openspec needs these to avoid recreating landed infrastructure. If there are none, omit the section.
- `[adjacent]` findings render as a user-visible `Related findings (out of requested scope)` note OUTSIDE the fenced prompt block (layer 2 per `output-format.md`). openspec never sees them. If there are none, omit the section entirely.
- Evidence fields are discarded before prompt rendering. They exist only so the parent agent can spot-check hallucinations.

## Dispatch instructions

```python
Agent(
    name="code-explorer",
    description="Discover missed functionality and verify ticket claims",
    subagent_type="Explore",
    prompt=<filled template above>,
    model="opus"
)
```

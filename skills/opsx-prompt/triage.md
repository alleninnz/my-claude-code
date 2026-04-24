# Triage — Narrow Mode Grounding Subagent

Dispatched when the user picks `Narrow` at the Phase 2 triage checkpoint. Goal: **ground the intent in real code symbols; don't hunt for missed functionality**.

**Precondition**: Narrow is only offered and dispatched when Raw ticket claims contains at least one named symbol OR at least one explicit scope statement. A ticket with only a domain-level intent and no concrete claims can't be grounded — Phase 2 hides the Narrow option for such tickets, so this subagent always has something to verify. If only scope statements exist (no named symbols), skip job 1's symbol portion and verify just the scope statements.

This is intentionally a different task from `code-exploration.md`. That one looks outward (callers, consumers, related infrastructure). This one looks inward (does the ticket's own claim hold up against the real code, and what are the exact names/paths for the change?).

## Prompt template

Fill in `{REPO_PATH}`, `{INTENT_SUMMARY}`, and `{RAW_CLAIMS}` before dispatching. `{RAW_CLAIMS}` comes from Phase 1 step 6 and contains two kinds of ticket statements:
- Named symbols (file paths, function names, symbol references) — for Narrow to verify
- Explicit scope statements (scope boundary phrases, Non-goals, "do NOT change X" clauses) — for Narrow to respect when refining the intent

If the ticket has neither kind, pass an empty block.

```
You are grounding a change intent in the real codebase at {REPO_PATH}. Do NOT hunt for missed functionality, upstream consumers, or breaking changes — that is a different task handled elsewhere.

## Change intent (domain-level)

{INTENT_SUMMARY}

## Raw ticket claims

{RAW_CLAIMS}

This block may contain three kinds of ticket statements, but Narrow only handles two of them:
- **Named symbols** (file paths, function names, proto fields, code snippets) — verify these against the repo.
- **Explicit scope statements** (scope boundary phrases, Non-goals, "do NOT change X" clauses) — respect these as default HARD boundaries, BUT also verify them: if light grounding shows the fix genuinely requires crossing one, emit a ⚠️ Verified entry for it (do not silently stay inside an infeasible boundary). If the crossing implies an external-contract change the ticket never classified as breaking (new schema, proto renumber, RPC shape change), the `[scope]` ⚠️ entry gets an additional flag `(implies-breaking)` — Phase 4 treats this as a STOP signal: do NOT generate a layer 1 prompt; instead re-present to the user with "Narrow grounding found an undeclared breaking change — please re-run with Full for Expand/Migrate/Contract phasing, or clarify the ticket". This prevents a silently under-specified prompt from reaching `opsx:new`.
- **Explicit asks** (acceptance criteria bullets, numbered deliverables) — **IGNORE these**. Narrow is a grounding pass, not a discovery pass; asks are Full mode's responsibility. Do NOT emit Verified entries for them, do NOT attempt to check whether the code satisfies them, do NOT spend file-read budget on them.

## Your two jobs

1. **Verify each claim** — each Verified entry must be prefixed `[claim]` (for a symbol) or `[scope]` (for a scope statement). The prefix is what Phase 4 uses to route; untagged entries cannot be routed correctly.
   - `[claim]`: does the named file / function / symbol / proto field actually exist and mean what the ticket implies? Report ✓ confirmed or ⚠️ with a one-sentence correction.
   - `[scope]`: is the boundary compatible with a correct fix? If light grounding shows the fix requires crossing the boundary, report ⚠️ with a one-sentence explanation of the scope-vs-code incompatibility. Do NOT silently stay inside — the user needs to see the conflict.
2. **Refine the intent** to reflect what you found. If a claim was wrong (symbol or scope), the refined intent should describe the change against the correct target / inside the corrected scope (still at domain level). If a scope boundary proved infeasible, the refined intent describes the fix as it actually needs to happen; the original (incompatible) scope statement surfaces only via the ⚠️ Verified entry.

Prerequisite: this subagent is only dispatched when Raw ticket claims contains at least one named symbol OR at least one explicit scope statement. If both are absent, Phase 2 hides the Narrow option from the user (Narrow has nothing concrete to verify); you should never receive a fully-empty block here. If you somehow do, return `Refined intent:` = original intent summary verbatim and empty `Verified:`; do NOT attempt to scan code to invent grounding. Scope-only tickets are valid: skip the symbol portion of job 1 and verify just the `[scope]` claims.

## Hard limits

- Max 10 file reads
- No recursion into callers or consumers of the named symbols
- Do NOT search for related functionality the intent didn't mention
- Do NOT perform deep breaking-change analysis (no Expand/Migrate/Contract phasing, no rollback safety analysis, no version-skew modeling — those belong to Full). BUT: if you notice that crossing a declared scope boundary would alter an external contract (schema change, proto renumber, RPC signature change), emit `[scope] ⚠️ (implies-breaking)` per the output schema — this is a STOP signal for Phase 5, not a breaking-change analysis.
- Do NOT sweep `openspec/changes/` or recent merged PRs

If a limit forces you to stop short, say so in the output — don't widen scope to compensate.

## Output format

Return exactly this structure, nothing else:

Refined intent:
  <2-3 sentences, DOMAIN-LEVEL only. Do NOT include file paths, function names, struct fields, proto field numbers, or other code-level identifiers here — the final prompt excludes them by rule, so anything you write here that names a symbol will be stripped or cause re-work. Describe WHAT and WHY in plain language.>

Verified:
  - [claim] <plain-language restatement of one symbol claim> ✓ <optional: the actual symbol you confirmed, as evidence — Verified IS allowed to name symbols, it's evidence not prompt content>
  - [scope] <plain-language restatement of one scope statement> ✓ <optional: brief note>
  - [claim] <a symbol claim that was wrong> ⚠️ <one-sentence correction, optionally naming the correct symbol>
  - [scope] <a scope statement that the fix cannot honor> ⚠️ <one-sentence explanation: why the boundary is infeasible>
  - [scope] <a scope statement whose crossing would alter an external contract — schema/proto/RPC shape> ⚠️ (implies-breaking) <one-sentence explanation: what contract would break; Phase 5 treats this flag as a STOP signal and recommends Full>
  ...

The `[claim]` / `[scope]` prefix is mandatory on every Verified entry. Phase 4's `Non-scope` filter drops only contradicted boundaries, so it must be able to tell a symbol mismatch from a scope mismatch — untagged ⚠️ entries cannot be routed correctly.

(Leave the `Verified:` list empty if `Raw ticket claims` was empty.)

## Handling ticket errors

If the premise of the ticket is materially wrong as a whole (the entire described bug isn't present in the code, the primary target doesn't exist and no nearby equivalent exists, etc.), mark the refined intent itself as ⚠️ and STOP. Do not try to salvage by broadening scope, inferring a different target, or searching for what the ticket "must have meant".

Return:

Refined intent:
  ⚠️ Unable to ground — <one-sentence explanation of the mismatch>

Verified:
  - [claim] <the specific false claim> ⚠️ <what you actually found>
```

## Dispatch instructions

```python
Agent(
    name="intent-grounder",
    description="Ground intent in real code symbols",
    subagent_type="Explore",
    prompt=<filled template above>,
    model="sonnet"
)
```

## Parsing the output for Phase 4

- The `Refined intent` block replaces the intent sentence in the generated prompt (layer 1 — inside the fenced block). It must be domain-level; if the subagent accidentally included symbols, strip them.
- Every `Verified` entry is prefixed `[claim]` or `[scope]`. The prefix is what Phase 4 uses to route — do NOT discard it.
- `Verified [claim]` / `[scope]` ✓ entries inform the wording of Phase 4's domain-level "This change:" bullets (they ground the prompt in what actually exists). They are NOT rendered as their own bullets — the no-code-level-references rule still holds inside layer 1.
- `Verified [claim]` ⚠️ entries render as a user-visible `⚠️ Ticket-vs-code mismatch` note in layer 2 (OUTSIDE the fenced prompt block) AND trigger Phase 4's `This change:` / `Breaking changes` filter — drop or rewrite any layer 1 bullet whose substance matches the wrong-symbol claim, so the prompt doesn't ask opsx:new to modify the wrong target while the refined intent points elsewhere.
- `Verified [scope]` ⚠️ entries render the same way in layer 2 AND trigger Phase 4's `Non-scope` filter — drop the matching scope statement from layer 1 so the prompt is not self-contradictory.
- Layer 2 may contain the corrected symbol names; layer 1 never does. The user sees the discrepancy before deciding whether to run `opsx:new`; openspec never sees these entries.
- If the `Refined intent` itself is ⚠️ (whole-premise failure), STOP — do not generate a prompt at all. Re-present the mismatch to the user; the ticket needs clarification first.

---
name: opsx-prompt
description: >
  Use when generating an opsx:new prompt from a Linear issue or free description.
  Triggers: "generate opsx prompt", "opsx prompt for APP-XXXXX", or when the user
  needs help writing an opsx:new change description.
  Do NOT use for generating design, tasks, or specs (those are openspec's job).
---

# OpenSpec Prompt Generator

Generate intent-focused prompts for `opsx:new` by combining Linear issue context with code exploration (scaled to the ticket's complexity) to produce a prompt that openspec can expand into a proposal/design/tasks without guessing scope.

**Core value:** For ambiguous or broad tickets, the `Full` exploration surfaces related functionality the issue author didn't think of — shared functions used by multiple RPCs, response fields that exist but aren't populated, store queries that need expanding, existing infrastructure the change should build on. For tight, well-scoped tickets, a `Narrow` grounding pass just anchors the intent to real symbols and skips the sweep. The user chooses depth at the Phase 2 checkpoint.

## Input

- **Issue ID** — matches `APP-\d+` (e.g., `APP-21594`). Read via `linear-cli:linear-cli` skill (preferred) → Linear MCP tools (fallback). If neither is available, tell the user and exit.
- **Free description** — anything else. Accept as-is.
- **No argument** — ask what the user wants to build.

## Workspace Resolution

Workspace root: `~/.caruso/config.yaml` → `workspace_path`. Fallback: walk up from cwd to find `openspec/`; use its parent.

Target repo: parse service name from issue title (`service-name | description` convention). If unclear, infer from issue body or ask.

---

## Phase 1: Extract Intent

Produce an intent summary (WHAT + WHY, no HOW).

**Issue ID mode:**

1. Fetch the issue: try `linear-cli:linear-cli` skill first, fall back to Linear MCP tools (`get_issue` with `includeRelations: true` + `list_comments`). If neither is available, tell the user "Linear integration not found — please paste the issue description" and exit.
2. Fetch related issues (1 level deep only, including parent/sub-issues) for context
3. **Check attachments for linked PRs** — identify already-completed work (e.g., schema PR merged). This becomes the "Already in place" section.
4. Extract WHY (business problem) and WHAT (desired outcome, distinguishing done vs remaining) into the intent summary
5. **Keep implementation details out of the intent summary** — function names, file paths, proto field numbers, code blocks don't belong here. Phase 4 generates a prompt that excludes code-level references by rule, regardless.
6. **Preserve concrete ticket statements in a `Raw ticket claims` block** — include three kinds. **Symbols and asks are NOT mutually exclusive**: if an explicit ask names an RPC / field / proto / helper (e.g. "rename `UnitPrice` to `CompletedUnitPrice`"), the symbol goes in BOTH the Named symbols sub-block (so Job 1 verifies it) AND the Explicit asks sub-block (so the deliverable is preserved). Apply this extraction rule across the entire ticket — narrative, acceptance criteria, examples, whatever.
   - **Named symbols**: file paths, function names, symbol references, proto field numbers, code snippets the ticket mentions ANYWHERE. Used by subagents to verify: does the named thing exist and mean what the ticket implies?
   - **Explicit scope statements**: quoted phrases like "the correct scope boundary is X", "do NOT change Y", Non-goals sections, out-of-scope clauses. Used by subagents to **respect** the line the ticket draws; also paraphrased by Phase 4 into layer 1's `Non-scope` section.
   - **Explicit asks**: the ticket's acceptance criteria bullets, numbered-list requirements, "must support X" clauses, and any other concrete deliverable it calls for. Each ask gets a tentative classification at extraction time — `breaking` (ticket explicitly names a public proto / GraphQL schema / RPC signature / error-code contract, or explicitly says "migration required") vs `breaking-uncertain` (ticket uses ambiguous phrasing like bare "rename X to Y" where X might be internal OR external) vs `non-breaking`. Phase 1 cannot ground this against code, so uncertain cases stay uncertain — Narrow/Skip render uncertain asks with `(breaking classification uncertain — run Full for confirmation)` appended; Full overrides the tentative label based on real code (its `[breaking]` / `[ticket-requested +breaking]` findings supersede). Phase 4 ALWAYS paraphrases all asks into layer 1's `This change:` bullets (domain-level, untagged) regardless of triage mode — they are part of what the ticket asks for, so they survive Narrow and Skip paths where no subagent looks for them. Breaking asks are ADDITIONALLY paraphrased into `Breaking changes + Expand/Migrate/Contract phase` (all modes — Narrow and Skip get rollout guidance from Phase 1 classification; Full refines the phase annotation if it has more detail). Passed into Full mode so it can (a) avoid re-tagging asks as `[ticket-requested]` (they're already rendered by Phase 1) and (b) refine the Expand/Migrate/Contract phasing on breaking asks with code-grounded detail — but Full should NOT re-emit literal asks as `[ticket-requested +breaking]` unless it has a gap refinement; that would duplicate.
   
   This block is passed to BOTH Phase 3 Full and Narrow subagents (scope discipline, claim verification, and ticket-ask awareness serve different modes). Raw claims itself is never rendered verbatim into Phase 4's generated prompt body — only paraphrased into layer 1 sections (`This change:` for asks, `Non-scope` for scope statements). If the ticket has no such concrete statements, the block is empty.

**AI-generated issue detection:** If the description contains code blocks, file paths, function signatures, or step-by-step instructions, extract the goal behind the detail for the intent summary; stash the concrete claims (all three kinds — symbols, scope statements, AND explicit asks) in `Raw ticket claims` so both subagent modes can use them and Phase 4 can populate `This change:` / `Breaking changes` from the asks.

**Free description mode:** Accept as-is. If it contains implementation detail, ask for the high-level goal; stash any concrete claims the user provides in `Raw ticket claims`.

---

## Phase 2: Triage Checkpoint

Deep exploration is not always warranted. Show the user what's been extracted plus the Linear signals that might inform depth, and let them pick.

**Pre-flight block format** (print before asking):

```
## Intent
<2-3 sentence intent summary from Phase 1>

## Linear signals
- Estimate: <N points or "—">
- Labels: <comma-separated or "—">
- Priority: <Urgent/High/Medium/Low or "—">
- Repo: <inferred from title>
- Linked PRs: <count; list URLs if > 0>
- Parent: <APP-XXXXX (title) or "—">
```

Free-description mode: omit the `## Linear signals` block; show only intent.

**Ask via `AskUserQuestion`** — Header: `Exploration depth`, Choices:

- `Full` — 6-step Explore subagent (opus, ~30–60s). Finds missed functionality, upstream/downstream consumers, breaking changes. Default when unsure.
- `Narrow` — Shallow subagent (sonnet, ~10–20s). Grounds intent in real code symbols; verifies ticket's named files/functions AND explicit scope statements; no upstream/downstream sweep. **Only offered if Raw ticket claims contains at least one named symbol OR at least one explicit scope statement** — Narrow's value is claim verification (symbol and scope), so on tickets with only a domain-level intent (no named symbols and no scope statements), Narrow has nothing concrete to ground and is omitted from the choices.
- `Skip` — No exploration. Intent proceeds as-is. Prompt will be annotated `(no code exploration — ticket scope trusted as-stated)`.

**Signals are displayed, not auto-decided.** Do not preselect based on heuristics; default highlight is always `Full` (safest). The user is the one reading the ticket — they judge clarity. There is no auto-skip — even non-backend tickets go through the checkpoint; the user picks `Skip` themselves.

Record the chosen depth; Phase 3 branches on it.

---

## Phase 3: Code Exploration

Behavior depends on the Phase 2 triage choice:

- **Full**: Dispatch the Explore subagent per `code-exploration.md` (model `opus`). Pass `{REPO_PATH}`, `{INTENT_SUMMARY}`, AND `{RAW_CLAIMS}` (named symbols for verification, scope statements for discipline, explicit asks for ticket-ask detection). Returns `Refined intent` (domain-level, reflects any corrections from claim verification) + discoveries grouped `[ticket-requested]` / `[must-include]` / `[breaking]` / `[existing]` / `[adjacent]` + claim checks tagged `[verified:claim]` / `[verified:scope]` / `[mismatch:claim]` / `[mismatch:scope]` (sub-type is mandatory — Phase 4's Non-scope filter only operates on `:scope` entries). Each finding has `Description` (domain-level) and `Evidence` (code-level, not for prompt body).
- **Narrow**: Dispatch the shallow grounding subagent per `triage.md` (model `sonnet`). Pass `{REPO_PATH}`, `{INTENT_SUMMARY}`, AND `{RAW_CLAIMS}`. Returns a `Refined intent` + `Verified:` list.
- **Skip**: No subagent. Proceed with Phase 1 intent unchanged.

**Full-mode handling**:
- `Refined intent` — replaces the Phase 1 intent summary inside the fenced prompt. Full's refined intent reflects any mismatches the subagent caught (the intent is rewritten against the correct target when a claim was wrong). Same pattern as Narrow. **Sanitize before inserting into layer 1**: if the Refined intent slipped in code-level identifiers (file paths, function names, struct fields, proto numbers), paraphrase to domain level; drop identifiers that can't be paraphrased without losing meaning. Same rule triage.md already enforces on Narrow.
- `[ticket-requested]` findings — current code doesn't satisfy something the ticket explicitly asked for. Merge with issue points; do NOT tag `(discovered)`.
- `[must-include]` findings — missed scope the fix genuinely needs. Render as `(discovered)` bullets in `This change:`.
- `[breaking]` findings — external-contract changes (proto renumber, nullability flip, RPC signature change, schema migration). Render in the `Breaking changes + Expand/Migrate/Contract phase` section of the fenced prompt.
- `[existing]` findings — pre-existing infrastructure to build on, not recreate. Merge with Phase 1's linked-PR context and render in the `Already in place` section of the fenced prompt.
- `[adjacent]` findings — optional quality improvements. Render as user-visible note OUTSIDE the fenced block (layer 2). NOT part of the opsx:new prompt.
- `[verified]` entries — ticket claims confirmed. Inform bullet wording only; not rendered as their own bullets.
- `[mismatch]` entries — ticket claims contradict code (claim-vs-code) or ticket scope incompatible with code (scope-vs-code). The fenced prompt already reflects the correction through `Refined intent` and the domain-level bullets. The raw mismatch text (with code-level symbols) renders as user-visible `⚠️ Ticket-vs-code mismatch` note OUTSIDE the fenced block (layer 2) so the user can decide whether to re-scope before running `opsx:new`.
- If the subagent returns nothing in any group AND no Refined intent, proceed with just the Phase 1 intent summary.

**Narrow-mode handling**: always pass the `Refined intent` to Phase 4, even when every `Verified` entry is ✓. The grounded intent is the value, not the checkmarks. Narrow results don't need further filtering — scope is enforced by the subagent's prompt.

---

## Phase 4: Generate Prompt

Merge intent + Phase 3 output. Read `output-format.md` for the prompt template.

**Rules for functionality points:**

- One sentence each, WHAT not HOW
- **Domain-level facts allowed** ("DB columns for calculation method exist from admin path") — **code-level references not allowed** ("column at `ent/schema/redemption_order.go:45`")
- Issue points first, then Full-mode `[must-include]` subagent discoveries tagged `(discovered)`
- No limit on number of points — constrain detail level, not quantity

**Reader pass — defense against subagent mis-tagging, applied to every finding (and to the Refined intent) before rendering:**

1. **Code-level language check (layer 1 only)**: If content going into layer 1 — Refined intent, or any finding's Description — names files, functions, struct fields, proto field numbers, or other identifiers, paraphrase to domain level. Evidence fields stay behind for verification — never render them in layer 1. Layer 2 sections MAY contain identifiers, since they are not sent to opsx:new.

   **Failure paths** (different by finding severity):
   - **Optional `[adjacent]` finding**: this rule does NOT apply — `[adjacent]` goes to layer 2 where code-level identifiers are explicitly allowed. Render as-is in `### Related findings` with symbol names intact. Do NOT sanitize adjacent items.
   - **Required finding** (`[must-include]`, `[breaking]`, `[existing]`, `[ticket-requested]`, including any with `+breaking`): if it can't be paraphrased without code-level identifiers, do NOT silently drop — the ticket needs this and the user should know. Surface it in layer 2 under `### ⚠️ Un-sanitizable findings (NOT sent to opsx:new — review before running)` with the raw Evidence intact, AND include a top-of-layer-1 note `⚠️ N required finding(s) deferred to layer 2 — the prompt is under-specified without them`. **BLOCKING**: Phase 5 must remove the `Run opsx:new` option from its AskUserQuestion when any un-sanitizable required finding exists — only `Edit prompt` and `Just copy` remain. User must manually incorporate the deferred findings (or edit the prompt) before this prompt can reach `opsx:new`. This prevents silent under-specification.
   - **Refined intent**: do NOT fall back to the Phase 1 intent — if the subagent produced a Refined intent specifically BECAUSE the Phase 1 intent had the wrong target, reverting would send the known-wrong scope to `opsx:new` while the correction survives only in the layer-2 ⚠️ note. Instead, STOP prompt generation and re-present the un-sanitizable Refined intent + the ⚠️ Ticket-vs-code mismatch to the user. They can edit the intent manually or re-run opsx-prompt after clarifying the ticket.
2. **Tag sanity check** — bidirectional. Re-examine each tag against its definition; re-tag if wrong. Common corrections:
   - `[must-include]` → `[adjacent]` (demote): fix would still work without it
   - `[ticket-requested]` → `[must-include]` or `[adjacent]` (rewrite): ticket doesn't actually ask for it
   - `[must-include]` → `[must-include +breaking]` (add modifier): describes an external-contract change (proto renumber, schema migration, RPC/GraphQL signature change) — the modifier routes the finding into BOTH `This change:` (as `(discovered)`) AND `Breaking changes + Expand/Migrate/Contract phase`. Do NOT replace with bare `[breaking]`; that drops the scope bullet.
   - `[ticket-requested]` → `[ticket-requested +breaking]` (add modifier): same pattern for ticket-requested asks that are also breaking.
   - `[must-include]` or `[adjacent]` or `[must-include +breaking]` → `[existing]` (promote): describes pre-existing infrastructure already landed (merged prerequisite, populated column, existing helper) that the change should build on, not rebuild. When promoting to `[existing]`, strip any `+breaking` modifier — already-landed infrastructure is not a rollout concern; keeping `+breaking` would incorrectly route it into `Breaking changes`.
   - `[adjacent]` → `[must-include]` (promote): discovery is actually required for the fix to land correctly
   Subagents can mis-classify in any direction; the reader pass corrects without bias. `+breaking` is preserved across most re-tagging (add if missing, keep if present) EXCEPT when promoting to `[existing]` — landed prerequisites aren't breaking by definition. Do not strip `+breaking` in other corrections.
3. **Layer routing**: route each finding per its final tag (see `output-format.md` → "Tagging by triage mode"). Layer 1 for `[ticket-requested]` / `[must-include]` / `[breaking]` / `[existing]`; layer 2 for `[adjacent]` / `[mismatch:claim]` / `[mismatch:scope]` / Narrow's `Verified` ⚠️. Findings with the `+breaking` modifier route to BOTH their primary layer-1 section AND `Breaking changes`.

Apply all three checks in order; a single finding may be modified by 1, re-tagged by 2, and routed by 3.

**Section sources in layer 1:**

- `Already in place`: merged from Phase 1's linked-PR context (always, regardless of triage mode) AND Full-mode `[existing]` findings. Omit only if both are empty.
- `Non-scope`: paraphrased from (a) Raw ticket claims' scope statements (Non-goals, "do NOT change X", explicit scope-boundary phrases) and (b) any Non-scope language already present in the issue body. Domain-level only, code-level identifiers stripped. This channel ensures scope constraints still reach `opsx:new` even though Raw claims itself is never rendered. **Filter (applies to BOTH sources)**: drop any scope statement — whether originally from Raw claims or from the issue body — whose substance matches a `[mismatch:scope]` finding (Full) or a `[scope]` ⚠️ Verified entry (Narrow). The filter matches on paraphrased substance, not verbatim text. It considers ONLY scope-type mismatches; `[mismatch:claim]` and `[claim]` ⚠️ entries are about wrong symbol names and never affect Non-scope. The contradicted boundary still surfaces in layer 2's `⚠️ Ticket-vs-code mismatch` for user visibility.
- `This change:`: issue points (from the issue body) + Raw claims' explicit asks paraphrased to domain-level (always included, all modes) + Full-mode `[ticket-requested]` (untagged — these are GAP refinements beyond the literal asks) + Full-mode `[must-include]` tagged `(discovered)`. Full-mode findings with the `+breaking` modifier render here AND in `Breaking changes`. **Deduplication (by substance, across all three sources)**: issue points and explicit asks both come from the same ticket body, so direct merge duplicates acceptance-criteria bullets; additionally, Full's `[ticket-requested]` findings (gap refinements) can substantively match explicit asks. Before rendering, dedupe every pair by domain-level substance and keep the MOST SPECIFIC formulation: prefer Full-mode refinement > explicit ask paraphrase > issue point. **Already-satisfied filter**: drop any bullet whose substance matches an item in `Already in place` (either Phase 1 linked-PR context showing the work has landed, or Full-mode `[existing]` finding). The same deliverable should not appear as both completed (in `Already in place`) and still-requested (in `This change:`) — that would send `opsx:new` to re-plan landed work. If every source is fully covered by `Already in place`, the ticket is effectively done; Phase 5 surfaces this to the user rather than generating a trivial prompt. **Filter (mirrors Non-scope)**: for any bullet — issue point or explicit-ask paraphrase — whose substance matches a `[mismatch:claim]` finding (Full) or a `[claim]` ⚠️ Verified entry (Narrow): try to rewrite against the subagent's corrected target. If rewrite is possible, replace the bullet. If rewrite is NOT possible (corrected target unclear, or subagent only flagged the mismatch without identifying a valid replacement), **STOP** — do NOT silently drop a required deliverable. Phase 5 treats this as a hard stop (same path as un-sanitizable Refined intent): present the original bullet + the mismatch to the user with "Ticket's core deliverable cannot be mapped to a valid target — clarify the ticket and re-run".
- `Breaking changes + Expand/Migrate/Contract phase`: domain-level paraphrases of Phase 1's `breaking` AND `breaking-uncertain` explicit asks + Full-mode `[breaking]` findings + any `+breaking`-modified `[ticket-requested]` / `[must-include]` findings (gap refinements OR phasing refinements of literal asks). **Full-mode override**: when Full runs, its grounded findings authoritatively replace Phase 1's pre-grounding tentative classifications ONLY when Full produces an explicit signal. (a) For any Phase 1 breaking ask whose substance matches a Full-mode `[breaking]` or `+breaking` finding — drop the Phase 1 bullet in favor of Full's (Full has phasing Phase 1 couldn't supply). (b) For Phase 1 asks that Full explicitly confirms non-breaking: Full must emit a `[verified:claim]` or `[verified:scope]` entry noting "confirmed non-breaking" — only then drop from `Breaking changes`. Silent Full passes do NOT count as confirmation (code-exploration.md tells Full not to re-emit literal asks without refinements, so silence is ambiguous). (c) For Phase 1 `breaking-uncertain` asks where Full is silent, KEEP the bullet with the uncertainty suffix — silence leaves the guess standing. (d) In Narrow/Skip modes (no Full grounding), keep all Phase 1 bullets with uncertainty suffixes per output-format.md. **Already-satisfied filter (mirrors `This change:`)**: drop any breaking bullet whose substance matches an item in `Already in place` — same reasoning, landed schema/proto migrations shouldn't re-appear as planned rollout work. **Filter (mirrors `This change:` and `Non-scope`)**: for any breaking bullet whose substance matches a `[mismatch:claim]` finding (Full) or a `[claim]` ⚠️ Verified entry (Narrow): try to rewrite against the corrected target AND re-evaluate the breaking classification — if the corrected target is non-breaking (internal helper, not a public contract), move the rewritten bullet to `This change:` rather than keeping it here. If rewrite is NOT possible, apply the same **STOP** rule as `This change:` — the ticket's rollout-sensitive deliverable cannot be mapped to a valid target, so don't generate a prompt that silently omits it. In Narrow mode specifically, a plain `[claim]` mismatch on a breaking ask also triggers STOP if it would leave `Breaking changes` empty (Narrow has no `+breaking` findings to fall back on). Omit the section only when all sources were legitimately empty (not when filter dropped everything).

**Mode-specific annotations:**

- **Full**: the Full subagent's `Refined intent` replaces the Phase 1 intent sentence in the fenced prompt. `[breaking]` and `[existing]` findings render inside the fenced prompt in their named sections (merged with Phase 1 linked-PR context for `Already in place`). `[verified]` entries inform bullet wording only. `[adjacent]` and `[mismatch]` findings render as user-visible notes OUTSIDE the fenced prompt block (layer 2 per `output-format.md`); they are NOT part of what `opsx:new` consumes.
- **Narrow**: replace the issue's original intent sentence with the `Refined intent` returned by the subagent. `Verified` ✓ entries inform the wording of the domain-level bullets (they ground the prompt in what exists) but are NOT rendered as their own bullets — the no-code-level-references rule still holds. `Verified` ⚠️ entries render as a user-visible `⚠️ Ticket-vs-code mismatch` note OUTSIDE the fenced block (layer 2) — NOT in the prompt opsx:new consumes. The refined intent already reflects the correction; the ⚠️ note exists so the user can decide whether to re-scope. If the `Refined intent` itself is ⚠️ (the ticket's premise doesn't hold), STOP — do not generate a prompt; re-present the mismatch to the user.
- **Skip**: add a top-of-prompt line `(no code exploration — ticket scope trusted as-stated)` inside the fenced block.

---

## Phase 5: Present & Act

**STOP check first**: if an earlier phase signaled a hard stop, do NOT render a fenced prompt. Hard-stop conditions:
- Full or Narrow subagent returned a `⚠️ Refined intent` whole-premise failure
- Phase 4's reader pass couldn't sanitize the Refined intent per step 1's failure path
- Narrow returned a `[scope] ⚠️ (implies-breaking)` entry (breaking change discovered beyond ticket's declared scope — Narrow can't supply Expand/Migrate/Contract phasing)
- Phase 4's `This change:` filter couldn't rewrite a claim-mismatched bullet against a valid corrected target (ticket's core deliverable is un-mappable)
- Phase 4's `Breaking changes` filter couldn't rewrite a claim-mismatched bullet against a valid corrected target, OR Narrow mode's plain `[claim]` mismatch on a breaking ask would leave `Breaking changes` empty (no `+breaking` findings to fall back on)

When any of these fire:
- Show the user WHICH stop condition triggered and WHY, with the specific content:
  - ⚠️ Refined intent (whole-premise failure): render the Refined intent text + any layer 2 mismatch notes
  - Unsanitizable Refined intent: render the un-paraphrasable Refined intent (with its code-level identifiers kept, since layer 1 is not being generated) + the mismatch notes
  - `[scope] ⚠️ (implies-breaking)`: render the specific Verified entry — which scope boundary was infeasible AND what external contract would break if the fix crossed it — so the user knows exactly what needs clarification or Full-mode re-run
  - `This change:` / `Breaking changes` claim-mismatch with no valid rewrite: render the original bullet that couldn't be mapped + the `[mismatch:claim]` / `[claim]` ⚠️ entry showing what's wrong
- Skip the `AskUserQuestion` for `Run opsx:new` / `Edit prompt` / `Just copy` — there is no prompt to run or copy
- Tell the user: "Ticket needs clarification before opsx-prompt can generate a valid prompt. Review the specific stop reason above and either update the ticket, re-run with Full mode (if the reason was `(implies-breaking)` or a mismatch Narrow can't resolve), or clarify the ambiguous claim."
- End the skill here.

Otherwise, proceed with the normal flow:

1. Display the prompt in a fenced code block (layer 1 — this is what `opsx:new` consumes)
2. Render layer 2 sections AFTER the fenced block (user-visible only; never included in what `opsx:new` receives). Include each only if it has content:
   - `### ⚠️ Ticket-vs-code mismatch (NOT sent to opsx:new — review before running)` — populated from Full `[mismatch:claim]`/`[mismatch:scope]` findings and Narrow `Verified` ⚠️ entries
   - `### ⚠️ Un-sanitizable findings (NOT sent to opsx:new — review before running)` — populated from required findings that Phase 4's reader pass couldn't paraphrase to domain level (see Phase 4 step 1 failure paths)
   - `### Related findings (out of requested scope — NOT sent to opsx:new)` — populated from Full `[adjacent]` findings
3. `AskUserQuestion` — Header: `Next step`, Choices:
   - `Run opsx:new — Create the openspec change and start the proposal` **— OMIT this choice if any `⚠️ Un-sanitizable findings` are present in layer 2. The prompt is under-specified without them; user must Edit or Copy and incorporate manually.**
   - `Edit prompt — Modify before proceeding`
   - `Just copy — I'll use it manually`
4. **Run opsx:new**: derive kebab-case name from title → `opsx:new <name>` → `opsx:continue` with the fenced-block prompt (layer 1) as context. Adjacent findings (layer 2) are NOT passed in.
5. **Edit prompt**: let user modify, re-present, ask again
6. **Just copy**: done

---

## Edge Cases

- **No argument provided**: Ask "What change do you want to generate a prompt for? Provide a Linear issue ID (e.g., APP-21594) or describe the change."
- **Issue has sub-issues**: Read parent + sub-issues as part of "related issues (1 level deep)" to understand full scope, but generate one prompt for the specific issue given
- **Issue is already done** (status = Done/Merged): Note this to the user, ask if they still want a prompt (useful for generating openspec retroactively for documentation)
- **Issue spans multiple repos**: Note the repos and deployment order in the prompt; generate one prompt (openspec handles per-repo change creation)
- **No code to explore** (pure frontend, infra, or docs change): Phase 2 still shows the checkpoint; the user picks `Skip`. The prompt gets the standard `(no code exploration — ticket scope trusted as-stated)` annotation.
- **Target repo not found** in workspace: Ask the user for the correct repo path — unless Phase 2 already resolved to `Skip`, in which case no subagent will dispatch and no code is read. In Skip mode, proceed with prompt generation without blocking on repo resolution (the prompt is intent-only and doesn't need a repo path).

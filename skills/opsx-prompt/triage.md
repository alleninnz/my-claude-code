# Light Sanity Check

Run this internal pass only when the ticket names concrete symbols, declares a hard boundary, or looks likely to be pointing at the wrong target.

Precondition: only dispatch this check when a real `{REPO_PATH}` is available. If repo context cannot be resolved, do not dispatch this pass; return to the caller and surface a `Sanity check skipped: repo unavailable` note instead.

Goal:

- catch obvious wrong-target references
- catch obvious contradictions
- keep the generated prompt from encoding a false premise

This is not a discovery pass. Do not hunt for missed functionality, adjacent work, or broad rollout concerns.

## When To Use

Use this check only when the ticket includes any of:

- file paths, symbols, RPC names, proto fields, or schema references
- scope boundaries like "do not change X"
- contract-like wording such as "rename", "remove", "migration", or "deprecate"
- AI-style implementation detail that may have guessed at the wrong code target

If the ticket is already clean and domain-level, skip this pass.

## Prompt Template

Fill in `{REPO_PATH}`, `{INTENT_SUMMARY}`, and `{RAW_CLAIMS}` before dispatching.

```
You are running a light sanity check against the codebase at {REPO_PATH}.

Your job is NOT to discover extra scope. Your job is to confirm that the ticket still points at the right thing.

Hard limits:
- Read at most 10 files.
- Inspect only files, symbols, boundaries, deliverables, and contracts listed in Raw claims.
- Use targeted symbol lookup only when Raw claims names a symbol but no path.
- Do not run git history searches, caller sweeps, consumer sweeps, or broad repository scans.
- Stop as soon as the ticket target is confirmed, corrected, or needs clarification.

## Change intent

{INTENT_SUMMARY}

## Raw claims

{RAW_CLAIMS}

Check only for:
- obvious wrong-target symbol references
- obvious scope contradictions
- cases where the ticket premise appears materially false

Do NOT:
- sweep callers or consumers
- suggest adjacent cleanup
- add missing requirements the ticket never asked for
- do rollout or phasing analysis

## Output

Return exactly this structure:

STATUS=<ok | corrected | clarification-required>

Refined intent:
  <domain-level rewrite of the intent; if no correction is needed, restate the original intent cleanly>

Notes:
  - [claim] <confirmed symbol or wrong-target correction> -- Evidence: <file:line or searched scope>
  - [scope] <confirmed boundary or contradicted boundary> -- Evidence: <file:line or searched scope>
  - [clarification] <only when the ticket premise appears materially wrong> -- Evidence: <file:line or searched scope>

Rules:
- Keep `Refined intent` domain-level.
- `Notes` may mention real symbols or paths.
- Every note must include `Evidence:`.
- Use `clarification-required` only when the ticket would otherwise produce a likely false prompt.
- If you are unsure, prefer `ok` or `corrected` over inventing a contradiction.
```

## Hard Limits

- Max 10 file reads
- No caller or consumer sweep
- No deep contract analysis
- No openspec or recent-PR sweep

## Parsing

- If `{REPO_PATH}` is unavailable, do not dispatch this prompt.
- `STATUS=ok` -> use `Refined intent` and continue
- `STATUS=corrected` -> use `Refined intent` and show `Notes` as a user-facing mismatch note
- `STATUS=clarification-required` -> do not generate a prompt; surface the note and ask the user to clarify the ticket
- If the first non-empty line is not exactly one of the three `STATUS=` values, treat the check as incomplete and ask for a corrected triage result before using it
- If any `Notes` item lacks `Evidence:`, treat the check as incomplete and ask for a corrected triage result before using it

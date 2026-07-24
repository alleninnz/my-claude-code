---
name: vertical-slice
description: >
    Use when starting a Linear ticket, project, or any multi-layer/multi-repo change,
    before writing code — when deciding how to break the work into parts, PRs, or
    milestones to implement and review one at a time, or when asked to keep PRs
    small or show steady progress. Skip for single-step fixes.
---

# Vertical Slice

## What a slice is

A slice is the **smallest increment of capability whose merge you can observe**. Slice by capability — a verb someone gains ("tenant can edit footers", "emails render the footer") — not by layer (store, proto, RPC, helper, hook, wiring).

**Violating the letter of this rule is violating the spirit of this rule.**

## The merge-state test

Write one sentence per slice: *"After this merges, ___."* The blank must name something observable:

- **a behaviour** — a user or calling service gets a different result, or
- **an exercisable contract** — an interface something *outside this ticket* can drive today: a gRPC/GraphQL API via grpcurl/bruno, a shared component another project consumes via Storybook.

"The store exists and is unused", "tested dead code", "mounted nowhere", "nothing calls it yet" — all **fail**. Unit tests on a private helper are not an exercisable contract. A failing part is not a slice: **fold it into its consumer.**

## How to slice a ticket

1. List the capabilities the ticket delivers, as verbs someone gains.
2. Make each capability a slice. Order them: riskiest or most-unknown first; guaranteed-value first; hard-blocked work last, as an explicit named slice (never silently dropped).
3. Within each slice, plan PRs in deploy order (backend → gateway → frontend). **Slice ≠ PR**: a slice may span repos and become several PRs. Deploy order sequences the PRs *inside* a slice — it never makes a layer a slice of its own.
4. Run the merge-state test on every part. Fold failures into their consumer: a store merges with the RPC that serves it; a pure helper merges with its call site; risky logic merges with its wiring (branch in the same PR, flag-gated).
5. Flag-gate the first behaviour-changing PR; flag off = today's behaviour.

Output per slice: **name (the capability) · merge state (the test sentence) · PRs in deploy order · how you verify it**.

## Worked example

"Customisable email footers" (message-service + ranger-api + admin-app):

| Slice | Merge state after it lands |
|---|---|
| 1. Compliance footer always renders (locked block, flag-gated) | Flag on → new locked wording on every classified email |
| 2. Tenant can edit footers (store+RPC → GraphQL → editor UI, 3 PRs) | Admin saves a footer in the UI; next email renders it |
| 3. Footer renders on the batch path | Marketing/batch emails carry the tenant footer |
| 4. Blocked: unsubscribe link target (other project) | Explicitly tracked, not built |

Slice 2's store PR merges *with its RPC* and is exercisable via grpcurl the day it lands — that passes. A store-only PR does not.

## When told "keep PRs small"

Make slices **narrower in capability**, never thinner in layer. "Preview renders the footer" then "test-email carries it" — not map/fetch/builder/wire×2. A layer split makes each PR *less* reviewable: a reviewer can't judge a payload builder without its call site.

## Rationalizations — all of these mean STOP

| Excuse | Reality |
|---|---|
| "It's a leaf, testable in full isolation" | Isolation isn't value. Nobody can review whether it's the *right* leaf without its consumer. |
| "Nothing calls it yet — no user-visible change, so it's safe" | Safe to merge ≠ worth merging. That sentence is the test failing. |
| "Tested dead code, zero live impact" | Zero impact = nothing observable to review. |
| "Deploy order forces splitting by layer" | Deploy order sequences PRs inside a slice. It doesn't choose your slice boundaries. |
| "That's the normal expand-phase state" | Expand/Migrate/Contract is for changing shipped contracts, not for landing a new feature as scattered dead parts. |
| "Parallel tracks, steady daily progress" | Progress is capabilities landed, not PRs opened. |
| "A swamped reviewer can approve a tiny diff quickly" | A tiny diff with no behaviour gives the reviewer nothing to check it against. |

## Red flags in your own plan

- Two or more parts whose merge-state sentence contains "unused", "nothing calls it", or "not yet".
- A part named after a layer or artifact (store, proto, hook, builder, wiring) instead of a capability.
- The same capability's logic and its wiring as separate parts.
- More parts than days of work.

**Any of these: re-fold the plan before showing it.**

## When NOT to slice

One capability, one repo, a day of work → one slice. Don't manufacture parts.

Execution rhythm after slicing — pausing at slice boundaries for review — is the pause-for-review skill.

---
name: write-articles
description: >
  Use when drafting, rewriting, or editing long-form articles, technical blog
  posts, newsletters, essays, launch posts, guides, or tutorials where voice,
  evidence, structure, or platform formatting matters. Not for PR descriptions,
  commit messages, Slack replies, Linear comments, or short status updates.
---

# Article Writing

Write long-form content with a specific voice, concrete evidence, and no generic AI filler.

## When Not to Use

- PR descriptions, commit messages, Slack replies, Linear comments, or short status updates.
- Pure API/reference docs where accuracy and completeness matter more than voice.
- Factual news, market analysis, or research claims without provided sources or permission to verify.
- Legal, medical, financial, or compliance advice that requires expert judgment.
- Caruso brand or marketing content when Caruso brand guidance is available; use that guidance first.

## Source and Fact Boundary

Never invent concrete facts. This includes:

- URLs, links, citations, quotes, screenshots, or source names.
- Dates, version numbers, prices, percentages, benchmark results, or metrics.
- People, companies, customers, products, features, incidents, or timelines.
- Biographical details, customer evidence, testimonials, or "research shows" claims.

If a concrete claim has no source, choose one:

- Delete it.
- Qualify it as opinion or inference.
- Mark it as `[TBD: source needed]`.

Never silently turn uncertainty into fact.

## Allen Voice Defaults

Use these when the user does not provide voice samples:

- Prefer Chinese for explanation; keep technical terms in English when clearer.
- Use short paragraphs, usually 2-4 sentences.
- Start with a concrete technical situation, failure, result, or tradeoff.
- Prefer direct judgment over fake neutrality.
- Avoid hype, motivational tone, and polished corporate language.
- Good default shape: problem scene -> non-obvious finding -> concrete recommendation.

Treat these as provisional defaults. If the user provides samples, extract the voice from those samples instead.

## Voice Capture

When matching a voice, build a compact voice profile before drafting:

| Dimension | Capture |
| --- | --- |
| Sentence length | short / medium / long; note fragments if common |
| Paragraph length | 1-2 / 3-5 / 6+ sentences |
| First person | none / occasional / frequent |
| Stance | neutral / opinionated / contrarian |
| Evidence | code, numbers, screenshots, anecdotes, citations, examples |
| Formatting | headings, bullets, code blocks, quotes, tables |
| Rhythm | dense, conversational, sharp, reflective, terse |
| Do-not-use | words, moves, jokes, or structures the sample avoids |

Voice match means preserving rhythm, density, stance, and evidence style. It does not mean copying catchphrases or inventing personal experience.

## Banned Patterns

Delete and rewrite these patterns before delivery:

| Category | Ban |
| --- | --- |
| Meta narration | "In this article...", "We'll explore...", "Let's dive in", "Without further ado" |
| Filler | "It's important to note", "It's worth mentioning", "Needless to say", "Moreover", "Furthermore" |
| Vague quantity | "various", "numerous", "many", "several", "a number of" without specifics |
| Fake balance | "On one hand... on the other hand" when there is a clear recommendation |
| Weak claims | "perhaps", "it could be argued", unnecessary "I think" |
| Hype | "cutting-edge", "revolutionary", "game-changer", "unlock", "empower", "seamless" |
| Chinese AI tone | "综上所述", "值得一提的是", "由此可见", "在...的大背景下", "众所周知", "...的奥秘", emoji titles |
| Ending cliches | "In conclusion", "To summarize", "Hopefully this was helpful", "总结一下" |

## Draft Loop

- If the user only asks for an article: propose a short outline first and wait for confirmation.
- If the user says to write it directly or gives a complete brief: draft the full piece.
- When rewriting existing copy: preserve the original argument unless explicitly asked to change it.
- When matching voice: show the voice profile, then write.
- For long pieces: prefer outline -> one representative section -> feedback -> full draft.

## Article Shape

- Lead with the concrete thing: example, output, anecdote, number, screenshot description, code, or a specific failure.
- Explain after the example, not before.
- Keep one purpose per section.
- Use code, terminal output, diagrams, before/after examples, or screenshots when they help verify the claim.
- End with concrete takeaways or next actions, not a soft summary.

## Platform Formatting

| Platform | Paragraphs | Headings | Code | Notes |
| --- | --- | --- | --- | --- |
| Blog / Medium | 2-4 sentences | H2/H3 | yes | Use a concrete intro and scannable sections |
| Newsletter / Substack | 2-5 sentences | H2 | optional | Make the first screen carry the point |
| WeChat article | 1-3 sentences | short or bold headings | short blocks or screenshots | Mobile-first; avoid dense walls of text |
| X thread | 1 sentence per post | none | avoid long code | One idea per post |

## Example

Bad:

> In today's rapidly evolving database landscape, Aurora MySQL provides numerous game-changing benefits that empower teams to unlock better performance.

Good:

> 上周我把一个慢查询拆开看，问题不在 Aurora，而在我们以为 `(a, b) > (?, ?)` 一定会走索引。EXPLAIN 给了另一种答案。

## Quality Gate

Before delivering:

- Check every URL, date, version, number, quote, person, company, and product claim against the provided source or mark it `[TBD: source needed]`.
- Remove or qualify unsupported claims.
- Scan for banned English and Chinese AI patterns.
- Confirm the output follows the selected voice profile or Allen defaults.
- Check the platform format: paragraph length, headings, code blocks, and mobile readability.

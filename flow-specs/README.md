# Flow Spec Index

Design documents for Blag Coaching, written before the code that satisfies them. Each spec
walks one user goal step by step: what they want, what they see, what they do, what happens.

The requirements these trace to, and the emotional core that steers their tone, are in
[REQUIREMENTS.md](REQUIREMENTS.md). Screens touched by more than one spec are catalogued in
[SCREENS.md](SCREENS.md).

**Scope.** Blag Coaching is a shipped app; these specs are not a retroactive description of
it. They cover areas being designed or redesigned from here on. The first area is what a
self-serve account still has to set once onboarding ends.

| # | Flow Spec | File | Status |
|---|---|---|---|
| 01 | Set a goal weight | [01-set-a-goal-weight.md](01-set-a-goal-weight.md) | Draft |

## Proposed next

Not drafted. Listed so the ordering reasoning is visible before any of it is written.

| # | Flow Spec | Why this flow | Why this position |
|---|---|---|---|
| 02 | Know what is still unset | R2 — three invitations exist independently and none knows the others exist, so a client cannot tell whether they are done setting up | After 01, because 01 supplies the third invitation. Writing 02 first would design a summary of something not yet complete. |

## Conventions

- Specs own behaviour, sequence and content **intent**. Visual design and final copy are
  decided when the screens are built, against `docs/DESIGN.md`.
- Literal strings appear only when marked `(draft copy)`.
- Status lives here and nowhere else: `Draft → Reviewed → Prototyped → Audited ✓`.

## Linter

```bash
node .claude/skills/user-flow-specs/validate-flow-specs.cjs flow-specs/
```

Advisory. Issues are format violations to fix; warnings are design prompts to consider.

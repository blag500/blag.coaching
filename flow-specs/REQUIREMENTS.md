# Requirements — Blag Coaching: setup completion after onboarding

> Single source of truth for this design area. Every flow spec traces back to a numbered requirement via its `**Covers:**` line. Changes to this file are dated edits — see the Change Log at the bottom.

**Scope note.** This is not a requirements document for the whole app. Blag Coaching is a
shipped product with five tabs and roughly a hundred screens; writing requirements for all of
it after the fact would be an archaeology project, not a design one. This file covers one
area: **what a self-serve account still has to set after onboarding ends, and how the app
asks.** Other areas get their own files when they get their own specs.

## Problem Statement

Onboarding asks six questions — name, goal, gender, weight, activity, notifications — and
derives calories and macros from the answers. It deliberately asks nothing more, because the
moment somebody is deciding whether to stay is the wrong moment to charge them setup time.

That decision is right, and it leaves three things unset: a training programme, daily habits,
and a goal weight. The app already invites the first two. It does not invite the third, and
none of the three knows the others exist, so a new client has no way to tell whether they are
finished setting up or have simply not noticed something.

## The User

- **Who:** A client on the free tier who registered themselves, without the coach enrolling
  them. Typically Bulgarian, training on their own, using the app daily on a phone.
- **Context:** Installed PWA on a phone, opened several times a day — usually standing in a
  kitchen or a gym, often one-handed, often in a hurry.
- **Standing accessibility requirements (always apply):**
  - WCAG AA contrast and text size, verified in all three themes (dark, light, glass)
  - Every interactive target reachable one-handed on a phone
  - Scannable UI: short lines, clear hierarchy, no wall of text
  - Nothing conveyed by colour alone
  - `prefers-reduced-motion` honoured

## Emotional Core

Knowing where you stand without being nagged. The app keeps the score so the person does not
have to — and it never implies they are behind.

## Functional Requirements

- **R1:** The app lets a client set a goal weight after onboarding, from the place where
  weight already lives.
- **R2:** The app shows a client what is still unset in their own setup, without implying
  fault or incompleteness as a failure.
- **R3:** The app stops asking for a given item once the client has either set it or declined
  it, and the decline is permanent until the client reopens it themselves.
- **R4:** The app's invitations to set something appear where that thing belongs, not
  collected into a separate setup screen away from the work.
- **R5:** A client who sets nothing keeps a fully usable app — every invitation is skippable
  and nothing is gated behind it.

## Constraints

- **Design system:** the project's own — `src/index.css` tokens, explained in `docs/DESIGN.md`.
  No new colours, radii, curves or durations.
- **Platform:** React PWA, phone-first, offline-tolerant.
- **Language:** all UI text in Bulgarian (`bg-BG`).
- **Technical:** state lives in Supabase `profiles`; three themes must all be handled.
- **Tone:** no slogans, no emoji, no praise. See `feedback-no-ad-slop` in project memory.

## Out of Scope

- The coach-enrolled intake flow. A client the coach enrolls has targets set for them by the
  coach, so none of this applies.
- Onboarding itself. Its six steps are settled and this area begins where they end.
- The paid-tier upsell. The coach offer already has its own moment and is not part of setup.
- A separate onboarding checklist screen. R4 rules it out on purpose.

## Change Log

- **2026-09-26:** Initial version. Written from the working queue dictated 2026-08-15, after
  confirming in code which parts of it had already shipped.

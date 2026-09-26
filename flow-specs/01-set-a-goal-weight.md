# Flow Spec 01: Set a goal weight

**Goal:** A self-serve client wants the app to know where they are heading, not only where they are, so their weight chart reads as progress rather than as a line.
**Covers:** R1, R3, R4, R5

---

## Entry Points

- **From the Today dashboard, weight card:** the client has logged weight at least once and
  has no goal weight set. The card is showing a current weight with nothing to compare it to.
- **From the Profile page, body section:** the client went looking for the setting deliberately.
- **From the weight chart in Nutrition → Тяло:** the client is reading their own trend and
  notices the chart has no target line.

---

## The Flow

### Step 1: Noticing that half the sentence is missing

**What they want:** They want to know whether the number they just logged is good news.

**What they see:** The weight card shows today's weight. Where a goal weight would sit beside
it, there is an invitation to set one — a control, not a notice, so it is obvious it can be
acted on rather than only read. Its content intent: the chart can show where you are going,
once you say where that is. No count of days, no percentage, no claim about their progress.

**What they do:** They tap the invitation.

**What happens:** A way to enter a goal weight opens in place, over the dashboard, with the
weight unit and scale matching the one they already used at onboarding. Their current weight
is visible while they choose, so the goal is set relative to something real.

### Step 2a: Naming a number

**What they want:** They want to name a number they believe, not one the app suggests.

**What they see:** An input for the goal weight, pre-positioned at their current weight so
the first movement is a deliberate one in a direction. The app offers no recommended value
and passes no judgement on the number chosen — the goal the client picked at onboarding
(cut, maintain, gain) is not used to steer, restrict or warn.

**What they do:** They set a number and confirm.

**What happens:** The goal weight is stored on the profile. The overlay closes. The weight
card now shows current weight against goal, and the chart draws its target line. Nothing else
in the app changes.

### Step 2b: Declining for now

**What they want:** They want the invitation to stop occupying the card without committing
to a number they have not thought about.

**What they see:** Alongside the input, a way to decline. Its content intent distinguishes
*not now* from *never* — the client is choosing not to answer today, not disabling a feature.

**What they do:** They decline.

**What happens:** The invitation leaves the weight card. It does not return on its own. The
goal weight stays settable from the Profile page, which the decline explicitly names, so
declining never removes the path.

### Step 3: Living with it

**What they want:** They want the goal to follow them as their real weight moves.

**What they see:** From now on every place that shows weight shows it against the goal —
the dashboard card, the chart's target line, and the Profile field carrying the same value.

**What they do:** Nothing. The goal persists until they change it in Profile.

**What happens:** When a logged weight reaches or passes the goal, the app states the fact
once and does not celebrate it. Content intent: you have reached what you set. It does not
prompt for a new goal in the same breath — that is a decision for a calmer moment, and the
client already knows where Profile is.

---

## Edge Cases

| Scenario | What the user sees |
|---|---|
| No weight has ever been logged | No invitation. A goal weight with no current weight compares nothing; the weight card's own empty state handles this moment instead. |
| Profile is still loading | The card shows its loading state. The invitation appears only once it is known that no goal weight exists — never flashing in and out. |
| Goal weight equals current weight | Accepted without comment. Maintaining is a goal. |
| Goal weight is far from current | Accepted without comment. The app does not gate, warn or moralise about the number. |
| Saving fails, for example offline | The entered value stays on screen with a plain statement that it has not been saved yet and can be retried. The client's typing is never discarded. |
| The client declined earlier | No invitation anywhere, on any device. The decline is stored on the profile, not in browser storage. |
| The client is coach-enrolled | No invitation. The coach owns this client's targets. |
| A goal weight already exists from the old local storage copy | Treated as set. The existing migration that carries `blag_target_weight_v1` into the profile runs first; the invitation is decided after it. |

---

## New User vs. Returning User

A client who registered before this flow existed reaches it the same way: they have logged
weight, they have no goal weight, so the invitation appears. No backfill, no announcement,
no separate treatment. The invitation is not a new feature being advertised — it is a field
that was always missing and now asks for itself.

---

## UX Notes

- **The invitation lives in the weight card because that is where weight lives.** R4. A
  setup checklist somewhere else would be easier to build and would move the question away
  from the moment it makes sense.
- **Declining is permanent until reopened by the client.** R3. An invitation that returns
  after being declined is a nag, and a nag in an app somebody opens four times a day is the
  fastest way to make them open it three times.
- **The app does not recommend a number.** A recommended goal weight is a judgement about a
  person's body made by software that has met them six questions ago. The coach may make that
  judgement; the app may not.
- **Reaching the goal is stated, not celebrated.** The project's standing rule against
  slogans and praise applies with most force here, where the temptation is greatest.
- **Nothing is gated.** R5. A client who never sets a goal weight keeps a fully working chart,
  card and app; they just lose the comparison.

---

## Prototype Scope

- Weight card on the Today dashboard, state: current weight logged, no goal weight — invitation present.
- Weight card, state: current weight logged, goal weight set — current against goal.
- Weight card, state: no weight ever logged — existing empty state, no invitation.
- Weight card, state: profile loading — no invitation visible.
- Goal-weight entry overlay, opened from the weight card, current weight visible.
- Goal-weight entry overlay, decline affordance present and its wording distinguishing *not now* from *never*.
- Goal-weight entry overlay, save-failed state with the entered value preserved.
- Weight chart in Nutrition → Тяло, state: goal weight set, target line drawn.
- All of the above in the three themes: dark, light, glass.

## Verified

- **Verified 2026-09-26:** The training tab and the habits card already invite the client to
  set a programme and habits — `Training.jsx:557` renders a no-plan invitation, and
  `TodayDashboard.jsx:257` renders a zero-habits one. Goal weight is the only one of the three
  that is silent: `WeightCard.jsx:160` omits the target when it is null and says nothing.
  Consequence: this flow covers goal weight alone, and does not touch the other two.
- **Verified 2026-09-26:** `completeOnboarding` in `AuthContext.jsx:262` writes calories,
  protein, carbs and fat derived from the six onboarding answers, and never writes
  `target_weight`. Consequence: macros are not part of what is left unset, and this flow does
  not offer to change them.
- **Verified 2026-09-26:** `Profile.jsx:128` carries a pre-existing `blag_target_weight_v1`
  value out of browser storage into the profile. Consequence: the invitation must be decided
  after that migration has run, or a returning client is asked for something they already set.

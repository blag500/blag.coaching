# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm test           # Run Playwright e2e tests (chromium + mobile chromium + iOS webkit)
```

Deploy by pushing to the main branch (Netlify / static host watching the repo). No manual deploy step needed. Supabase Edge Functions are deployed separately via `supabase functions deploy send-push`.

## Architecture

**Stack:** React 18 + Vite, CSS Modules, Supabase (Postgres + Auth + Edge Functions), VitePWA (`injectManifest` strategy with a custom `src/sw.js`).

**Entry flow:** `main.jsx` → `App.jsx` wraps everything in `<AuthProvider>`. `AppShell` renders a single-page shell: Splash → Auth check → tab-based page switcher → `<BottomNav>`.

**Routing** is tab-based (no React Router). `activeTab` state in `AppShell` picks which page component renders. Tabs: `nutrition`, `compliance`, `training`, `profile`, `clients` (coach only), `explore`.

**Auth & profile** (`src/contexts/AuthContext.jsx`) — single context that holds `session`, `profile`, and every Supabase data-access function used across the app. Components import `useAuth()` to read data and call mutations. Clients have `role: 'client'`; coaches have `role: 'coach'`. The coach sees a `clients` tab (`CoachPanel`) instead of personal tracking tabs.

**Role split:**
- `role === 'coach'` → `CoachPanel` + `ClientDetail` (manage all clients, edit macros/targets, view charts)
- `role === 'client'` → `NutritionCards`, `Compliance`, `Training`, `Profile`, `Explore`

**CSS design system** — `src/index.css` holds the tokens (132 of them);
`docs/DESIGN.md` explains what they mean and why. **Read `docs/DESIGN.md` before
touching anything visible.** The short version:

- Three themes on `<html data-theme>`: dark (default), `light`, `glass`. Every colour
  token is redefined in all three — never give a colour its only definition inside one.
- `--bg: #0C0A06`, `--accent: #C8A05A` (antique gold), `--text: #F2E8CF` in the dark theme.
- `--font-heading: 'Oswald'` (Bebas Neue ships no Cyrillic); `--font-body` is the system
  face, not a webfont.
- Surfaces: `--panel-bg` for cards (no blur), `--glass-bg` + `--glass-blur` for chrome
  that genuinely overlaps content, `--panel-solid` for things floating over content.
- Colour, radius, easing and duration are never hardcoded. Five radii, four curves,
  four durations — the set is deliberate and closed.

**Data hooks** (`src/hooks/`): each wraps a Supabase query with local state. Hooks: `useFoodLog`, `useCustomFoods`, `useHabitsToday`, `useHabitHistory`, `useWeightLog`, `usePushNotifications`, `useUnread`, `usePullToRefresh`.

**Charts:** SVG-only, no chart libraries. `WeightChart.jsx` uses cubic bezier `smoothPath()` and a `gradId` prop to avoid SVG gradient ID collisions when multiple chart instances exist in the DOM simultaneously.

**Push notifications:** `usePushNotifications` hook registers the browser for Web Push and stores the subscription in Supabase (`push_subscriptions` table). The `send-push` Deno Edge Function (VAPID via `web-push`) sends notifications when messages are sent.

**Blag Bot** (`supabase/functions/blag-bot`): answers questions over the person's
own logged data, and reads a sentence like "изядох 200 г извара" into draft food
rows the person confirms with one tap. `supabase/functions/bot-watch` is the
nightly pass (21:00 Sofia, pg_cron → `fire_bot_watch()`): it computes a handful
of rules and, when one fires, opens an unread chat with one observation. The
rules are computed in TypeScript — the model only puts a sentence around a
number it is given. `?dry=1` reports which rule would fire without calling the
model; `?dry=2` also returns the wording without writing anything.

**Scheduled-job secret**: `public.app_secrets` holds it, `reminder_url()` and
`bot_watch_url()` read it, and the three functions it guards (`send-reminders`,
`bot-watch`, `knowledge`) look it up in that table with their service-role
client. Nobody types it and nobody sees it — rotating is one statement with no
value in it:

```sql
update public.app_secrets
   set value = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
       updated_at = now()
 where name = 'reminder';
```

The `REMINDER_SECRET` env var stays as a fallback for a failed table read only.

**Bot spend**: every call to the model writes a row in `public.bot_usage`
(`kind`, model, token counts) — 'answer', 'extract', 'translate', 'watch',
'distill', 'title'. Nobody sees it but the service role; it prunes itself after
60 days. To read it:

```sql
select kind, count(*), sum(prompt_tokens) as in_, sum(completion_tokens) as out_
from public.bot_usage where created_at > now() - interval '7 days'
group by kind order by sum(total_tokens) desc;
```

Measured, not guessed: one question is ~4 900 tokens, almost all of it prompt
(the ДАННИ block, the knowledge chunks and the thread). The deliberate decision
is no per-day cap — watch the spend and add one when it starts to show.

**Bot knowledge** (`supabase/functions/knowledge` + `bot_knowledge`): the coach's
own notes, chunked by heading and embedded with Supabase's built-in `gte-small`
model — no external API, no per-token cost, and the text never leaves the
project. `blag-bot` embeds each question and pulls the four nearest chunks into
a ЗНАНИЕ section of the prompt. Scope decides reach: `private` (answers to the
coach only), `shared` (answers to his clients too), `client` (one person).
The bot retells in its own words rather than quoting — that rule is in the
system prompt, and numbers from the person's own log always beat the notes.
Fill it from an Obsidian vault with `node scripts/sync-knowledge.mjs <folder>
--scope private` (needs SUPABASE_URL, BOT_SECRET, OWNER_EMAIL); unchanged files
are skipped by content digest.

**Service Worker** (`src/sw.js`): Workbox precache + cache strategies for fonts (CacheFirst) and Open Food Facts API (NetworkFirst). Handles `push` and `notificationclick` events.

## Testing

Tests run against a **mocked Supabase** — `tests/harness.js` seeds a fake session into
`localStorage` and intercepts every request to `*.supabase.co`, answering from in-memory
tables. Nothing touches the production database, and no account is needed to reach the
screens behind the auth wall.

```bash
npm test                                      # the smoke suite, all three projects
npx playwright test shots --project=mobile    # screenshots of every tab × every theme → shots/
```

`tests/shots.spec.js` is not an assertion suite — it is a way to *look* at the app. Run it
after any change to colour, motion, or glass and read the PNGs in `shots/`.

The `ios` project needs a one-time `npx playwright install webkit`.

The bot's pure functions have their own checks, run separately from Playwright:

```bash
npx deno run --allow-read supabase/functions/blag-bot/checks.ts
```

They cover the three things that can break silently — the sieve that decides
whether a sentence is a food entry, the JSON reader for the extracted rows, and
the source filter that drops sections the bot did not actually see. The
functions are cut out of `index.ts` at run time, so the checks always test what
is deployed.

## Database

Migrations live in `supabase/migrations/` — run them in order in the Supabase SQL Editor. All tables use Row-Level Security. The `get_my_role()` and `get_coach_id()` functions are `security definer` to avoid RLS recursion.

Key tables: `profiles`, `food_logs`, `habit_completions`, `weight_logs`, `exercise_logs`, `messages`, `shopping_lists`, `shopping_items`, `efficient_products`, `push_subscriptions`.

To promote a user to coach:
```sql
update public.profiles set role = 'coach' where email = 'email@example.com';
```

## Obsidian log

Every finished task gets a note in the Obsidian vault — what was wrong, what
changed, what was verified, and where it lives (branch, deployed or not). One
note per session, named `YYYY-MM-DD <short title>.md`, in Bulgarian.

The vault is a git repo of its own — `blag500/blag-vault`, private, since
2026-09-26. That is what carries the notes to the phone.

- Local sessions: write it straight into the vault at `D:\obsidian\blag`, then
  commit and push there. `git pull --rebase` first.
- Cloud sessions can't reach the vault: write it to `docs/obsidian/` in this
  repo and commit it with the work. The next local session copies it into the
  vault and pushes — one `cp`, then a commit.

## Component conventions

- Each component lives in its own folder with a matching `.module.css` file
- Pages receive an `onBack` prop when shown as a sub-page (e.g. `<EfficientProducts onBack={...} />`)
- Use the flex column + spacer pattern for pages where an input must pin to the bottom: `page {flex-direction: column}` → `listBody {flex: 1}` → `spacer {flex: 1}` → input at natural flow position. Do **not** use `position: sticky` for this — it fails when page content is shorter than the viewport.
- SVG gradient IDs must be unique per component instance; pass a `gradId` prop when a chart component may appear more than once on screen.
- All UI text is in Bulgarian (`bg-BG` locale).

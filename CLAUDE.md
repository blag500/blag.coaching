# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm test           # Run Playwright e2e tests (chromium + mobile chromium + iOS webkit)
```

Deploy by pushing to the main branch. The live host is **Vercel** — project `blag-coaching`,
with `blag-coaching.com`, `www.` and `blag-coaching.vercel.app` verified on it; `vercel.json`
holds the rewrites. A `netlify.toml` is still in the repo but the domain resolves to Vercel. Supabase Edge Functions are deployed separately via `supabase functions deploy send-push`.

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

- Three themes on `<html data-theme>`: `glass` (the crystal one — the default), dark, `light`. Every colour
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

**Чийт Код** (`cheatcode/page.html` → `public/cheatcode/index.html`): отделна
страница, не част от приложението — конфигурируеми ястия за такеауей.
Източникът е тялото без обвивка; `node scripts/build-cheatcode.mjs` слага
doctype, head, `noindex` и пренаписва пътищата на снимките към `/cheatcode/`.
Снимките живеят направо в `public/cheatcode/` и не се копират — строителят
само проверява, че всяка поискана наистина е там, и пада с грешка, ако не е.
Страницата се редактира и гледа директно; артефактът в Claude вече не се ползва.
Тя е и отделно PWA (инсталира се като „Cheat Code“): манифест и иконки в
`public/cheatcode/`, а `sw.js` със scope `/cheatcode/` се **генерира** от
строителя с версия от съдържанието — не се пипа на ръка. Иконките са PNG от
`cheatcode/brand/app-icon.svg`; iOS не чете SVG за начален екран.

**Инвестиции** (`/invest/`, `invest/index.html` → `src/invest/`): лично табло за
сметката в Trading 212 — втори вход на Vite, не таб в приложението. Същата сесия
(същия адрес), тема кристал, без service worker. Браузърът не говори с Trading
212: `supabase/functions/invest-sync` снима сметката всеки час (pg_cron
`invest-sync`, `:07`) и пише в `invest_snapshots`, `invest_dividends`,
`invest_transactions`; страницата чете само оттам. Чете само собственикът от
`invest_owner` — не по роля. Ключът е в тайните на функциите (`T212_API_KEY`,
`T212_API_SECRET`), само за четене. Миграция `123_invest.sql`.

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

## Решенията

`docs/DECISIONS.md` пази **защо**, не какво. Отхвърлените варианти и причината,
с която са отхвърлени.

**Прочети го, преди да предложиш име, знак, ценообразуване или инструмент.**
Повечето от тях вече са били обсъждани и отхвърлени с довод; без този файл
същото предложение се връща след месец, с пълна убеденост.

Дописва се, когато решение се вземе или се **обърне**. Обърнатото не се трие —
дописва се с датата и причината.

Трите места не се дублират: `DECISIONS.md` е защо, трезорът е разказът по
сесии, а правилата за употреба стоят при артефакта — `docs/DESIGN.md`,
`cheatcode/brand/RULES.md`.

## Thinking discipline

1. **Check the request first.** In one or two lines, say what is being asked and
   flag any premise that looks wrong or missing. If a premise is wrong, say so and
   solve the corrected problem, or ask one specific question. An ambiguous "this
   page" with a screenshot is checked against the screenshot before any code is
   written — on 2026-09-29 a Cheat Code change went into the app instead, and was
   reverted.
2. **Finish one approach before switching.** Change course only when blocked by an
   obstacle you can name in one line.
3. **Settled means checked against something outside your head** — a test, a run,
   a render, the source. A conclusion that was only thought through is not settled.
   Once it is, move on; re-reading it to see if it still feels right is not a check.
4. **Doubt does not reopen a settled answer — it sends you looking for a reason.**
   Reopen only on a concrete one you can state in a line: a failing check, a
   contradicting fact, a specific error, a counterexample. If the search finds
   none, keep the answer and continue.
5. **Do not revise just to agree.** Pushback without new evidence gets the
   conclusion restated with its one-line justification and a question for the
   fact behind the disagreement.
6. **New evidence reopens the case at once.** Say exactly what changed your mind.
7. **Verify outside, not by rethinking.** When a real check exists — tests, a
   build, Playwright, the file itself — run it and let it decide.
8. **Do not perform caution.** State residual uncertainty once, and only if it
   would change what the user should do.
9. **Corrections.** In conversation, correct an earlier statement only when it
   would change the user's code, conclusions or decisions. In anything that goes
   into the repo, fix it and leave a trace in the commit message — a silent edit
   surprises the next person.

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

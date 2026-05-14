# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm test           # Run Playwright e2e tests
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

**CSS design system** (defined in `src/index.css`):
- Dark gold luxury theme: `--bg: #0C0A06`, `--accent: #ffb74d` (amber gold), `--text: #F2E8CF`
- `--font-heading: 'Bebas Neue'` (uppercase display), `--font-body: 'JetBrains Mono'` (monospace)
- Surface layers: `--surface-1` (card bg), `--surface-2` (input bg)
- All new UI should use these CSS variables — never hardcode colors except SVG-specific ones

**Data hooks** (`src/hooks/`): each wraps a Supabase query with local state. Hooks: `useFoodLog`, `useCustomFoods`, `useHabitsToday`, `useHabitHistory`, `useWeightLog`, `usePushNotifications`, `useUnread`, `usePullToRefresh`.

**Charts:** SVG-only, no chart libraries. `WeightChart.jsx` uses cubic bezier `smoothPath()` and a `gradId` prop to avoid SVG gradient ID collisions when multiple chart instances exist in the DOM simultaneously.

**Push notifications:** `usePushNotifications` hook registers the browser for Web Push and stores the subscription in Supabase (`push_subscriptions` table). The `send-push` Deno Edge Function (VAPID via `web-push`) sends notifications when messages are sent.

**Service Worker** (`src/sw.js`): Workbox precache + cache strategies for fonts (CacheFirst) and Open Food Facts API (NetworkFirst). Handles `push` and `notificationclick` events.

## Database

Migrations live in `supabase/migrations/` — run them in order in the Supabase SQL Editor. All tables use Row-Level Security. The `get_my_role()` and `get_coach_id()` functions are `security definer` to avoid RLS recursion.

Key tables: `profiles`, `food_logs`, `habit_completions`, `weight_logs`, `exercise_logs`, `messages`, `shopping_lists`, `shopping_items`, `efficient_products`, `push_subscriptions`.

To promote a user to coach:
```sql
update public.profiles set role = 'coach' where email = 'email@example.com';
```

## Component conventions

- Each component lives in its own folder with a matching `.module.css` file
- Pages receive an `onBack` prop when shown as a sub-page (e.g. `<EfficientProducts onBack={...} />`)
- Use the flex column + spacer pattern for pages where an input must pin to the bottom: `page {flex-direction: column}` → `listBody {flex: 1}` → `spacer {flex: 1}` → input at natural flow position. Do **not** use `position: sticky` for this — it fails when page content is shorter than the viewport.
- SVG gradient IDs must be unique per component instance; pass a `gradId` prop when a chart component may appear more than once on screen.
- All UI text is in Bulgarian (`bg-BG` locale).

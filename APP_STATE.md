# Blag Coaching — App State Reference

> Feed this file to Claude at the start of a new session to restore full context.
> Keep CLAUDE.md for architecture/commands; this file is for *current feature state*.

---

## What the app is

Bulgarian fitness coaching PWA. One coach (Nikolay), multiple clients. Deployed at **blag-coaching.com** via Netlify (auto-deploys on push to `main`). Backend: Supabase (Postgres + Auth + Storage + Edge Functions).

Tech: React 18 + Vite + CSS Modules. No React Router — tab-based navigation via `activeTab` state in `AppShell`. PWA with `injectManifest` service worker.

---

## Roles

| Role | What they see |
|------|--------------|
| `client` | ДНЕС, Nutrition, Training, Compliance, Profile, Explore, Chat, Recovery, Calendar, Learn |
| `coach` | CoachPanel (client list) + ClientDetail (per-client view); BottomNav: ЧАТ, КЛИЕНТИ, ПРОФИЛ, МЕНЮ |

Coach is promoted via SQL: `update profiles set role = 'coach' where email = '...'`

---

## Onboarding flow (client)

1. **PlanSelector** — choose plan (step 1 of 3 eyebrow label)
2. **ContactForm** — name + phone (validated, blocks submit if empty)
3. **WelcomeOverlay** — 6-step feature tour (Хранене, Тренировки, Прогрес, Съобщения, Снимки на храна, Навици)
4. **PendingApproval** — waiting screen until coach approves
5. Coach approves via SQL RPC or CoachPanel UI → client gets full access

---

## Client features

### Nutrition tab
- Food log with AI recognition (MealBot), barcode scanner, manual entry
- Macros tracked: kcal, protein, carbs, fat + grams
- MealBot uses `roundServing()` — typical serving sizes, scores by ratio-to-gap (0.2–1.5 range)
- Meal photos — upload per food log entry (stored in `meal-photos` Storage bucket, migration 042)
- `photo_url` column on `food_logs`
- Recipes, custom foods, efficient products (coach-curated)

### Training tab
- Weekly training plan (block-based, set by coach per client)
- `profiles.training_plan` JSONB; `getBlocks()` returns `null` for missing/old format → shows placeholder
- Exercise log: sets × reps × weight per exercise per day
- Progression view: per-exercise history chart + editable log table
- Workout completions tracking (`workout_completions` table, `completed_date` field)

### Compliance tab
- Daily habit checkboxes — habits come from `profile.habits` JSONB if set, else DEFAULT_HABITS from `appData.js`
- Default habits: water, protein, training, sleep, steps
- Coach sets per-client habits in ClientDetail → ЦЕЛИ tab (HabitsEditor)
- Streak tracking, ring progress, habit calendar
- SOS button, supplement section, sleep log

### Profile tab
- Activity calendar (dots per day: food=green, training=amber, habits=blue, weight=pink, sleep=purple)
  - Training: `workout_completions.completed_date`
  - Weight: `weight_logs` OR `form_checkins.weight_kg`
  - Sleep: `sleep_logs.duration_hours` OR `form_checkins.sleep_hours`
- Weekly summary card (avg kcal, habit %, streak days)
- Macro targets display (read-only, set by coach)
- NutritionProgress ring (today's macros vs targets)
- Weight log + chart (WeightChart SVG cubic bezier, `gradId` prop for dedup)
- **Check-in form** (FormCheckin) — daily structured fields:
  - Weight (kg) + Sleep (hours) — side by side
  - Gym performance: tap row ↓/=/↑ (stored 0/1/2)
  - Training desire: 0–5 circles
  - Note (free text)
  - Weekly résumé section (collapsible toggle): победа + що да подобря
  - Progress photo (stored in `form-checkins` Storage bucket)
  - Pre-populates from today's saved entry on load
- Name editor
- Avatar upload (stored in `avatars` bucket, migration 051)
- Notification settings (Web Push)
- **Appearance settings** — dark/light theme toggle + Bulgarian/English language toggle
  - Managed by `SettingsContext` (`src/contexts/SettingsContext.jsx`)
  - Theme stored as `blag_theme` in localStorage; applied as `data-theme` on `<html>`
  - Lang stored as `blag_lang` in localStorage; `t(key)` function returns translated string
- Sign out

### Explore tab
- **ВДЪХНОВЕНИЕ** (ShowcasePage) — coach inspiration posts for clients
  - `CoachLiveCard`: coach avatar + name, training streak badge, training dots last 7 days (💪 = trained, 💤 = rest), habit bars last 7 days, today stats row (kcal / habits / sleep / training), check-in photo strip (last 60 days, tap to lightbox)
  - Posts filtered by category (ТРЕНИНГ / ХРАНЕНЕ)
  - Post detail view with full body text
  - RLS (migrations 052 + 053): clients can read coach's workout_completions, habit_completions, food_logs, form_checkins, sleep_logs, and profile row
- EfficientProducts (coach-curated product list with photos, likes)
- Learn page
- Shopping list

### Chat
- **ChatPage.jsx** — full-page dedicated chat (no floating bubble)
- Date separators (ДНЕС / ВЧЕРА / formatted)
- Text bubbles + photo bubbles (tap to fullscreen lightbox)
- Camera button → upload to `chat-photos` bucket → sends `photo_url`
- Realtime via Supabase channel + 15s polling fallback + visibilitychange refresh
- Header shows coach's real name + avatar (fetched via RLS policy added in migration 053)
- `embedded` prop used in ClientDetail chat tab (scroll-isolated)
- Client resolves coach ID via `get_coach_id()` RPC

---

## Coach features

### CoachPanel (client list)
- Approved clients sorted: active today → recently active → never logged
- Each card shows: name, kcal today (amber), last active label (green if today)
- Pending clients section (approve/deny)

### Coach BottomNav
ЧАТ | КЛИЕНТИ | ПРОФИЛ | МЕНЮ

- **ЧАТ** tab: shows `CoachChatList` (select a client) → full ChatPage for that client

### ClientDetail (per-client view)
Tabs: **ПРОГРЕС | ЧАТ | CHECK-IN | ХРАНЕНЕ | УПРАЖНЕНИЯ | ПЛАН | ЦЕЛИ | БЕЛЕЖКИ**

| Tab | Content |
|-----|---------|
| ПРОГРЕС | 7-day kcal bar chart, habit completion bars, weight chart |
| ЧАТ | Full ChatPage embedded, scroll-isolated (pageChat CSS class) |
| CHECK-IN | form_checkins history — date, weight, sleep/perf/desire chips, weekly win, photo thumbnails |
| ХРАНЕНЕ | Food log by date — view/edit/delete/add entries; meal photo lightbox; meal photo strip (last 30 days) |
| УПРАЖНЕНИЯ | Exercise diary by date + progression sub-tab (per-exercise history) |
| ПЛАН | Training plan editor (block-based, weekly structure) |
| ЦЕЛИ | Editable name/target weight + HabitsEditor (per-client habit list) |
| БЕЛЕЖКИ | Coach private notes per client |

- Macro bar always visible above tabs (coach edits kcal/protein/carbs/fat)
- Delete client button (with confirmation)

### ShowcaseManager (in CoachPanel)
- Create/edit/delete showcase posts (training or nutrition category)
- Photo upload per post (`showcase-photos` bucket)
- Sort order control

---

## Database — key tables

| Table | Purpose |
|-------|---------|
| `profiles` | users — role, macros, name, avatar_url, coach_notes, training_plan, habits (JSONB), intake fields |
| `food_logs` | daily food entries + `photo_url` (meal photos) |
| `exercise_logs` | sets/reps/weight per exercise per date |
| `habit_completions` | daily habit checkbox state |
| `weight_logs` | daily weight entries (Profile page) |
| `workout_completions` | completed training blocks per date |
| `messages` | coach↔client chat; content nullable; photo_url for photo messages |
| `form_checkins` | daily check-in: weight_kg, sleep_hours, gym_performance, training_desire, weekly_win, weekly_improve, notes, photo_url |
| `sleep_logs` | Recovery page sleep entries (duration_hours, quality) |
| `push_subscriptions` | Web Push subscriptions per user |
| `efficient_products` | coach-curated product list |
| `shopping_lists` / `shopping_items` | per-client shopping lists |
| `showcase_posts` | coach inspiration posts (category, title, body, photo_url, sort_order) |
| `training_sessions` | scheduled sessions |

Key RPCs: `get_my_role()`, `get_coach_id()`, `approve_client()`, `select_plan()` — all `security definer`.

---

## Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `send-push` | Sends Web Push notification (VAPID) to a user's subscriptions |
| `delete-user` | Deletes auth user (coach action) |
| `notify-new-registration` | Notifies coach when new client registers |

---

## Storage buckets

| Bucket | Used for |
|--------|---------|
| `avatars` | Profile avatars (coach + client) — migration 051 |
| `meal-photos` | Food log entry photos — migration 042 |
| `form-checkins` | Progress/check-in photos |
| `chat-photos` | Chat message photo attachments — migration 050 |
| `showcase-photos` | Coach showcase post photos — migration 048 |

---

## DB migrations (run in order)

| # | File | What it adds |
|---|------|-------------|
| 042 | `042_meal_photos.sql` | `food_logs.photo_url` + `meal-photos` bucket |
| 048 | `048_showcase_posts.sql` | `showcase_posts` table + `showcase-photos` bucket |
| 049 | `049_profile_habits.sql` | `profiles.habits` JSONB column |
| 050 | `050_chat_photos.sql` | `messages.content` nullable + `messages.photo_url` + `chat-photos` bucket |
| 051 | `051_avatar.sql` | `profiles.avatar_url` + `avatars` bucket |
| 052 | `052_coach_showcase_data.sql` | RLS: clients can read coach's workout/habit/food/checkin/sleep data |
| 053 | `053_clients_view_coach_profile.sql` | RLS: clients can read coach's `profiles` row (name, avatar_url) |

---

## Settings & i18n

- `SettingsContext` (`src/contexts/SettingsContext.jsx`) — wraps entire app in App.jsx
- `useSettings()` returns `{ theme, setTheme, lang, setLang, t }`
- `t('nav.training')` → 'ТРЕНИРОВКА' (bg) / 'TRAINING' (en)
- BottomNav and NavDrawer both use `t()` — fully translated, no hardcoded strings
- Light theme: `html[data-theme="light"]` CSS overrides in `src/index.css`

---

## CSS design system

```css
--bg: #0C0A06
--accent: #ffb74d          /* amber gold */
--text: #F2E8CF
--font-heading: 'Bebas Neue'
--font-body: 'JetBrains Mono'
--surface-1, --surface-2   /* card/input backgrounds */
--muted, --border
--ease-out: cubic-bezier(0.23, 1, 0.32, 1)
```

Light theme overrides (`html[data-theme="light"]`):
```css
--bg: #F5F0E8  --surface-1: #FFFFFF  --surface-2: #EDE8DE
--accent: #C07800  --text: #1A1300  --muted: #7A6840  --border: #D4C8A8
```

All UI text in Bulgarian (`bg-BG` locale). Never hardcode colors (except SVG-specific).

---

## Pending / not yet built

- Check-in trends/aggregates in coach view (avg sleep, desire, perf trend over time)
- Weekly push notification summary (Friday: avg kcal, habit %, weight change)
- Payment / subscription system
- Multiple coach support (infrastructure exists, not exposed in UI)
- Meal planning / weekly meal prep feature
- Wearable integrations

# Blag Coaching — App State Reference

> Feed this file to Claude at the start of a new session to restore full context.
> Keep CLAUDE.md for architecture/commands; this file is for *current feature state*.

---

## What the app is

Bulgarian fitness coaching PWA. One coach (Nikolay), multiple clients. Deployed at **blag-coaching.com** via Vercel (auto-deploys on push to `main`). Backend: Supabase (Postgres + Auth + Storage + Edge Functions).

Tech: React 18 + Vite + CSS Modules. No React Router — tab-based navigation via `activeTab` state in `AppShell`. PWA with `injectManifest` service worker.

---

## Roles

| Role | What they see |
|------|--------------|
| `client` | Nutrition, Training, Compliance, Profile, Explore tabs + BottomNav |
| `coach` | CoachPanel (client list) + ClientDetail (per-client view) — no personal tracking tabs |

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
- Meal photos — upload per food log entry (stored in `meal-photos` Storage bucket)
- Photo_url column on `food_logs` table (migration 042)
- Recipes, custom foods, efficient products (coach-curated)

### Training tab
- Weekly training plan (set by coach per client)
- Exercise log: sets × reps × weight per exercise per day
- Progression view: per-exercise history chart + editable log table
- Workout completions tracking

### Compliance tab
- Daily habit checkboxes (6 habits defined in `src/data/appData.js`)
- Streak tracking, ring progress, habit calendar
- SOS button
- Supplement section, sleep log

### Profile tab
- Activity calendar (dots per day: food=green, training=amber, habits=blue, weight=pink, sleep=purple)
  - Sleep dot reads from `form_checkins.sleep_hours` (not a separate table)
- Weekly summary card (avg kcal, habit %, streak days)
- Macro targets display (read-only, set by coach)
- NutritionProgress ring (today's macros vs targets)
- Weight log + chart (WeightChart, SVG cubic bezier, gradId prop for dedup)
- **Check-in form** (FormCheckin) — daily structured fields:
  - Weight (kg) + Sleep (hours) — side by side
  - Gym performance: tap row ↓/=/↑ (stored 0/1/2)
  - Training desire: 0–5 circles
  - Note (free text)
  - Weekly résumé section (collapsible toggle): победа + що да подобря
  - Progress photo (stored in `form-checkins` Storage bucket)
  - Pre-populates from today's saved entry on load
- Name editor
- Notification settings (Web Push)
- Sign out

### Explore tab
- EfficientProducts (coach-curated product list)
- Learn page
- Shopping list

### Messaging
- In-app chat between client and coach (`messages` table)
- Client resolves coach ID via `get_coach_id()` security-definer RPC (coach_id not in RLS-visible columns)
- Real-time via Supabase Realtime (replica identity full on messages — migration 045)
- Unread badge on BottomNav / CoachPanel
- Push notifications on new message via `send-push` Supabase Edge Function (VAPID)
- **Known issue (active debug):** message history not loading on either side. `fetchMessages` may be hitting early return. Debug `console.log` is currently live in AuthContext — remove after fix.

---

## Coach features

### CoachPanel (client list)
- Approved clients sorted: active today → recently active → never logged
- Each card shows: name, kcal today (amber), last active label (green if today)
- Pending clients section (approve/deny)

### ClientDetail (per-client view)
Tabs:
| Tab | Content |
|-----|---------|
| ПРОГРЕС | 7-day kcal bar chart, habit completion bars, weight chart |
| CHECK-IN | Client's form_checkins history — date, weight, sleep/perf/desire chips, weekly win (green), photo thumbnails tap-to-fullscreen |
| ХРАНЕНЕ | Food log by date — view, edit, delete, add entries manually; meal photo lightbox |
| УПРАЖНЕНИЯ | Exercise diary by date + progression sub-tab (per-exercise history) |
| ПЛАН | Training plan editor (weekly day structure) |
| ЦЕЛИ | Client intake data (phone, age, goal, health notes) + editable name/target weight |
| БЕЛЕЖКИ | Coach private notes per client |

- Macro bar always visible above tabs (coach edits kcal/protein/carbs/fat targets)
- Chat overlay (💬 button) opens in-app chat
- Delete client button (with confirmation)

---

## Database — key tables

| Table | Purpose |
|-------|---------|
| `profiles` | users — role, macros, name, coach_notes, training_plan, intake fields |
| `food_logs` | daily food entries + `photo_url` (meal photos) |
| `exercise_logs` | sets/reps/weight per exercise per date |
| `habit_completions` | daily habit checkbox state |
| `weight_logs` | daily weight entries |
| `messages` | coach↔client chat; replica identity full |
| `form_checkins` | daily check-in: weight_kg, sleep_hours, gym_performance, training_desire, weekly_win, weekly_improve, notes, photo_url |
| `push_subscriptions` | Web Push subscriptions per user |
| `efficient_products` | coach-curated product list |
| `shopping_lists` / `shopping_items` | per-client shopping lists |
| `training_sessions` | scheduled sessions |

Key RPCs: `get_my_role()`, `get_coach_id()`, `approve_client()`, `select_plan()` — all `security definer` to avoid RLS recursion.

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
| `meal-photos` | Food log entry photos |
| `form-checkins` | Progress/form check-in photos |

---

## Active issues / in-progress

1. **Chat message history broken** — `fetchMessages` in AuthContext returns empty on both sides. Debug logging currently live. Suspected: early return guard `(!otherUserId || !session?.user.id)` firing unexpectedly. Need console output to confirm.

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

All UI text in Bulgarian (`bg-BG` locale). Never hardcode colors (except SVG-specific).

---

## Pending (not yet built)

- Chat fix (see active issues)
- Meal photos end-to-end verification
- Check-in trends/aggregates in coach view (avg sleep, desire, perf trend)
- Weekly push notification summary (Friday: avg kcal, habit %, weight change)
- Profile page reorder (check-in form near top, it's a daily action)

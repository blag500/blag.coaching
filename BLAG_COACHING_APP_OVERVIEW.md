# Blag Coaching — App Overview

## What is Blag Coaching?

A Bulgarian-language **personal fitness coaching PWA** (Progressive Web App) — installable on iOS and Android like a native app. Built for a single coach (Blag/Nikolay) managing clients remotely, with infrastructure that can scale to support other coaches (B2B).

Live at: **blag-coaching.com**

---

## User Roles

| Role | Description |
|------|-------------|
| **Client** | A person being coached — tracks nutrition, training, habits, weight, recovery |
| **Coach** | Manages all clients, sets plans, monitors progress, communicates, posts inspiration |

Clients require coach approval before accessing the app (gated onboarding). The coach can promote any user to coach role for B2B expansion.

---

## Client-Facing Features

### Nutrition Tracking
- Food search powered by **AI macro lookup** (MealBot — Supabase Edge Function + LLM)
- **Barcode scanner** — scan any product, auto-fills macros
- **Open Food Facts** integration for packaged products
- Manual food entry with full macro control
- Daily food log with editable entries (name, grams, macros)
- **Meal photos** — photograph each food log entry; visible to coach
- Undo last removed entry
- Daily macro targets set by coach (kcal, protein, carbs, fat)
- Visual macro progress cards with ring/bar charts

### Recipes
- Create custom recipes with multiple ingredients (AI search, barcode, or manual)
- Set servings count — log by portions or grams
- Optional photo per recipe
- Coach can share recipes with all clients
- Log a recipe directly to food diary

### Habit Tracking
- Daily habits defined per client by coach (e.g. "Drink 3L water", "Sleep 8h")
- One-tap completion per habit
- Compliance history calendar, streak tracking, ring progress
- Weekly compliance percentage

### Weight Logging
- Log daily weight
- SVG line chart with progress over time (1M / 3M / ALL ranges)

### Training Plan
- Block-based training plan set by coach per client
- View exercises per block with sets × reps targets
- Log weight/reps/sets per exercise with notes
- Per-exercise progression chart (weight over time)
- Mark block as completed for the day
- Workout history with training dots

### Check-in Form (Daily)
- Weight + sleep side by side
- Gym performance rating (↓ / = / ↑)
- Training desire (0–5 scale)
- Free-text note
- Weekly summary section: biggest win + what to improve
- Progress photo upload

### Activity Calendar (Profile)
- Dots per day: food logged (green), trained (amber), habits (blue), weight (pink), sleep (purple)
- Pulls from multiple data sources — comprehensive daily coverage

### Training Calendar (Scheduling)
- Book training sessions with the coach
- Coach can confirm / decline / mark as completed
- Clients can propose time changes (coach approves)

### Messaging (Chat)
- Real-time coach ↔ client chat (Supabase Realtime)
- **Photo messages** — tap camera button, send photos in chat
- Date separators (ДНЕС / ВЧЕРА / date)
- Tap photo to fullscreen lightbox
- Unread badge on navigation
- Push notifications when new message arrives

### ВДЪХНОВЕНИЕ (Inspiration) Page
- Live card showing coach's real training & lifestyle data:
  - Coach avatar + name + training streak 🔥
  - Last 7 days training dots (💪 trained / 💤 rest day)
  - Last 7 days habit completion bars
  - Today: kcal logged, habits done, hours slept, trained ✓/—
  - Coach's check-in photos (last 60 days, tap to fullscreen)
- Coach inspiration posts (training and nutrition articles with photos)

### Profile & Settings
- Update name + avatar photo
- View assigned macro targets
- **Theme toggle** — dark (default) or light mode
- **Language toggle** — Bulgarian or English
- Sign out / push notification preferences

### Explore Tab
- **Ефективни продукти** — community-sourced recommended food products with photos, likes
- Learn page
- Shopping list

---

## Coach-Facing Features

### Client Management Panel (CoachPanel)
- List of all clients sorted by activity (active today first)
- Each card: name, kcal today, last active indicator
- Pending clients section (approve / deny)
- Unread chat badge per client

### Coach Navigation
ЧАТ | КЛИЕНТИ | ПРОФИЛ | МЕНЮ

### ClientDetail — Per-Client Tabs

| Tab | What coach can do |
|-----|------------------|
| ПРОГРЕС | 7-day kcal chart, habit bars, weight chart |
| ЧАТ | Full chat with client — text and photos |
| CHECK-IN | View all check-ins: weight, sleep, performance, desire, weekly win, progress photos |
| ХРАНЕНЕ | View/edit/delete food log by date; meal photo strip (last 30 days) |
| УПРАЖНЕНИЯ | Exercise diary by date + per-exercise progression chart |
| ПЛАН | Block-based training plan editor |
| ЦЕЛИ | Edit client name, target weight, per-client habit list |
| БЕЛЕЖКИ | Private coach notes per client |

- Macro targets bar always visible above tabs (edit kcal/protein/carbs/fat)
- Delete client with confirmation

### Showcase Manager
- Create/edit/delete inspiration posts (ТРЕНИНГ or ХРАНЕНЕ category)
- Photo per post
- Sort order control — posts appear on client ВДЪХНОВЕНИЕ page

### Chat (Coach)
- Select any client from chat tab → full conversation
- Photo messages, realtime, push notifications

---

## Notifications

- **Web Push** notifications (Android; iOS 16.4+ with PWA install)
- Triggered on: new chat message (text or photo)
- Powered by Supabase Edge Function (Deno) + VAPID/web-push
- Photo-only messages show "📷 Снимка" as notification body

---

## Technical Notes

- **Stack:** React 18, Vite, CSS Modules, Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **PWA:** Installable, offline-capable (Workbox precache), push notifications
- **AI:** Edge Function calls LLM for macro lookup by food name (MealBot)
- **Storage buckets:** `avatars`, `meal-photos`, `chat-photos`, `form-checkins`, `showcase-photos`
- **Auth:** Email/password via Supabase Auth, role-based (client/coach)
- **Database:** Row-Level Security on all tables; coach can see all clients' data
- **i18n:** Bulgarian/English toggle via SettingsContext (t() function, localStorage)
- **Theming:** Dark/light mode toggle, CSS custom properties, stored in localStorage
- **Charts:** SVG-only, no chart libraries
- **Emails:** Resend API (verified domain blag-coaching.com)

---

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `avatars` | Profile photos (coach + clients) |
| `meal-photos` | Food log entry photos |
| `chat-photos` | Chat message photos |
| `form-checkins` | Daily check-in progress photos |
| `showcase-photos` | Inspiration post photos |

---

## What the App Does NOT Have Yet

- Payment / subscription system (no Stripe, no billing)
- In-app live video sessions
- Public landing/marketing page
- Multiple coach UI (infrastructure exists in DB, not exposed)
- Calorie/macro goal auto-calculation (currently manual by coach)
- Meal planning / weekly meal prep
- Wearable integrations (Garmin, Apple Watch, etc.)
- Check-in trend aggregates in coach view (avg sleep, performance over time)
- Weekly automated push summary (kcal, habit %, weight change)

---

## Current Business Model

- Single coach (Nikolay/Blag) using the platform for his clients
- No monetisation implemented yet
- Infrastructure already supports multi-coach expansion (B2B)

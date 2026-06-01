# Blag Coaching — App Overview for Pricing Discussion

## What is Blag Coaching?

A Bulgarian-language **personal fitness coaching PWA** (Progressive Web App) — installable on iOS and Android like a native app. Built for a single coach (Blag) managing clients remotely, with infrastructure that can scale to support other coaches (B2B).

Live at: **blag-coaching.com**

---

## User Roles

| Role | Description |
|------|-------------|
| **Client** | A person being coached — tracks nutrition, training, habits, weight |
| **Coach** | Manages all clients, sets plans, monitors progress, communicates |

Clients require coach approval before accessing the app (gated onboarding). The coach can promote any user to coach role for B2B expansion.

---

## Client-Facing Features

### Nutrition Tracking
- Food search powered by **AI macro lookup** (Supabase Edge Function + LLM)
- **Barcode scanner** — scan any product, auto-fills macros
- **Open Food Facts** integration for packaged products
- Manual food entry with full macro control
- Daily food log with editable entries (name, grams, macros)
- Undo last removed entry
- Daily macro targets set by coach (kcal, protein, carbs, fat)
- Visual macro progress cards with ring/bar charts

### Recipes
- Create custom recipes with multiple ingredients (AI search, barcode, or manual per ingredient)
- Set servings count — log by portions or grams
- Optional photo per recipe
- Coach can share recipes with all clients
- Log a recipe directly to food diary

### Habit Tracking
- Daily habits defined by coach (e.g. "Drink 3L water", "Sleep 8h")
- One-tap completion per habit
- Compliance history view
- Weekly compliance percentage chart

### Weight Logging
- Log daily weight
- SVG line chart with progress over time (1M / 3M / ALL ranges)

### Training Plan
- Block-based training plan set by coach (e.g. Day A, Day B, Rest)
- View exercises per block with sets × reps targets
- Log weight/reps/sets per exercise with notes
- Per-exercise progression chart (weight over time)
- Mark block as completed for the day
- Workout history calendar with colored dots per block
- Undo last exercise log entry

### Training Calendar (Scheduling)
- Book training sessions with the coach
- Coach can confirm / decline / mark as completed
- Clients can propose time changes (coach approves)
- Filter sessions by client (coach view)
- Rest day quick-add button
- Upcoming vs. History tabs

### Messaging
- Real-time coach ↔ client chat (Supabase Realtime)
- Unread message badge on bottom navigation
- Push notifications when new message arrives

### Profile
- Update name, photo, personal stats (age, height, weight)
- View assigned macro targets and training plan

### Explore Tab
- **Ефективни продукти** (Efficient Products) — community-sourced list of recommended food products
  - Name, source (store), price, indicator (e.g. "High protein")
  - Optional photo with fullscreen lightbox tap
  - Like/upvote system (💪 reactions)
  - Sort by newest or most liked
  - Any user can contribute

---

## Coach-Facing Features

### Client Management Panel
- List of all clients with approval control
- View any client's full nutrition dashboard, compliance, weight chart
- Set individual macro targets per client
- Assign and edit training plans (block-based editor)
- Delete clients

### Training Editor
- Full drag-and-compose training block editor
- Add/remove/reorder exercises with sets, reps, notes
- Assign plans to specific clients

### Training Calendar (Coach View)
- See all clients' sessions in one calendar
- Filter by individual client
- Book sessions for clients
- Confirm, decline, complete sessions
- Accept/reject client-proposed time changes

### Messaging
- Chat with each client individually
- Push notifications on new messages

### Recipes
- Create recipes and toggle "Share with clients"
- Shared recipes appear in all clients' recipe library

---

## Notifications

- **Web Push** notifications (works on Android home screen; iOS 16.4+ with PWA install)
- Triggered on: new training session booked, session confirmed, new message
- Powered by Supabase Edge Function (Deno) + VAPID/web-push

---

## Technical Notes (relevant to pricing/scaling)

- **Stack:** React 18, Vite, CSS Modules, Supabase (Postgres + Auth + Realtime + Storage + Edge Functions)
- **PWA:** Installable, offline-capable (Workbox precache), push notifications
- **AI:** Edge Function calls LLM for macro lookup by food name
- **Storage:** Supabase Storage for product photos, recipe photos, profile photos
- **Auth:** Email/password via Supabase Auth, role-based (client/coach)
- **Database:** Row-Level Security on all tables; coach can see all their clients' data
- **Emails:** Resend API (verified domain blag-coaching.com) — sends on key events only

---

## What the App Does NOT Have Yet

- Payment / subscription system (no Stripe, no billing)
- In-app live video sessions
- Automated onboarding flow for new clients
- Public landing/marketing page
- Multiple coach support (infrastructure exists, not exposed in UI)
- Calorie/macro goal auto-calculation (currently manual by coach)
- Meal planning / weekly meal prep feature
- Sleep / recovery tracking
- Integration with wearables (Garmin, Apple Watch, etc.)

---

## Current Business Model

- Single coach (Blag) using the platform for his clients
- No monetisation implemented yet — discussing subscription tiers
- Infrastructure already supports multi-coach expansion (B2B)

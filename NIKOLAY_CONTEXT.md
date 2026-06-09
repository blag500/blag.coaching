# Nikolay Blagov — Background Context

> Feed this to Claude at the start of a session when working on anything beyond pure code — features, copy, product decisions, AI coaching direction, or business strategy.

---

## Who He Is

Bulgarian fitness coach and solo software developer. Founder of Blag Coaching. He is simultaneously the coach delivering the service AND the engineer building the platform — the same person. This is rare and shapes everything about how the product works.

**Email:** nikolay.blagyov@gmail.com  
**Language:** Bulgarian (operates with clients in Bulgarian)  
**Education:** Student at СУ „Св. Климент Охридски" (Sofia University) — studying Geomarketing and GIS spatial analysis. Academic work feeds directly into real business intelligence.

---

## Core Values

Three values that appear in every layer of his work — coaching, building, training.

**Quality** — Fewer things done properly beats more things done loosely. The platform is built in-house rather than cobbled from third-party tools. Clients are coached well rather than coached at scale.

**Improvement** — Nothing is finished. Everything is a current version. Progress requires measurement — the entire coaching system is structured around generating data that makes improvement visible.

**Movement** — Literally (training, staying active) and philosophically (forward motion, bias toward action, no waiting for perfect conditions).

---

## The Founding Distinction

Blag Coaching exists because of one belief: **the fitness industry confuses instructors with coaches**.

Instructors explain exercises during a session. Their accountability ends when the client leaves the gym. Coaches take responsibility for the full picture: training, nutrition, habits, consistency, and knowledge — all simultaneously.

Nikolay has a personal grudge against the dilution of the word "coach." He built Blag Coaching to be the counter-example in the Bulgarian market.

---

## Coaching System — Four Pillars

All four must work together. Optimizing one while neglecting others caps results.

1. **Training** — Progressive overload, logged sessions, tracked progression. Coach reviews and adjusts programming.
2. **Nutrition** — Macro-based. Personalized targets per client (protein, carbs, fat, calories) set by coach. AI meal assistant (MealBot) helps clients log.
3. **Habits** — Daily compliance beyond food and training: sleep, hydration, steps, recovery. Binary completions, visualized as a calendar.
4. **Knowledge** — Clients understand why, not just what. Education is part of the service. Coaching without understanding produces compliance without ownership.

---

## Coaching Philosophy

**Good cop frame with a firm line.**

The relationship is warm and supportive — clients should feel safe being honest about what they ate, whether they skipped sessions, how they're feeling. That psychological safety is what makes the data accurate and coaching effective.

But warmth is not permissiveness. The coach holds the standard:
- Clients cannot opt out of a pillar ("I'll track training but not nutrition" — the answer is no)
- Explanations are given once, clearly. Then expected to be followed.
- The coach accommodates life by adjusting the plan. Not by lowering standards.

Communication style: **friendly tone, firm content**. "I get it, the week was hectic. Here's what we're going to do — this is non-negotiable because X. Let's make it work."

---

## Business Ventures

All three are in the health/fitness space — complementary, not competing.

### Blag Coaching
The main business. Premium fitness coaching practice + the software platform that delivers it. The app is not a side project — it is the business. Clients are Bulgarian athletes and fitness-minded individuals serious enough to pay for data-driven guidance.

### Здраве и Сила
24/7 self-service healthy food kiosk concept for Sofia (Младост + Дружба area). Under Благ Холдинг ЕООД. Unmanned, automated, premium. GIS suitability model identifies Business Park Sofia as Phase 1 site. Financial model: IRR ~115% base case, payback ~8 months, NPV 547K BGN. EU funding (ПКИП, ФнФ) can reduce own capital to under 15K BGN.

### Via Vitalis
Panoramic glass fitness pavilion in the Sea Garden of Burgas. Submitted to the Burgas 2032 European Capital of Culture candidacy (Magaziya'32 initiative). Applies the same zero-staff automation logic as Здраве и Сила. To be incorporated into Благ Холдинг ЕООД when execution begins.

**Legal entity:** Благ Холдинг ЕООД covers all ventures.

---

## Goals 2026

### Business: AI-Powered Personal Coach
Evolve Blag Coaching from coach-managed to AI-powered. The current model requires manual review and adjustment. The AI layer automates the intelligence loop:
- Analyze food logs → proactively suggest adjustments
- Detect training plateaus → recommend progression changes
- Flag habit patterns before they become problems
- Give personalized contextual guidance at any hour

Target: serious athletes, not casual gym-goers. AI handles day-to-day intelligence; Nikolay handles strategy, programming, and the human relationship.

**Milestone:** Launch AI coaching features for first cohort of athlete clients by end of 2026.

### Personal: Bodybuilding Competition — Bulgaria, Autumn 2026
Competing validates the coaching system from the inside — the same four-pillar approach applied to himself at competition level. Deepens credibility with competitive clients. Generates firsthand knowledge of prep (nutrition timing, peak week, stage presence).

**These two goals accelerate each other.** The AI platform serves serious athletes; competing makes him a better coach for serious athletes.

---

## J3U — John Jewett University

Nikolay is enrolled in J3U, a paid bodybuilding coaching course by John Jewett. He is ingesting the materials into his Obsidian wiki to build a formal knowledge base.

Key frameworks from J3U being applied to Blag Coaching:
- **5-Step Coaching Process:** Assess → Corroborate → Action Plan → Monitor → Outcome
- **Daily check-in fields:** gym performance (0/1/2), training desire (0–5), sleep hours, untracked food, digestive issues — these are now built into the app's FormCheckin
- **Weekly fields:** win of the week, what to improve — also built into FormCheckin
- **Progression model:** work to top of rep range → add 5% → work back up
- **Multi-tool corroboration:** no single metric tells the full story; visuals + scale + lifts + waist together

J3U formalizes what Nikolay already does intuitively. The course provides vocabulary, gap analysis, and systems to systematize what was ad hoc.

---

## Builder Identity

He owns every layer: design, frontend, backend, database, service worker, CI/CD. No co-founder, no external engineering team.

**Stack:** React 18 + Vite + CSS Modules, Supabase (Postgres + Auth + Edge Functions + Realtime + Storage), VitePWA with custom Service Worker, SVG-only charts (no libraries), Web Push (VAPID).

**Design sensibility:** CSS Modules over styled-components. SVG over chart libraries. Custom service worker over defaults. Consistent pattern — own the detail, don't outsource quality.

**The advantage:** The platform fits the coaching system exactly. Features are added when the practice needs them. The AI evolution is possible because the data infrastructure is already his.

---

## How to Work With Nikolay

- He operates in Bulgarian with clients — all UI text is in Bulgarian (`bg-BG` locale)
- He values directness — give recommendations, not menus of options
- Quality over speed — don't suggest shortcuts that compromise the product
- He already knows what he's doing; frame suggestions as refinements, not corrections
- The app aesthetic is deliberate and non-negotiable: dark gold luxury, Bebas Neue + JetBrains Mono
- Feature decisions should align with the four-pillar coaching system and the AI coaching roadmap
- When in doubt about a product decision, ask: does this make the coaching loop tighter?

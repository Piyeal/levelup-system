# ⚔️ Level Up System — "THE SYSTEM"

A *Solo Leveling* inspired real-life progression app. Complete daily quests across fitness, nutrition, sleep, screen time, work, and mental health to earn XP, level up, climb ranks (E → Monarch), build streaks, unlock achievements, and get a weekly grade. Miss days and the penalty engine docks XP — fair, but real.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL · NextAuth · Recharts**.

---

## 1. Prerequisites

- **Node.js 18.18+** (or 20+) — https://nodejs.org
- A **PostgreSQL** database. Easiest free options:
  - [Neon](https://neon.tech) (serverless Postgres, great with Vercel)
  - [Supabase](https://supabase.com)
  - [Railway](https://railway.app)
  - or local Postgres

## 2. Install

```bash
npm install
```

## 3. Configure environment

Copy the example and fill it in:

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/levelup?schema=public"
NEXTAUTH_SECRET="paste-a-long-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

Generate a secret:

```bash
openssl rand -base64 32
```

## 4. Create the database tables

```bash
npm run db:push      # pushes the Prisma schema to your database
```

(For versioned migrations instead, use `npx prisma migrate dev --name init`.)

## 5. Run it

```bash
npm run dev
```

Open **http://localhost:3000** → you'll be sent to `/login`. Click **Register**, create an account, and you're in. Your daily quests are generated automatically.

Useful extras:

```bash
npm run db:studio    # visual database browser at localhost:5555
```

---

## 6. Project structure

```
prisma/schema.prisma        # User, Player, QuestInstance, QuestTemplate,
                            #   AchievementUnlock, ActivityLog

src/lib/
  constants.ts              # difficulty/XP, categories, ranks, achievements,
                            #   default daily quest templates (shared client+server)
  leveling.ts               # XP→level math, rank lookup, date helpers (pure)
  game.ts                   # SERVER-AUTHORITATIVE engine: quest generation,
                            #   penalty, toggle, streaks, achievements, weekly eval
  prisma.ts                 # Prisma client singleton
  auth.ts                   # NextAuth config (Credentials + JWT sessions)
  session.ts                # getUserId() helper for route handlers

src/app/api/
  auth/[...nextauth]/       # NextAuth handler
  auth/register/            # POST email+password signup (bcrypt)
  state/                    # GET full game state (ensures today's quests + penalty)
  quests/toggle/            # POST complete / un-complete a quest
  quests/custom/            # POST create a custom quest
  quests/[id]/              # DELETE a quest
  player/                   # PATCH settings (name, protein goal, gym goal)
  reset/                    # POST wipe progress

src/app/
  login/page.tsx            # sign in / register screen
  dashboard/page.tsx        # auth-guarded server page
  layout.tsx, globals.css, page.tsx
src/components/
  SystemDashboard.tsx       # the RPG UI (quests, stats, trophies, settings)
  Providers.tsx             # SessionProvider
src/middleware.ts           # protects /dashboard
```

## 7. How the mechanics map to the spec

- **Leveling** — XP to go from level *n* → *n+1* is `100 × n`. Level is derived purely from lifetime XP, so penalties can genuinely demote you. (`src/lib/leveling.ts`)
- **Ranks** — E (1–10), D (11–20), C, B, A, S, National, Monarch (71+).
- **Daily quests** — auto-generated each day from default templates + your custom ones, grouped by category, with Easy/Medium/Hard/Epic = 10/25/50/100 XP.
- **Penalty engine** — runs once per day; missing days costs 50 XP/day (capped at 3) and resets your streak. Designed to be *fair*, not punishing.
- **Weekly evaluation** — letter grade S–F based on completion %, plus per-category counts and a 7-day XP chart.
- **Achievements** — 10 unlockables checked server-side after every completion.
- **All mutations are server-authoritative** — the client never decides XP; it asks the API and re-renders from the returned state. No way to cheat from the browser.

## 8. Deploy (Vercel + Neon, ~5 min)

1. Push this repo to GitHub.
2. Create a Postgres database on Neon and copy its connection string.
3. Import the repo into Vercel. Add env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` (your production URL, e.g. `https://yourapp.vercel.app`).
4. The `build` script runs `prisma generate` automatically. After the first deploy, run `npx prisma db push` against the production DB (e.g. locally with the prod `DATABASE_URL`, or via a one-off command).

## 9. Notes & next steps

- **Time zones:** "today" uses the server's local date. For a production multi-user app, store the user's time zone and compute the day boundary per-user.
- **OAuth:** sessions use JWT + Credentials so it runs with zero OAuth keys. To add GitHub/Google, drop a provider into `src/lib/auth.ts` and add its env vars — no schema change needed.
- **Architecture is ready for** the roadmap items (AI-generated quests, wearable/Google Fit/Apple Health sync, leaderboards, guilds, boss fights): quests are already first-class rows, and the engine is isolated in `src/lib/game.ts`, so new sources/rules slot in cleanly.

Consistency > perfection. Now go level up. ⚔️

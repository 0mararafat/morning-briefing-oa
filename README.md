# Morning Briefing

Your own daily intelligence briefing — researched and written by Claude, waiting
for you every morning. Sign in, tell it what you care about, and read a sharp,
sourced edition of the world's news through your lens.

No feeds to scroll. No newsletter pile-up. One clean briefing a day, on your
topics, on your schedule.

Based on and inspired by [HarveySanghera98-Labs/MorningBriefing](https://github.com/HarveySanghera98-Labs/MorningBriefing).

---

## What's in your briefing

Six sections, written fresh for you each morning:

- **Top Stories** — the biggest developments across your topics, ranked by what matters most, each with the full context and links to sources.
- **Sector Scan** — every topic you follow at a glance, flagged for whether there's fresh news today.
- **Week Ahead** — what's coming: earnings, launches, economic data, hearings, and other events on your radar.
- **Pattern Watch** — speculative, connect-the-dots analysis that links the day's stories into bigger themes worth watching.
- **Deep Dive** — one long-form, sourced read each day on a single story or theme. The subject rotates and never repeats.
- **Signal Scan** — what the specific people you follow have said recently, summarised with a note on why it matters.

It reads like a premium morning paper, with light and dark themes.

---

## Getting started

1. **Sign in** with GitHub or Google.
2. **Set up your edition** in a short wizard:
  - **Topics** you want to follow, in priority order
  - **Sources** you trust (or add your own)
  - **Sections** to turn on or off
  - **Voices** — specific people whose output you want tracked
  - **Schedule** — the time, timezone, and days it arrives
3. **Choose how it runs** (see below).
4. **Read it** on your dashboard each morning. Past editions are always a click away.

---

## Two ways to run it

On the last step of setup, pick whichever suits you:

- **Use your Claude subscription** — the easiest way to start. No API key, nothing
  sensitive to store. You drop a generated prompt into a scheduled Claude routine,
  which posts the finished briefing back to your account each morning.

- **Use your own API key** — bring your Anthropic key for full control over models
  and limits; you pay the provider directly. Your key is encrypted and stored
  securely. Best for power users.

Either way, every briefing is dated correctly for **your** timezone, so it never
lands on the wrong day.

---

## Your data

Each account is private and independent. Your topics, sources, and briefings are
yours alone, visible only to you unless you choose to share a specific edition.

---

# For developers

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | [Next.js 15](https://nextjs.org) (App Router), React 19, TypeScript |
| Auth | [Auth.js / NextAuth v5](https://authjs.dev) — GitHub + Google OAuth |
| Database | [Supabase](https://supabase.com) Postgres via [Prisma 6](https://www.prisma.io) |
| Background jobs | [Inngest](https://www.inngest.com) (daily scheduler + per-user generation) |
| AI | [Anthropic SDK](https://docs.anthropic.com) (`@anthropic-ai/sdk`) + web search |
| Feeds | `rss-parser` for the Signal Scan |
| Dates | Luxon (per-user timezones) |
| Validation | Zod |
| Styling | Tailwind + CSS-variable design tokens (light/dark) |
| Tests | Vitest (golden/parity, crypto, schedule, ingest, rate-limit) |

## Project structure

```
app/
  (marketing)/       Public landing page
  (app)/             Authenticated area (guarded by (app)/layout.tsx)
    dashboard/         Latest edition + controls
    briefings/         Archive index and per-date viewer
    setup/             Config wizard + run-mode connect screen
  share/[token]/     Public, unauthenticated shared-briefing view
  signin/            OAuth sign-in
  api/               Route handlers (config, key, share, run, ingest, inngest, …)
components/
  viewer/            BriefingView (the canonical renderer) + share control
  wizard/            Multi-step setup wizard
lib/
  generator/         The briefing pipeline (orchestrate → section generators → render)
  auth, db, crypto, secrets, share, schedule, config, …
inngest/             Inngest client + functions (daily-scheduler, generate-user-briefing)
prisma/              Schema + migrations
reference/           Original Python app + sample data (drives the golden tests)
design_handoff_.../  Design-system tokens and HTML prototypes
tests/               Vitest suites and golden fixtures
```

## Local development

**Prerequisites:** Node 20+, a Supabase (or any Postgres) database, and GitHub +
Google OAuth apps.

1. **Register OAuth callback URLs** (or sign-in will fail):
   - GitHub → Developer settings → OAuth Apps → callback
     `http://localhost:3000/api/auth/callback/github`
   - Google → Cloud Console → Credentials → authorized redirect URI
     `http://localhost:3000/api/auth/callback/google`

2. **Install and configure**
   ```bash
   npm install
   ```
   Create `.env.local` with the variables below. Prisma's CLI reads `.env` (not
   `.env.local`), so also put `DATABASE_URL` and `DIRECT_URL` in a gitignored
   `.env`. Both files are gitignored.

3. **Create the database tables**
   ```bash
   npm run db:generate
   npm run db:migrate          # applies migrations to DIRECT_URL
   ```

4. **Run the two dev servers** (two terminals)
   ```bash
   npm run dev                 # app at http://localhost:3000
   npm run inngest:dev -- -u http://localhost:3000/api/inngest
   ```
   The Inngest dashboard (http://localhost:8288) should list `daily-scheduler`
   and `generate-user-briefing`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled Postgres URL (PgBouncer, port 6543, `?pgbouncer=true`) — app runtime |
| `DIRECT_URL` | Direct Postgres URL (port 5432) — Prisma migrations |
| `AUTH_SECRET` | NextAuth session/JWT secret (`openssl rand -base64 32`) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth app credentials |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client credentials |
| `APP_ENCRYPTION_KEY` | 32 bytes base64 (`openssl rand -base64 32`) — encrypts stored API keys |
| `NEXT_PUBLIC_APP_URL` | Public base URL, used to build share links |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Inngest keys (blank for local dev; set by the Vercel integration in prod) |

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | `prisma generate` + `next build` |
| `npm test` | Run the Vitest suites once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:migrate` | Create/apply a migration (dev) |
| `npm run db:deploy` | Apply migrations (prod/CI) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run inngest:dev` | Run the local Inngest dev server |

## How generation works

`lib/generator/orchestrate.ts` runs a three-stage, mostly-parallel pipeline that
is transport-agnostic (a pure function of config + state + date):

1. **Stage 1** — main briefing, deep dive, and RSS fetch in parallel.
2. **Stage 2** — signal scan (weekly-cached) and pattern watch.
3. **Render** — assemble the `Briefing` JSON; a standalone HTML snapshot is also
   built (`render/render.ts`) and stored for share/export.

In the live app, Inngest's `generate-user-briefing` invokes this, then the
[`BriefingView`](components/viewer/BriefingView.tsx) component renders the JSON —
the single source of truth for how an edition looks (dashboard, archive, and
public share pages all use it). Routine mode instead posts a finished briefing to
`POST /api/ingest` with a per-user bearer token.

## Testing

```bash
npm test
```

Golden tests pin prompt and render output against the original Python reference
(`reference/`), so parity regressions are caught. Other suites cover crypto,
scheduling, ingest, and rate limiting.

## Deploying to Vercel

1. Push to GitHub and import the repo into Vercel.
2. Add every environment variable above, but set `NEXT_PUBLIC_APP_URL` to your
   real URL and register **production** OAuth callback URLs.
3. Connect the **Inngest → Vercel integration** (it sets `INNGEST_EVENT_KEY` /
   `INNGEST_SIGNING_KEY` and registers `/api/inngest` automatically).
4. `prisma migrate deploy` runs on build (via the `build` script).
5. API-key mode runs for several minutes per briefing → use Vercel **Fluid
   Compute / Pro** for the extended function duration.

## Security notes

- Anthropic API keys are encrypted at rest with `APP_ENCRYPTION_KEY`
  (AES-GCM, see [`lib/crypto.ts`](lib/crypto.ts)); only the last four digits are
  ever returned to the client.
- All database access goes through Prisma using the connection-string role — the
  app never uses Supabase's public Data API. Enable Row Level Security on all
  `public` tables (deny-all is enough) to lock down that API surface; Prisma
  connects as the table owner and bypasses RLS.
- Every query is scoped by `userId`; share links are opt-in per edition and
  revocable.

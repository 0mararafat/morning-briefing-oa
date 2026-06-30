# Morning Briefing — local setup & run

Your steps to get the app running locally and produce a first briefing.
`.env.local` is already filled (Supabase, GitHub/Google OAuth, secrets). Inngest
keys stay blank for local dev. **Never commit `.env.local`** — it's gitignored.

---

## 0. One-time: register OAuth callback URLs

You created the OAuth apps, but make sure each has the right **callback URL**, or
sign-in will fail:

- **GitHub** → Settings → Developer settings → OAuth Apps → your app →
  Authorization callback URL = `http://localhost:3000/api/auth/callback/github`
- **Google** → Cloud Console → Credentials → your OAuth client → Authorized
  redirect URIs → add `http://localhost:3000/api/auth/callback/google`

---

## 1. Install dependencies (if not already)

```bash
npm install
```

## 2. Create the database tables (Prisma migration)

This reads `DIRECT_URL` and creates all tables in your Supabase database:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

✅ Success looks like: "Your database is now in sync with your schema."
You can confirm in Supabase → Table Editor (you'll see User, Briefing, etc.),
or run `npx prisma studio` to browse it.

> If this errors with a connection/timeout, see **Troubleshooting → Database** below.

## 3. Start the two dev servers (two terminals)

**Terminal A — the app:**
```bash
npm run dev
```
→ app at http://localhost:3000

**Terminal B — Inngest (background jobs):**
```bash
npx inngest-cli dev -u http://localhost:3000/api/inngest
```
→ Inngest dashboard at http://localhost:8288
(The `-u` flag points it straight at your app so it finds the functions.)

In the Inngest dashboard you should see two functions:
`daily-scheduler` and `generate-user-briefing`.

## 4. Use the app

1. Open http://localhost:3000 → **Get started** → sign in with GitHub or Google.
2. Run the **setup wizard** (Topics → Sources → Sections → Voices → Schedule → Mode).
3. On the **Mode** step pick one:
  - **Use my own API key** → next screen: paste your `sk-ant-…` key, click **Save**,
     then **Run now**. Watch the run in the Inngest dashboard (Terminal B); when it
     finishes, your briefing shows on **/dashboard**. *(A real run makes live Claude +
     web-search calls and takes a few minutes.)*
  - **Use my Claude subscription** → next screen: click **Generate routine prompt &
     token**, copy them, and paste into a scheduled Claude routine. To test the
     plumbing without waiting, you can POST a sample yourself (see below).

### Optional: test routine-mode ingest without a real routine
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Authorization: Bearer YOUR_TOKEN_FROM_THE_CONNECT_SCREEN" \
  -H "Content-Type: application/json" \
  -d "{\"data\": $(cat reference/sample-briefing.json) }"
```
The briefing is stamped with today's date in your configured timezone — no `date`
field needed (pass one only to backfill a specific day). Then refresh
**/dashboard** — the sample briefing should render.

## 5. Run the tests (anytime)

```bash
npm test
```
Expected: all suites pass (prompt parity, extract-json, render, schedule, ingest, crypto).

---

## Troubleshooting

### "Environment variable not found: DIRECT_URL"
The Prisma CLI reads **`.env`**, not `.env.local`. There's a gitignored `.env`
holding just `DATABASE_URL` + `DIRECT_URL` (mirrored from `.env.local`) so Prisma
can see them. If you change those values, update them in `.env` too.

### Database (`prisma migrate` fails to connect)
- Supabase's **direct** host (`db.<ref>.supabase.co`) is IPv6-only on some
  networks. If migration times out, set **`DIRECT_URL`** to the Supabase
  **Session pooler** string instead: same as your pooled URL but **port 5432**
  and **no** `pgbouncer` flag, e.g.
  `postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres`
- If you get an auth/parse error, your DB password contains a special character
  (e.g. an apostrophe). URL-encode it in both URLs — `'` becomes `%27`.

### Sign-in fails / redirect error
- The OAuth callback URL isn't registered (see step 0), or the ID/secret in
  `.env.local` doesn't match the OAuth app.

### Inngest shows no functions
- Make sure **Terminal A** (`npm run dev`) is running, then restart Terminal B
  with the `-u http://localhost:3000/api/inngest` flag.

---

## Later: deploy to Vercel

1. Push the repo to GitHub, import into Vercel.
2. In Vercel → Project → Settings → Environment Variables, paste every value from
   `.env.local`, but:
  - Set `NEXT_PUBLIC_APP_URL` to your real Vercel URL.
  - Add **production** OAuth apps/redirect URIs (`https://YOURDOMAIN/api/auth/callback/...`).
  - Connect the **Inngest → Vercel integration** (it sets `INNGEST_EVENT_KEY` and
     `INNGEST_SIGNING_KEY` automatically and registers `/api/inngest`).
3. `npx prisma migrate deploy` runs against your DB on build (already in the build script).
4. API-key mode needs functions that run several minutes → Vercel **Pro / Fluid
   Compute** for the extended duration.

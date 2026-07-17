# Setup & Deployment — kiro-week5-notes

This app is fully built. What's left are the account-level steps that need your
own Supabase and Vercel logins. Follow these in order.

---

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Give it a name (e.g. `kiro-week5-notes`) and a strong database password (save it somewhere private).
3. Pick a region close to you and click **Create new project**. Wait ~1 minute for it to provision.

## 2. Create the database table + security rules

1. In your project, open **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` in this repo, copy its entire contents, paste into the editor.
3. Click **Run**. This creates the `notes` table, an index, an `updated_at` trigger, turns
   **Row-Level Security ON**, and adds owner-scoped policies (each user only touches their own rows).

## 3. Get your API keys

1. Go to **Project Settings** → **API**.
2. Copy the **Project URL** and the **anon public** key.
   - The anon key is safe to expose in the browser. Do **not** use the `service_role` key here.

## 4. Run locally (optional but recommended)

1. Open `.env.local` in this repo and fill in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```
2. In a terminal inside `kiro-week5-notes`, run:
   ```
   npm run dev
   ```
3. Open http://localhost:3000 — you'll be redirected to `/login`. Sign up, then start adding notes.

> Note on email confirmation: by default Supabase may require email confirmation on sign-up.
> For quick testing, go to **Authentication → Providers → Email** and toggle
> **Confirm email** OFF, or confirm via the link Supabase emails you.

## 5. Deploy to Vercel

1. Go to https://vercel.com/new and **import** your GitHub repo (`Thickn00dles/KIRO5`).
2. **IMPORTANT — set the Root Directory.** This app lives in a subfolder, so in the import
   screen click **Edit** next to *Root Directory* and select **`kiro-week5-notes`**.
   (Next.js is auto-detected; leave build/output settings as default.)
3. Under **Environment Variables**, add both:
   | Name                            | Value                          |
   |---------------------------------|--------------------------------|
   | `NEXT_PUBLIC_SUPABASE_URL`      | your Project URL               |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key           |
4. Click **Deploy**.

## 6. Test the live app

Open the deployed URL and verify the full flow:
1. **Sign up** with one account, add a couple of notes.
2. **Sign out**, then **sign up** with a second account.
3. Confirm the second account sees an **empty** list — it cannot see the first account's notes.
   This proves Row-Level Security is working.

## 7. Security checklist before calling it done

- [ ] RLS is **ON** for the `notes` table (the SQL script does this).
- [ ] All four policies exist: select / insert / update / delete, each scoped to `auth.uid() = user_id`.
- [ ] Only the **anon** key is in the env vars — never the `service_role` key.
- [ ] `.env.local` is git-ignored and was never committed.

---

## Project structure reference

```
kiro-week5-notes/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx            # Protected notes dashboard
│  │  ├─ login/page.tsx      # Login page
│  │  ├─ signup/page.tsx     # Sign up page
│  │  ├─ auth/actions.ts     # login / signup / logout server actions
│  │  └─ notes/actions.ts    # create / update / delete note server actions
│  ├─ components/            # AuthForm, NoteComposer, NoteCard
│  ├─ lib/
│  │  ├─ supabase/           # browser client, server client, session middleware
│  │  └─ types.ts            # Note type
│  └─ middleware.ts          # route protection + session refresh
└─ supabase/schema.sql       # table + RLS policies (run this in Supabase)
```

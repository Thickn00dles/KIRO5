# PRD — kiro-week5-notes

## 1. Overview
A minimal full-stack **personal notes app**. Each user creates an account, logs in,
and manages a private list of notes. Notes are strictly per-user: no one can see
another user's data. Built to demonstrate authentication + a database with proper
security, kept intentionally small so it can be finished in one week.

## 2. Goals
- Demonstrate real authentication (sign up, log in, log out).
- Demonstrate persistent, per-user data (notes stored in a database).
- Enforce data isolation at the database level (Row-Level Security), not just in the UI.

## 3. Non-Goals (explicitly out of scope for this week)
- Sharing notes between users or collaboration.
- Rich text / markdown editor, attachments, images.
- Tags, folders, search, or sorting beyond newest-first.
- Password reset emails, OAuth/social login, profile pages.
- Mobile app. (Responsive web is enough.)

## 4. Target User
A single individual who wants a private place to jot and manage short notes.

## 5. Tech Stack
- **Frontend + Backend:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **Auth + Database:** Supabase (Postgres + Supabase Auth)
- **Hosting:** Vercel
- **Data access:** `@supabase/supabase-js` with `@supabase/ssr` for session handling

## 6. Core Features (MVP)
### 6.1 Authentication
- Sign up with email + password.
- Log in with email + password.
- Log out.
- Unauthenticated users are redirected to the login page when visiting protected routes.

### 6.2 Notes CRUD
- **Create** a note (title + body).
- **Read** a list of the current user's notes (newest first).
- **Update** an existing note.
- **Delete** a note.

### 6.3 Security
- Each note row stores the owning `user_id`.
- Row-Level Security (RLS) is enabled so users can only select/insert/update/delete
  their own rows, enforced by Postgres regardless of client code.

## 7. Data Model
### Table: `notes`
| Column      | Type        | Notes                                        |
|-------------|-------------|----------------------------------------------|
| `id`        | uuid        | Primary key, default `gen_random_uuid()`     |
| `user_id`   | uuid        | FK to `auth.users(id)`, default `auth.uid()` |
| `title`     | text        | Required                                     |
| `body`      | text        | Optional                                     |
| `created_at`| timestamptz | Default `now()`                              |
| `updated_at`| timestamptz | Default `now()`                              |

## 8. Pages / Routes
- `/login` — login form (+ link to sign up)
- `/signup` — sign up form
- `/` (or `/notes`) — protected: list + create + edit + delete notes
- Server-side redirect to `/login` if no session.

## 9. Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (public)
- (Secrets like the `service_role` key are NOT used in the client and NOT committed.)

## 10. Acceptance Criteria
- A new user can sign up, then log in.
- A logged-in user can create, edit, and delete notes and see them persist across reloads.
- Logging in as a different user shows a different, empty notes list.
- Attempting to query another user's notes returns nothing (verified via RLS).
- Visiting the notes page while logged out redirects to `/login`.
- App builds cleanly and deploys to Vercel.

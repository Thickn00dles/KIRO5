# PRD — Reverse Snake 🧲

## 1. Overview
A fast, arcade-style browser game added to the existing app. The twist: instead of
a head dragging a passive tail, **your tail is chasing your head**. You steer the
head with the arrow keys and flee; every orb you grab makes your tail longer — and
a longer tail is more likely to catch you. Get caught (or hit a wall) and it's game
over. Scores are saved to a global **leaderboard** so players compete for the top spot.

Sits behind the same Supabase login the app already uses. You must be signed in to play.

## 2. Goals
- A polished, responsive arcade game controlled by the keyboard.
- Persist scores per user and show a shared leaderboard (the "scoreboard").
- Reuse existing auth; keep the login gate in front of the game.

## 3. Non-Goals
- Multiplayer / real-time play.
- Touch/mobile on-screen controls (keyboard only for v1; still renders responsively).
- Accounts/profiles beyond what auth already provides.

## 4. Gameplay
- **Grid:** fixed square grid (e.g. 21x21 cells) rendered on a canvas.
- **Control:** Arrow keys (and WASD) change direction. You cannot instantly reverse 180°.
- **Orbs:** one orb spawns at a random empty cell. Grabbing it +1 length, +score, respawns.
- **Speed:** the tick rate speeds up slightly as your score climbs (difficulty ramp).
- **Lose conditions:** head hits a wall, or the tail (body) catches the head.
- **Pause:** Space toggles pause. Enter/Space restarts from the game-over screen.
- **Theme:** head glows bright; the tail fades toward a "danger" color at its tip to
  sell the chase.

## 5. Scoreboard / Leaderboard
- On game over, the run's score is submitted to Supabase.
- Leaderboard shows the **top 10 scores** across all players (name + score).
- The current player's **personal best** is highlighted.
- A player is shown by a display name derived from their email local-part
  (the text before `@`) — full emails are never exposed.

## 6. Data Model
### Table: `scores`
| Column       | Type        | Notes                                        |
|--------------|-------------|----------------------------------------------|
| `id`         | uuid        | Primary key, default `gen_random_uuid()`     |
| `user_id`    | uuid        | FK to `auth.users(id)`, default `auth.uid()` |
| `player_name`| text        | Display name (email local-part)              |
| `score`      | integer     | >= 0                                         |
| `created_at` | timestamptz | Default `now()`                              |

### Row-Level Security
- **Insert:** a user may insert only rows where `user_id = auth.uid()`.
- **Select:** any authenticated user may read all rows (needed for a shared leaderboard).
- **Update/Delete:** not allowed (scores are immutable once set).

## 7. Routes
- `/game` — protected. Renders the game + leaderboard. Redirects to `/login` if signed out.
- Navigation links between `/` (notes) and `/game`.

## 8. Acceptance Criteria
- Signed-out users visiting `/game` are redirected to `/login`.
- Arrow keys move the head; eating orbs grows the tail and increases the score.
- Hitting a wall or your own tail ends the game.
- On game over, the score is saved and the leaderboard updates without a full reload.
- The leaderboard shows top 10 scores and highlights the player's best.
- No other player's full email is visible anywhere.

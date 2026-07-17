# PRD — Reverse Snake (full-stack game)

## 1. Overview
A single-game full-stack app. Users sign in and are taken **straight to the Reverse Snake
game**, which has a global leaderboard. Auth and data (scores, display names) are handled by
Supabase. The login gate stays in front of the game.

## 2. Goals
- One shared login (Supabase Auth) in front of the game.
- After login, land directly on the game — no menus or other pages.
- Persist scores per user and show a shared leaderboard of unique players by best score.
- An editable display name used on the leaderboard.

## 3. Non-Goals
- Multiple games / a game hub.
- Notes or any non-game features.
- Real-time multiplayer.

## 4. Gameplay — Reverse Snake 🧲
Your tail chases your head. Steer the head with arrow keys/WASD and flee; grab orbs to grow.
A longer tail is more likely to catch you. Hitting a wall or your own tail ends the run.
- 21×21 grid on a canvas; one orb at a time; speed ramps up with score.
- Space: pause/resume. Enter: start/restart.
- `score` = orbs eaten (higher is better).

## 5. Flow
1. Visit app → redirected to `/login` if signed out.
2. Sign in → land directly on the game (`/`).
3. Play → on game over the score is submitted; the leaderboard updates.
4. Optional: change your display name (applies across the whole leaderboard).

## 6. Data Model
### Table `scores`
| Column       | Type        | Notes                                   |
|--------------|-------------|-----------------------------------------|
| `id`         | uuid        | PK                                      |
| `user_id`    | uuid        | FK auth.users, default `auth.uid()`     |
| `player_name`| text        | Snapshot of display name at submit time |
| `score`      | integer     | >= 0                                    |
| `created_at` | timestamptz | default now()                           |

### Table `profiles`
| Column        | Type | Notes                           |
|---------------|------|---------------------------------|
| `user_id`     | uuid | PK, FK auth.users               |
| `display_name`| text | 2–24 chars, shown on the board  |

### Row-Level Security
- `scores`: authenticated users read all (leaderboard); users insert only their own rows.
- `profiles`: authenticated users read all names; users insert/update only their own.

## 7. Leaderboard
- Top 10 **unique** players by their **best** score.
- Names come from `profiles`, so a rename updates the whole board.
- The current player's row is highlighted; personal best shown in the HUD.

## 8. Acceptance Criteria
- Signed-out users are redirected to `/login`.
- After sign-in the user lands directly on the game (no intermediate page).
- Movement, growth, collision, pause, and game-over all work.
- On game over the score is saved and the leaderboard updates without a full reload.
- Each player appears once on the board (their best), by name (no emails exposed).
- Changing the display name updates it across the leaderboard.

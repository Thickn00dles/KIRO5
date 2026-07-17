# PRD — Reverse Snake 🧲 (slug: `reverse-snake`)

## Concept
Arcade snake with a twist: your tail chases your head. Steer with arrow keys/WASD,
grab orbs to grow. A longer tail is more likely to catch you. Wall hit or self-collision
ends the run.

## Controls
- Arrow keys or WASD to change direction (no instant 180° reversal).
- Space: pause/resume. Enter: start/restart.

## Rules
- 21×21 grid on a canvas. One orb at a time.
- Eat orb → +1 length, +1 score, orb respawns.
- Speed ramps up as score rises.
- Lose on wall or tail collision.

## Score
- `score` = number of orbs eaten. Higher is better.

## Leaderboard
- Top 10 unique players by best snake score.

## Acceptance
- Movement, growth, collision, pause, and game-over all work.
- On game over the score is submitted under `reverse-snake`.

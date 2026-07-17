"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GRID = 21; // cells per side
const SIZE = 483; // canvas logical px (multiple of GRID -> 23px cells)
const CELL = SIZE / GRID;
const BASE_SPEED = 135; // ms per step at score 0
const MIN_SPEED = 60;

type Point = { x: number; y: number };
type Status = "idle" | "running" | "paused" | "over";

type Props = {
  submitScore: (score: number) => Promise<{ error: string | null }>;
  personalBest: number;
};

function randomEmptyCell(snake: Point[]): Point {
  while (true) {
    const p = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export default function ReverseSnake({ submitScore, personalBest }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mutable game state lives in refs so the animation loop always sees fresh values.
  const snakeRef = useRef<Point[]>([]);
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const pendingDirRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 10, y: 10 });
  const scoreRef = useRef(0);
  const statusRef = useRef<Status>("idle");
  const lastStepRef = useRef(0);
  const rafRef = useRef<number>(0);
  const submittedRef = useRef(false);

  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(personalBest);

  const setStatusBoth = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const resetGame = useCallback(() => {
    const start: Point[] = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    snakeRef.current = start;
    dirRef.current = { x: 1, y: 0 };
    pendingDirRef.current = { x: 1, y: 0 };
    foodRef.current = randomEmptyCell(start);
    scoreRef.current = 0;
    submittedRef.current = false;
    lastStepRef.current = 0;
    setScore(0);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Board background.
    const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(1, "#020617");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Subtle grid.
    ctx.strokeStyle = "rgba(148,163,184,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(SIZE, i * CELL);
      ctx.stroke();
    }

    // Food orb (pulsing glow).
    const food = foodRef.current;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
    const fx = food.x * CELL + CELL / 2;
    const fy = food.y * CELL + CELL / 2;
    ctx.save();
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 12 + pulse * 10;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(fx, fy, CELL / 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Snake: gradient from bright head to danger-red tail tip.
    const snake = snakeRef.current;
    const n = snake.length;
    for (let i = 0; i < n; i++) {
      const seg = snake[i];
      const t = n === 1 ? 0 : i / (n - 1); // 0 head -> 1 tail
      const r = Math.round(52 + t * (239 - 52));
      const g = Math.round(211 + t * (68 - 211));
      const b = Math.round(153 + t * (68 - 153));
      const pad = i === 0 ? 1 : 2;
      const x = seg.x * CELL + pad;
      const y = seg.y * CELL + pad;
      const s = CELL - pad * 2;

      ctx.save();
      if (i === 0) {
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = 16;
      } else if (i === n - 1) {
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const radius = 6;
      ctx.beginPath();
      ctx.roundRect(x, y, s, s, radius);
      ctx.fill();
      ctx.restore();
    }
  }, []);

  const endGame = useCallback(async () => {
    setStatusBoth("over");
    const finalScore = scoreRef.current;
    if (finalScore > best) setBest(finalScore);
    if (!submittedRef.current && finalScore > 0) {
      submittedRef.current = true;
      const res = await submitScore(finalScore);
      if (!res.error) router.refresh();
    }
  }, [best, router, submitScore, setStatusBoth]);

  const step = useCallback(() => {
    const snake = snakeRef.current;
    // Commit the queued direction (guards against 180° reversal).
    dirRef.current = pendingDirRef.current;
    const dir = dirRef.current;
    const head = snake[0];
    const newHead = { x: head.x + dir.x, y: head.y + dir.y };

    // Wall collision.
    if (
      newHead.x < 0 ||
      newHead.x >= GRID ||
      newHead.y < 0 ||
      newHead.y >= GRID
    ) {
      void endGame();
      return;
    }

    const eating = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;

    // Self collision. Ignore the current tail cell when not growing (it moves away).
    const body = eating ? snake : snake.slice(0, -1);
    if (body.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      void endGame();
      return;
    }

    const next = [newHead, ...snake];
    if (eating) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      foodRef.current = randomEmptyCell(next);
    } else {
      next.pop();
    }
    snakeRef.current = next;
  }, [endGame]);

  // Main animation loop.
  useEffect(() => {
    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (statusRef.current === "running") {
        const speed = Math.max(
          MIN_SPEED,
          BASE_SPEED - Math.floor(scoreRef.current / 4) * 8
        );
        if (ts - lastStepRef.current >= speed) {
          lastStepRef.current = ts;
          step();
        }
      }
      draw();
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [step, draw]);

  const start = useCallback(() => {
    resetGame();
    setStatusBoth("running");
  }, [resetGame, setStatusBoth]);

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key;
      const map: Record<string, Point> = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };

      if (key in map) {
        e.preventDefault();
        if (statusRef.current !== "running") return;
        const nd = map[key];
        const cur = dirRef.current;
        // Disallow reversing directly into yourself.
        if (nd.x === -cur.x && nd.y === -cur.y) return;
        pendingDirRef.current = nd;
        return;
      }

      if (key === " ") {
        e.preventDefault();
        if (statusRef.current === "running") setStatusBoth("paused");
        else if (statusRef.current === "paused") setStatusBoth("running");
        else start();
      }

      if (key === "Enter") {
        if (statusRef.current === "idle" || statusRef.current === "over") start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setStatusBoth, start]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[483px] items-center justify-between gap-4">
        <div className="rounded-xl bg-slate-800/60 px-4 py-2 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Score
          </p>
          <p className="text-2xl font-bold tabular-nums text-emerald-400">
            {score}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800/60 px-4 py-2 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Your best
          </p>
          <p className="text-2xl font-bold tabular-nums text-amber-400">
            {best}
          </p>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="w-full max-w-[483px] rounded-2xl border border-slate-700 shadow-2xl shadow-emerald-500/10"
        />

        {status !== "running" && status !== "paused" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-950/80 backdrop-blur-sm">
            {status === "over" ? (
              <>
                <p className="text-3xl font-black text-red-400">Caught!</p>
                <p className="text-slate-300">
                  Your tail got you. Score:{" "}
                  <span className="font-bold text-emerald-400">{score}</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl font-black text-emerald-400">
                  Reverse Snake
                </p>
                <p className="max-w-xs text-center text-sm text-slate-300">
                  Arrow keys or WASD to run. Grab orbs to grow — but the longer you
                  get, the more your own tail hunts you.
                </p>
              </>
            )}
            <button
              onClick={start}
              className="rounded-xl bg-emerald-500 px-6 py-3 text-base font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              {status === "over" ? "Play again" : "Start game"}
            </button>
            <p className="text-xs text-slate-500">
              Space to pause · Enter to start
            </p>
          </div>
        ) : null}

        {status === "paused" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950/70 backdrop-blur-sm">
            <p className="text-3xl font-black text-slate-200">Paused</p>
            <button
              onClick={() => setStatusBoth("running")}
              className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              Resume
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-center text-xs text-slate-500">
        Tip: speed ramps up as your score climbs. Don&apos;t get cornered.
      </p>
    </div>
  );
}

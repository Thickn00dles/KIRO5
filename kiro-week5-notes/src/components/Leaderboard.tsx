type Row = {
  id: string;
  player_name: string;
  score: number;
  isMe?: boolean;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
        <span>🏆</span> Leaderboard
      </h2>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No scores yet. Be the first to make the board.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                row.isMe
                  ? "bg-emerald-500/15 ring-1 ring-emerald-500/40"
                  : "bg-slate-800/40"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-6 shrink-0 text-center font-semibold text-slate-400">
                  {i < 3 ? MEDALS[i] : i + 1}
                </span>
                <span
                  className={`truncate font-medium ${
                    row.isMe ? "text-emerald-300" : "text-slate-200"
                  }`}
                >
                  {row.player_name}
                  {row.isMe ? (
                    <span className="ml-1 text-xs text-emerald-400/80">
                      (you)
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-amber-400">
                {row.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

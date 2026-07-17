import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { submitScore } from "@/app/game/actions";
import ReverseSnake from "@/components/ReverseSnake";
import Leaderboard from "@/components/Leaderboard";

export default async function GamePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Top 10 scores for the shared leaderboard.
  const { data: topScores } = await supabase
    .from("scores")
    .select("id, user_id, player_name, score")
    .order("score", { ascending: false })
    .limit(10);

  // The signed-in player's personal best.
  const { data: myScores } = await supabase
    .from("scores")
    .select("score")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(1);

  const personalBest = myScores?.[0]?.score ?? 0;

  const rows = (topScores ?? []).map((r) => ({
    id: r.id as string,
    player_name: r.player_name as string,
    score: r.score as number,
    isMe: r.user_id === user.id,
  }));

  return (
    <div className="min-h-dvh bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight text-white">
              🧲 Reverse Snake
            </h1>
            <Link
              href="/"
              className="text-sm font-medium text-slate-400 transition hover:text-slate-200"
            >
              ← Notes
            </Link>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <section className="flex justify-center">
          <ReverseSnake submitScore={submitScore} personalBest={personalBest} />
        </section>
        <aside className="lg:pt-2">
          <Leaderboard rows={rows} />
        </aside>
      </main>
    </div>
  );
}

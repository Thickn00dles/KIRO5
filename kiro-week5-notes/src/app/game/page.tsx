import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { submitScore } from "@/app/game/actions";
import ReverseSnake from "@/components/ReverseSnake";
import Leaderboard from "@/components/Leaderboard";
import NameEditor from "@/components/NameEditor";

export default async function GamePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ensure this player has a profile; default the name to the email local-part.
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  let myName = myProfile?.display_name;
  if (!myName) {
    myName = (user.email?.split("@")[0] ?? "player").slice(0, 24);
    await supabase
      .from("profiles")
      .insert({ user_id: user.id, display_name: myName });
  }

  // Pull scores (highest first) and keep only each player's best -> unique names.
  const { data: allScores } = await supabase
    .from("scores")
    .select("user_id, score")
    .order("score", { ascending: false })
    .limit(500);

  const bestByUser = new Map<string, number>();
  for (const s of allScores ?? []) {
    const uid = s.user_id as string;
    if (!bestByUser.has(uid)) bestByUser.set(uid, s.score as number);
  }

  // Map insertion order already follows descending best score.
  const topUsers = [...bestByUser.entries()].slice(0, 10);
  const topUserIds = topUsers.map(([uid]) => uid);

  // Fetch current display names for the users on the board.
  const { data: profiles } = topUserIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", topUserIds)
    : { data: [] as { user_id: string; display_name: string }[] };

  const nameByUser = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, p.display_name as string])
  );

  const rows = topUsers.map(([uid, score]) => ({
    id: uid,
    player_name: nameByUser.get(uid) ?? "player",
    score,
    isMe: uid === user.id,
  }));

  const personalBest = bestByUser.get(user.id) ?? 0;

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
        <aside className="space-y-4 lg:pt-2">
          <NameEditor currentName={myName} />
          <Leaderboard rows={rows} />
        </aside>
      </main>
    </div>
  );
}

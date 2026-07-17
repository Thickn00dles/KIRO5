"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Records a finished run's score for the signed-in user.
 * player_name is derived from the email local-part so the leaderboard
 * never exposes full email addresses.
 */
export async function submitScore(
  score: number
): Promise<{ error: string | null }> {
  if (!Number.isFinite(score) || score < 0) {
    return { error: "Invalid score." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const playerName = (user.email?.split("@")[0] ?? "player").slice(0, 24);

  const { error } = await supabase.from("scores").insert({
    user_id: user.id,
    player_name: playerName,
    score: Math.floor(score),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/game");
  return { error: null };
}

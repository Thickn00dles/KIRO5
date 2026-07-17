"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function defaultName(email: string | undefined) {
  return (email?.split("@")[0] ?? "player").slice(0, 24);
}

/**
 * Returns the signed-in user's display name, creating a default
 * profile (from the email local-part) the first time if needed.
 */
async function getOrCreateDisplayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | undefined
): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.display_name) return profile.display_name;

  const name = defaultName(email);
  await supabase.from("profiles").insert({ user_id: userId, display_name: name });
  return name;
}

/**
 * Records a finished run's score for the signed-in user.
 * The stored player_name matches the user's current display name.
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

  const playerName = await getOrCreateDisplayName(supabase, user.id, user.email);

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

export type NameState = { error: string | null; success?: boolean };

/**
 * Updates (or creates) the signed-in user's display name.
 */
export async function updateDisplayName(
  _prevState: NameState,
  formData: FormData
): Promise<NameState> {
  const name = String(formData.get("display_name") ?? "").trim();

  if (name.length < 2) {
    return { error: "Name must be at least 2 characters." };
  }
  if (name.length > 24) {
    return { error: "Name must be 24 characters or fewer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/game");
  return { error: null, success: true };
}

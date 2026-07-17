"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type NoteActionState = { error: string | null };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createNote(
  _prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title) {
    return { error: "A title is required." };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("notes")
    .insert({ title, body: body || null, user_id: user.id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
}

export async function updateNote(
  _prevState: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!id) {
    return { error: "Missing note id." };
  }
  if (!title) {
    return { error: "A title is required." };
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  // RLS also enforces ownership, but we scope explicitly for clarity.
  const { error } = await supabase
    .from("notes")
    .update({ title, body: body || null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { error: null };
}

export async function deleteNote(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase, user } = await requireUser();
  if (!user) return;

  await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/");
}

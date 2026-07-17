import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import NoteComposer from "@/components/NoteComposer";
import NoteCard from "@/components/NoteCard";
import type { Note } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this, but double-check on the server.
  if (!user) {
    redirect("/login");
  }

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (notes ?? []) as Note[];

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              My Notes
            </h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <NoteComposer />

        <section className="mt-6">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                No notes yet
              </p>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Add your first note using the form above.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {list.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

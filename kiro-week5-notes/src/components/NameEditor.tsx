"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateDisplayName, type NameState } from "@/app/game/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

export default function NameEditor({ currentName }: { currentName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<NameState, FormData>(
    updateDisplayName,
    { error: null }
  );

  // Collapse the editor once a save succeeds.
  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state]);

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Playing as
          </p>
          <p className="truncate text-base font-semibold text-emerald-400">
            {currentName}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          {open ? "Cancel" : "Change name"}
        </button>
      </div>

      {open ? (
        <form action={formAction} className="mt-3 space-y-2">
          <input
            name="display_name"
            type="text"
            required
            minLength={2}
            maxLength={24}
            defaultValue={currentName}
            placeholder="Your display name"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
          {state.error ? (
            <p className="text-sm text-red-400">{state.error}</p>
          ) : null}
          <div className="flex justify-end">
            <SaveButton />
          </div>
          <p className="text-xs text-slate-500">
            2-24 characters. Updates your name on the whole leaderboard.
          </p>
        </form>
      ) : null}
    </div>
  );
}

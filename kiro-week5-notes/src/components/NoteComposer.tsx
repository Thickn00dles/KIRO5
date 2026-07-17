"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createNote, type NoteActionState } from "@/app/notes/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Adding..." : "Add note"}
    </button>
  );
}

export default function NoteComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<NoteActionState, FormData>(
    createNote,
    { error: null }
  );

  // Clear the form after a successful add.
  useEffect(() => {
    if (state.error === null) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"
    >
      <input
        name="title"
        type="text"
        required
        placeholder="Note title"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      <textarea
        name="body"
        rows={3}
        placeholder="Write something..."
        className="mt-3 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      {state.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}
      <div className="mt-3 flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}

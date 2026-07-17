"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteNote,
  updateNote,
  type NoteActionState,
} from "@/app/notes/actions";
import type { Note } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SaveEditButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}

export default function NoteCard({ note }: { note: Note }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction] = useActionState<NoteActionState, FormData>(
    updateNote,
    { error: null }
  );

  // Leave edit mode once a save succeeds.
  useEffect(() => {
    if (isEditing && state.error === null) {
      setIsEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (isEditing) {
    return (
      <li className="rounded-2xl border border-indigo-300 bg-white p-4 shadow-sm dark:border-indigo-800 dark:bg-slate-900 sm:p-5">
        <form action={formAction}>
          <input type="hidden" name="id" value={note.id} />
          <input
            name="title"
            type="text"
            required
            defaultValue={note.title}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <textarea
            name="body"
            rows={3}
            defaultValue={note.body ?? ""}
            className="mt-3 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          {state.error ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          ) : null}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <SaveEditButton />
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {note.title}
        </h3>
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {formatDate(note.created_at)}
        </span>
      </div>
      {note.body ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
          {note.body}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Edit
        </button>
        <form action={deleteNote}>
          <input type="hidden" name="id" value={note.id} />
          <DeleteButton />
        </form>
      </div>
    </li>
  );
}

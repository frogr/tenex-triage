"use client";

import { useState, useEffect, useRef } from "react";

interface CreateBucketDialogProps {
  onClose: () => void;
  onCreate: (name: string, description: string, reclassifyAll: boolean) => void;
}

export function CreateBucketDialog({
  onClose,
  onCreate,
}: CreateBucketDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<{ name: string; description: string; reason: string }[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, submitting]);

  async function fetchSuggestions() {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleSubmit(reclassifyAll: boolean, e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim() || !description.trim()) return;
    setSubmitting(true);
    await onCreate(name.trim(), description.trim(), reclassifyAll);
    setSubmitting(false);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      if (!submitting) onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-bucket-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-bucket-title" className="text-lg font-semibold text-white">
            Create a new bucket
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* AI Suggestions */}
        {suggestions === null && !loadingSuggestions && (
          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={submitting}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Suggest buckets with AI
          </button>
        )}
        {loadingSuggestions && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-zinc-800 px-3 py-3">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
            <span className="text-xs text-zinc-500">Analyzing your emails...</span>
          </div>
        )}
        {suggestions && suggestions.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-medium text-zinc-500">Suggested buckets</p>
            {suggestions.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setName(s.name);
                  setDescription(s.description);
                }}
                className="flex w-full flex-col rounded-lg border border-zinc-800 px-3 py-2 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800/50"
              >
                <span className="text-sm font-medium text-zinc-200">{s.name}</span>
                <span className="text-xs text-zinc-500">{s.reason}</span>
              </button>
            ))}
          </div>
        )}
        {suggestions && suggestions.length === 0 && (
          <p className="mb-4 text-center text-xs text-zinc-600">
            No additional buckets suggested — your current set looks good!
          </p>
        )}

        <form onSubmit={(e) => handleSubmit(false, e)} className="flex flex-col gap-4">
          <div>
            <label htmlFor="bucket-name" className="mb-1.5 block text-sm font-medium text-zinc-400">
              Name
            </label>
            <input
              id="bucket-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Investor Updates"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              autoFocus
              disabled={submitting}
              maxLength={50}
            />
          </div>
          <div>
            <label htmlFor="bucket-description" className="mb-1.5 block text-sm font-medium text-zinc-400">
              Description
            </label>
            <textarea
              id="bucket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what emails belong here — the AI uses this to classify threads."
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white placeholder-zinc-600 transition-colors focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              disabled={submitting}
              maxLength={200}
            />
            <p className="mt-1 text-right text-xs text-zinc-700">
              {description.length}/200
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-zinc-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <CreateSubmitButton
              disabled={!name.trim() || !description.trim() || submitting}
              submitting={submitting}
              onSubmit={(reclassifyAll) => handleSubmit(reclassifyAll)}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateSubmitButton({
  disabled,
  submitting,
  onSubmit,
}: {
  disabled: boolean;
  submitting: boolean;
  onSubmit: (reclassifyAll: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative flex" ref={ref}>
      <button
        type="button"
        onClick={() => onSubmit(false)}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-l-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
        )}
        {submitting ? "Creating..." : "Create & Classify"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="rounded-r-lg border-l border-zinc-300 bg-white px-1.5 py-2 text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="More create options"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-10 mb-1 min-w-[220px] rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-2xl">
          <button
            type="button"
            onClick={() => { setOpen(false); onSubmit(false); }}
            className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-zinc-700"
          >
            <span className="text-sm text-zinc-200">Create & Classify new</span>
            <span className="text-xs text-zinc-500">Only unclassified threads</span>
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onSubmit(true); }}
            className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-zinc-700"
          >
            <span className="text-sm text-zinc-200">Create & Reclassify all</span>
            <span className="text-xs text-zinc-500">Re-sort everything (keeps manual moves)</span>
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";

interface CreateBucketDialogProps {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export function CreateBucketDialog({
  onClose,
  onCreate,
}: CreateBucketDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;
    setSubmitting(true);
    await onCreate(name.trim(), description.trim());
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <button
              type="submit"
              disabled={!name.trim() || !description.trim() || submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
              )}
              {submitting ? "Creating..." : "Create & Reclassify"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

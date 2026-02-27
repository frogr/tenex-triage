"use client";

import { useState, useEffect, useRef } from "react";

interface Thread {
  id: string;
  subject: string;
  snippet: string;
  sender: string;
  date: string;
  messageCount: number;
  isRead: boolean;
  confidence: number | null;
  bucketId: string | null;
  bucket: { id: string; name: string } | null;
}

interface Bucket {
  id: string;
  name: string;
}

interface ThreadCardProps {
  thread: Thread;
  buckets: Bucket[];
  onMove: (threadId: string, bucketId: string) => void;
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ThreadCard({ thread, buckets, onMove }: ThreadCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoveMenu) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setShowMoveMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMoveMenu]);

  const otherBuckets = buckets.filter((b) => b.id !== thread.bucketId);

  return (
    <div className="group flex min-w-0 items-start gap-2.5 border-b border-zinc-800/60 px-1 py-3 sm:gap-4 sm:rounded-lg sm:border sm:border-zinc-800/80 sm:bg-zinc-900/50 sm:px-4 sm:py-3 sm:transition-colors sm:hover:border-zinc-700 sm:hover:bg-zinc-900">
      {/* Unread indicator dot */}
      <div className="flex pt-1.5">
        <div
          className={`h-2 w-2 shrink-0 rounded-full ${
            thread.isRead ? "bg-transparent" : "bg-blue-500"
          }`}
        />
      </div>

      <div className="min-w-0 flex-1">
        {/* Top row: sender + meta */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span
            className={`truncate text-sm ${thread.isRead ? "text-zinc-400" : "font-semibold text-white"}`}
          >
            {thread.sender}
          </span>
          {thread.messageCount > 1 && (
            <span className="shrink-0 text-xs text-zinc-600">
              ({thread.messageCount})
            </span>
          )}
          {thread.confidence !== null && (
            <ConfidenceBadge confidence={thread.confidence} />
          )}
          <span className="ml-auto shrink-0 text-xs tabular-nums text-zinc-600">
            {relativeDate(thread.date)}
          </span>
        </div>

        {/* Subject */}
        <p
          className={`truncate text-sm ${thread.isRead ? "text-zinc-400" : "text-white"}`}
        >
          {thread.subject}
        </p>

        {/* Snippet + bucket label row */}
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-xs text-zinc-600">
            {thread.snippet}
          </p>
          {thread.bucket && (
            <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-500">
              {thread.bucket.name}
            </span>
          )}
        </div>
      </div>

      {/* Move button + dropdown */}
      <div className="relative shrink-0 pt-0.5" ref={menuRef}>
        <button
          onClick={() => setShowMoveMenu(!showMoveMenu)}
          className="rounded p-1.5 text-zinc-700 transition-all hover:bg-zinc-800 hover:text-zinc-400 sm:opacity-0 sm:group-hover:opacity-100"
          aria-label="Move to bucket"
          aria-expanded={showMoveMenu}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="5" r="1" fill="currentColor" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
            <circle cx="12" cy="19" r="1" fill="currentColor" />
          </svg>
        </button>
        {showMoveMenu && otherBuckets.length > 0 && (
          <div className="absolute right-0 top-8 z-20 min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
            <p className="px-3 py-1.5 text-xs text-zinc-600">Move to...</p>
            {otherBuckets.map((bucket) => (
              <button
                key={bucket.id}
                onClick={() => {
                  onMove(thread.id, bucket.id);
                  setShowMoveMenu(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                {bucket.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);

  if (confidence >= 0.85) {
    // High confidence — no badge, keep it clean
    return null;
  }

  if (confidence >= 0.7) {
    // Medium confidence — subtle indicator
    return (
      <span
        className="shrink-0 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[11px] tabular-nums text-zinc-500"
        title={`Confidence: ${pct}%`}
      >
        {pct}%
      </span>
    );
  }

  // Low confidence — warning
  return (
    <span
      className="shrink-0 rounded-full bg-yellow-900/30 px-1.5 py-0.5 text-[11px] tabular-nums text-yellow-500"
      title={`Low confidence: ${pct}%`}
    >
      {pct}%
    </span>
  );
}

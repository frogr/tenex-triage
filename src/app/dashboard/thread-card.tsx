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
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (threadId: string) => void;
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

export function ThreadCard({ thread, buckets, onMove, selectable, selected, onToggleSelect }: ThreadCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState<{ from: string; date: string | null; body: string }[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
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

  async function handleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (preview) return; // already fetched
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/threads/${thread.id}/preview`);
      if (res.ok) {
        const data = await res.json();
        setPreview(data.messages ?? []);
      }
    } catch {
      // silently fail — snippet is still visible
    } finally {
      setLoadingPreview(false);
    }
  }

  const otherBuckets = buckets.filter((b) => b.id !== thread.bucketId);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", thread.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group flex min-w-0 cursor-grab items-start gap-2.5 border-b border-zinc-800/60 px-1 py-3 active:cursor-grabbing sm:gap-4 sm:rounded-lg sm:border sm:border-zinc-800/80 sm:bg-zinc-900/50 sm:px-4 sm:py-3 sm:transition-colors sm:hover:border-zinc-700 sm:hover:bg-zinc-900"
    >
      {/* Checkbox / unread dot */}
      <div className="flex pt-1 sm:pt-1.5">
        {selectable || selected ? (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onToggleSelect?.(thread.id)}
            className="h-4 w-4 shrink-0 cursor-pointer rounded border-zinc-600 bg-zinc-800 text-white accent-white"
            aria-label={`Select ${thread.subject}`}
          />
        ) : (
          <div className="relative h-4 w-4 shrink-0">
            {/* Unread dot — shown by default */}
            <div
              className={`absolute left-1 top-1 h-2 w-2 rounded-full transition-opacity group-hover:opacity-0 sm:group-hover:opacity-0 ${
                thread.isRead ? "bg-transparent" : "bg-blue-500"
              }`}
            />
            {/* Checkbox — appears on hover */}
            <input
              type="checkbox"
              checked={false}
              onChange={() => onToggleSelect?.(thread.id)}
              className="absolute inset-0 hidden h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-800 text-white accent-white sm:group-hover:block"
              aria-label={`Select ${thread.subject}`}
            />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <button
          onClick={handleExpand}
          className="w-full text-left"
          aria-expanded={expanded}
        >
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
        </button>

        {/* Expanded preview */}
        {expanded && (
          <div className="mt-2 border-t border-zinc-800/60 pt-2">
            {loadingPreview && (
              <div className="flex items-center gap-2 py-2">
                <div className="h-3 w-3 animate-spin rounded-full border border-zinc-600 border-t-zinc-300" />
                <span className="text-xs text-zinc-500">Loading preview...</span>
              </div>
            )}
            {preview && preview.length > 0 && (
              <div className="space-y-3">
                {preview.slice(0, 3).map((msg, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-medium text-zinc-400">{msg.from}</span>
                      {msg.date && (
                        <span className="tabular-nums">{relativeDate(msg.date)}</span>
                      )}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                      {truncateBody(msg.body)}
                    </p>
                  </div>
                ))}
                {preview.length > 3 && (
                  <p className="text-xs text-zinc-600">
                    +{preview.length - 3} more message{preview.length - 3 !== 1 && "s"}
                  </p>
                )}
              </div>
            )}
            {preview && preview.length === 0 && (
              <p className="py-1 text-xs text-zinc-600">No message content available.</p>
            )}
          </div>
        )}
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

function truncateBody(body: string, maxLength = 500): string {
  if (!body) return "";
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trimEnd() + "...";
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

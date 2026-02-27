"use client";

import { useState } from "react";

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

  return (
    <div className="group flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-700">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm ${thread.isRead ? "text-zinc-400" : "font-semibold text-white"}`}
          >
            {thread.sender}
          </span>
          {thread.messageCount > 1 && (
            <span className="text-xs text-zinc-600">
              ({thread.messageCount})
            </span>
          )}
          {thread.bucket && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">
              {thread.bucket.name}
            </span>
          )}
          {thread.confidence !== null && thread.confidence < 0.7 && (
            <span className="rounded bg-yellow-900/30 px-1.5 py-0.5 text-xs text-yellow-600">
              ?
            </span>
          )}
        </div>
        <p
          className={`truncate text-sm ${thread.isRead ? "text-zinc-400" : "text-white"}`}
        >
          {thread.subject}
        </p>
        <p className="truncate text-xs text-zinc-600">{thread.snippet}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-zinc-600">
          {relativeDate(thread.date)}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="rounded p-1 text-zinc-600 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-zinc-400 group-hover:opacity-100"
            title="Move to bucket"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          {showMoveMenu && (
            <div className="absolute right-0 top-8 z-10 min-w-[160px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
              {buckets
                .filter((b) => b.id !== thread.bucketId)
                .map((bucket) => (
                  <button
                    key={bucket.id}
                    onClick={() => {
                      onMove(thread.id, bucket.id);
                      setShowMoveMenu(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {bucket.name}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

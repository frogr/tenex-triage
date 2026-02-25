"use client";

import { useState, useEffect } from "react";

interface Thread {
  id: string;
  subject: string;
  snippet: string;
  sender: string;
  senderEmail: string;
  date: string;
  messageCount: number;
  isRead: boolean;
  bucketId: string | null;
  bucket: { id: string; name: string } | null;
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

export function ThreadList() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState<number | null>(null);

  useEffect(() => {
    async function sync() {
      try {
        const res = await fetch("/api/threads");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch threads");
        }
        const data = await res.json();
        setThreads(data.threads);
        setSynced(data.synced);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    sync();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
        <p className="text-sm text-zinc-400">
          Fetching your emails from Gmail...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div>
      {synced !== null && (
        <p className="mb-4 text-sm text-zinc-500">
          Synced {synced} threads from Gmail
        </p>
      )}
      {threads.length === 0 ? (
        <p className="py-8 text-center text-zinc-500">No threads found.</p>
      ) : (
        <div className="grid gap-1">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="flex items-start gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-700"
            >
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
                </div>
                <p
                  className={`truncate text-sm ${thread.isRead ? "text-zinc-400" : "text-white"}`}
                >
                  {thread.subject}
                </p>
                <p className="truncate text-xs text-zinc-600">
                  {thread.snippet}
                </p>
              </div>
              <span className="shrink-0 text-xs text-zinc-600">
                {relativeDate(thread.date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

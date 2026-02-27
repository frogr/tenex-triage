"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BucketTabs } from "./bucket-tabs";
import { ThreadCard } from "./thread-card";
import { CreateBucketDialog } from "./create-bucket-dialog";
import { ClassificationLog, type LogEntry } from "./classification-log";

interface Bucket {
  id: string;
  name: string;
  description: string;
  _count: { threads: number };
}

interface Thread {
  id: string;
  subject: string;
  snippet: string;
  sender: string;
  senderEmail: string;
  date: string;
  messageCount: number;
  isRead: boolean;
  confidence: number | null;
  bucketId: string | null;
  bucket: { id: string; name: string } | null;
}

export function Dashboard() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [showCreateBucket, setShowCreateBucket] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [bucketsRes, threadsRes] = await Promise.all([
        fetch("/api/buckets"),
        fetch("/api/threads"),
      ]);

      if (bucketsRes.ok) {
        const b = await bucketsRes.json();
        setBuckets(b);
      }
      if (threadsRes.ok) {
        const t = await threadsRes.json();
        setThreads(t.threads);
      }
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/threads?sync=true");
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      setThreads(data.threads);
      const bucketsRes = await fetch("/api/buckets");
      if (bucketsRes.ok) setBuckets(await bucketsRes.json());
    } catch {
      setError("Failed to sync from Gmail. Check your connection and try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleClassify(reclassifyAll = false) {
    setClassifying(true);
    setError(null);
    setLogEntries([]);

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reclassifyAll }),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = "Classification failed";
        try {
          message = JSON.parse(text).error || message;
        } catch { /* not JSON */ }
        throw new Error(message);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line) as LogEntry;
            // Replace progress entries instead of stacking them
            setLogEntries((prev) => {
              if (entry.step === "progress") {
                const withoutProgress = prev.filter((e) => e.step !== "progress");
                return [...withoutProgress, entry];
              }
              return [...prev, entry];
            });
          } catch { /* skip malformed lines */ }
        }
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setClassifying(false);
    }
  }

  async function handleMoveThread(threadId: string, bucketId: string) {
    // Optimistic update
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              bucketId,
              bucket: buckets.find((b) => b.id === bucketId)
                ? { id: bucketId, name: buckets.find((b) => b.id === bucketId)!.name }
                : t.bucket,
            }
          : t
      )
    );
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucketId }),
      });
      if (!res.ok) throw new Error("Move failed");
      await loadData();
    } catch {
      setError("Failed to move thread");
      await loadData(); // revert optimistic update
    }
  }

  async function handleCreateBucket(name: string, description: string) {
    try {
      const res = await fetch("/api/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create bucket");
      }
      setShowCreateBucket(false);
      await loadData();
      await handleClassify();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bucket");
    }
  }

  const filteredThreads = activeBucket
    ? threads.filter((t) => t.bucketId === activeBucket)
    : threads;

  const unclassifiedCount = threads.filter((t) => !t.bucketId).length;
  const hasThreads = threads.length > 0;
  const needsClassification =
    hasThreads && unclassifiedCount > threads.length * 0.5;
  const isBusy = syncing || classifying;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
        <p className="text-sm text-zinc-400">Loading your inbox...</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-400"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 shrink-0 text-red-500 transition-colors hover:text-red-300"
            aria-label="Dismiss error"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Action bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6 sm:gap-3">
        <button
          onClick={handleSync}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          {syncing && (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          )}
          {syncing ? "Syncing..." : "Refresh from Gmail"}
        </button>
        {hasThreads && (
          <ClassifyButton
            classifying={classifying}
            disabled={isBusy}
            onClassify={() => handleClassify()}
            onReclassifyAll={() => handleClassify(true)}
          />
        )}
        <button
          onClick={() => setShowCreateBucket(true)}
          disabled={isBusy}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          + Add Bucket
        </button>
      </div>

      {/* Classification log */}
      {logEntries.length > 0 && (
        <ClassificationLog entries={logEntries} />
      )}

      {/* First-time empty state */}
      {!hasThreads && (
        <div className="flex flex-col items-center gap-4 py-24">
          <div className="rounded-full bg-zinc-900 p-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
              <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-zinc-300">No emails yet</p>
            <p className="mt-1 text-sm text-zinc-600">
              Click &quot;Refresh from Gmail&quot; to fetch your latest threads.
            </p>
          </div>
        </div>
      )}

      {/* Bucket tabs + thread list */}
      {hasThreads && (
        <>
          {needsClassification && !classifying && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-yellow-900/40 bg-yellow-950/20 px-3 py-2.5 sm:items-center sm:gap-3 sm:px-4 sm:py-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-yellow-600 sm:mt-0">
                <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-yellow-500 sm:text-sm">
                {unclassifiedCount} thread{unclassifiedCount !== 1 && "s"} not classified yet.
                Tap &quot;Classify Inbox&quot; to sort them.
              </p>
            </div>
          )}

          <BucketTabs
            buckets={buckets}
            activeBucket={activeBucket}
            onSelect={setActiveBucket}
            onCreateBucket={() => setShowCreateBucket(true)}
            totalThreads={threads.length}
          />

          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <p className="text-sm text-zinc-500">No threads in this bucket</p>
              <button
                onClick={() => setActiveBucket(null)}
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
              >
                View all threads
              </button>
            </div>
          ) : (
            <div className="mt-2 grid min-w-0 gap-0 sm:mt-4 sm:gap-1.5">
              {filteredThreads.map((thread) => (
                <ThreadCard
                  key={thread.id}
                  thread={thread}
                  buckets={buckets}
                  onMove={handleMoveThread}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showCreateBucket && (
        <CreateBucketDialog
          onClose={() => setShowCreateBucket(false)}
          onCreate={handleCreateBucket}
        />
      )}
    </div>
  );
}

function ClassifyButton({
  classifying,
  disabled,
  onClassify,
  onReclassifyAll,
}: {
  classifying: boolean;
  disabled: boolean;
  onClassify: () => void;
  onReclassifyAll: () => void;
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
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative flex" ref={ref}>
      <button
        onClick={onClassify}
        disabled={disabled}
        className="rounded-l-lg bg-white px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
      >
        {classifying ? "Classifying..." : "Classify Inbox"}
      </button>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="rounded-r-lg border-l border-zinc-300 bg-white px-1.5 py-2 text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Classification options"
        aria-expanded={open}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
          <button
            onClick={() => {
              setOpen(false);
              onClassify();
            }}
            className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-zinc-800"
          >
            <span className="text-sm text-zinc-200">Classify new</span>
            <span className="text-xs text-zinc-500">Only unclassified threads</span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onReclassifyAll();
            }}
            className="flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-zinc-800"
          >
            <span className="text-sm text-zinc-200">Reclassify all</span>
            <span className="text-xs text-zinc-500">Re-sort everything (keeps manual moves)</span>
          </button>
        </div>
      )}
    </div>
  );
}

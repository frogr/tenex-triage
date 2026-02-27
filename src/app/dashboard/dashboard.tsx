"use client";

import { useState, useEffect, useCallback } from "react";
import { BucketTabs } from "./bucket-tabs";
import { ThreadCard } from "./thread-card";
import { CreateBucketDialog } from "./create-bucket-dialog";

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
      // Refresh bucket counts
      const bucketsRes = await fetch("/api/buckets");
      if (bucketsRes.ok) setBuckets(await bucketsRes.json());
    } catch {
      setError("Failed to sync from Gmail");
    } finally {
      setSyncing(false);
    }
  }

  async function handleClassify() {
    setClassifying(true);
    setError(null);
    try {
      const res = await fetch("/api/classify", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Classification failed");
      }
      // Reload everything
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification failed");
    } finally {
      setClassifying(false);
    }
  }

  async function handleMoveThread(threadId: string, bucketId: string) {
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
      // Reclassify with new bucket
      await loadData();
      setClassifying(true);
      try {
        await fetch("/api/classify", { method: "POST" });
        await loadData();
      } finally {
        setClassifying(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bucket");
    }
  }

  const filteredThreads = activeBucket
    ? threads.filter((t) => t.bucketId === activeBucket)
    : threads;

  const unclassifiedCount = threads.filter((t) => !t.bucketId).length;
  const hasThreads = threads.length > 0;
  const needsClassification = hasThreads && unclassifiedCount > threads.length * 0.5;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
        <p className="text-sm text-zinc-400">Loading your inbox...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-300"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Action bar */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Refresh from Gmail"}
        </button>
        {hasThreads && (
          <button
            onClick={handleClassify}
            disabled={classifying}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
          >
            {classifying ? "Classifying..." : "Classify Inbox"}
          </button>
        )}
        <button
          onClick={() => setShowCreateBucket(true)}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-300"
        >
          + Add Bucket
        </button>
      </div>

      {classifying && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
            <p className="text-sm text-zinc-400">
              Classifying {threads.length} threads into buckets...
            </p>
          </div>
        </div>
      )}

      {/* First-time empty state */}
      {!hasThreads && (
        <div className="py-16 text-center">
          <p className="text-lg text-zinc-400">No emails yet.</p>
          <p className="mt-2 text-sm text-zinc-600">
            Click &quot;Refresh from Gmail&quot; to fetch your last 200 threads.
          </p>
        </div>
      )}

      {/* Bucket tabs + thread list */}
      {hasThreads && (
        <>
          {needsClassification && !classifying && (
            <div className="mb-4 rounded-lg border border-yellow-900/50 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-500">
              {unclassifiedCount} threads haven&apos;t been classified yet.
              Click &quot;Classify Inbox&quot; to sort them into buckets.
            </div>
          )}

          <BucketTabs
            buckets={buckets}
            activeBucket={activeBucket}
            onSelect={setActiveBucket}
            totalThreads={threads.length}
          />

          {filteredThreads.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-600">
              No threads in this bucket.
            </p>
          ) : (
            <div className="mt-4 grid gap-1">
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

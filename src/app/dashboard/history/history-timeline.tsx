"use client";

import { useState, useEffect } from "react";

interface ClassificationRun {
  id: string;
  status: string;
  totalThreads: number;
  classifiedCount: number;
  bucketSnapshot: { name: string; description: string }[];
  modelUsed: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costCents: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface SyncEvent {
  id: string;
  threadsFound: number;
  newThreads: number;
  updatedThreads: number;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
}

type TimelineItem =
  | { type: "classification"; data: ClassificationRun; date: Date }
  | { type: "sync"; data: SyncEvent; date: Date };

export function HistoryTimeline() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) return;
        const { classificationRuns, syncEvents } = await res.json();

        const timeline: TimelineItem[] = [
          ...classificationRuns.map((r: ClassificationRun) => ({
            type: "classification" as const,
            data: r,
            date: new Date(r.startedAt),
          })),
          ...syncEvents.map((s: SyncEvent) => ({
            type: "sync" as const,
            data: s,
            date: new Date(s.createdAt),
          })),
        ].sort((a, b) => b.date.getTime() - a.date.getTime());

        setItems(timeline);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
        <p className="text-sm text-zinc-400">Loading history...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <div className="rounded-full bg-zinc-900 p-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-zinc-500">No activity yet</p>
        <p className="text-xs text-zinc-600">Sync from Gmail or classify your inbox to see history here.</p>
      </div>
    );
  }

  // Group by date
  const grouped = groupByDate(items);

  return (
    <div className="space-y-8">
      {grouped.map(([dateLabel, dayItems]) => (
        <div key={dateLabel}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            {dateLabel}
          </h2>
          <div className="space-y-2">
            {dayItems.map((item) =>
              item.type === "classification" ? (
                <ClassificationCard key={item.data.id} run={item.data} />
              ) : (
                <SyncCard key={item.data.id} sync={item.data} />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClassificationCard({ run }: { run: ClassificationRun }) {
  const [expanded, setExpanded] = useState(false);
  const isError = run.status === "failed";
  const totalTokens =
    (run.inputTokens ?? 0) + (run.outputTokens ?? 0);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className={`mt-0.5 rounded-full p-1.5 ${isError ? "bg-red-950/60" : "bg-emerald-950/60"}`}>
          {isError ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
              <path d="M9 3.5V2m0 1.5a5.5 5.5 0 015.5 5.5V12a5.5 5.5 0 01-5.5 5.5M9 3.5A5.5 5.5 0 003.5 9V12A5.5 5.5 0 009 17.5m0 0V22" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">
              Classification
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              isError
                ? "bg-red-950/60 text-red-400"
                : run.status === "running"
                  ? "bg-yellow-950/60 text-yellow-400"
                  : "bg-emerald-950/60 text-emerald-400"
            }`}>
              {run.status}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {run.classifiedCount}/{run.totalThreads} threads classified
            {run.costCents != null && ` \u00b7 $${(run.costCents / 100).toFixed(4)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-zinc-600">
            {formatTime(run.startedAt)}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-zinc-600 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800/60 px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            <Detail label="Model" value={run.modelUsed} />
            <Detail label="Threads" value={`${run.classifiedCount} of ${run.totalThreads}`} />
            <Detail
              label="Duration"
              value={
                run.completedAt
                  ? formatDuration(new Date(run.startedAt), new Date(run.completedAt))
                  : "In progress"
              }
            />
            <Detail label="Input tokens" value={run.inputTokens?.toLocaleString() ?? "—"} />
            <Detail label="Output tokens" value={run.outputTokens?.toLocaleString() ?? "—"} />
            <Detail label="Total tokens" value={totalTokens > 0 ? totalTokens.toLocaleString() : "—"} />
            <Detail label="Cost" value={run.costCents != null ? `$${(run.costCents / 100).toFixed(4)}` : "—"} />
            <Detail label="Started" value={new Date(run.startedAt).toLocaleString()} />
            {run.completedAt && (
              <Detail label="Completed" value={new Date(run.completedAt).toLocaleString()} />
            )}
          </dl>
          {run.errorMessage && (
            <p className="mt-2 rounded bg-red-950/30 px-2 py-1.5 text-xs text-red-400">
              {run.errorMessage}
            </p>
          )}
          {Array.isArray(run.bucketSnapshot) && run.bucketSnapshot.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-zinc-500">Buckets used</p>
              <div className="flex flex-wrap gap-1.5">
                {run.bucketSnapshot.map((b) => (
                  <span
                    key={b.name}
                    className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-400"
                    title={b.description}
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SyncCard({ sync }: { sync: SyncEvent }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-3">
      <div className="mt-0.5 rounded-full bg-blue-950/60 p-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">Gmail Sync</span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {sync.threadsFound} threads found
          {sync.newThreads > 0 && ` \u00b7 ${sync.newThreads} new`}
          {sync.updatedThreads > 0 && ` \u00b7 ${sync.updatedThreads} updated`}
          {sync.durationMs != null && ` \u00b7 ${(sync.durationMs / 1000).toFixed(1)}s`}
        </p>
        {sync.errorMessage && (
          <p className="mt-1 text-xs text-red-400">{sync.errorMessage}</p>
        )}
      </div>
      <span className="shrink-0 text-xs tabular-nums text-zinc-600">
        {formatTime(sync.createdAt)}
      </span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-600">{label}</dt>
      <dd className="mt-0.5 font-mono text-zinc-300">{value}</dd>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function groupByDate(items: TimelineItem[]): [string, TimelineItem[]][] {
  const groups = new Map<string, TimelineItem[]>();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    const d = item.date;
    let label: string;
    if (isSameDay(d, today)) label = "Today";
    else if (isSameDay(d, yesterday)) label = "Yesterday";
    else label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }

  return Array.from(groups.entries());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

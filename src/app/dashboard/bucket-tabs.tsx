"use client";

import { useState, useEffect, useRef } from "react";

interface Bucket {
  id: string;
  name: string;
  _count: { threads: number };
}

interface BucketTabsProps {
  buckets: Bucket[];
  activeBucket: string | null;
  onSelect: (bucketId: string | null) => void;
  onCreateBucket?: () => void;
  onEditBucket?: (bucketId: string) => void;
  totalThreads: number;
  onDropThread?: (threadId: string, bucketId: string) => void;
}

export function BucketTabs({
  buckets,
  activeBucket,
  onSelect,
  onCreateBucket,
  onEditBucket,
  totalThreads,
  onDropThread,
}: BucketTabsProps) {
  const activeName = activeBucket
    ? buckets.find((b) => b.id === activeBucket)?.name ?? "Bucket"
    : "All";
  const activeCount = activeBucket
    ? buckets.find((b) => b.id === activeBucket)?._count.threads ?? 0
    : totalThreads;

  return (
    <>
      {/* Mobile: dropdown selector */}
      <div className="sm:hidden">
        <MobileSelector
          buckets={buckets}
          activeBucket={activeBucket}
          activeName={activeName}
          activeCount={activeCount}
          totalThreads={totalThreads}
          onSelect={onSelect}
          onCreateBucket={onCreateBucket}
          onEditBucket={onEditBucket}
        />
      </div>

      {/* Desktop: tab bar */}
      <div className="hidden overflow-hidden sm:block">
        <nav
          role="tablist"
          aria-label="Email buckets"
          className="scrollbar-hide flex gap-1 overflow-x-auto border-b border-zinc-800"
        >
          <TabButton
            active={activeBucket === null}
            onClick={() => onSelect(null)}
            label="All"
            count={totalThreads}
          />
          {buckets.map((bucket) => (
            <TabButton
              key={bucket.id}
              active={activeBucket === bucket.id}
              onClick={() => onSelect(bucket.id)}
              label={bucket.name}
              count={bucket._count.threads}
              onDropThread={onDropThread ? (threadId) => onDropThread(threadId, bucket.id) : undefined}
              onEdit={onEditBucket ? () => onEditBucket(bucket.id) : undefined}
            />
          ))}
        </nav>
      </div>
    </>
  );
}

function MobileSelector({
  buckets,
  activeBucket,
  activeName,
  activeCount,
  totalThreads,
  onSelect,
  onCreateBucket,
  onEditBucket,
}: {
  buckets: Bucket[];
  activeBucket: string | null;
  activeName: string;
  activeCount: number;
  totalThreads: number;
  onSelect: (bucketId: string | null) => void;
  onCreateBucket?: () => void;
  onEditBucket?: (bucketId: string) => void;
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{activeName}</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs tabular-nums text-zinc-400">
            {activeCount}
          </span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl"
          role="listbox"
        >
          <SelectorOption
            label="All"
            count={totalThreads}
            active={activeBucket === null}
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
          />
          {buckets.map((bucket) => (
            <div key={bucket.id} className="flex items-center">
              <SelectorOption
                label={bucket.name}
                count={bucket._count.threads}
                active={activeBucket === bucket.id}
                onClick={() => {
                  onSelect(bucket.id);
                  setOpen(false);
                }}
              />
              {onEditBucket && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    onEditBucket(bucket.id);
                  }}
                  className="shrink-0 rounded p-2 text-zinc-700 transition-colors active:bg-zinc-800 active:text-zinc-300"
                  aria-label={`Edit ${bucket.name}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {onCreateBucket && (
            <>
              <div className="mx-3 border-t border-zinc-800" />
              <button
                onClick={() => {
                  setOpen(false);
                  onCreateBucket();
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-zinc-500 transition-colors active:bg-zinc-800"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New bucket...
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SelectorOption({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors active:bg-zinc-800 ${
        active ? "text-white" : "text-zinc-400"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {active ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-[14px]" />
        )}
        <span>{label}</span>
      </div>
      <span className="tabular-nums text-xs text-zinc-600">{count}</span>
    </button>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  onDropThread,
  onEdit,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  onDropThread?: (threadId: string) => void;
  onEdit?: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className="group/tab flex shrink-0 items-center"
      onDragOver={(e) => {
        if (!onDropThread) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const threadId = e.dataTransfer.getData("text/plain");
        if (threadId && onDropThread) onDropThread(threadId);
      }}
    >
      <button
        role="tab"
        aria-selected={active}
        onClick={onClick}
        className={`border-b-2 px-4 py-2.5 text-sm transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-950/30 text-blue-300"
            : active
              ? "border-white text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
        }`}
      >
        {label}
        <span
          className={`ml-1.5 tabular-nums ${dragOver ? "text-blue-400" : active ? "text-zinc-400" : "text-zinc-600"}`}
        >
          {count}
        </span>
      </button>
      {active && onEdit && (
        <button
          onClick={onEdit}
          className="-ml-2 rounded p-1 text-zinc-600 opacity-0 transition-all hover:text-zinc-300 group-hover/tab:opacity-100"
          aria-label={`Edit ${label}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      )}
    </div>
  );
}

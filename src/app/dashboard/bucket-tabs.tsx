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
  totalThreads: number;
}

export function BucketTabs({
  buckets,
  activeBucket,
  onSelect,
  onCreateBucket,
  totalThreads,
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
}: {
  buckets: Bucket[];
  activeBucket: string | null;
  activeName: string;
  activeCount: number;
  totalThreads: number;
  onSelect: (bucketId: string | null) => void;
  onCreateBucket?: () => void;
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
            <SelectorOption
              key={bucket.id}
              label={bucket.name}
              count={bucket._count.threads}
              active={activeBucket === bucket.id}
              onClick={() => {
                onSelect(bucket.id);
                setOpen(false);
              }}
            />
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
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors ${
        active
          ? "border-white text-white"
          : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 tabular-nums ${active ? "text-zinc-400" : "text-zinc-600"}`}
      >
        {count}
      </span>
    </button>
  );
}

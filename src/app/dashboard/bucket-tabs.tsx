"use client";

interface Bucket {
  id: string;
  name: string;
  _count: { threads: number };
}

interface BucketTabsProps {
  buckets: Bucket[];
  activeBucket: string | null;
  onSelect: (bucketId: string | null) => void;
  totalThreads: number;
}

export function BucketTabs({
  buckets,
  activeBucket,
  onSelect,
  totalThreads,
}: BucketTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-zinc-800 pb-px">
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
    </div>
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
      onClick={onClick}
      className={`shrink-0 border-b-2 px-4 py-2 text-sm transition-colors ${
        active
          ? "border-white text-white"
          : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 ${active ? "text-zinc-400" : "text-zinc-600"}`}
      >
        {count}
      </span>
    </button>
  );
}

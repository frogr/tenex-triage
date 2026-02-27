"use client";

import { useState } from "react";

export interface LogEntry {
  step: string;
  [key: string]: unknown;
}

interface ClassificationLogProps {
  entries: LogEntry[];
}

export function ClassificationLog({ entries }: ClassificationLogProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  const latest = entries[entries.length - 1];
  const isDone = latest.step === "complete" || latest.step === "done";
  const isError = latest.step === "error";
  const past = entries.slice(0, -1);

  return (
    <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 font-mono text-xs sm:text-sm">
      {/* Expandable past entries */}
      {expanded && past.length > 0 && (
        <div className="border-b border-zinc-800/60 px-3 py-2 sm:px-4">
          {past.map((entry, i) => (
            <div key={i} className="flex gap-2 py-0.5 text-zinc-600">
              <span className="shrink-0 select-none">{">"}</span>
              <span>{formatEntry(entry)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Current line — always visible */}
      <button
        onClick={() => past.length > 0 && setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left sm:px-4"
        disabled={past.length === 0}
      >
        {!isDone && !isError && (
          <div className="h-3 w-3 shrink-0 animate-spin rounded-full border border-zinc-600 border-t-zinc-300" />
        )}
        {isDone && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 text-green-500">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
        {isError && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="shrink-0 text-red-400">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        )}
        <span className={isError ? "text-red-400" : isDone ? "text-zinc-300" : "text-zinc-400"}>
          {formatEntry(latest)}
        </span>
        {past.length > 0 && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`ml-auto shrink-0 text-zinc-600 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>
    </div>
  );
}

function formatEntry(entry: LogEntry): string {
  switch (entry.step) {
    case "scanning": {
      const total = entry.total as number;
      const manual = entry.manual as number;
      const already = entry.alreadyClassified as number;
      const toClassify = entry.toClassify as number;
      const parts = [`Found ${total} emails.`];
      if (manual > 0) parts.push(`${manual} manually sorted by you.`);
      if (already > 0) parts.push(`${already} already classified.`);
      if (toClassify > 0) parts.push(`${toClassify} remaining.`);
      else parts.push("Everything is already classified!");
      return parts.join(" ");
    }
    case "classifying":
      return `Classifying ${entry.threadCount} emails...`;
    case "progress":
      return `Classifying... ${entry.classified}/${entry.total}`;
    case "complete": {
      const count = entry.classifiedCount as number;
      if (count === 0) return entry.message as string;
      const cost = entry.costCents as number;
      return `Done! ${count} emails classified. ($${(cost / 100).toFixed(4)})`;
    }
    case "done":
      return "Classification complete.";
    case "error":
      return `Error: ${entry.message}`;
    default:
      return JSON.stringify(entry);
  }
}
